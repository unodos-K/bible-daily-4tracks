-- Persist One Verse candidates before a day is completed.
-- Apply manually in the Supabase SQL Editor after review; do not run db push.

CREATE TABLE IF NOT EXISTS public.one_verse_candidates (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_index integer NOT NULL CHECK (day_index BETWEEN 1 AND 365),
  track_type text NOT NULL,
  book text NOT NULL,
  chapter integer NOT NULL CHECK (chapter > 0),
  verse integer NOT NULL CHECK (verse > 0),
  raw_text text NOT NULL,
  display_text text NOT NULL,
  chunks jsonb NOT NULL CHECK (jsonb_typeof(chunks) = 'array'),
  reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT one_verse_candidates_pkey PRIMARY KEY (user_id, day_index, book, chapter, verse)
);

ALTER TABLE public.one_verse_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own One Verse candidates"
  ON public.one_verse_candidates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own One Verse candidates"
  ON public.one_verse_candidates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own One Verse candidates"
  ON public.one_verse_candidates
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON TABLE public.one_verse_candidates TO authenticated;
