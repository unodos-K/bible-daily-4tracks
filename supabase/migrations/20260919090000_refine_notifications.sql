BEGIN;

-- friend_completed_reading was never a distinct product event. Remove any
-- legacy rows before tightening the type constraint so old data cannot make
-- notification reads fail after the migration.
DELETE FROM public.notifications WHERE type = 'friend_completed_reading';
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'friend_request', 'friend_request_accepted', 'one_verse_liked',
  'reading_streak_achieved', 'memorization_completed', 'one_verse_completed'
));

-- Store the calendar date with an amen notification. The app uses this date
-- (rather than the schedule Day number) to open the correct archive month.
CREATE OR REPLACE FUNCTION public.notify_like_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  liked_date text;
BEGIN
  IF auth.uid() = NEW.liker_id
    AND EXISTS (SELECT 1 FROM public.friendships WHERE user_id = NEW.liker_id AND friend_id = NEW.author_id AND status = 'accepted')
    AND EXISTS (SELECT 1 FROM public.friendships WHERE user_id = NEW.author_id AND friend_id = NEW.liker_id AND status = 'accepted')
    AND EXISTS (SELECT 1 FROM public.reading_records WHERE user_id = NEW.author_id AND day_index = NEW.day_index AND one_verse IS NOT NULL AND completed_at IS NOT NULL) THEN
    SELECT read_date::text INTO liked_date
    FROM public.reading_records
    WHERE user_id = NEW.author_id AND day_index = NEW.day_index
    LIMIT 1;
    PERFORM public.emit_activity_notification(NEW.author_id, NEW.liker_id, 'one_verse_liked',
      'like:' || NEW.liker_id || ':' || NEW.author_id || ':' || NEW.day_index, NEW.day_index,
      jsonb_build_object('read_date', liked_date));
  END IF;
  RETURN NEW;
END;
$$;

-- Keep calculating streaks for future use, but do not emit streak notifications
-- until the product definition is finalized. The type remains valid so older
-- rows can still be rendered and marked read.
CREATE OR REPLACE FUNCTION public.notify_reading_activity() RETURNS trigger
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
    SELECT count(*) INTO streak FROM (
      SELECT d, row_number() OVER (ORDER BY d DESC)::integer - 1 AS distance
      FROM (SELECT DISTINCT (completed_at AT TIME ZONE 'Asia/Seoul')::date AS d
        FROM public.reading_records WHERE user_id = NEW.user_id AND completed_at IS NOT NULL
        AND (completed_at AT TIME ZONE 'Asia/Seoul')::date <= completion_day) dates
    ) ranked WHERE d = completion_day - distance;
  END IF;
  FOR recipient IN SELECT DISTINCT f.friend_id FROM public.friendships f WHERE f.user_id = NEW.user_id AND f.status = 'accepted'
    AND EXISTS (SELECT 1 FROM public.friendships back WHERE back.user_id = f.friend_id AND back.friend_id = NEW.user_id AND back.status = 'accepted') LOOP
    -- Streak notification emission intentionally disabled pending a refined definition.
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

COMMIT;
