BEGIN;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('friend_request', 'friend_request_accepted', 'one_verse_liked',
    'reading_streak_achieved', 'memorization_completed', 'one_verse_completed', 'friend_completed_reading')),
  related_day_index integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_key text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (actor_id IS NULL OR actor_id <> recipient_id),
  UNIQUE (recipient_id, event_key)
);
CREATE INDEX notifications_recipient_created ON public.notifications(recipient_id, created_at DESC, id DESC);
CREATE INDEX notifications_unread ON public.notifications(recipient_id) WHERE NOT is_read;
CREATE INDEX reading_records_notification_streak ON public.reading_records(user_id, completed_at) WHERE completed_at IS NOT NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
CREATE POLICY notifications_read_own ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

-- Only this constrained RPC can modify read state; no client INSERT/UPDATE grants.
CREATE FUNCTION public.mark_notifications_read(p_id uuid DEFAULT NULL, p_before timestamptz DEFAULT now())
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.notifications SET is_read = true, read_at = now()
  WHERE recipient_id = auth.uid() AND NOT is_read
    AND (p_id IS NULL OR id = p_id) AND created_at <= p_before;
$$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid, timestamptz) TO authenticated;

-- Private-to-the-database helper. Clients cannot manufacture notification events.
CREATE FUNCTION public.emit_activity_notification(p_recipient uuid, p_actor uuid, p_type text,
  p_key text, p_day integer DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.notifications(recipient_id, actor_id, type, event_key, related_day_index, metadata)
  SELECT p_recipient, p_actor, p_type, p_key, p_day, p_metadata
  WHERE p_recipient <> p_actor
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient)
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor)
  ON CONFLICT (recipient_id, event_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.emit_activity_notification(uuid,uuid,text,text,integer,jsonb) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.notify_friendship_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' AND auth.uid() = NEW.user_id THEN
    PERFORM public.emit_activity_notification(NEW.friend_id, NEW.user_id, 'friend_request',
      'request:' || NEW.user_id || ':' || NEW.friend_id || ':' || NEW.created_at);
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'accepted' AND auth.uid() = NEW.friend_id THEN
    -- accept_invite creates the inviter -> invitee row inside a trusted RPC.
    -- The reciprocal row has user_id = auth.uid() and deliberately emits nothing.
    PERFORM public.emit_activity_notification(NEW.user_id, NEW.friend_id, 'friend_request_accepted',
      'accept:' || NEW.user_id || ':' || NEW.friend_id || ':' || NEW.created_at);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reject forged direction changes and ignore the reciprocal accepted row.
    IF OLD.status = 'pending' AND NEW.status = 'accepted'
      AND OLD.user_id = NEW.user_id AND OLD.friend_id = NEW.friend_id AND auth.uid() = NEW.friend_id THEN
      PERFORM public.emit_activity_notification(NEW.user_id, NEW.friend_id, 'friend_request_accepted',
        'accept:' || NEW.user_id || ':' || NEW.friend_id || ':' || NEW.created_at);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_friendship_activity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notification_friendship AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_friendship_activity();

CREATE FUNCTION public.notify_like_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() = NEW.liker_id
    AND EXISTS (SELECT 1 FROM public.friendships WHERE user_id = NEW.liker_id AND friend_id = NEW.author_id AND status = 'accepted')
    AND EXISTS (SELECT 1 FROM public.friendships WHERE user_id = NEW.author_id AND friend_id = NEW.liker_id AND status = 'accepted')
    AND EXISTS (SELECT 1 FROM public.reading_records WHERE user_id = NEW.author_id AND day_index = NEW.day_index AND one_verse IS NOT NULL AND completed_at IS NOT NULL) THEN
    PERFORM public.emit_activity_notification(NEW.author_id, NEW.liker_id, 'one_verse_liked',
      'like:' || NEW.liker_id || ':' || NEW.author_id || ':' || NEW.day_index, NEW.day_index);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_like_activity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notification_like AFTER INSERT ON public.one_verse_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_like_activity();

CREATE FUNCTION public.notify_reading_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  previous_verse jsonb := NULL;
  previous_completed timestamptz := NULL;
  recipient uuid;
  method text;
  reference_key text;
  streak integer := 0;
  completion_day date;
  details jsonb;
BEGIN
  IF auth.uid() IS DISTINCT FROM NEW.user_id THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN previous_verse := OLD.one_verse; previous_completed := OLD.completed_at; END IF;
  details := jsonb_build_object('book', NEW.one_verse->>'book', 'chapter', NEW.one_verse->'chapter', 'verse', NEW.one_verse->'verse');
  reference_key := NEW.user_id || ':' || NEW.day_index || ':' || COALESCE(NEW.one_verse->>'book','') || ':' || COALESCE(NEW.one_verse->>'chapter','') || ':' || COALESCE(NEW.one_verse->>'verse','');
  IF NEW.completed_at IS NOT NULL AND previous_completed IS NULL THEN
    completion_day := (NEW.completed_at AT TIME ZONE 'Asia/Seoul')::date;
    -- Actual completion calendar days, not schedule Day numbers. Multiple
    -- readings on one day count once; gaps break the run.
    SELECT count(*) INTO streak FROM (
      SELECT d, row_number() OVER (ORDER BY d DESC)::integer - 1 AS distance
      FROM (SELECT DISTINCT (completed_at AT TIME ZONE 'Asia/Seoul')::date AS d
        FROM public.reading_records WHERE user_id = NEW.user_id AND completed_at IS NOT NULL
        AND (completed_at AT TIME ZONE 'Asia/Seoul')::date <= completion_day) dates
    ) ranked WHERE d = completion_day - distance;
  END IF;
  FOR recipient IN SELECT DISTINCT f.friend_id FROM public.friendships f WHERE f.user_id = NEW.user_id AND f.status = 'accepted'
    AND EXISTS (SELECT 1 FROM public.friendships back WHERE back.user_id = f.friend_id AND back.friend_id = NEW.user_id AND back.status = 'accepted') LOOP
    IF streak IN (3,7,14,30) THEN
      PERFORM public.emit_activity_notification(recipient, NEW.user_id, 'reading_streak_achieved',
        'streak:' || NEW.user_id || ':' || completion_day || ':' || streak, NEW.day_index,
        jsonb_build_object('days', streak, 'achieved_on', completion_day));
    END IF;
    IF NEW.completed_at IS NOT NULL AND NEW.one_verse IS NOT NULL
      AND (previous_completed IS NULL OR previous_verse IS NULL) THEN
      PERFORM public.emit_activity_notification(recipient, NEW.user_id, 'one_verse_completed',
        'one:' || reference_key, NEW.day_index, details);
    END IF;
    IF NEW.one_verse->>'isMemorized' = 'true' THEN
      FOREACH method IN ARRAY ARRAY['voice','writing'] LOOP
        IF COALESCE(NEW.one_verse->'memorizedMethods', '[]'::jsonb) ? method
          AND NOT (COALESCE(previous_verse->'memorizedMethods', '[]'::jsonb) ? method) THEN
          PERFORM public.emit_activity_notification(recipient, NEW.user_id, 'memorization_completed',
            'memory:' || reference_key || ':' || method, NEW.day_index, details || jsonb_build_object('method',method));
        END IF;
      END LOOP;
      -- Compatibility with older clients which only persisted isMemorized.
      IF COALESCE(previous_verse->>'isMemorized','false') <> 'true'
        AND COALESCE(NEW.one_verse->'memorizedMethods','[]'::jsonb) = '[]'::jsonb THEN
        PERFORM public.emit_activity_notification(recipient, NEW.user_id, 'memorization_completed',
          'memory:' || reference_key || ':legacy', NEW.day_index, details);
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_reading_activity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notification_reading AFTER INSERT OR UPDATE ON public.reading_records
  FOR EACH ROW EXECUTE FUNCTION public.notify_reading_activity();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
COMMIT;
