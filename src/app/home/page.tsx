"use client";

import React from "react";
import { AlertCircle, BookOpen, CalendarDays, CheckCircle2, Footprints, Heart, Pin } from "lucide-react";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { calculateDaysSince } from "@/hooks/bible-reader/dayUtils";
import { getLastRecordDay, getReadingProgress } from "@/lib/readingRecords";
import ScheduleBottomSheet from "@/components/home/ScheduleBottomSheet";
import SplashScreen from "@/components/home/SplashScreen";
import { formatSchedule } from "@/lib/bibleFormat";
import type { OneVerseRecordsMap, ReadRecordsMap } from "@/lib/storage";
import scheduleData from "@/data/Bible_Reading_Schedule_365.json";

function getSafeDayIndex(dayIndex: number) {
  return Math.min(Math.max(dayIndex, 1), scheduleData.length);
}

function getScheduleParts(dayIndex: number) {
  return formatSchedule(scheduleData[getSafeDayIndex(dayIndex) - 1]);
}

function ScheduleBadges({ parts }: { parts: ReturnType<typeof formatSchedule> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {parts.map((part) => (
        <span
          key={part.category}
          className="rounded-md bg-stone-100 px-2 py-1 text-sm font-bold text-stone-800 dark:bg-stone-800 dark:text-stone-100"
        >
          {part.text}
        </span>
      ))}
    </div>
  );
}

function getLatestOneVerseRecord(oneVerseRecords: OneVerseRecordsMap) {
  return Object.values(oneVerseRecords).sort((a, b) => {
    const bTime = new Date(b.completedAt ?? b.readDate).getTime();
    const aTime = new Date(a.completedAt ?? a.readDate).getTime();
    return bTime - aTime || b.dayIndex - a.dayIndex;
  })[0] ?? null;
}

function hasMemo(value: unknown) {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((entry) => {
    if (Array.isArray(entry)) return entry.length > 0;
    return typeof entry === "string" ? entry.trim().length > 0 : Boolean(entry);
  });
}

function countFootprints(oneVerseRecords: OneVerseRecordsMap) {
  return Object.values(oneVerseRecords).filter((record) => hasMemo(record.oneVerse.memo)).length;
}

function getLastReadingParts(records: ReadRecordsMap) {
  const hasRecords = Object.keys(records).length > 0;
  if (!hasRecords) return [];
  const lastDay = getLastRecordDay(records);
  return getScheduleParts(lastDay);
}

function getTodayStatus(isTodayRead: boolean, pastMissedDays: number) {
  if (isTodayRead) {
    return {
      icon: CheckCircle2,
      label: "오늘의 통독을 완료했어요",
      tone: "text-emerald-600 dark:text-emerald-400",
    };
  }

  if (pastMissedDays >= 2) {
    return {
      icon: AlertCircle,
      label: `${pastMissedDays}일의 읽을 분량이 기다리고 있어요`,
      tone: "text-amber-700 dark:text-amber-400",
    };
  }

  return {
    icon: BookOpen,
    label: "오늘 분량을 읽을 차례예요",
    tone: "text-sky-700 dark:text-sky-400",
  };
}

function DashboardSkeleton() {
  return (
    <div className="flex w-full animate-pulse flex-col gap-8">
      <div className="space-y-3">
        <div className="h-4 w-40 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-7 w-72 max-w-full rounded bg-stone-200 dark:bg-stone-800" />
      </div>
      <div className="space-y-4 border-y border-stone-200 py-7 dark:border-stone-800">
        <div className="h-4 w-32 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-24 w-full rounded bg-stone-100 dark:bg-stone-900" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-36 rounded-xl bg-stone-100 dark:bg-stone-900" />
        <div className="h-36 rounded-xl bg-stone-100 dark:bg-stone-900" />
      </div>
      <div className="h-40 rounded-xl bg-stone-100 dark:bg-stone-900" />
    </div>
  );
}

