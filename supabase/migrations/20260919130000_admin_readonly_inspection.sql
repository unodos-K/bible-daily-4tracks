-- Read-only operations inspection surface.
-- Every function verifies auth.uid() against the single administrator account
-- before reading any user-owned data. No table RLS policy is relaxed.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_require_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM '77d3a5c6-f9bb-447e-b6cf-be5c663dce54'::uuid THEN
    RAISE EXCEPTION 'administrator access required' USING ERRCODE = '42501';
  END IF;
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
  SELECT count(DISTINCT user_id) INTO today_one_verse_users
  FROM public.reading_records
  WHERE one_verse IS NOT NULL
    AND completed_at IS NOT NULL
    AND (completed_at AT TIME ZONE 'Asia/Seoul')::date = today_kst;
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

CREATE OR REPLACE FUNCTION public.admin_search_users(
  p_query text DEFAULT '',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  clean_query text := left(trim(coalesce(p_query, '')), 100);
  safe_page integer := greatest(coalesce(p_page, 1), 1);
  safe_page_size integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
  result_items jsonb;
  result_total bigint;
BEGIN
  PERFORM public.admin_require_access();
  SELECT count(*) INTO result_total
  FROM auth.users au
  JOIN public.profiles p ON p.id = au.id
  WHERE clean_query = ''
    OR p.id::text = clean_query
    OR coalesce(p.nickname, '') ILIKE '%' || clean_query || '%'
    OR coalesce(p.name, '') ILIKE '%' || clean_query || '%';

  SELECT coalesce(jsonb_agg(to_jsonb(items)), '[]'::jsonb) INTO result_items
  FROM (
    SELECT p.id, p.nickname, p.name, au.created_at AS joined_at
    FROM auth.users au
    JOIN public.profiles p ON p.id = au.id
    WHERE clean_query = ''
      OR p.id::text = clean_query
      OR coalesce(p.nickname, '') ILIKE '%' || clean_query || '%'
      OR coalesce(p.name, '') ILIKE '%' || clean_query || '%'
    ORDER BY coalesce(p.nickname, p.name, ''), p.id
    LIMIT safe_page_size OFFSET (safe_page - 1) * safe_page_size
  ) items;

  RETURN jsonb_build_object('items', result_items, 'total', result_total, 'page', safe_page, 'pageSize', safe_page_size);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_user_detail(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_data jsonb;
  settings_data jsonb;
  record_data jsonb;
  friendship_data jsonb;
  like_data jsonb;
  user_created_at timestamptz;
  recent_record_at timestamptz;
BEGIN
  PERFORM public.admin_require_access();
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user id is required' USING ERRCODE = '22023'; END IF;

  SELECT jsonb_build_object('id', p.id, 'nickname', p.nickname, 'name', p.name), au.created_at
    INTO profile_data, user_created_at
  FROM public.profiles p JOIN auth.users au ON au.id = p.id WHERE p.id = p_user_id;
  IF profile_data IS NULL THEN RAISE EXCEPTION 'user not found' USING ERRCODE = '22023'; END IF;

  SELECT jsonb_build_object('startDate', start_date, 'createdAt', created_at, 'updatedAt', updated_at)
    INTO settings_data FROM public.reading_settings WHERE user_id = p_user_id;

  SELECT max(coalesce(completed_at, read_date::timestamptz)) INTO recent_record_at
  FROM public.reading_records WHERE user_id = p_user_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'dayIndex', r.day_index,
    'readDate', r.read_date,
    'completedAt', r.completed_at,
    'hasOneVerse', r.one_verse IS NOT NULL,
    'verseLocation', CASE WHEN jsonb_typeof(r.one_verse) = 'object' THEN jsonb_build_object(
      'book', r.one_verse->>'book', 'chapter', r.one_verse->>'chapter', 'verse', r.one_verse->>'verse'
    ) ELSE NULL END,
    'isMemorized', r.one_verse->>'isMemorized' = 'true',
    'memorizedAt', r.one_verse->>'memorizedAt',
    'memorizedMethods', CASE WHEN jsonb_typeof(r.one_verse->'memorizedMethods') = 'array' THEN r.one_verse->'memorizedMethods' ELSE '[]'::jsonb END,
    'hasFootprint', (
      (jsonb_typeof(r.one_verse->'memo') = 'string' AND NULLIF(trim(r.one_verse->>'memo'), '') IS NOT NULL)
      OR (jsonb_typeof(r.one_verse->'memo') IN ('object', 'array') AND r.one_verse->'memo' NOT IN ('{}'::jsonb, '[]'::jsonb))
    ),
    'footprintRecordedAt', NULL
  ) ORDER BY r.day_index DESC), '[]'::jsonb) INTO record_data
  FROM public.reading_records r WHERE r.user_id = p_user_id;

  SELECT coalesce(jsonb_agg(to_jsonb(items) ORDER BY items.created_at DESC), '[]'::jsonb) INTO friendship_data
  FROM (
    SELECT f.user_id, f.friend_id, f.status, f.created_at,
      CASE WHEN f.user_id = p_user_id THEN 'sent' ELSE 'received' END AS direction,
      coalesce(other.nickname, other.name, '알 수 없음') AS other_name
    FROM public.friendships f
    LEFT JOIN public.profiles other ON other.id = CASE WHEN f.user_id = p_user_id THEN f.friend_id ELSE f.user_id END
    WHERE (f.user_id = p_user_id OR f.friend_id = p_user_id)
      AND (f.status <> 'accepted' OR f.user_id::text < f.friend_id::text)
  ) items;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id, 'dayIndex', l.day_index, 'likerId', l.liker_id,
    'likerName', coalesce(p.nickname, p.name, '알 수 없음'), 'createdAt', l.created_at,
    'isSelfAmen', l.liker_id = l.author_id
  ) ORDER BY l.created_at DESC), '[]'::jsonb) INTO like_data
  FROM public.one_verse_likes l
  LEFT JOIN public.profiles p ON p.id = l.liker_id
  WHERE l.author_id = p_user_id;

  RETURN jsonb_build_object(
    'profile', profile_data,
    'joinedAt', user_created_at,
    'settings', coalesce(settings_data, '{}'::jsonb),
    'recentRecordAt', recent_record_at,
    'records', record_data,
    'friendships', friendship_data,
    'likes', like_data
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_search_notifications(
  p_recipient_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_is_read boolean DEFAULT NULL,
  p_day_index integer DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  safe_page integer := greatest(coalesce(p_page, 1), 1);
  safe_page_size integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
  result_items jsonb;
  result_total bigint;
BEGIN
  PERFORM public.admin_require_access();
  SELECT count(*) INTO result_total FROM public.notifications n
  WHERE (p_recipient_id IS NULL OR n.recipient_id = p_recipient_id)
    AND (p_actor_id IS NULL OR n.actor_id = p_actor_id)
    AND (p_type IS NULL OR p_type = '' OR n.type = p_type)
    AND (p_from IS NULL OR n.created_at >= p_from)
    AND (p_to IS NULL OR n.created_at < p_to)
    AND (p_is_read IS NULL OR n.is_read = p_is_read)
    AND (p_day_index IS NULL OR n.related_day_index = p_day_index);
  SELECT coalesce(jsonb_agg(to_jsonb(items)), '[]'::jsonb) INTO result_items
  FROM (
    SELECT n.id, n.type, n.recipient_id, n.actor_id, n.created_at, n.is_read, n.read_at,
      n.related_day_index, n.event_key,
      coalesce(recipient.nickname, recipient.name, '알 수 없음') AS recipient_name,
      coalesce(actor.nickname, actor.name, '알 수 없음') AS actor_name,
      jsonb_strip_nulls(jsonb_build_object('book', n.metadata->>'book', 'chapter', n.metadata->>'chapter', 'verse', n.metadata->>'verse', 'read_date', n.metadata->>'read_date')) AS metadata
    FROM public.notifications n
    LEFT JOIN public.profiles recipient ON recipient.id = n.recipient_id
    LEFT JOIN public.profiles actor ON actor.id = n.actor_id
    WHERE (p_recipient_id IS NULL OR n.recipient_id = p_recipient_id)
      AND (p_actor_id IS NULL OR n.actor_id = p_actor_id)
      AND (p_type IS NULL OR p_type = '' OR n.type = p_type)
      AND (p_from IS NULL OR n.created_at >= p_from)
      AND (p_to IS NULL OR n.created_at < p_to)
      AND (p_is_read IS NULL OR n.is_read = p_is_read)
      AND (p_day_index IS NULL OR n.related_day_index = p_day_index)
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT safe_page_size OFFSET (safe_page - 1) * safe_page_size
  ) items;
  RETURN jsonb_build_object('items', result_items, 'total', result_total, 'page', safe_page, 'pageSize', safe_page_size);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_data_checks(p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  safe_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  result_items jsonb;
BEGIN
  PERFORM public.admin_require_access();
  WITH issues AS (
    SELECT '과거 정책 기록' AS category, 'One Verse는 있으나 completed_at이 없습니다.' AS reason, user_id, day_index, NULL::uuid AS related_id
    FROM public.reading_records WHERE one_verse IS NOT NULL AND completed_at IS NULL
    UNION ALL
    SELECT '추가 확인 필요', '읽기 완료인데 One Verse가 없습니다.', user_id, day_index, NULL::uuid
    FROM public.reading_records WHERE completed_at IS NOT NULL AND one_verse IS NULL
    UNION ALL
    SELECT '오류 의심', 'One Verse JSON에 성경 위치 필드가 없습니다.', user_id, day_index, NULL::uuid
    FROM public.reading_records
    WHERE one_verse IS NOT NULL AND (jsonb_typeof(one_verse) <> 'object' OR NOT (one_verse ? 'book') OR NOT (one_verse ? 'chapter') OR NOT (one_verse ? 'verse'))
    UNION ALL
    SELECT '추가 확인 필요', '대상 One Verse 기록이 없는 아멘입니다.', liker_id, day_index, id
    FROM public.one_verse_likes l
    WHERE NOT EXISTS (SELECT 1 FROM public.reading_records r WHERE r.user_id = l.author_id AND r.day_index = l.day_index AND r.one_verse IS NOT NULL)
    UNION ALL
    SELECT '오류 의심', '수락 친구 관계의 반대 방향 행이 없습니다.', f.user_id, NULL, NULL::uuid
    FROM public.friendships f
    WHERE f.status = 'accepted' AND NOT EXISTS (
      SELECT 1 FROM public.friendships back WHERE back.user_id = f.friend_id AND back.friend_id = f.user_id AND back.status = 'accepted'
    )
  )
  SELECT coalesce(jsonb_agg(to_jsonb(limited)), '[]'::jsonb) INTO result_items
  FROM (SELECT * FROM issues LIMIT safe_limit) limited;
  RETURN jsonb_build_object('items', result_items);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_require_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_search_users(text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_user_detail(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_search_notifications(uuid, uuid, text, timestamptz, timestamptz, boolean, integer, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_data_checks(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_users(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_notifications(uuid, uuid, text, timestamptz, timestamptz, boolean, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_data_checks(integer) TO authenticated;

COMMIT;
