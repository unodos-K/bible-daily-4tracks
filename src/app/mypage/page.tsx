"use client";

import React, { useEffect } from "react";
import { Settings, Footprints } from "lucide-react";
import {
  OneVerseRecord,
} from "@/lib/storage";
import { signInWithKakao } from "@/lib/supabase";
import { shareOneVerse } from "@/lib/share";
import ShareModal from "@/components/ShareModal";
import MemoryTrainerModal from "@/components/MemoryTrainerModal";

import { useMyPageStats } from "@/hooks/useMyPageStats";
import MyPageCalendar from "@/components/mypage/MyPageCalendar";
import MyPageStatsBoard from "@/components/mypage/MyPageStatsBoard";
import AvatarImage from "@/components/AvatarImage";
import { getLastRecordDay } from "@/lib/readingRecords";

export default function MyPage() {
  const stats = useMyPageStats();

  useEffect(() => {
    if (stats.isClient && Object.keys(stats.records).length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      const dayStr = urlParams.get('day');
      
      if (action === 'add-footprint') {
        if (dayStr) {
          stats.router.replace(`/memo?day=${dayStr}&mode=edit`);
        } else {
          const lastDay = getLastRecordDay(stats.records);
          stats.router.replace(`/memo?day=${lastDay}&mode=edit`);
        }
      }
    }
  }, [stats.isClient, stats.records, stats.router]);

  if (!stats.isClient || !stats.settings || !stats.settings.hasStarted) {
    return (
      <div className="min-h-[calc(100vh-52px)] bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-3 text-stone-500">
        <Footprints className="animate-pulse w-8 h-8" />
        <span className="text-sm font-medium">발자국을 확인하는 중...</span>
      </div>
    );
  }

  const handleDayClick = (dateStr: string) => {
    stats.router.push(`/verse/${dateStr}`);
  };

  // 달력은 완료 여부와 무관하게 최종 One Verse가 있는 기록을 표시한다.
  const oneVerseRecordsByDate: Record<string, OneVerseRecord[]> = {};
  for (const record of Object.values(stats.oneVerseRecords)) {
    if (!oneVerseRecordsByDate[record.readDate]) oneVerseRecordsByDate[record.readDate] = [];
    oneVerseRecordsByDate[record.readDate].push(record);
  }

  // 그룹 내에서 Day 순으로 정렬
  for (const date in oneVerseRecordsByDate) {
    oneVerseRecordsByDate[date].sort((a, b) => a.dayIndex - b.dayIndex);
  }

  // 달력 렌더링을 위한 데이터
  const year = stats.currentDate.getFullYear();
  const month = stats.currentDate.getMonth() + 1;

  // 이번 달 One Verse 필터링 로직
  const currentMonthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
  const thisMonthRecords = Object.values(stats.oneVerseRecords)
    .filter((record) => record.readDate.startsWith(currentMonthPrefix))
    .sort((a, b) => b.readDate.localeCompare(a.readDate) || b.dayIndex - a.dayIndex);

  const thisMonthTotal = thisMonthRecords.length;
  const thisMonthCompletedTotal = thisMonthRecords.filter((record) => record.completedAt !== null).length;
  const thisMonthMemorized = thisMonthRecords.filter(r => r.oneVerse?.isMemorized).length;

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 w-full flex-col items-center overflow-hidden bg-transparent">
      <div className="flex min-h-0 w-full max-w-2xl flex-1 flex-col">

        {/* 헤더 및 프로필 (고정 헤더) */}
        <header className="shrink-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md pt-6 pb-4 px-4 sm:px-6 border-b border-stone-200/50 dark:border-stone-800/50 flex flex-row items-center justify-between w-full gap-4">

          {/* 좌측 묶음: 타이틀과 유저 정보 (반응형 래퍼) */}
          <div className="flex flex-col items-start gap-2 min-w-0 flex-1 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg sm:text-2xl font-black text-stone-800 dark:text-stone-100 shrink-0 flex items-center gap-2">
              <Footprints size={24} className="text-emerald-500" />
              나의 발자국 보관소
            </h1>

            <div className="flex items-center min-w-0">
              {stats.authUser ? (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-stone-100 dark:bg-stone-800 rounded-full border border-stone-200 dark:border-stone-700 shadow-inner min-w-0">
                  <div className="w-5 h-5 rounded-full bg-stone-300 dark:bg-stone-700 flex items-center justify-center text-[10px] font-bold text-stone-600 dark:text-stone-300 overflow-hidden shrink-0">
                    {stats.authUser.avatar_url ? (
                      <AvatarImage src={stats.authUser.avatar_url} alt={stats.authUser.name} size={20} className="w-full h-full object-cover" />
                    ) : (
                      <span>{stats.authUser.name.substring(0, 1)}</span>
                    )}
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-stone-700 dark:text-stone-200 truncate">
                    {stats.authUser.nickname ? stats.authUser.nickname.split('#')[0] : stats.authUser.name.split('#')[0]}
                  </span>
                </div>
              ) : (
                <button
                  onClick={signInWithKakao}
                  className="text-xs sm:text-sm font-bold bg-[#FEE500] text-black hover:bg-[#FDD800] px-3 py-1.5 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                >
                  💬 카카오 로그인
                </button>
              )}
            </div>
          </div>

          {/* 우측 설정 버튼 */}
          <button
            onClick={() => stats.router.push("/settings")}
            className="p-2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full shadow-sm shrink-0"
            aria-label="환경 설정"
          >
            <Settings size={20} />
          </button>

        </header>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain flex flex-col gap-8 px-6 pt-6 pb-8 w-full">
          <MyPageCalendar
            currentDate={stats.currentDate}
            setCurrentDate={stats.setCurrentDate}
            year={year}
            month={month}
            settings={stats.settings}
            oneVerseRecordsByDate={oneVerseRecordsByDate}
            selectedRecordStr={stats.selectedRecordStr}
            handleDayClick={handleDayClick}
          />

          <MyPageStatsBoard
            year={year}
            month={month}
            thisMonthTotal={thisMonthTotal}
            thisMonthCompletedTotal={thisMonthCompletedTotal}
            thisMonthMemorized={thisMonthMemorized}
            thisMonthRecords={thisMonthRecords}
            router={stats.router}
            handleShareOneVerse={stats.handleShareOneVerse}
            onOpenMemory={stats.handleOpenMemory}
            likesMap={stats.likesMap}
            handleToggleLike={stats.handleToggleLike}
          />
        </div>
      </div>

      {/* 암송 트레이너 모달 연동 */}
      {stats.isMemoryModalOpen && stats.selectedOneVerseForMemory && (
        <MemoryTrainerModal
          oneVerse={stats.selectedOneVerseForMemory.oneVerse}
          onClose={stats.closeMemoryModal}
          onComplete={stats.handleMemoryComplete}
        />
      )}

      <ShareModal
        isOpen={!!stats.selectedRecordToShare}
        onClose={() => stats.setSelectedRecordToShare(null)}
        record={stats.selectedRecordToShare}
        onShare={(orderedItems) => {
          if (stats.selectedRecordToShare) {
            const nickname = stats.authUser ? (stats.authUser.nickname || stats.authUser.name).split('#')[0] : '순례자';
            shareOneVerse(stats.selectedRecordToShare, nickname, orderedItems);
          }
        }}
      />

      {stats.toastMessage && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-stone-800 text-white px-4 py-2 rounded-full shadow-lg z-[100] animate-fade-in-up text-sm whitespace-nowrap">
          {stats.toastMessage}
        </div>
      )}
    </div>
  );
}
