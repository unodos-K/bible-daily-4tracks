import { supabase } from "./supabase";
import { getUserId, OneVerse, parseOneVerse } from "./storage";
import type { Json } from "@/types/supabase";

export interface FriendProfile {
  id: string;
  name: string;
  avatar_url: string;
  nickname?: string;
}

export interface FriendFeedItem {
  id?: string;
  user_id: string;
  name: string;
  avatar_url: string;
  nickname?: string;
  day_index: number;
  read_date: string;
  completed_at: string;
  one_verse: OneVerse; // from OneVerse type
  like_count: number;
  is_liked_by_me: boolean;
  liked_by_users?: { id: string; name: string }[];
}

export async function createInviteLink(origin: string): Promise<string | null> {
  const { data: inviteId, error } = await supabase.rpc('create_invite');
  if (error || !inviteId) {
    console.error("createInviteLink error:", error);
    return null;
  }

  return `${origin}/?inviteCode=${encodeURIComponent(inviteId)}`;
}

// 1. 친구 검색 (닉네임 기준) 또는 전체 디렉토리 조회
export async function searchUsersByNickname(nickname: string, currentUserId?: string): Promise<FriendProfile[]> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return [];

  let query = supabase
    .from('profiles')
    .select('id, name, avatar_url, nickname')
    .neq('id', userId)
    .order('nickname', { ascending: true })
    .limit(100);

  if (nickname.trim()) {
    query = query.ilike('nickname', `%${nickname.trim()}%`);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("searchUsersByNickname error:", error);
    return [];
  }
  return data as FriendProfile[];
}

// 1-1. 내가 보낸 친구 요청 목록 (friend_id 리스트 반환)
export async function getSentRequests(currentUserId?: string): Promise<string[]> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error || !data) return [];
  return data.map(r => r.friend_id);
}

// 2. 친구 요청 보내기
export async function sendFriendRequest(friendId: string, currentUserId?: string): Promise<boolean> {
  const userId = currentUserId ?? await getUserId();
  if (!userId || userId === friendId) return false;

  const { error } = await supabase.from('friendships').insert({
    user_id: userId,
    friend_id: friendId,
    status: 'pending'
  });

  if (error) {
    console.error("sendFriendRequest error:", error);
    return false;
  }
  return true;
}

