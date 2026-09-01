import { supabase } from "./supabase";
import { getUserId, OneVerse } from "./storage";

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

// 1. 친구 검색 (닉네임 기준) 또는 전체 디렉토리 조회
export async function searchUsersByNickname(nickname: string): Promise<FriendProfile[]> {
  const userId = await getUserId();
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
export async function getSentRequests(): Promise<string[]> {
  const userId = await getUserId();
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
export async function sendFriendRequest(friendId: string): Promise<boolean> {
  const userId = await getUserId();
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
export async function getPendingRequests(): Promise<{ id: string; profile: FriendProfile }[]> {
  const userId = await getUserId();
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

  return data.map((row: { user_id: string; profiles: FriendProfile | FriendProfile[] }) => ({
    id: row.user_id,
    profile: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  }));
}

// 4. 친구 요청 수락/거절
export async function respondToFriendRequest(requesterId: string, accept: boolean): Promise<boolean> {
  const userId = await getUserId();
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
export async function getFriendsList(): Promise<FriendProfile[]> {
  const userId = await getUserId();
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

// 4. 특정 친구의 One Verse 기록 조회 (아멘 상태 포함)
export async function getFriendRecords(friendId: string): Promise<FriendFeedItem[]> {
  const myUserId = await getUserId();
  
  // 친구의 One Verse 기록 가져오기 (최신순)
  const { data: records, error: recordError } = await supabase
    .from('reading_records')
    .select('*')
    .eq('user_id', friendId)
    .not('one_verse', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(50);

  if (recordError || !records) {
    console.error("getFriendRecords error:", recordError);
    return [];
  }

  if (records.length === 0) return [];

  // 아멘 데이터 가져오기
  const { data: likes } = await supabase
    .from('one_verse_likes')
    .select('liker_id, author_id, day_index, profiles!liker_id(name, nickname)')
    .eq('author_id', friendId);

  // 친구 프로필 가져오기
  const profile = await getFriendProfile(friendId);
  const friendName = profile?.name || '친구';
  const friendAvatar = profile?.avatar_url || '';
  const friendNickname = profile?.nickname;

  const feedItems: FriendFeedItem[] = records.map(record => {
    const recordLikes = likes ? likes.filter(l => l.day_index === record.day_index) : [];
    const isLikedByMe = myUserId ? recordLikes.some(l => l.liker_id === myUserId) : false;
    const likedByUsers = recordLikes.map(l => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = Array.isArray(l.profiles) ? l.profiles[0] : (l.profiles as any);
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
      one_verse: record.one_verse,
      like_count: recordLikes.length,
      is_liked_by_me: isLikedByMe,
      liked_by_users: likedByUsers
    };
  });

  return feedItems;
}

// 4-1. 특정 친구의 통독 및 암송 통계 조회
export async function getFriendStats(friendId: string): Promise<{ totalReadDays: number, memorizedCount: number }> {
  const { data: records, error } = await supabase
    .from('reading_records')
    .select('one_verse')
    .eq('user_id', friendId);

  if (error || !records) {
    console.error("getFriendStats error:", error);
    return { totalReadDays: 0, memorizedCount: 0 };
  }

  const totalReadDays = records.length;
  const memorizedCount = records.filter(r => r.one_verse?.isMemorized).length;

  return { totalReadDays, memorizedCount };
}

// 5. 아멘 토글
export async function toggleLike(authorId: string, dayIndex: number): Promise<boolean> {
  const userId = await getUserId();
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
