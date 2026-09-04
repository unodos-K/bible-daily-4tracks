import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from "lucide-react";
import { ReadRecordsMap, ReadingSettings } from "@/lib/storage";
import { ReadingData } from "./BibleContent";

interface ReadHeaderProps {
  dayIndex: number;
  handleSetDay: (newDay: number) => void;
  isDaySelectorOpen: boolean;
  setIsDaySelectorOpen: (open: boolean) => void;
  readingData: ReadingData;
  isCompletedDay: boolean;
  records: ReadRecordsMap;
  settings: ReadingSettings | null;
  headerRef: React.RefObject<HTMLElement>;
  calculateDaysSince: (startDateStr: string) => number;
}

export default function ReadHeader({
  dayIndex,
  handleSetDay,
  isDaySelectorOpen,
  setIsDaySelectorOpen,
  readingData,
  isCompletedDay,
  records,
  settings,
  headerRef,
  calculateDaysSince
}: ReadHeaderProps) {
  return (
    <header 
      ref={headerRef as React.RefObject<HTMLDivElement>}
      className="relative z-30 flex shrink-0 flex-col gap-2 border-b border-stone-200 bg-stone-50 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] dark:border-stone-800 dark:bg-stone-950"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => handleSetDay(dayIndex - 10)}
            disabled={dayIndex <= 1}
            aria-label="10일 이전으로 이동"
            className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
            title="10일 이전"
          >
            <ChevronsLeft size={22} className="text-stone-700 dark:text-stone-300" />
          </button>
          <button
            onClick={() => handleSetDay(dayIndex - 1)}
            disabled={dayIndex <= 1}
            aria-label="1일 이전으로 이동"
            className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
            title="1일 이전"
          >
            <ChevronLeft size={22} className="text-stone-700 dark:text-stone-300" />
          </button>
        </div>
        
        <button
          type="button"
          aria-label="Day 선택 열기"
          aria-expanded={isDaySelectorOpen}
          className="flex flex-col items-center flex-1 cursor-pointer select-none py-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors mx-2" 
          onClick={() => setIsDaySelectorOpen(!isDaySelectorOpen)}
        >
          <h1 className="font-bold text-lg sm:text-xl text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
            Day {readingData.dayIndex} 
            <ChevronDown size={18} className={`text-stone-400 transition-transform ${isDaySelectorOpen ? 'rotate-180' : ''}`} />
          </h1>
          <span className="text-[10px] sm:text-xs text-stone-500 font-medium mt-0.5">
            {isCompletedDay && records[dayIndex]?.readDate ? (
              `${parseInt(records[dayIndex].readDate.split('-')[1])}월 ${parseInt(records[dayIndex].readDate.split('-')[2])}일 완료 / 목표 Day ${settings ? calculateDaysSince(settings.startDate) : 1}`
            ) : (
              `${new Date().getMonth() + 1}월 ${new Date().getDate()}일 (오늘) / 목표 Day ${settings ? calculateDaysSince(settings.startDate) : 1}`
            )}
          </span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => handleSetDay(dayIndex + 1)}
            disabled={dayIndex >= 365}
            aria-label="1일 다음으로 이동"
            className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
            title="1일 다음"
          >
            <ChevronRight size={22} className="text-stone-700 dark:text-stone-300" />
          </button>
          <button
            onClick={() => handleSetDay(dayIndex + 10)}
            disabled={dayIndex >= 365}
            aria-label="10일 다음으로 이동"
            className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
            title="10일 다음"
          >
            <ChevronsRight size={22} className="text-stone-700 dark:text-stone-300" />
          </button>
        </div>
      </div>
    </header>
  );
}
