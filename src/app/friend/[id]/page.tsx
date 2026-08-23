"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Heart, Loader2, ChevronLeft } from "lucide-react";
import { getFriendRecords, getFriendProfile, toggleLike, getFriendStats, FriendFeedItem, FriendProfile } from "@/lib/social";
import { getAuthUser, AuthUser } from "@/lib/auth";

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const friendId = params.id as string;

  const [records, setRecords] = useState<FriendFeedItem[]>([]);
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [stats, setStats] = useState<{ totalReadDays: number, memorizedCount: number }>({ totalReadDays: 0, memorizedCount: 0 });
  const [thisMonthRecords, setThisMonthRecords] = useState<FriendFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!friendId) return;

    getAuthUser().then(user => {
      if (!mounted) return;
      setAuthUser(user);

      Promise.all([
        getFriendProfile(friendId),
        getFriendRecords(friendId),
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
    });

    return () => { mounted = false; };
  }, [friendId]);

  const handleLike = async (item: FriendFeedItem) => {
    if (!authUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    // 낙관적 업데이트
    setRecords(prev => prev.map(rec => {
      if (rec.day_index === item.day_index) {
        return {
          ...rec,
          is_liked_by_me: !rec.is_liked_by_me,
          like_count: rec.is_liked_by_me ? Math.max(0, rec.like_count - 1) : rec.like_count + 1
        };
      }
      return rec;
    }));

    const success = await toggleLike(friendId, item.day_index);
    if (!success) {
      console.error("좋아요 처리 실패");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex justify-center items-center">
        <Loader2 className="animate-spin text-stone-400" size={32} />
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

  return (
    <div className="w-full min-h-screen flex flex-col bg-stone-100/50 dark:bg-stone-950 pb-32">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center px-4 h-14 max-w-2xl mx-auto w-full">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100 ml-2">
            친구 묵상 기록
          </h1>
        </div>
      </header>

      <main className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-4 sm:p-8 mt-4">
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
            <p className="text-stone-400 dark:text-stone-500 text-xs mt-1">카카오 연동 이름: {profile.name}</p>
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
              <span className="text-sm font-bold text-stone-600 dark:text-stone-300">뇌새김 암송 완료</span>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full">
                👑 {stats.memorizedCount}구절
              </span>
            </div>
          </div>
        </div>

        {/* 이번 달 One Verse 아카이브 */}
        <div className="flex flex-col gap-4 mt-2">
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 px-1">
            📅 이번 달 One Verse 모음
          </h3>
          {thisMonthRecords.length === 0 ? (
            <div className="text-center py-12 text-stone-500 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
              <p>이번 달에 기록한 One Verse가 없습니다.</p>
            </div>
          ) : (
            thisMonthRecords.map((record) => (
              <div key={record.day_index} className="bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-stone-800 dark:text-stone-200">Day {record.day_index}</p>
                    <p className="text-xs text-stone-400">• {new Date(record.completed_at).toLocaleDateString()}</p>
                  </div>
                  {record.one_verse?.isMemorized && (
                    <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      👑 암송
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
                  <button 
                    onClick={() => handleLike(record)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                      record.is_liked_by_me 
                        ? "bg-red-50 dark:bg-red-950/30 text-red-500" 
                        : "bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700"
                    }`}
                  >
                    <Heart size={16} fill={record.is_liked_by_me ? "currentColor" : "none"} />
                    <span className="text-xs font-bold">{record.like_count > 0 ? record.like_count : '좋아요'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* 이전 기록 보기 (추후 구현 가능) */}
        {records.length > thisMonthRecords.length && (
          <div className="text-center mt-4">
            <button className="text-sm font-semibold text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
              이전 기록 모두 보기 ({records.length - thisMonthRecords.length}개)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
