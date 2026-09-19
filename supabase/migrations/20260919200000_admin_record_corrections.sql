-- Requires the read-only admin migration. No historical records are backfilled.
BEGIN;

CREATE TABLE public.admin_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL UNIQUE,
  admin_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  day_index integer NOT NULL CHECK (day_index BETWEEN 1 AND 365),
  action text NOT NULL CHECK (action IN ('complete', 'dates')),
  before_values jsonb NOT NULL,
  after_values jsonb NOT NULL,
  request_values jsonb NOT NULL,
  transaction_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_record ON public.admin_audit_logs(target_user_id, day_index, id);
CREATE INDEX admin_audit_transaction ON public.admin_audit_logs(transaction_id, target_user_id, day_index);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.admin_audit_logs_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_audit_logs TO authenticated;
CREATE POLICY admin_audit_read ON public.admin_audit_logs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '77d3a5c6-f9bb-447e-b6cf-be5c663dce54'::uuid);

-- Private implementation: row lock + optimistic check + idempotency key.
-- Only date fields enter the audit log. No One Verse JSON or personal text.
CREATE FUNCTION public.admin_change_record(
  p_user_id uuid, p_day_index integer, p_read_date date, p_completed_at timestamptz,
  p_expected_read_date date, p_expected_completed_at timestamptz,
  p_request_id uuid, p_action text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  r public.reading_records%ROWTYPE;
  prior public.admin_audit_logs%ROWTYPE;
  start_day date;
  new_read date;
  new_completed timestamptz;
  old_values jsonb;
  new_values jsonb;
  request_values jsonb;
BEGIN
  PERFORM public.admin_require_access();
  IF p_user_id IS NULL OR p_day_index IS NULL OR p_day_index NOT BETWEEN 1 AND 365
    OR p_request_id IS NULL OR p_expected_read_date IS NULL OR p_action IS NULL
    OR p_action NOT IN ('complete','dates') THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = '22023';
  END IF;
  request_values := jsonb_build_object('user_id',p_user_id,'day_index',p_day_index,
    'action',p_action,'read_date',p_read_date,'completed_at',p_completed_at,
    'expected_read_date',p_expected_read_date,'expected_completed_at',p_expected_completed_at);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  SELECT * INTO prior FROM public.admin_audit_logs WHERE request_id=p_request_id;
  IF FOUND THEN
    IF prior.admin_id IS DISTINCT FROM auth.uid() OR prior.request_values IS DISTINCT FROM request_values THEN
      RAISE EXCEPTION 'REQUEST_CONFLICT' USING ERRCODE='40001';
    END IF;
    RETURN jsonb_build_object('success',true,'userId',p_user_id,'dayIndex',p_day_index,'values',prior.after_values,'replayed',true);
  END IF;
  SELECT * INTO r FROM public.reading_records WHERE user_id=p_user_id AND day_index=p_day_index FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RECORD_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF r.read_date IS DISTINCT FROM p_expected_read_date OR r.completed_at IS DISTINCT FROM p_expected_completed_at THEN
    RAISE EXCEPTION 'STALE_RECORD' USING ERRCODE='40001';
  END IF;
  IF p_action='complete' THEN
    IF r.one_verse IS NULL OR r.one_verse='null'::jsonb OR r.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'NOT_COMPLETABLE' USING ERRCODE='22023';
    END IF;
    new_read := r.read_date;
    new_completed := coalesce(p_completed_at,now());
  ELSE
    new_read := p_read_date;
    new_completed := p_completed_at;
    -- Date correction is not a completion-cancellation workflow.
    IF r.completed_at IS NOT NULL AND new_completed IS NULL THEN
      RAISE EXCEPTION 'CANNOT_CLEAR_COMPLETION' USING ERRCODE='22023';
    END IF;
    IF r.completed_at IS NULL AND new_completed IS NOT NULL AND (r.one_verse IS NULL OR r.one_verse='null'::jsonb) THEN
      RAISE EXCEPTION 'ONE_VERSE_REQUIRED' USING ERRCODE='22023';
    END IF;
  END IF;
  SELECT start_date INTO start_day FROM public.reading_settings WHERE user_id=p_user_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'START_DATE_REQUIRED' USING ERRCODE='22023'; END IF;
  -- Same date across Days is supported by the existing PK (user_id, day_index).
  -- Day is a reading-plan index, not start_date + day_index - 1.
  IF new_read IS NULL OR NOT isfinite(new_read) OR new_read < start_day
    OR new_read > (now() AT TIME ZONE 'Asia/Seoul')::date
    OR (new_completed IS NOT NULL AND (NOT isfinite(new_completed)
      OR new_completed > now() OR (new_completed AT TIME ZONE 'Asia/Seoul')::date < start_day
      OR (new_completed AT TIME ZONE 'Asia/Seoul')::date < new_read)) THEN
    RAISE EXCEPTION 'INVALID_RECORD_DATE' USING ERRCODE='22023';
  END IF;
  old_values := jsonb_build_object('read_date',r.read_date,'completed_at',r.completed_at);
  new_values := jsonb_build_object('read_date',new_read,'completed_at',new_completed);
  IF old_values = new_values THEN
    RETURN jsonb_build_object('success',true,'userId',p_user_id,'dayIndex',p_day_index,'values',new_values,'unchanged',true);
  END IF;
  -- Insert before UPDATE so the notification guard can authenticate this exact correction.
  -- Both statements roll back together if UPDATE or any trigger fails.
  INSERT INTO public.admin_audit_logs(request_id,admin_id,target_user_id,day_index,action,before_values,after_values,request_values,transaction_id)
    VALUES(p_request_id,auth.uid(),p_user_id,p_day_index,p_action,old_values,new_values,request_values,pg_current_xact_id()::text);
  UPDATE public.reading_records SET read_date=new_read,completed_at=new_completed
    WHERE user_id=p_user_id AND day_index=p_day_index;
  RETURN jsonb_build_object('success',true,'userId',p_user_id,'dayIndex',p_day_index,'values',new_values);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_change_record(uuid,integer,date,timestamptz,date,timestamptz,uuid,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.admin_complete_one_verse_record(p_user_id uuid,p_day_index integer,
  p_expected_read_date date,p_expected_completed_at timestamptz,p_request_id uuid,p_completed_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM public.admin_require_access();
  RETURN public.admin_change_record(p_user_id,p_day_index,NULL,p_completed_at,p_expected_read_date,p_expected_completed_at,p_request_id,'complete');
END;
$$;
CREATE FUNCTION public.admin_update_reading_record_date(p_user_id uuid,p_day_index integer,p_read_date date,p_completed_at timestamptz,
  p_expected_read_date date,p_expected_completed_at timestamptz,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM public.admin_require_access();
  RETURN public.admin_change_record(p_user_id,p_day_index,p_read_date,p_completed_at,p_expected_read_date,p_expected_completed_at,p_request_id,'dates');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_complete_one_verse_record(uuid,integer,date,timestamptz,uuid,timestamptz) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_update_reading_record_date(uuid,integer,date,timestamptz,date,timestamptz,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_complete_one_verse_record(uuid,integer,date,timestamptz,uuid,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_reading_record_date(uuid,integer,date,timestamptz,date,timestamptz,uuid) TO authenticated;

-- Normal activity conditions below remain unchanged, including paused streak emission.
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
  -- Only an audit row written by the private admin RPC in this transaction can suppress this update.
  -- A caller-controlled setting alone never suppresses notifications.
  IF TG_OP = 'UPDATE' AND auth.uid() = '77d3a5c6-f9bb-447e-b6cf-be5c663dce54'::uuid
    AND OLD.one_verse IS NOT DISTINCT FROM NEW.one_verse
    AND EXISTS (SELECT 1 FROM public.admin_audit_logs a
      WHERE a.transaction_id=pg_current_xact_id()::text AND a.admin_id=auth.uid()
        AND a.target_user_id=NEW.user_id AND a.day_index=NEW.day_index
        AND a.before_values=jsonb_build_object('read_date',OLD.read_date,'completed_at',OLD.completed_at)
        AND a.after_values=jsonb_build_object('read_date',NEW.read_date,'completed_at',NEW.completed_at)) THEN
    RETURN NEW;
  END IF;
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


CREATE OR REPLACE FUNCTION public.admin_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  today_kst date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  total_users bigint;
  today_one_verse_users bigint;
  today_memorized_users bigint;
  legacy_one_verse bigint;
  completed_without_one_verse bigint;
  malformed_one_verse bigint;
  orphan_likes bigint;
  asymmetric_friendships bigint;
BEGIN
  PERFORM public.admin_require_access();

  SELECT count(*) INTO total_users FROM public.profiles;
  -- Administrative dates change archive/progress, not evidence of user activity.
  -- For corrected rows retain the completion timestamp before the first correction.
  SELECT count(DISTINCT r.user_id) INTO today_one_verse_users
  FROM public.reading_records r
  LEFT JOIN LATERAL (SELECT a.before_values FROM public.admin_audit_logs a
    WHERE a.target_user_id=r.user_id AND a.day_index=r.day_index ORDER BY a.id LIMIT 1) original ON true
  WHERE r.one_verse IS NOT NULL AND r.completed_at IS NOT NULL
    AND ((CASE WHEN original.before_values IS NOT NULL
      THEN (original.before_values->>'completed_at')::timestamptz
      ELSE r.completed_at END) AT TIME ZONE 'Asia/Seoul')::date = today_kst;
  SELECT count(DISTINCT user_id) INTO today_memorized_users
  FROM public.reading_records
  WHERE one_verse->>'isMemorized' = 'true'
    AND substring(one_verse->>'memorizedAt' from '^\\d{4}-\\d{2}-\\d{2}') = today_kst::text;
  SELECT count(*) INTO legacy_one_verse
  FROM public.reading_records WHERE one_verse IS NOT NULL AND completed_at IS NULL;
  SELECT count(*) INTO completed_without_one_verse
  FROM public.reading_records WHERE completed_at IS NOT NULL AND one_verse IS NULL;
  SELECT count(*) INTO malformed_one_verse
  FROM public.reading_records
  WHERE one_verse IS NOT NULL
    AND (jsonb_typeof(one_verse) <> 'object'
      OR NOT (one_verse ? 'book')
      OR NOT (one_verse ? 'chapter')
      OR NOT (one_verse ? 'verse'));
  SELECT count(*) INTO orphan_likes
  FROM public.one_verse_likes l
  LEFT JOIN public.reading_records r
    ON r.user_id = l.author_id AND r.day_index = l.day_index AND r.one_verse IS NOT NULL
  WHERE r.user_id IS NULL;
  SELECT count(*) INTO asymmetric_friendships
  FROM public.friendships f
  WHERE f.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM public.friendships reciprocal
      WHERE reciprocal.user_id = f.friend_id
        AND reciprocal.friend_id = f.user_id
        AND reciprocal.status = 'accepted'
    );

  RETURN jsonb_build_object(
    'todayKst', today_kst,
    'totalUsers', total_users,
    'todayOneVerseUsers', today_one_verse_users,
    'todayMemorizedUsers', today_memorized_users,
    'checks', jsonb_build_object(
      'oneVerseWithoutCompletion', legacy_one_verse,
      'completedWithoutOneVerse', completed_without_one_verse,
      'malformedOneVerse', malformed_one_verse,
      'orphanLikes', orphan_likes,
      'asymmetricFriendships', asymmetric_friendships
    )
  );
END;
$$;


COMMIT;
