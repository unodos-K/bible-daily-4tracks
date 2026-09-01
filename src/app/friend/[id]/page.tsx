"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Footprints, Loader2, Heart, Sparkles } from "lucide-react";
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
  const [visibleCount, setVisibleCount] = useState(3);
  const [loading, setLoading] = useState(true);
  const { authUser, isAuthLoading } = useAuth();
  
  const observerTargetRef = useRef<HTMLDivElement>(null);

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
          // day_index 내림차순 (최신순) 정렬 보장
          const sorted = [...recs].sort((a, b) => (b.day_index || 0) - (a.day_index || 0));
          setRecords(sorted);
          setStats(st);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [authUser, friendId, isAuthLoading]);

  // 스크롤 감지 Lazy Load (5개씩 추가)
  useEffect(() => {
    if (loading || records.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < records.length) {
          setVisibleCount((prev) => Math.min(prev + 5, records.length));
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [visibleCount, records.length, loading]);

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

  const visibleRecords = records.slice(0, visibleCount);
  const hasMore = visibleCount < records.length;

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

        {/* One Verse 아카이브 (최신순 3개 시작, 스크롤시 5개씩 추가) */}
        <div className="flex flex-col gap-4 mt-2">
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 px-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles size={18} className="text-amber-500" />
              최근 One Verse 발자국
            </span>
            <span className="text-xs font-normal text-stone-400">총 {records.length}개 중 {visibleRecords.length}개 표시</span>
          </h3>

          {visibleRecords.length === 0 ? (
            <div className="text-center py-12 text-stone-500 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
              <p>남긴 발자국이 없어요.</p>
            </div>
          ) : (
            visibleRecords.map((record) => (
              <div 
                key={record.day_index} 
                className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-200/80 dark:border-stone-800 flex flex-col gap-4 transition-all hover:shadow-md"
              >
                {/* 상단: 레퍼런스 및 마음새김 뱃지 */}
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40">
                    📖 {record.one_verse?.reference || `Day ${record.day_index}`}
                  </span>

                  {record.one_verse?.isMemorized && (
                    <span className="bg-amber-100/80 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-200 dark:border-amber-800/50">
                      <Heart size={11} fill="currentColor" /> 마음 새김
                    </span>
                  )}
                </div>

                {/* 중앙: 말씀 본문 텍스트 (가장 크고 또렷하게 강조) */}
                <blockquote className="text-stone-800 dark:text-stone-100 text-lg sm:text-xl font-bold leading-relaxed tracking-tight my-1 pl-1">
                  &ldquo;{record.one_verse?.displayText}&rdquo;
                </blockquote>

                {/* 하단: Day / 날짜 (서브 메타 정보) 및 좋아요 버튼 */}
                <div className="flex justify-between items-center pt-3 border-t border-stone-100 dark:border-stone-800/60">
                  <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
                    <span className="font-semibold text-stone-500 dark:text-stone-400">Day {record.day_index}</span>
                    <span>•</span>
                    <span>{new Date(record.completed_at).toLocaleDateString()}</span>
                  </div>

                  {/* 좋아요 버튼 유지 */}
                  <LikeButton item={record} onLike={() => handleLike(record)} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Lazy Load 스크롤 감지 타겟 및 더보기 안내 */}
        <div ref={observerTargetRef} className="py-6 flex flex-col items-center justify-center gap-2">
          {hasMore ? (
            <button
              onClick={() => setVisibleCount((prev) => Math.min(prev + 5, records.length))}
              className="px-5 py-2.5 bg-stone-200/60 hover:bg-stone-200 dark:bg-stone-800/60 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Loader2 size={14} className="animate-spin text-stone-400" />
              이전 발자국 5개 더 불러오는 중... (클릭 가능)
            </button>
          ) : records.length > 0 ? (
            <p className="text-xs text-stone-400 font-medium text-center">
              ✨ 모든 말씀 발자국을 불러왔습니다.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
