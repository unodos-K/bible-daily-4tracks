-- Run in the Supabase SQL editor before applying the security migration.
-- This is read-only and intentionally does not modify or delete existing data.

-- A future unique constraint on directed friendships is unsafe until this returns no rows.
SELECT user_id, friend_id, COUNT(*) AS duplicate_count
FROM public.friendships
GROUP BY user_id, friend_id
HAVING COUNT(*) > 1;

-- Self friendships must be reviewed before adding a CHECK (user_id <> friend_id).
SELECT user_id, friend_id
FROM public.friendships
WHERE user_id = friend_id;

-- Legacy invite_code values are not used by the new opaque-ID flow. Review them
-- before any future unique constraint or legacy-link migration is attempted.
SELECT invite_code, COUNT(*) AS duplicate_count
FROM public.invites
GROUP BY invite_code
HAVING COUNT(*) > 1;
