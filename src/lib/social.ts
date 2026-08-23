import { supabase } from "./supabase";
import { getUserId } from "./storage";

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
  one_verse: any; // from OneVerse type
  like_count: number;
  is_liked_by_me: boolean;
}

// 1. 친구 추가 (쌍방향 upsert)
export async function addFriend(friendId: string): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  
  if (userId === friendId) return false; // 자기 자신을 친구로 추가할 수 없음

  // 양방향으로 레코드 생성
  const { error } = await supabase.from('friendships').upsert([
    { user_id: userId, friend_id: friendId },
    { user_id: friendId, friend_id: userId }
  ], { onConflict: 'user_id, friend_id' });

  if (error) {
    console.error("addFriend error:", error);
    return false;
  }
  return true;
}

// 2. 내 친구 목록 가져오기 (profiles 테이블과 조인)
export async function getFriendsList(): Promise<FriendProfile[]> {
  const userId = await getUserId();
  if (!userId) return [];

  // Step 1: 현재 유저의 친구 관계 데이터만 단순하게 조회
  const { data: friendships, error: friendError } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId);

  if (friendError || !friendships) {
    console.error("getFriendsList friend error:", friendError);
    return [];
  }

  // Step 2: friend_id 배열 추출
  const friendIds = friendships.map(f => f.friend_id);
  if (friendIds.length === 0) return [];

  // Step 3: profiles 테이블에서 친구들의 닉네임과 아바타 정보 조회
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, nickname')
    .in('id', friendIds);

  if (profileError || !profiles) {
    console.error("getFriendsList profile error:", profileError);
    return [];
  }

  // 두 데이터를 조합하여 친구 목록 반환
  const friendsMap = new Map<string, FriendProfile>();
  for (const p of profiles) {
    friendsMap.set(p.id, {
      id: p.id,
      name: p.name || '친구',
      avatar_url: p.avatar_url || '',
      nickname: p.nickname || undefined
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

// 4. 특정 친구의 One Verse 기록 조회 (좋아요 상태 포함)
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

  // 좋아요 데이터 가져오기
  const { data: likes, error: likeError } = await supabase
    .from('one_verse_likes')
    .select('liker_id, author_id, day_index')
    .eq('author_id', friendId);

  // 친구 프로필 가져오기
  const profile = await getFriendProfile(friendId);
  const friendName = profile?.name || '친구';
  const friendAvatar = profile?.avatar_url || '';
  const friendNickname = profile?.nickname;

  const feedItems: FriendFeedItem[] = records.map(record => {
    const recordLikes = likes ? likes.filter(l => l.day_index === record.day_index) : [];
    const isLikedByMe = myUserId ? recordLikes.some(l => l.liker_id === myUserId) : false;

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
      is_liked_by_me: isLikedByMe
    };
  });

  return feedItems;
}

// 5. 좋아요 토글
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
