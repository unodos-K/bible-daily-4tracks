-- 1. reading_records -> profiles
ALTER TABLE public.reading_records
  ADD CONSTRAINT fk_reading_records_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. friendships -> profiles (user_id, friend_id)
ALTER TABLE public.friendships
  ADD CONSTRAINT fk_friendships_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_friendships_friend
  FOREIGN KEY (friend_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. one_verse_likes -> profiles (liker_id, author_id)
ALTER TABLE public.one_verse_likes
  ADD CONSTRAINT fk_one_verse_likes_liker
  FOREIGN KEY (liker_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_one_verse_likes_author
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. reading_settings -> profiles
ALTER TABLE public.reading_settings
  ADD CONSTRAINT fk_reading_settings_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
