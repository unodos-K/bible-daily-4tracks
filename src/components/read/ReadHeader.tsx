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
      className="sticky top-0 z-30 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-sm flex flex-col px-3 py-2 gap-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => handleSetDay(dayIndex - 10)}
            disabled={dayIndex <= 1}
            className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
            title="10일 이전"
          >
            <ChevronsLeft size={22} className="text-stone-700 dark:text-stone-300" />
          </button>
          <button
            onClick={() => handleSetDay(dayIndex - 1)}
            disabled={dayIndex <= 1}
            className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
            title="1일 이전"
          >
            <ChevronLeft size={22} className="text-stone-700 dark:text-stone-300" />
          </button>
        </div>
        
        <div 
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
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => handleSetDay(dayIndex + 1)}
            disabled={dayIndex >= 365}
            className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
            title="1일 다음"
          >
            <ChevronRight size={22} className="text-stone-700 dark:text-stone-300" />
          </button>
          <button
            onClick={() => handleSetDay(dayIndex + 10)}
            disabled={dayIndex >= 365}
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
