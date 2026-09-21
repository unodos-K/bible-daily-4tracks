BEGIN;

-- Private snapshots retain verse-specific footprints/memorization when a choice
-- is cleared/replaced. They are not attached to a newly selected verse.
CREATE TABLE public.one_verse_selection_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_index integer NOT NULL CHECK (day_index BETWEEN 1 AND 365),
  one_verse jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.one_verse_selection_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.one_verse_selection_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.one_verse_selection_history TO authenticated;
CREATE POLICY selection_history_owner ON public.one_verse_selection_history
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE FUNCTION public.set_one_verse_selection(p_day_index integer, p_one_verse jsonb, p_expected jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  owner_id uuid := auth.uid();
  previous jsonb;
  previous_completed timestamptz;
  previous_flag text := current_setting('app.one_verse_selection', true);
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_day_index IS NULL OR p_day_index NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'INVALID_DAY'; END IF;
  IF p_one_verse IS NOT NULL AND (jsonb_typeof(p_one_verse) IS DISTINCT FROM 'object'
    OR coalesce(p_one_verse->>'book','') = ''
    OR coalesce(p_one_verse->>'chapter','') !~ '^[1-9][0-9]*$'
    OR coalesce(p_one_verse->>'verse','') !~ '^[1-9][0-9]*$') THEN RAISE EXCEPTION 'INVALID_VERSE'; END IF;
  -- ON CONFLICT waits for concurrent creators; the subsequent row lock and
  -- expected JSON check prevent replacing a choice/memo changed in another tab.
  IF p_one_verse IS NOT NULL THEN
    INSERT INTO public.reading_records(user_id,day_index,read_date,completed_at,one_verse)
      VALUES(owner_id,p_day_index,(now() AT TIME ZONE 'Asia/Seoul')::date,NULL,NULL)
      ON CONFLICT(user_id,day_index) DO NOTHING;
  END IF;
  SELECT one_verse,completed_at INTO previous,previous_completed FROM public.reading_records
    WHERE user_id=owner_id AND day_index=p_day_index FOR UPDATE;
  IF NOT FOUND THEN RETURN p_expected IS NULL; END IF;
  IF previous IS NOT DISTINCT FROM p_one_verse AND (p_one_verse IS NULL OR previous_completed IS NOT NULL) THEN RETURN true; END IF;
  IF previous IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'STALE_SELECTION'; END IF;
  IF previous IS NOT NULL AND previous IS DISTINCT FROM p_one_verse THEN
    INSERT INTO public.one_verse_selection_history(user_id,day_index,one_verse)
      VALUES(owner_id,p_day_index,previous);
  END IF;
  -- First final selection completes the Day and emits the existing completion
  -- notification. Replacement/reset never changes the original completion time
  -- or emits new activity notifications.
  IF previous_completed IS NOT NULL OR p_one_verse IS NULL THEN
    PERFORM set_config('app.one_verse_selection','on',true);
  END IF;
  UPDATE public.reading_records SET one_verse=p_one_verse,
    completed_at=CASE WHEN p_one_verse IS NOT NULL THEN coalesce(completed_at,now()) ELSE completed_at END
    WHERE user_id=owner_id AND day_index=p_day_index;
  PERFORM set_config('app.one_verse_selection',coalesce(previous_flag,''),true);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.set_one_verse_selection(integer,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_one_verse_selection(integer,jsonb,jsonb) TO authenticated;

-- Re-selection changes are not activity notifications. Retain the existing
-- function (including its admin guard and disabled streak policy) untouched.
DROP TRIGGER notification_reading ON public.reading_records;
CREATE TRIGGER notification_reading AFTER INSERT OR UPDATE ON public.reading_records
  FOR EACH ROW WHEN (current_setting('app.one_verse_selection',true) IS DISTINCT FROM 'on')
  EXECUTE FUNCTION public.notify_reading_activity();

-- The legacy first-selection RPC remains compatible with older clients.
COMMIT;
