"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Footprints } from "lucide-react";
import { getFriendsList, FriendProfile } from "@/lib/social";
import { getAuthUser, AuthUser } from "@/lib/auth";

export default function FriendsList() {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;
    
    getAuthUser().then(user => {
      if (!mounted) return;
      setAuthUser(user);
      if (user) {
        getFriendsList().then(list => {
          if (mounted) {
            setFriends(list);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="animate-spin text-stone-400" size={24} />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="text-center py-8 text-stone-500 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm mt-4">
        로그인 후 친구 목록을 확인할 수 있습니다.
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm mt-4">
        <p>아직 등록된 친구가 없습니다.</p>
        <p className="text-sm mt-1 opacity-80">초대 버튼을 눌러 함께할 친구를 초대해 보세요!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 mt-4">
      {friends.map((friend) => (
        <Link 
          href={`/friend/${friend.id}`} 
          key={friend.id}
          className="flex items-center justify-between p-4 bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xl overflow-hidden shrink-0">
              {friend.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
              ) : (
                <span>👤</span>
              )}
            </div>
            <div>
              <p className="font-bold text-stone-800 dark:text-stone-100">{friend.nickname || friend.name || '이름 없는 순례자'}</p>
              <p className="text-xs text-stone-400 flex items-center gap-1"><Footprints size={12} /> 발자국 보기</p>
            </div>
          </div>
          <div className="text-stone-400">
            <span className="text-xl">👉</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
