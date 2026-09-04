"use client";

import React from "react";
import { BookOpen, CalendarDays } from "lucide-react";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { calculateDaysSince } from "@/hooks/bible-reader/dayUtils";
import { getReadingProgress } from "@/lib/readingRecords";
import MiniScheduleWidget from "@/components/home/MiniScheduleWidget";
import ReadingProgressWidget from "@/components/home/ReadingProgressWidget";
import ScheduleBottomSheet from "@/components/home/ScheduleBottomSheet";
import SplashScreen from "@/components/home/SplashScreen";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse">
      {/* 미니 스케줄 스켈레톤 */}
      <div className="bg-stone-100 dark:bg-stone-800 rounded-2xl p-5 flex flex-col shadow-sm border border-stone-200 dark:border-stone-700">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-stone-300 dark:bg-stone-700 rounded-full"></div>
            <div className="w-20 h-5 bg-stone-300 dark:bg-stone-700 rounded-md"></div>
          </div>
          <div className="w-16 h-6 bg-stone-300 dark:bg-stone-700 rounded-md"></div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4 mt-2">
          <div className="w-32 h-6 bg-stone-300 dark:bg-stone-700 rounded-md"></div>
          <div className="w-24 h-6 bg-stone-300 dark:bg-stone-700 rounded-md"></div>
        </div>
        <div className="w-24 h-4 bg-stone-300 dark:bg-stone-700 rounded-md self-end mt-2"></div>
      </div>

      {/* 요약 위젯 스켈레톤 */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <div className="w-20 h-4 bg-stone-200 dark:bg-stone-800 rounded-md mb-2"></div>
            <div className="w-28 h-8 bg-stone-200 dark:bg-stone-800 rounded-md"></div>
          </div>
          <div className="w-20 h-6 bg-stone-200 dark:bg-stone-800 rounded-full"></div>
        </div>
        <div className="w-full h-2.5 bg-stone-200 dark:bg-stone-800 rounded-full mt-1"></div>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-stone-100 dark:bg-stone-800 rounded-xl p-3 flex flex-col items-center justify-center h-20">
            <div className="w-16 h-3 bg-stone-200 dark:bg-stone-700 rounded-md mb-2"></div>
            <div className="w-16 h-5 bg-stone-200 dark:bg-stone-700 rounded-md"></div>
          </div>
          <div className="bg-stone-100 dark:bg-stone-800 rounded-xl p-3 flex flex-col items-center justify-center h-20">
            <div className="w-16 h-3 bg-stone-200 dark:bg-stone-700 rounded-md mb-2"></div>
            <div className="w-16 h-5 bg-stone-200 dark:bg-stone-700 rounded-md"></div>
          </div>
          <div className="bg-stone-100 dark:bg-stone-800 rounded-xl p-4 flex flex-col items-center justify-center col-span-2 h-16">
             <div className="w-48 h-4 bg-stone-200 dark:bg-stone-700 rounded-md"></div>
          </div>
        </div>
        
        {/* 주간 스트릭 스켈레톤 */}
        <div className="flex justify-between items-center mt-2 px-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-6 h-6 bg-stone-200 dark:bg-stone-800 rounded-full"></div>
          ))}
        </div>
      </div>
      
      {/* 액션 버튼 스켈레톤 */}
      <div className="w-full h-14 bg-stone-200 dark:bg-stone-800 rounded-2xl mt-4"></div>
    </div>
  );
}

