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
      <div className="text-center text-stone-500 py-10 text-sm">
        아직 등록된 친구가 없습니다. <br/>[친구 찾기]에서 닉네임으로 검색해보세요!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {friends.map(friend => {
        const latestFeed = friendsFeed[friend.id]?.[0];

        return (
          <div 
            key={friend.id} 
            className="bg-white dark:bg-stone-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-stone-200/70 dark:border-stone-800 flex flex-col gap-2.5 group transition-all"
            onTouchStart={() => handleTouchStart(friend.id)}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {/* 친구 헤더 */}
            <Link href={`/friend/${friend.id}`} className="flex items-center justify-between w-full group/link">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden flex-shrink-0 group-hover/link:ring-2 ring-sky-500 transition-all">
                  {friend.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <UserCheck size={18} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-bold text-sm sm:text-base text-stone-800 dark:text-stone-100 group-hover/link:text-sky-600 dark:group-hover/link:text-sky-400 transition-colors truncate">
                      {(friend.nickname || friend.name).split('#')[0]}
                    </span>
                    {friend.nickname?.includes('#') && (
                      <span className="text-xs font-normal text-stone-400 shrink-0">
                        #{friend.nickname.split('#')[1]}
                      </span>
                    )}
                  </div>
                  {friend.name && friend.nickname && (
                    <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 truncate">
                      카카오 이름: {friend.name}
                    </span>
                  )}
                </div>
              </div>

              <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 group-hover/link:underline shrink-0 ml-2">
                발자국 보기 &rsaquo;
              </span>
            </Link>
            
            {/* 최신 One Verse 노출 (심플 & 컴팩트) */}
            {latestFeed ? (
              <div className="p-3 bg-stone-50 dark:bg-stone-950/80 rounded-xl text-xs sm:text-sm border border-stone-100 dark:border-stone-800/80 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-sky-600 dark:text-sky-400">
                    📖 {latestFeed.one_verse?.reference || `Day ${latestFeed.day_index}`}
                  </span>
                  <span className="text-[11px] font-medium text-stone-400">
                    Day {latestFeed.day_index}
                  </span>
                </div>
                
                <p className="font-semibold text-stone-700 dark:text-stone-200 leading-relaxed text-xs sm:text-sm line-clamp-2">
                  &ldquo;{latestFeed.one_verse?.displayText || latestFeed.one_verse?.rawText}&rdquo;
                </p>
                
                {/* 아멘 버튼 연동 */}
                <div className="flex justify-end pt-1 mt-0.5 border-t border-stone-200/50 dark:border-stone-800/50">
                  <LikeButton item={latestFeed} onLike={() => handleLike(friend.id, latestFeed)} />
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-stone-400 py-1 pl-1">아직 남긴 발자국이 없습니다.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
