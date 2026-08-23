"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X, Search, UserPlus, Check, X as RejectIcon, UserCheck, Flame, BookOpen, Heart } from "lucide-react";
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

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "search">("friends");
  
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<{ id: string; profile: FriendProfile }[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [friendsFeed, setFriendsFeed] = useState<Record<string, FriendFeedItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
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
          return {
            ...rec,
            is_liked_by_me: !rec.is_liked_by_me,
            like_count: rec.is_liked_by_me ? Math.max(0, rec.like_count - 1) : rec.like_count + 1
          };
        }
        return rec;
      });

      return { ...prev, [friendId]: newFeed };
    });

    const success = await toggleLike(friendId, item.day_index);
    if (!success) {
      console.error("좋아요 처리 실패");
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-stone-50 dark:bg-stone-950 flex flex-col pb-20">
      <div className="w-full max-w-2xl mx-auto flex flex-col h-full">
        {/* 헤더 */}
        <header className="sticky top-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md pt-6 pb-4 px-6 border-b border-stone-200/50 dark:border-stone-800/50 flex items-center justify-between w-full">
          <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
            친구 탭
          </h1>
        </header>

        <div className="flex px-4 pt-2 border-b border-stone-100 dark:border-stone-800">
          <button 
            onClick={() => setActiveTab("friends")}
            className={`flex-1 pb-3 font-semibold border-b-2 transition-colors ${activeTab === "friends" ? "border-stone-800 text-stone-800 dark:border-stone-200 dark:text-stone-200" : "border-transparent text-stone-400 hover:text-stone-600"}`}
          >
            내 친구 ({friends.length})
          </button>
          <button 
            onClick={() => setActiveTab("requests")}
            className={`flex-1 pb-3 font-semibold border-b-2 transition-colors relative ${activeTab === "requests" ? "border-stone-800 text-stone-800 dark:border-stone-200 dark:text-stone-200" : "border-transparent text-stone-400 hover:text-stone-600"}`}
          >
            요청 대기
            {requests.length > 0 && (
              <span className="absolute top-0 right-4 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab("search")}
            className={`flex-1 pb-3 font-semibold border-b-2 transition-colors ${activeTab === "search" ? "border-stone-800 text-stone-800 dark:border-stone-200 dark:text-stone-200" : "border-transparent text-stone-400 hover:text-stone-600"}`}
          >
            친구 찾기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-50 dark:bg-stone-950">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-stone-400">로딩 중...</div>
          ) : (
            <>
              {/* 내 친구 탭 */}
              {activeTab === "friends" && (
                <div className="flex flex-col gap-4">
                  {friends.length === 0 ? (
                    <div className="text-center text-stone-500 py-10">
                      아직 등록된 친구가 없습니다. <br/>[친구 찾기]에서 닉네임으로 검색해보세요!
                    </div>
                  ) : (
                    friends.map(friend => (
                      <div key={friend.id} className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col gap-3">
                        <Link href={`/friend/${friend.id}`} className="flex items-center gap-3 cursor-pointer group">
                          <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden flex-shrink-0 group-hover:ring-2 ring-sky-500 transition-all">
                            {friend.avatar_url ? (
                              <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400">
                                <UserCheck size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-stone-800 dark:text-stone-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{friend.nickname || friend.name}</div>
                          </div>
                        </Link>
                        
                        {/* 최신 One Verse 노출 */}
                        {friendsFeed[friend.id] && friendsFeed[friend.id].length > 0 ? (
                          <div className="mt-2 p-3 bg-stone-50 dark:bg-stone-950 rounded-xl text-sm text-stone-600 dark:text-stone-300 border border-stone-100 dark:border-stone-800 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sky-600 dark:text-sky-400 text-xs">{friendsFeed[friend.id][0].one_verse.reference}</span>
                              <span className="text-xs text-stone-400">Day {friendsFeed[friend.id][0].day_index}</span>
                            </div>
                            <p className="font-semibold text-stone-700 dark:text-stone-200">
                              &quot;{friendsFeed[friend.id][0].one_verse.displayText || friendsFeed[friend.id][0].one_verse.text}&quot;
                            </p>
                            
                            {/* 좋아요 버튼 연동 */}
                            <div className="flex justify-end pt-1 mt-1 border-t border-stone-200 dark:border-stone-800/50">
                              <button 
                                onClick={() => handleLike(friend.id, friendsFeed[friend.id][0])}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                                  friendsFeed[friend.id][0].is_liked_by_me 
                                    ? "bg-red-50 dark:bg-red-950/30 text-red-500" 
                                    : "bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700"
                                }`}
                              >
                                <Heart size={16} fill={friendsFeed[friend.id][0].is_liked_by_me ? "currentColor" : "none"} />
                                <span className="text-xs font-bold">{friendsFeed[friend.id][0].like_count > 0 ? friendsFeed[friend.id][0].like_count : '좋아요'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-stone-400">아직 기록이 없습니다.</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 요청 대기 탭 */}
              {activeTab === "requests" && (
                <div className="flex flex-col gap-3">
                  {requests.length === 0 ? (
                    <div className="text-center text-stone-500 py-10">받은 친구 요청이 없습니다.</div>
                  ) : (
                    requests.map(req => (
                      <div key={req.id} className="bg-white dark:bg-stone-900 p-4 rounded-xl shadow-sm border border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                            {req.profile.avatar_url && <img src={req.profile.avatar_url} alt={req.profile.name} className="w-full h-full object-cover" />}
                          </div>
                          <div className="font-bold text-stone-800 dark:text-stone-100">{req.profile.nickname || req.profile.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRespondRequest(req.id, true)} className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-full">
                            <Check size={18} />
                          </button>
                          <button onClick={() => handleRespondRequest(req.id, false)} className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-full">
                            <RejectIcon size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 친구 찾기 탭 */}
              {activeTab === "search" && (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="친구의 닉네임을 입력하세요" 
                      className="flex-1 px-4 py-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button 
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="px-4 bg-stone-800 text-white rounded-xl hover:bg-stone-900 transition-colors"
                    >
                      <Search size={20} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-4">
                    {searchResults.length === 0 && searchQuery !== "" && !isSearching && (
                      <div className="text-center text-stone-500">검색 결과가 없습니다.</div>
                    )}
                    {searchResults.map(user => {
                      const isAlreadyFriend = friends.some(f => f.id === user.id);
                      const isPendingRequest = sentRequests.includes(user.id);
                      
                      return (
                        <div key={user.id} className="bg-white dark:bg-stone-900 p-4 rounded-xl shadow-sm border border-stone-100 dark:border-stone-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                              {user.avatar_url && <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />}
                            </div>
                            <div className="font-bold text-stone-800 dark:text-stone-100">{user.nickname || user.name}</div>
                          </div>
                          
                          {isAlreadyFriend ? (
                            <span className="px-3 py-1.5 flex items-center gap-1 text-sm font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                              <Check size={16} /> 친구 완료
                            </span>
                          ) : isPendingRequest ? (
                            <button disabled className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-400 font-semibold text-sm rounded-lg flex items-center gap-1 cursor-not-allowed">
                              요청 대기 중
                            </button>
                          ) : (
                            <button onClick={() => handleSendRequest(user.id)} className="px-3 py-1.5 bg-sky-100 text-sky-700 hover:bg-sky-200 font-semibold text-sm rounded-lg flex items-center gap-1">
                              <UserPlus size={16} /> 친구 추가
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