export default function HomePage() {
  const {
    router,
    settings,
    records,
    oneVerseRecords,
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
  const todayParts = getScheduleParts(daysSince);
  const latestOneVerseRecord = getLatestOneVerseRecord(oneVerseRecords);
  const latestOneVerse = latestOneVerseRecord?.oneVerse ?? null;
  const lastReadingParts = getLastReadingParts(records);
  const footprintCount = countFootprints(oneVerseRecords);
  
  const isTodayRead = !!(records[daysSince]?.completedAt || records[daysSince]?.readDate);
  let pastMissedDays = 0;
  for (let d = 1; d < daysSince; d++) {
    if (!records[d]?.completedAt && !records[d]?.readDate) {
      pastMissedDays++;
    }
  }
  const todayStatus = getTodayStatus(isTodayRead, pastMissedDays);
  const TodayStatusIcon = todayStatus.icon;
  const formattedToday = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div data-v2-home className="w-full min-h-full flex flex-col items-center bg-transparent pb-10">
      <div className="w-full max-w-xl flex flex-col">
        <main className="flex flex-col gap-9 px-6 pb-6 pt-[calc(2rem+env(safe-area-inset-top))]">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              <section data-v2-home-greeting className="space-y-2">
                {authUser ? (
                  <>
                    <p className="truncate text-sm font-semibold text-amber-700 dark:text-amber-400">
                      {(authUser.nickname || authUser.name).split("#")[0]}님,
                    </p>
                    <h1 className="break-keep text-2xl font-black leading-snug text-stone-900 dark:text-stone-100">
                      오늘도 말씀을 마음에 새겨볼까요? ✨
                    </h1>
                  </>
                ) : (
                  <h1 className="break-keep text-2xl font-black leading-snug text-stone-900 dark:text-stone-100">
                    오늘도 말씀을 마음에 새겨볼까요? ✨
                  </h1>
                )}
              </section>

              <section data-v2-home-latest className="border-y border-stone-200 py-7 dark:border-stone-800">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                  최근 마음에 새긴 말씀
                </p>
                {latestOneVerse ? (
                  <div className="space-y-4">
                    <blockquote data-v2-home-scripture className="break-keep text-2xl font-medium leading-relaxed text-stone-900 dark:text-stone-100">
                      &ldquo;{latestOneVerse.displayText || latestOneVerse.rawText}&rdquo;
                    </blockquote>
                    <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
                      {latestOneVerse.reference || `${latestOneVerse.book} ${latestOneVerse.chapter}:${latestOneVerse.verse}`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-stone-800 dark:text-stone-100">아직 마음에 새긴 말씀이 없어요.</p>
                    <p className="break-keep text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                      오늘 말씀을 읽으며 마음에 남는 한 구절을 선택해 보세요.
                    </p>
                  </div>
                )}
              </section>

              <section data-v2-home-reading className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <article className="flex min-h-44 flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-stone-500 dark:text-stone-400">마지막 읽은 본문</p>
                      {lastReadingParts.length > 0 ? (
                        <ScheduleBadges parts={lastReadingParts} />
                      ) : (
                        <p className="break-keep text-sm font-bold leading-snug text-stone-600 dark:text-stone-400">아직 읽기 전</p>
                      )}
                    </div>
                    <button
                      data-v2-home-read-secondary
                      type="button"
                      onClick={() => {
                        if (Object.keys(records).length === 0) {
                          alert("아직 읽은 기록이 없어요. 오늘 진도부터 시작해 보세요!");
                          return;
                        }
                        router.push("/read?day=" + nextUnreadDay);
                      }}
                      className="mt-4 flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-2 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                    >
                      <BookOpen size={17} />
                      <span className="whitespace-nowrap">이어서 읽기</span>
                    </button>
                  </article>

                  <article className="flex min-h-44 flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-stone-500 dark:text-stone-400">오늘의 분량</p>
                      <ScheduleBadges parts={todayParts} />
                    </div>
                    <button
                      data-v2-home-read-primary
                      type="button"
                      onClick={() => router.push("/read?day=" + daysSince)}
                      className="mt-4 flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 text-sm font-black text-white shadow-sm shadow-emerald-500/20 transition-colors hover:from-emerald-600 hover:to-emerald-700"
                    >
                      <CalendarDays size={17} />
                      <span className="whitespace-nowrap">오늘 분량 읽기</span>
                    </button>
                  </article>
                </div>
              </section>

              <section data-v2-home-journey className="space-y-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">나의 통독 여정</p>
                    <h2 className="mt-1 text-lg font-black text-stone-900 dark:text-stone-100">{formattedToday}</h2>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Day {daysSince}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
                    {totalReadDays} / 365일을 완료해 성경 전체의 {achievementRate}%를 읽었습니다
                  </p>
                  <div data-v2-progress-track className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <div
                      data-v2-progress-fill
                      className="h-full rounded-full bg-amber-500 transition-all duration-700"
                      style={{ width: `${achievementRate}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-stone-200 border-y border-stone-200 py-4 text-center dark:divide-stone-800 dark:border-stone-800">
                  <div className="space-y-1 px-2">
                    <p className="flex items-center justify-center gap-1 text-xs font-bold text-stone-500 dark:text-stone-400"><Footprints size={14} />발자국</p>
                    <p className="text-lg font-black text-stone-900 dark:text-stone-100">{footprintCount}</p>
                  </div>
                  <div className="space-y-1 px-2">
                    <p className="flex items-center justify-center gap-1 text-xs font-bold text-stone-500 dark:text-stone-400"><Heart size={14} />암송</p>
                    <p className="text-lg font-black text-stone-900 dark:text-stone-100">{memorizedCount}절</p>
                  </div>
                  <div className="space-y-1 px-2">
                    <p className="flex items-center justify-center gap-1 text-xs font-bold text-stone-500 dark:text-stone-400"><Pin size={14} />현재 진도</p>
                    <p className="text-lg font-black text-stone-900 dark:text-stone-100">Day {daysSince}</p>
                  </div>
                </div>

                <div data-v2-home-status className={`flex items-center gap-2 text-sm font-bold ${todayStatus.tone}`}>
                  <TodayStatusIcon size={17} />
                  <span className="break-keep">{todayStatus.label}</span>
                </div>
              </section>

              <section data-v2-home-guide className="mb-8 flex flex-col gap-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400 break-keep">
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
              </section>
            </>
          )}
        </main>
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
