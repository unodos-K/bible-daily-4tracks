-- Run this file in the Supabase SQL Editor immediately before considering
-- 20260902090000_friendship_like_integrity.sql.
-- Every query is read-only. Do not apply the migration if any prerequisite
-- data-integrity query below returns rows.

BEGIN TRANSACTION READ ONLY;

-- Prerequisite: a friendship must never point to the same user.
SELECT user_id, friend_id, status, created_at
FROM public.friendships
WHERE user_id = friend_id;

-- Informational: accepted friendships are stored in both directions. A missing
-- or non-accepted reverse row is an inconsistent accepted relationship, not an
-- automatically removable duplicate.
SELECT
  f.user_id,
  f.friend_id,
  f.status AS status,
  reverse_friendship.status AS reverse_status
FROM public.friendships AS f
LEFT JOIN public.friendships AS reverse_friendship
  ON reverse_friendship.user_id = f.friend_id
 AND reverse_friendship.friend_id = f.user_id
WHERE f.status = 'accepted'
  AND (reverse_friendship.user_id IS NULL OR reverse_friendship.status IS DISTINCT FROM 'accepted');

-- Informational: statuses used by current client flows are pending and accepted.
SELECT user_id, friend_id, status
FROM public.friendships
WHERE status IS NULL OR status NOT IN ('pending', 'accepted');

-- Defensive orphan check. Existing foreign keys should make this empty.
SELECT f.user_id, f.friend_id
FROM public.friendships AS f
LEFT JOIN public.profiles AS user_profile ON user_profile.id = f.user_id
LEFT JOIN public.profiles AS friend_profile ON friend_profile.id = f.friend_id
WHERE user_profile.id IS NULL OR friend_profile.id IS NULL;

-- Prerequisite: nullable IDs defeat PostgreSQL unique semantics because NULLs
-- are distinct. Both columns must be populated before making them NOT NULL.
SELECT id, liker_id, author_id, day_index, created_at
FROM public.one_verse_likes
WHERE liker_id IS NULL OR author_id IS NULL;

-- Defensive check for records that would conflict after NULLs are disallowed.
SELECT liker_id, author_id, day_index, COUNT(*) AS duplicate_count
FROM public.one_verse_likes
GROUP BY liker_id, author_id, day_index
HAVING COUNT(*) > 1;

-- Informational: liking one's own verse is currently permitted by both schema
-- and client flow. Treat this as a product decision, not data to delete.
SELECT id, liker_id, author_id, day_index, created_at
FROM public.one_verse_likes
WHERE liker_id = author_id;

-- Defensive orphan check. Existing foreign keys should make this empty.
SELECT l.id, l.liker_id, l.author_id, l.day_index
FROM public.one_verse_likes AS l
LEFT JOIN public.profiles AS liker_profile ON liker_profile.id = l.liker_id
LEFT JOIN public.profiles AS author_profile ON author_profile.id = l.author_id
WHERE (l.liker_id IS NOT NULL AND liker_profile.id IS NULL)
   OR (l.author_id IS NOT NULL AND author_profile.id IS NULL);

-- Informational: day_index is currently unconstrained in the database. Review
-- out-of-range values before proposing a separate 1..365 CHECK constraint.
SELECT id, liker_id, author_id, day_index
FROM public.one_verse_likes
WHERE day_index < 1 OR day_index > 365;

-- Record the current RLS policies before any future policy redesign.
SELECT tablename, policyname, roles, cmd, qual AS using_expression, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('friendships', 'one_verse_likes', 'profiles', 'reading_records')
ORDER BY tablename, policyname;

-- Record relevant indexes before and after applying the candidate migration.
SELECT tablename, indexname, indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('friendships', 'one_verse_likes', 'reading_records')
ORDER BY tablename, indexname;

COMMIT;
