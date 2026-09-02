import React from "react";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface ReadingProgressWidgetProps {
  totalReadDays: number;
  achievementRate: number;
  daysSince: number;
  memorizedCount: number;
  isTodayRead: boolean;
  pastMissedDays: number;
}

export default function ReadingProgressWidget({
  totalReadDays,
  achievementRate,
  daysSince,
  memorizedCount,
  isTodayRead,
  pastMissedDays
}: ReadingProgressWidgetProps) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col gap-4">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-semibold mb-1">나의 통독 여정</p>
          <h2 className="text-3xl font-black text-stone-800 dark:text-stone-100">
            {totalReadDays} <span className="text-lg font-bold text-stone-400">/ 365일</span>
          </h2>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
            달성률 {achievementRate}%
          </span>
        </div>
      </div>
      
      <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden mt-1">
        <div 
          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${achievementRate}%` }}
        ></div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-stone-50 dark:bg-stone-950 rounded-xl p-3 flex flex-col items-center justify-center border border-stone-100 dark:border-stone-800">
          <span className="text-xs font-semibold text-stone-500 mb-0.5">목표 진도</span>
          <span className="text-lg font-black text-stone-700 dark:text-stone-300">Day {daysSince}</span>
        </div>
        <div className="bg-stone-50 dark:bg-stone-950 rounded-xl p-3 flex flex-col items-center justify-center border border-stone-100 dark:border-stone-800">
          <span className="text-xs font-semibold text-stone-500 mb-0.5">암송 완료</span>
          <span className="text-lg font-black text-stone-700 dark:text-stone-300">{memorizedCount}절</span>
        </div>
        
        <div className="bg-stone-50 dark:bg-stone-950 rounded-xl p-3 flex flex-col items-center justify-center border border-stone-100 dark:border-stone-800 col-span-2">
          <span className="text-xs font-semibold text-stone-500 mb-1">오늘의 통독 상태</span>
          {isTodayRead ? (
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> 오늘 통독 완료 🎉
            </span>
          ) : pastMissedDays > 0 ? (
            <span className="text-sm font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle size={16} /> 밀린 진도가 {pastMissedDays}일 있어요! 몰아보기 추천 🔥
            </span>
          ) : (
            <span className="text-sm font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-500" /> 오늘도 말씀을 읽어볼까요? ✨
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