export default function HomePage() {
  const {
    router,
    settings,
    records,
    authUser,
    
    nextUnreadDay,
    isScheduleSheetOpen,
    setIsScheduleSheetOpen,
    isLoading,
    targetDayRef
  } = useHomeDashboard();

  const [showSplash, setShowSplash] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (!hasSeenSplash) {
      setShowSplash(true);
      sessionStorage.setItem('hasSeenSplash', 'true');
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full min-h-full flex flex-col items-center bg-stone-50 dark:bg-stone-950 pb-10 px-6 pt-24">
        <div className="w-full max-w-xl">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const { totalReadDays, achievementRate, memorizedCount } = getReadingProgress(records);
  const daysSince = settings ? calculateDaysSince(settings.startDate) : 1;
  
  const isTodayRead = !!(records[daysSince]?.completedAt || records[daysSince]?.readDate);
  let pastMissedDays = 0;
  for (let d = 1; d < daysSince; d++) {
    if (!records[d]?.completedAt && !records[d]?.readDate) {
      pastMissedDays++;
    }
  }

  return (
    <div data-v2-home className="w-full min-h-full flex flex-col items-center bg-transparent pb-10">
      <div className="w-full max-w-xl flex flex-col">
        
        {/* 환영 메시지 (고정 헤더) */}
        <header className="sticky top-0 z-40 mb-6 border-b border-stone-200/50 bg-stone-50/95 px-6 pb-4 pt-[calc(1.5rem+env(safe-area-inset-top))] backdrop-blur-md dark:border-stone-800/50 dark:bg-stone-950/95">
          <h1 className="flex flex-col gap-1.5 w-full">
            {authUser ? (
              <>
                <div className="flex items-center text-lg font-bold text-amber-600 dark:text-amber-500">
                  <span className="truncate max-w-[80%] inline-block">{(authUser.nickname || authUser.name).split('#')[0]}</span>
                  <span>님,</span>
                </div>
                <div className="text-xl font-black text-stone-800 dark:text-stone-100 break-keep">
                  오늘도 말씀을 마음에 새겨볼까요? ✨
                </div>
              </>
            ) : (
              <div className="text-xl font-black text-stone-800 dark:text-stone-100">
                나의 통독 대시보드 ✨
              </div>
            )}
          </h1>
        </header>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex flex-col gap-8 px-6">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              <MiniScheduleWidget 
                daysSince={daysSince} 
                setIsScheduleSheetOpen={setIsScheduleSheetOpen} 
              />
              <ReadingProgressWidget 
                totalReadDays={totalReadDays}
                achievementRate={achievementRate}
                daysSince={daysSince}
                memorizedCount={memorizedCount}
                isTodayRead={isTodayRead}
                pastMissedDays={pastMissedDays}
              />

        {/* CTA 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              if (Object.keys(records).length === 0) {
                alert("아직 남겨진 발자국이 없어요. 오늘 진도부터 시작해 보세요!");
                return;
              }
              router.push("/read?day=" + nextUnreadDay);
            }}
            className="w-full py-3.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-2xl transition-transform hover:-translate-y-1 shadow-sm flex items-center justify-center gap-2 text-[15px] sm:text-base active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <BookOpen size={20} />
            마지막 읽은 본문 이어서 읽기
          </button>
          
          <button
            onClick={() => router.push("/read?day=" + daysSince)}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black rounded-2xl transition-transform hover:-translate-y-1 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-lg active:translate-y-0"
          >
            <CalendarDays size={22} />
            오늘 목표 진도 읽기 (Day {daysSince})
          </button>
        </div>

        {/* 앱 활용 가이드 */}
        <div className="flex flex-col gap-3 mt-2 mb-8 text-sm text-stone-500 dark:text-stone-400 leading-relaxed px-1 break-keep">
          <h3 className="font-semibold text-stone-700 dark:text-stone-300">💡 One Verse 100% 활용 가이드</h3>
          <ul className="flex flex-col space-y-3 pl-0.5">
            <li className="flex items-start gap-2">
              <span className="mt-[1px]">•</span>
              <span><strong>말씀 읽기:</strong> 매일 구약, 신약, 시편, 잠언으로 구성된 분량을 읽으며 1년 1독에 도전해 보세요. 마음에 와닿는 단 하나의 구절(One Verse)에 나만의 묵상 발자국을 남기고 카카오톡으로 나눌 수도 있습니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[1px]">•</span>
              <span><strong>친구:</strong> 카카오톡 친구를 앱으로 초대해 보세요. 서로가 선택한 One Verse와 묵상을 나누며 함께 은혜를 풍성하게 누릴 수 있습니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[1px]">•</span>
              <span><strong>암송 기능:</strong> 빈칸 채우기 기반의 &apos;뇌새김&apos; 방식을 통해, 오늘 내게 주신 말씀을 하루 종일 머리와 가슴에 깊이 새겨보세요.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[1px]">•</span>
              <span><strong>홈 화면 설치:</strong> 브라우저 메뉴에서 &apos;홈 화면에 추가&apos;를 누르면 네이티브 앱처럼 편하게 쓸 수 있어요. (Safari: 하단 나눔 아이콘 ➔ 홈 화면에 추가 / Chrome: 우측 상단 메뉴 ➔ 앱 설치)</span>
            </li>
          </ul>
        </div>
            </>
          )}
        </div>
      </div>

      {/* 365일 바텀 시트 */}
      {isScheduleSheetOpen && (
        <ScheduleBottomSheet
          daysSince={daysSince}
          records={records}
          setIsScheduleSheetOpen={setIsScheduleSheetOpen}
          targetDayRef={targetDayRef}
        />
      )}
    </div>
  );
}
