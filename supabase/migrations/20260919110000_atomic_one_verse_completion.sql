BEGIN;

-- Final One Verse selection and first reading completion must be one atomic,
-- owner-checked operation. Existing read_date and user-authored JSON fields are
-- preserved; an already completed record is intentionally left unchanged.
CREATE OR REPLACE FUNCTION public.save_final_one_verse(
  p_day_index integer,
  p_one_verse jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved boolean;
BEGIN
  IF auth.uid() IS NULL OR p_day_index IS NULL OR p_one_verse IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.reading_records(user_id, day_index, read_date, completed_at, one_verse)
  VALUES (
    auth.uid(),
    p_day_index,
    (now() AT TIME ZONE 'Asia/Seoul')::date,
    now(),
    p_one_verse
  )
  ON CONFLICT (user_id, day_index) DO UPDATE
    SET one_verse = CASE
          WHEN public.reading_records.one_verse->>'book' = EXCLUDED.one_verse->>'book'
            AND public.reading_records.one_verse->>'chapter' = EXCLUDED.one_verse->>'chapter'
            AND public.reading_records.one_verse->>'verse' = EXCLUDED.one_verse->>'verse'
          THEN EXCLUDED.one_verse || jsonb_strip_nulls(jsonb_build_object(
            'memo', public.reading_records.one_verse->'memo',
            'memoUpdatedAt', public.reading_records.one_verse->'memoUpdatedAt',
            'isMemorized', public.reading_records.one_verse->'isMemorized',
            'memorizedAt', public.reading_records.one_verse->'memorizedAt',
            'memorizedMethods', public.reading_records.one_verse->'memorizedMethods'
          ))
          ELSE EXCLUDED.one_verse
        END,
        completed_at = COALESCE(public.reading_records.completed_at, EXCLUDED.completed_at)
    WHERE public.reading_records.completed_at IS NULL
  RETURNING true INTO saved;

  RETURN COALESCE(saved, false);
END;
$$;

REVOKE ALL ON FUNCTION public.save_final_one_verse(integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_final_one_verse(integer, jsonb) TO authenticated;

COMMIT;
