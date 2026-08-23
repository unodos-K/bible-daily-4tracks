"use client";

import React, { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { getFriendsFeed, toggleLike, FriendFeedItem } from "@/lib/social";
import { getAuthUser, AuthUser } from "@/lib/auth";

export default function FriendsFeed() {
  const [feedItems, setFeedItems] = useState<FriendFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;
    
    getAuthUser().then(user => {
      if (!mounted) return;
      setAuthUser(user);
      if (user) {
        getFriendsFeed().then(items => {
          if (mounted) {
            setFeedItems(items);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, []);

  const handleLike = async (item: FriendFeedItem) => {
    if (!authUser) return;

    // 낙관적 업데이트
    setFeedItems(prev => prev.map(feedItem => {
      if (feedItem.user_id === item.user_id && feedItem.day_index === item.day_index) {
        return {
          ...feedItem,
          is_liked_by_me: !feedItem.is_liked_by_me,
          like_count: feedItem.is_liked_by_me ? feedItem.like_count - 1 : feedItem.like_count + 1
        };
      }
      return feedItem;
    }));

    // 실제 API 호출
    const success = await toggleLike(item.user_id, item.day_index);
    
    // 실패 시 롤백 (여기서는 복잡성을 줄이기 위해 생략하거나 재조회할 수 있습니다)
    if (!success) {
      console.error("좋아요 처리 실패");
      // 필요 시 원래 상태로 복구
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-stone-400" size={24} />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="text-center py-12 text-stone-500">
        로그인 후 친구들의 피드를 확인할 수 있습니다.
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm mt-4">
        <p>아직 친구들의 기록이 없습니다.</p>
        <p className="text-sm mt-2 opacity-80">초대 버튼을 눌러 친구를 초대해 보세요!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-4">
      {feedItems.map((item, idx) => (
        <div key={`${item.user_id}-${item.day_index}-${idx}`} className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-sm font-bold text-stone-500">
                👤
              </div>
              <div>
                <p className="font-bold text-sm text-stone-800 dark:text-stone-200">{item.name}</p>
                <p className="text-xs text-stone-400">Day {item.day_index} • {new Date(item.completed_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-stone-50 dark:bg-stone-950 p-4 rounded-xl border border-stone-100 dark:border-stone-800">
            <p className="text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">{item.one_verse?.reference}</p>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-semibold">
              {item.one_verse?.displayText}
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button 
              onClick={() => handleLike(item)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                item.is_liked_by_me 
                  ? "bg-red-50 dark:bg-red-950/30 text-red-500" 
                  : "bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700"
              }`}
            >
              <Heart size={16} fill={item.is_liked_by_me ? "currentColor" : "none"} />
              <span className="text-xs font-bold">{item.like_count > 0 ? item.like_count : '좋아요'}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
