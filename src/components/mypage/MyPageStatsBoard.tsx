import React from "react";
import { HeartHandshake, Heart, BookOpen, Footprints } from "lucide-react";
import { OneVerseRecord } from "@/lib/storage";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import LikeButton from "@/components/friends/LikeButton";
import { FriendFeedItem } from "@/lib/social";
import { VerseLikeData } from "@/hooks/useMyPageStats";

interface MyPageStatsBoardProps {
  year: number;
  month: number;
  thisMonthTotal: number;
  thisMonthCompletedTotal: number;
  thisMonthMemorized: number;
  thisMonthRecords: OneVerseRecord[];
  router: AppRouterInstance;
  handleShareOneVerse: (record: OneVerseRecord) => void;
  setSelectedRecordStr: (date: string) => void;
  setSelectedDayIndexForMemory: (index: number) => void;
  setIsMemoryModalOpen: (isOpen: boolean) => void;
  likesMap?: Record<number, VerseLikeData>;
  handleToggleLike?: (dayIndex: number) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
function getDayOfWeek(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return WEEKDAYS[date.getDay()];
}

export default function MyPageStatsBoard({
  year,
  month,
  thisMonthTotal,
  thisMonthCompletedTotal,
  thisMonthMemorized,
  thisMonthRecords,
  router,
  handleShareOneVerse,
  setSelectedRecordStr,
  setSelectedDayIndexForMemory,
  setIsMemoryModalOpen,
  likesMap,
  handleToggleLike
}: MyPageStatsBoardProps) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 sm:p-6 flex flex-col">
      <div className="flex flex-col gap-4 mb-6">
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
          📅 {year}년 {month}월의 One Verse
          <span className="text-sm font-medium text-stone-500 bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 rounded-full">
            총 {thisMonthTotal}개
          </span>
        </h3>
        <div className="flex gap-2">
          <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-md flex items-center gap-1">
            <Heart size={12} fill="currentColor" /> 마음 새김: {thisMonthMemorized}개
          </span>
          <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-md">
            📖 통독: {thisMonthCompletedTotal}개
          </span>
        </div>
      </div>

      {thisMonthTotal === 0 ? (
        <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-stone-500 dark:text-stone-400 mb-2 font-medium">이번 달에 등록된 One Verse가 아직 없습니다.</p>
          <p className="text-stone-400 dark:text-stone-500 text-sm">오늘의 말씀을 읽고 마음에 닿는 구절을 남겨보세요! ✨</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {thisMonthRecords.map((record) => {
            const [yStr, mStr, dStr] = record.readDate.split("-");
            const dayNum = parseInt(dStr, 10);
            const weekDay = getDayOfWeek(parseInt(yStr), parseInt(mStr), dayNum);
            const verse = record.oneVerse!;
            const isMem = verse.isMemorized;
            const isCompleted = record.completedAt !== null;
            // @ts-expect-error: compatibility with older data structure
            const displayTxt = verse.displayText || verse.text || "";
            const formattedRef = verse.book === "시편" ? `${verse.book} ${verse.chapter}편 ${verse.verse}절` : `${verse.book} ${verse.chapter}장 ${verse.verse}절`;

            return (
              <div key={`${record.readDate}-${record.dayIndex}`} className="flex flex-col bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                
                <div className="flex flex-col px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 gap-2 rounded-t-2xl">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      {parseInt(mStr)}월 {dayNum}일 ({weekDay})
                    </span>
                    
                    {likesMap && handleToggleLike && (
                      <LikeButton 
                        item={{
                          is_liked_by_me: likesMap[record.dayIndex]?.isLikedByMe || false,
                          like_count: likesMap[record.dayIndex]?.count || 0,
                          liked_by_users: likesMap[record.dayIndex]?.likers || [],
                        } as FriendFeedItem} 
                        onLike={() => handleToggleLike(record.dayIndex)} 
                      />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 w-full mt-2">
                    <div className={`flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold py-1.5 rounded-md border text-center ${isCompleted ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800" : "bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 border-sky-300 dark:border-sky-800"}`}>
                      <BookOpen size={12} /> <span className="hidden sm:inline">{isCompleted ? "통독 완료" : "One Verse 선택"}</span><span className="sm:hidden">{isCompleted ? "통독" : "선택"}</span>
                    </div>
                    
                    {/* 2. 마음 새김 */}
                    <div className={`flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold py-1.5 rounded-md border text-center transition-colors ${
                      isMem
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                        : "bg-stone-100 dark:bg-stone-800/50 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-700"
                    }`}>
                      <Heart size={12} fill={isMem ? "currentColor" : "none"} /> <span className="hidden sm:inline">마음 새김</span><span className="sm:hidden">새김</span>
                    </div>
                    
                    {/* 3. 발자국 */}
                    <div className={`flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold py-1.5 rounded-md border text-center transition-colors ${
                      verse.memo && (typeof verse.memo === 'string' ? verse.memo.trim().length > 0 : true)
                        ? "bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 border-sky-300 dark:border-sky-800"
                        : "bg-stone-100 dark:bg-stone-800/50 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-700"
                    }`}>
                      <Footprints size={12} /> 발자국
                    </div>
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-3">
                  <div className="flex justify-start mb-1">
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 px-2 py-1 rounded-md">
                      Day {record.dayIndex}
                    </span>
                  </div>
                  <blockquote className="text-base sm:text-lg text-stone-800 dark:text-stone-200 font-medium leading-relaxed italic break-keep">
                    {displayTxt}
                  </blockquote>
                  <div className="text-right text-stone-500 dark:text-stone-400 font-bold text-xs sm:text-sm">
                    - {formattedRef} -
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-6 pt-4 border-t border-stone-100 dark:border-stone-800">
                    <button
                      onClick={() => router.push(`/memo?day=${record.dayIndex}&mode=${verse.memo ? 'view' : 'edit'}`)}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                    >
                      <Footprints size={20} strokeWidth={2.5} className="text-emerald-500 dark:text-emerald-400" />
                      <span className="text-[10px] sm:text-xs font-bold tracking-tight">{verse.memo ? "발자국 보기" : "발자국 남기기"}</span>
                    </button>
                    <button
                      onClick={() => handleShareOneVerse(record)}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                    >
                      <HeartHandshake size={20} strokeWidth={2.5} className="text-sky-500 dark:text-sky-400" />
                      <span className="text-[10px] sm:text-xs font-bold tracking-tight">나눔</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRecordStr(record.readDate);
                        setSelectedDayIndexForMemory(record.dayIndex);
                        setIsMemoryModalOpen(true);
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                    >
                      <Heart size={20} strokeWidth={2.5} className="text-amber-500 dark:text-amber-400" />
                      <span className="text-[10px] sm:text-xs font-bold tracking-tight">{isMem ? '다시 새김' : '마음 새김'}</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push("/read?day=" + record.dayIndex);
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                    >
                      <BookOpen size={20} strokeWidth={2.5} className="text-indigo-500 dark:text-indigo-400" />
                      <span className="text-[10px] sm:text-xs font-bold tracking-tight">본문 보기</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
