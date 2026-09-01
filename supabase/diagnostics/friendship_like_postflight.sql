-- Run in Supabase SQL Editor immediately after the reviewed candidate migration.
-- This is metadata-only and read-only: it does not access application rows.
BEGIN TRANSACTION READ ONLY;

SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_catalog.pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conname = 'friendships_no_self_reference';

SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'one_verse_likes'
  AND column_name IN ('liker_id', 'author_id')
ORDER BY column_name;

SELECT tablename, indexname, indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_friendships_friend_status',
    'idx_friendships_user_status',
    'idx_reading_records_user_completed_one_verse',
    'idx_one_verse_likes_author_day'
  )
ORDER BY tablename, indexname;

COMMIT;
