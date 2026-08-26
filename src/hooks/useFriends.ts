import { useState, useEffect, useRef } from "react";
import { 
  FriendProfile, 
  searchUsersByNickname, 
  sendFriendRequest, 
  getPendingRequests, 
  respondToFriendRequest, 
  getFriendsList,
  FriendFeedItem,
  getFriendRecords,
  toggleLike,
  getSentRequests
} from "@/lib/social";
import { getAuthUser, AuthUser } from "@/lib/auth";

export type TabType = "friends" | "requests" | "search";

export function useFriends() {
  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<{ id: string; profile: FriendProfile }[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [friendsFeed, setFriendsFeed] = useState<Record<string, FriendFeedItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [pressedId, setPressedId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    getAuthUser().then(user => setAuthUser(user));
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fList = await getFriendsList();
      setFriends(fList);
      
      const rList = await getPendingRequests();
      setRequests(rList);
      
      // Fetch sent requests
      const sentList = await getSentRequests();
      setSentRequests(sentList);

      // Fetch initial directory
      const directory = await searchUsersByNickname("");
      setSearchResults(directory);

      // Fetch feed for friends
      const feeds: Record<string, FriendFeedItem[]> = {};
      for (const friend of fList) {
        const records = await getFriendRecords(friend.id);
        feeds[friend.id] = records;
      }
      setFriendsFeed(feeds);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };



  const handleInvite = async () => {
    if (!authUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    
    const inviteUrl = window.location.origin || process.env.NEXT_PUBLIC_BASE_URL || "";
    const shareData = {
      title: 'One Verse',
      text: '매일 말씀을 읽고 내게 주신 한 구절을 암송하세요\\n말씀읽기 & 뇌새김 말씀 암송',
      url: inviteUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("공유 실패:", err);
      }
    } else if (typeof window !== "undefined" && window.Kakao) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: shareData.title,
          description: shareData.text,
          imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=800&auto=format&fit=crop',
          link: {
            mobileWebUrl: inviteUrl,
            webUrl: inviteUrl,
          },
        },
        buttons: [
          {
            title: '함께 시작하기',
            link: {
              mobileWebUrl: inviteUrl,
              webUrl: inviteUrl,
            },
          },
        ],
      });
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\\n${shareData.url}`);
        alert("초대 링크가 클립보드에 복사되었습니다!");
      } catch {
        alert("공유 기능을 지원하지 않는 브라우저입니다.");
      }
    }
  };

  const handleCopyNickname = async () => {
    if (!authUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    const nickname = (authUser.nickname || authUser.name).split('#')[0];
    const textToCopy = `One Verse에서 저와 함께 말씀 통독을 해요! 제 닉네임은 ${nickname}입니다. (친구 탭에서 검색해 주세요!)`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert("클립보드에 복사되었습니다!");
    } catch {
      alert("복사에 실패했습니다.");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchUsersByNickname(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSendRequest = async (friendId: string) => {
    const success = await sendFriendRequest(friendId);
    if (success) {
      setSentRequests(prev => [...prev, friendId]);
    } else {
      alert("친구 요청에 실패했거나 이미 요청을 보낸 사용자입니다.");
    }
  };

  const handleRespondRequest = async (requesterId: string, accept: boolean) => {
    const success = await respondToFriendRequest(requesterId, accept);
    if (success) {
      alert(accept ? "친구 요청을 수락했습니다." : "친구 요청을 거절했습니다.");
      loadData(); // 리로드
      window.dispatchEvent(new CustomEvent('friend_requests_updated'));
    } else {
      alert("처리에 실패했습니다.");
    }
  };

  const handleLike = async (friendId: string, item: FriendFeedItem) => {
    // 낙관적 업데이트
    setFriendsFeed(prev => {
      const friendFeed = prev[friendId];
      if (!friendFeed) return prev;
      
      const newFeed = friendFeed.map(rec => {
        if (rec.day_index === item.day_index) {
          const isLiking = !rec.is_liked_by_me;
          let newLikedByUsers = [...(rec.liked_by_users || [])];
          if (isLiking && authUser) {
            newLikedByUsers.push({ id: authUser.id, name: authUser.name || '나' });
          } else if (!isLiking && authUser) {
            newLikedByUsers = newLikedByUsers.filter(u => u.id !== authUser.id);
          }
          return {
            ...rec,
            is_liked_by_me: isLiking,
            like_count: isLiking ? rec.like_count + 1 : Math.max(0, rec.like_count - 1),
            liked_by_users: newLikedByUsers
          };
        }
        return rec;
      });

      return { ...prev, [friendId]: newFeed };
    });

    const success = await toggleLike(friendId, item.day_index);
    if (!success) {
      console.error("좋아요 처리 실패, 롤백합니다.");
      // 롤백
      setFriendsFeed(prev => {
        const friendFeed = prev[friendId];
        if (!friendFeed) return prev;
        
        const newFeed = friendFeed.map(rec => {
          if (rec.day_index === item.day_index) {
            return {
              ...rec,
              is_liked_by_me: item.is_liked_by_me,
              like_count: item.like_count,
              liked_by_users: item.liked_by_users
            };
          }
          return rec;
        });

        return { ...prev, [friendId]: newFeed };
      });
    }
  };

  const handleTouchStart = (id: string) => {
    timerRef.current = setTimeout(() => {
      setPressedId(id);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressedId(null);
  };

  return {
    activeTab, setActiveTab,
    authUser,
    friends,
    requests,
    sentRequests,
    searchQuery, setSearchQuery,
    searchResults,
    isSearching,
    friendsFeed,
    isLoading,
    pressedId,
    handleTouchStart,
    handleTouchEnd,
    handleInvite,
    handleCopyNickname,
    handleSearch,
    handleSendRequest,
    handleRespondRequest,
    handleLike
  };
}
