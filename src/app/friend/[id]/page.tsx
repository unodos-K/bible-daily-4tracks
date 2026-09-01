"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Footprints, Loader2, Heart } from "lucide-react";
import { getFriendRecords, getFriendProfile, toggleLike, getFriendStats, FriendFeedItem, FriendProfile } from "@/lib/social";
import LikeButton from "@/components/friends/LikeButton";
import { useAuth } from "@/components/AuthProvider";

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const friendId = params.id as string;

  const [records, setRecords] = useState<FriendFeedItem[]>([]);
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [stats, setStats] = useState<{ totalReadDays: number, memorizedCount: number }>({ totalReadDays: 0, memorizedCount: 0 });
  const [thisMonthRecords, setThisMonthRecords] = useState<FriendFeedItem[]>([]);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [loading, setLoading] = useState(true);
  const { authUser, isAuthLoading } = useAuth();

  useEffect(() => {
    let mounted = true;
    if (!friendId || isAuthLoading) return () => { mounted = false; };
      Promise.all([
        getFriendProfile(friendId),
        getFriendRecords(friendId, authUser?.id),
        getFriendStats(friendId)
      ]).then(([prof, recs, st]) => {
        if (mounted) {
          setProfile(prof);
          setRecords(recs);
          setStats(st);
          
          const now = new Date();
          const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const monthly = recs.filter(r => r.read_date?.startsWith(currentMonthStr));
          setThisMonthRecords(monthly);
          
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [authUser, friendId, isAuthLoading]);

  const handleLike = async (item: FriendFeedItem) => {
    if (!authUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    // 낙관적 업데이트
    setRecords(prev => prev.map(rec => {
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
    }));

    const success = await toggleLike(friendId, item.day_index, authUser?.id);
    if (!success) {
      console.error("아멘 처리 실패");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-3 text-stone-500">
        <Loader2 className="animate-spin text-stone-400 w-8 h-8" />
        <span className="text-sm font-medium">데이터를 불러오는 중...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center pt-20">
        <p className="text-stone-500">친구 정보를 찾을 수 없습니다.</p>
        <button 
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-stone-200 dark:bg-stone-800 rounded-lg text-sm font-bold"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const displayedRecords = showAllRecords ? records : thisMonthRecords;
  const pastRecordsCount = records.length - thisMonthRecords.length;

  return (
    <div className="w-full min-h-screen flex flex-col bg-stone-100/50 dark:bg-stone-950 pb-32">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shrink-0">
        <div className="flex items-center px-4 h-14 max-w-2xl mx-auto w-full">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
            title="뒤로가기"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100 ml-2 flex items-center gap-2">
            <Footprints size={20} className="text-emerald-500" />
            친구 발자국
          </h1>
        </div>
      </header>

      <main className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-4 sm:p-8 mt-2">
        {/* 프로필 정보 섹션 */}
        <div className="flex flex-col items-center py-6 px-4">
          <div className="w-24 h-24 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden shadow-sm mb-4 flex items-center justify-center text-4xl">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span>👤</span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1">
            {(profile.nickname || profile.name || '이름 없는 순례자').split('#')[0]}
            {profile.nickname?.includes('#') && (
              <span className="text-xs font-normal text-stone-400">#{profile.nickname.split('#')[1]}</span>
            )}
          </h2>
          {profile.nickname && (
            <p className="text-stone-400 dark:text-stone-500 text-xs mt-1">{profile.name}</p>
          )}

          {/* 통독 현황 위젯 */}
          <div className="w-full mt-6 bg-white dark:bg-stone-900 rounded-2xl p-5 shadow-sm border border-stone-200 dark:border-stone-800">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-stone-600 dark:text-stone-300">전체 통독 현황</span>
              <span className="text-xs font-semibold text-stone-400">{stats.totalReadDays} / 365일 ({(stats.totalReadDays / 365 * 100).toFixed(1)}%)</span>
            </div>
            <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-500 dark:bg-sky-400 transition-all duration-1000 ease-out rounded-full" 
                style={{ width: `${Math.min(100, (stats.totalReadDays / 365) * 100)}%` }} 
              />
            </div>
            
            {/* 뇌새김(암송) 통계 */}
            <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center">
              <span className="text-sm font-bold text-stone-600 dark:text-stone-300">마음새김 완료</span>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full flex items-center gap-1">
                <Heart size={12} fill="currentColor" /> {stats.memorizedCount}구절
              </span>
            </div>
          </div>
        </div>

        {/* One Verse 아카이브 */}
        <div className="flex flex-col gap-4 mt-2">
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 px-1 flex items-center justify-between">
            <span>📅 {showAllRecords ? "전체 One Verse 모음" : "이번 달 One Verse 모음"}</span>
            <span className="text-xs font-normal text-stone-400">총 {records.length}개 중 {displayedRecords.length}개</span>
          </h3>
          {displayedRecords.length === 0 ? (
            <div className="text-center py-12 text-stone-500 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
              <p>남긴 발자국이 없어요.</p>
            </div>
          ) : (
            displayedRecords.map((record) => (
              <div key={record.day_index} className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-stone-800 dark:text-stone-200">Day {record.day_index}</p>
                    <p className="text-xs text-stone-400">• {new Date(record.completed_at).toLocaleDateString()}</p>
                  </div>
                  {record.one_verse?.isMemorized && (
                    <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Heart size={10} fill="currentColor" /> 마음 새김
                    </span>
                  )}
                </div>
                
                <div className="bg-stone-50 dark:bg-stone-950 p-4 rounded-xl border border-stone-100 dark:border-stone-800">
                  <p className="text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">{record.one_verse?.reference}</p>
                  <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-semibold">
                    {record.one_verse?.displayText}
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <LikeButton item={record} onLike={() => handleLike(record)} />
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* 이전 발자국 보기 */}
        {pastRecordsCount > 0 && (
          <div className="mt-2 px-1 mb-8">
            <button 
              onClick={() => setShowAllRecords(prev => !prev)}
              className="w-full py-3.5 bg-stone-200/70 hover:bg-stone-200 dark:bg-stone-800/80 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold rounded-xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {showAllRecords ? (
                <>이전 발자국 접기 🔼</>
              ) : (
                <>이전 발자국 모두 보기 ({pastRecordsCount}개 더보기) 🔽</>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
