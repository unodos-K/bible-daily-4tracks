import { supabase } from "./supabase";
import { getUserId } from "./storage";

export interface FriendFeedItem {
  user_id: string;
  name: string;
  avatar_url: string;
  day_index: number;
  read_date: string;
  completed_at: string;
  one_verse: any; // from OneVerse type
  like_count: number;
  is_liked_by_me: boolean;
}

// 1. 친구 추가 (단방향/상호 자유롭지만 여기서는 내가 상대를 팔로우)
export async function addFriend(friendId: string): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  
  if (userId === friendId) return false; // 자기 자신을 친구로 추가할 수 없음

  const { error } = await supabase.from('friendships').upsert({
    user_id: userId,
    friend_id: friendId
  }, { onConflict: 'user_id, friend_id' });

  if (error) {
    console.error("addFriend error:", error);
    return false;
  }
  return true;
}

// 2. 좋아요 토글
export async function toggleLike(authorId: string, dayIndex: number): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;

  // 좋아요가 이미 있는지 확인
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
    // 좋아요 취소 (삭제)
    const { error: deleteError } = await supabase
      .from('one_verse_likes')
      .delete()
      .eq('id', data.id);
    if (deleteError) {
      console.error("toggleLike delete error:", deleteError);
      return false;
    }
  } else {
    // 좋아요 추가
    const { error: insertError } = await supabase
      .from('one_verse_likes')
      .insert({
        liker_id: userId,
        author_id: authorId,
        day_index: dayIndex
      });
    if (insertError) {
      console.error("toggleLike insert error:", insertError);
      return false;
    }
  }
  
  return true;
}

// 3. 친구 피드 조회
// auth.users 테이블 조인이 불가능할 수 있으므로 (보안 상), 프로필 테이블이 따로 없으면 
// 앱에서 처리하거나 임시로 카카오 프로필 등을 별도 테이블에 저장해야 합니다.
// 하지만 Supabase는 기본적으로 auth.users 조인을 지원하지 않습니다 (auth schema 접근 불가 제한).
// 이를 해결하기 위해 일단 reading_records 만 가져오고 이름은 fallback 처리합니다.
// (실제 프로덕션에서는 public.profiles 테이블을 만들어서 trigger로 동기화하는 것이 정석입니다.)
export async function getFriendsFeed(): Promise<FriendFeedItem[]> {
  const userId = await getUserId();
  if (!userId) return [];

  // 내 친구들의 목록 가져오기
  const { data: friendships, error: friendError } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId);

  if (friendError || !friendships) {
    console.error("getFriendsFeed friend error:", friendError);
    return [];
  }

  const friendIds = friendships.map(f => f.friend_id);
  if (friendIds.length === 0) return [];

  // 친구들의 One Verse 기록 가져오기 (최신순)
  const { data: records, error: recordError } = await supabase
    .from('reading_records')
    .select('*')
    .in('user_id', friendIds)
    .not('one_verse', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(50);

  if (recordError || !records) {
    console.error("getFriendsFeed record error:", recordError);
    return [];
  }

  // 모든 좋아요 데이터 가져오기 (피드에 표시된 기록들에 대해서)
  // 현실적으로는 IN 쿼리나 서버사이드 뷰가 좋지만, 여기서는 간단히 전체 조회를 활용
  const authorIds = Array.from(new Set(records.map(r => r.user_id)));
  const { data: likes, error: likeError } = await supabase
    .from('one_verse_likes')
    .select('liker_id, author_id, day_index')
    .in('author_id', authorIds);

  const feedItems: FriendFeedItem[] = records.map(record => {
    const recordLikes = likes ? likes.filter(l => l.author_id === record.user_id && l.day_index === record.day_index) : [];
    const isLikedByMe = recordLikes.some(l => l.liker_id === userId);

    return {
      user_id: record.user_id,
      name: "익명의 친구", // Profile table needed for real names
      avatar_url: "",
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
