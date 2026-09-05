import React from "react";
import { Check, X as RejectIcon } from "lucide-react";
import { FriendProfile } from "@/lib/social";
import AvatarImage from "@/components/AvatarImage";

interface FriendRequestListProps {
  requests: { id: string; profile: FriendProfile }[];
  handleRespondRequest: (requesterId: string, accept: boolean) => void;
  handleTouchStart: (id: string) => void;
  handleTouchEnd: () => void;
}

export default function FriendRequestList({
  requests,
  handleRespondRequest,
  handleTouchStart,
  handleTouchEnd
}: FriendRequestListProps) {
  if (requests.length === 0) {
    return (
      <div data-v2-empty-state className="text-center text-stone-500 py-10">
        받은 친구 요청이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map(req => (
        <article
          data-v2-friend-card
          key={req.id} 
          className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col gap-3 group"
          onTouchStart={() => handleTouchStart(req.id)}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden flex-shrink-0">
                {req.profile.avatar_url && (
                  <AvatarImage src={req.profile.avatar_url} alt={req.profile.name} size={48} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-stone-800 dark:text-stone-100 break-words">
                  {(req.profile.nickname || req.profile.name).split('#')[0]}
                </span>
                {req.profile.nickname?.includes('#') && (
                  <span className="text-sm font-medium text-stone-500 mt-0.5">
                    #{req.profile.nickname.split('#')[1]}
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs font-medium text-stone-400 shrink-0 ml-2">
              {req.profile.name}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <button onClick={() => handleRespondRequest(req.id, false)} className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2.5 font-bold text-sm bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors">
              <RejectIcon size={18} /> 거절
            </button>
            <button onClick={() => handleRespondRequest(req.id, true)} className="relative flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2.5 font-bold text-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl transition-colors">
              <Check size={18} /> 수락
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-stone-50 dark:ring-stone-900 animate-pulse"></span>
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