// 3. 나에게 온 친구 요청 목록 가져오기
export async function getPendingRequests(currentUserId?: string): Promise<{ id: string; profile: FriendProfile }[]> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select(`
      user_id,
      profiles!fk_friendships_user (
        id, name, avatar_url, nickname
      )
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error || !data) {
    console.error("getPendingRequests error:", error);
    return [];
  }

  return data.flatMap(row => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile) return [];

    return [{
      id: row.user_id,
      profile: {
        id: profile.id,
        name: profile.name || '친구',
        avatar_url: profile.avatar_url || '',
        nickname: profile.nickname || undefined,
      },
    }];
  });
}

// 4. 친구 요청 수락/거절
export async function respondToFriendRequest(requesterId: string, accept: boolean, currentUserId?: string): Promise<boolean> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return false;

  if (accept) {
    // 수락 시 status를 accepted로 변경하고 쌍방향 레코드 생성
    const { error: updateError } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('user_id', requesterId)
      .eq('friend_id', userId);

    if (updateError) return false;

    await supabase.from('friendships').upsert({
      user_id: userId,
      friend_id: requesterId,
      status: 'accepted'
    });
    return true;
  } else {
    // 거절 시 삭제
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', requesterId)
      .eq('friend_id', userId);
    return !error;
  }
}


// 2. 내 친구 목록 가져오기 (profiles 테이블과 조인)
export async function getFriendsList(currentUserId?: string): Promise<FriendProfile[]> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return [];

  // FK 제약 조건이 설정되었으므로 profiles 테이블과 바로 조인 가능
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      friend_id,
      profiles:friend_id (
        name,
        avatar_url,
        nickname
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (error || !data) {
    console.error("getFriendsList error:", error);
    return [];
  }

  const friendsMap = new Map<string, FriendProfile>();
  
  for (const row of data) {
    if (!row.profiles) continue;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (!profile) continue;

    friendsMap.set(row.friend_id, {
      id: row.friend_id,
      name: profile.name || '친구',
      avatar_url: profile.avatar_url || '',
      nickname: profile.nickname || undefined
    });
  }

  return Array.from(friendsMap.values());
}

/**
 * Builds the list-card feed with two batch queries, regardless of friend count.
 * The list UI only renders each friend's latest One Verse, so older records are
 * discarded after the ordered batch response is mapped by author.
 */
export async function getFriendsFeed(
  friends: FriendProfile[],
  currentUserId: string,
): Promise<Record<string, FriendFeedItem[]>> {
  const friendIds = Array.from(new Set(friends.map((friend) => friend.id)));
  const feedByFriend: Record<string, FriendFeedItem[]> = Object.fromEntries(
    friendIds.map((friendId) => [friendId, []]),
  );
  if (friendIds.length === 0) return feedByFriend;

  const profileById = new Map(friends.map((friend) => [friend.id, friend]));
  const { data: records, error: recordError } = await supabase
    .from('reading_records')
    .select('user_id, day_index, read_date, completed_at, one_verse')
    .in('user_id', friendIds)
    .not('one_verse', 'is', null)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });

  if (recordError || !records) {
    console.error('getFriendsFeed records error:', recordError);
    return feedByFriend;
  }

  const latestRecordByFriend = new Map<string, {
    dayIndex: number;
    readDate: string;
    completedAt: string;
    oneVerse: OneVerse;
  }>();

  for (const record of records) {
    if (latestRecordByFriend.has(record.user_id) || !record.completed_at) continue;
    const oneVerse = parseOneVerse(record.one_verse);
    if (!oneVerse) continue;

    latestRecordByFriend.set(record.user_id, {
      dayIndex: record.day_index,
      readDate: record.read_date,
      completedAt: record.completed_at,
      oneVerse,
    });
  }

  if (latestRecordByFriend.size === 0) return feedByFriend;

  const latestAuthorIds = Array.from(latestRecordByFriend.keys());
  const latestDayIndices = Array.from(new Set(
    Array.from(latestRecordByFriend.values(), (record) => record.dayIndex),
  ));
  const { data: likes, error: likeError } = await supabase
    .from('one_verse_likes')
    .select('liker_id, author_id, day_index, profiles!liker_id(name, nickname)')
    .in('author_id', latestAuthorIds)
    .in('day_index', latestDayIndices);

  if (likeError) {
    console.error('getFriendsFeed likes error:', likeError);
  }

  const likesByVerse = new Map<string, NonNullable<typeof likes>>();
  for (const like of likes ?? []) {
    if (!like.author_id) continue;
    const key = `${like.author_id}:${like.day_index}`;
    const recordLikes = likesByVerse.get(key) ?? [];
    recordLikes.push(like);
    likesByVerse.set(key, recordLikes);
  }

  for (const [friendId, record] of Array.from(latestRecordByFriend.entries())) {
    const friend = profileById.get(friendId);
    if (!friend) continue;

    const recordLikes = likesByVerse.get(`${friendId}:${record.dayIndex}`) ?? [];
    feedByFriend[friendId] = [{
      user_id: friendId,
      name: friend.name,
      avatar_url: friend.avatar_url,
      nickname: friend.nickname,
      day_index: record.dayIndex,
      read_date: record.readDate,
      completed_at: record.completedAt,
      one_verse: record.oneVerse,
      like_count: recordLikes.length,
      is_liked_by_me: recordLikes.some((like) => like.liker_id === currentUserId),
      liked_by_users: recordLikes.flatMap((like) => {
        if (!like.liker_id) return [];
        const profile = Array.isArray(like.profiles) ? like.profiles[0] : like.profiles;
        return [{
          id: like.liker_id,
          name: profile?.nickname || profile?.name || '알 수 없음',
        }];
      }),
    }];
  }

  return feedByFriend;
}

// 3. 친구 정보 단건 조회
export async function getFriendProfile(friendId: string): Promise<FriendProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', friendId)
    .maybeSingle();

  if (error || !data) {
    console.error("getFriendProfile error:", error);
    return null;
  }

  return {
    id: data.id,
    name: data.name || '친구',
    avatar_url: data.avatar_url || '',
    nickname: data.nickname || undefined
  };
}

export interface FriendStats {
  totalReadDays: number;
  memorizedCount: number;
}

export interface FriendDetail {
  profile: FriendProfile | null;
  records: FriendFeedItem[];
  stats: FriendStats;
}

function buildFriendStats(records: { one_verse: Json | null }[]): FriendStats {
  return {
    totalReadDays: records.length,
    memorizedCount: records.filter((record) => parseOneVerse(record.one_verse)?.isMemorized).length,
  };
}

// 상세 화면은 읽기 기록을 한 번만 가져와 One Verse 목록과 통계를 함께 구성한다.
export async function getFriendDetail(friendId: string, currentUserId?: string): Promise<FriendDetail> {
  const myUserId = currentUserId ?? await getUserId();
  const [profile, recordsResult, likesResult] = await Promise.all([
    getFriendProfile(friendId),
    supabase
      .from('reading_records')
      .select('user_id, day_index, read_date, completed_at, one_verse')
      .eq('user_id', friendId)
      .order('completed_at', { ascending: false }),
    supabase
      .from('one_verse_likes')
      .select('liker_id, author_id, day_index, profiles!liker_id(name, nickname)')
      .eq('author_id', friendId),
  ]);

  if (recordsResult.error || !recordsResult.data) {
    console.error("getFriendDetail records error:", recordsResult.error);
    return { profile, records: [], stats: { totalReadDays: 0, memorizedCount: 0 } };
  }
  if (likesResult.error) console.error("getFriendDetail likes error:", likesResult.error);

  const allRecords = recordsResult.data;
  const stats = buildFriendStats(allRecords);
  const likesByDay = new Map<number, NonNullable<typeof likesResult.data>>();
  for (const like of likesResult.data ?? []) {
    const dayLikes = likesByDay.get(like.day_index) ?? [];
    dayLikes.push(like);
    likesByDay.set(like.day_index, dayLikes);
  }

  const friendName = profile?.name || '친구';
  const friendAvatar = profile?.avatar_url || '';
  const friendNickname = profile?.nickname;
  const feedItems: FriendFeedItem[] = allRecords
    .filter((record) => record.one_verse !== null && record.completed_at !== null)
    .slice(0, 50)
    .flatMap(record => {
    const oneVerse = parseOneVerse(record.one_verse);
    if (!oneVerse || !record.completed_at) return [];

    const recordLikes = likesByDay.get(record.day_index) ?? [];
    const isLikedByMe = myUserId ? recordLikes.some(l => l.liker_id === myUserId) : false;
    const likedByUsers = recordLikes.flatMap(l => {
      if (!l.liker_id) return [];
      const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
      return {
        id: l.liker_id,
        name: p?.nickname || p?.name || '알 수 없음'
      };
    });

    return {
      user_id: record.user_id,
      name: friendName,
      avatar_url: friendAvatar,
      nickname: friendNickname,
      day_index: record.day_index,
      read_date: record.read_date,
      completed_at: record.completed_at,
      one_verse: oneVerse,
      like_count: recordLikes.length,
      is_liked_by_me: isLikedByMe,
      liked_by_users: likedByUsers
    };
  });

  return { profile, records: feedItems, stats };
}

// 5. 아멘 토글
export async function toggleLike(authorId: string, dayIndex: number, currentUserId?: string): Promise<boolean> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return false;

  const { data, error: selectError } = await supabase
    .from('one_verse_likes')
    .select('id')
    .eq('liker_id', userId)
    .eq('author_id', authorId)
    .eq('day_index', dayIndex)
    .maybeSingle();

  if (selectError) {
    console.error("toggleLike select error:", selectError);
    return false;
  }

  if (data) {
    const { error: deleteError } = await supabase
      .from('one_verse_likes')
      .delete()
      .eq('id', data.id);
    if (deleteError) return false;
  } else {
    const { error: insertError } = await supabase
      .from('one_verse_likes')
      .insert({
        liker_id: userId,
        author_id: authorId,
        day_index: dayIndex
      });
    if (insertError) return false;
  }
  
  return true;
}
