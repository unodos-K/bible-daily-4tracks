import React from "react";
import Link from "next/link";
import { UserCheck } from "lucide-react";
import { FriendProfile, FriendFeedItem } from "@/lib/social";
import LikeButton from "./LikeButton";

interface FriendListWidgetProps {
  friends: FriendProfile[];
  friendsFeed: Record<string, FriendFeedItem[]>;
  handleLike: (friendId: string, item: FriendFeedItem) => void;
  handleTouchStart: (id: string) => void;
  handleTouchEnd: () => void;
}

export default function FriendListWidget({
  friends,
  friendsFeed,
  handleLike,
  handleTouchStart,
  handleTouchEnd
}: FriendListWidgetProps) {
  if (friends.length === 0) {
    return (
      <div className="text-center text-stone-500 py-10">
        아직 등록된 친구가 없습니다. <br/>[친구 찾기]에서 닉네임으로 검색해보세요!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {friends.map(friend => (
        <div 
          key={friend.id} 
          className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col gap-3 group"
          onTouchStart={() => handleTouchStart(friend.id)}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <Link href={`/friend/${friend.id}`} className="flex flex-col gap-3 cursor-pointer group/link">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden flex-shrink-0 group-hover/link:ring-2 ring-sky-500 transition-all">
                  {friend.avatar_url ? (
                    <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <UserCheck size={24} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg text-stone-800 dark:text-stone-100 group-hover/link:text-sky-600 dark:group-hover/link:text-sky-400 transition-colors break-words">
                    {(friend.nickname || friend.name).split('#')[0]}
                  </span>
                  {friend.nickname?.includes('#') && (
                    <span className="text-sm font-medium text-stone-500 mt-0.5">
                      #{friend.nickname.split('#')[1]}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs font-medium text-stone-400 shrink-0 ml-2">
                {friend.name}
              </div>
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
                {friendsFeed[friend.id][0].one_verse.displayText || friendsFeed[friend.id][0].one_verse.rawText}
              </p>
              
              {/* 좋아요 버튼 연동 */}
              <div className="flex justify-end pt-1 mt-1 border-t border-stone-200 dark:border-stone-800/50">
                <LikeButton item={friendsFeed[friend.id][0]} onLike={() => handleLike(friend.id, friendsFeed[friend.id][0])} />
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-stone-400">아직 기록이 없습니다.</div>
          )}
        </div>
      ))}
    </div>
  );
}
