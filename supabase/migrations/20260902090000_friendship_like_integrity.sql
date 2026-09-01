-- Candidate forward-only migration. Do not apply to production until every
-- prerequisite query in diagnostics/friendship_like_preflight.sql returns no
-- rows and the results have been reviewed.
--
-- This migration deliberately does not alter RLS. Public profile/record access
-- and friendship/like SELECT policy scope require a product-level privacy review.

ALTER TABLE public.friendships
  ADD CONSTRAINT friendships_no_self_reference
  CHECK (user_id <> friend_id);

ALTER TABLE public.one_verse_likes
  ALTER COLUMN liker_id SET NOT NULL,
  ALTER COLUMN author_id SET NOT NULL;

-- Supports pending incoming requests and accepted-friend listing, respectively.
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status
  ON public.friendships (friend_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_user_status
  ON public.friendships (user_id, status);

-- Supports friend feed ordering without indexing records that have no One Verse.
CREATE INDEX IF NOT EXISTS idx_reading_records_user_completed_one_verse
  ON public.reading_records (user_id, completed_at DESC)
  WHERE one_verse IS NOT NULL AND completed_at IS NOT NULL;

-- Supports likes loaded by verse author and day. The existing unique key serves
-- the inverse lookup used when the current user toggles a like.
CREATE INDEX IF NOT EXISTS idx_one_verse_likes_author_day
  ON public.one_verse_likes (author_id, day_index);
