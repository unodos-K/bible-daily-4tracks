import React from "react";
import { Search, UserPlus, Check } from "lucide-react";
import { FriendProfile } from "@/lib/social";

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
  return (
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
            <div 
              key={user.id} 
              className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col gap-3 group"
              onTouchStart={() => handleTouchStart(user.id)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden flex-shrink-0">
                    {user.avatar_url && <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-lg text-stone-800 dark:text-stone-100 break-words">
                      {(user.nickname || user.name).split('#')[0]}
                    </span>
                    {user.nickname?.includes('#') && (
                      <span className="text-sm font-medium text-stone-500 mt-0.5">
                        #{user.nickname.split('#')[1]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs font-medium text-stone-400 shrink-0 ml-2">
                  {user.name}
                </div>
              </div>
              
              <div className="flex justify-end mt-2">
                {isAlreadyFriend ? (
                  <span className="w-full sm:w-auto flex justify-center items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <Check size={18} /> 친구 완료
                  </span>
                ) : isPendingRequest ? (
                  <button disabled className="w-full sm:w-auto flex justify-center items-center gap-1.5 px-4 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-400 font-bold text-sm rounded-xl cursor-not-allowed">
                    요청 대기중
                  </button>
                ) : (
                  <button onClick={() => handleSendRequest(user.id)} className="w-full sm:w-auto flex justify-center items-center gap-1.5 px-4 py-2.5 bg-sky-100 text-sky-700 hover:bg-sky-200 font-bold text-sm rounded-xl transition-colors">
                    <UserPlus size={18} /> 친구 추가
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
