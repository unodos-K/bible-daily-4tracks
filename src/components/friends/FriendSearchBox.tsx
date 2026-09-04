import React from "react";
import { Search, User, UserPlus } from "lucide-react";
import { FriendProfile } from "@/lib/social";
import AvatarImage from "@/components/AvatarImage";

interface FriendSearchBoxProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: FriendProfile[];
  isSearching: boolean;
  friends: FriendProfile[];
  sentRequests: string[];
  handleSearch: () => void;
  handleSendRequest: (friendId: string) => void;
  handleTouchStart: (id: string) => void;
  handleTouchEnd: () => void;
}

export default function FriendSearchBox({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  friends,
  sentRequests,
  handleSearch,
  handleSendRequest,
  handleTouchStart,
  handleTouchEnd
}: FriendSearchBoxProps) {
  // 이미 친구 상태인 유저 제외 필터링
  const filteredResults = searchResults.filter(user => !friends.some(f => f.id === user.id));

  return (
    <div className="flex flex-col gap-4">
      {/* 검색창 */}
      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="친구의 닉네임을 입력하세요" 
          className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button 
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 bg-stone-800 hover:bg-stone-900 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-bold rounded-xl transition-colors text-sm flex items-center justify-center cursor-pointer"
        >
          <Search size={18} />
        </button>
      </div>
      
      {/* 검색 결과 리스트 */}
      <div className="flex flex-col gap-2.5 mt-2">
        {filteredResults.length === 0 && searchQuery !== "" && !isSearching && (
          <div className="text-center text-stone-500 text-sm py-8 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800">
            검색 결과가 없거나 이미 친구로 등록되어 있습니다.
          </div>
        )}

        {filteredResults.map(user => {
          const isPendingRequest = sentRequests.includes(user.id);
          
          return (
            <div 
              key={user.id} 
              className="bg-white dark:bg-stone-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-3 group transition-all"
              onTouchStart={() => handleTouchStart(user.id)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              {/* 유저 프로필 정보 (썸네일 + 닉네임 + 카카오 이름) */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <AvatarImage src={user.avatar_url} alt={user.name} size={40} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">
                      <User size={18} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-bold text-sm sm:text-base text-stone-800 dark:text-stone-100 truncate">
                      {(user.nickname || user.name).split('#')[0]}
                    </span>
                    {user.nickname?.includes('#') && (
                      <span className="text-xs font-normal text-stone-400 shrink-0">
                        #{user.nickname.split('#')[1]}
                      </span>
                    )}
                  </div>
                  {user.name && user.nickname && (
                    <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 truncate">
                      카카오 이름: {user.name}
                    </span>
                  )}
                </div>
              </div>
              
              {/* 친구 요청 / 상태 버튼 (우측 슬림 배치) */}
              <div className="shrink-0">
                {isPendingRequest ? (
                  <span className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-400 font-semibold text-xs rounded-lg select-none">
                    요청 대기중
                  </span>
                ) : (
                  <button 
                    onClick={() => handleSendRequest(user.id)} 
                    className="px-3 py-1.5 bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/60 dark:hover:bg-sky-900/80 text-sky-700 dark:text-sky-300 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus size={14} /> 친구 추가
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
