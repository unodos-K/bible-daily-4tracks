import React from "react";
import { CalendarDays, X } from "lucide-react";
import { formatSchedule, getCategoryColor } from "@/lib/bibleFormat";
import scheduleData from "@/data/Bible_Reading_Schedule_365.json";
import { ReadRecordsMap } from "@/lib/storage";

interface ScheduleBottomSheetProps {
  daysSince: number;
  records: ReadRecordsMap;
  setIsScheduleSheetOpen: (isOpen: boolean) => void;
  targetDayRef: React.RefObject<HTMLDivElement | null>;
}

export default function ScheduleBottomSheet({
  daysSince,
  records,
  setIsScheduleSheetOpen,
  targetDayRef
}: ScheduleBottomSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setIsScheduleSheetOpen(false)}
      />
      <div className="relative w-full max-w-xl bg-white dark:bg-stone-950 rounded-t-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center p-5 border-b border-stone-200 dark:border-stone-800 shrink-0">
          <h2 className="text-xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <CalendarDays size={20} className="text-sky-500" /> 365일 전체 일정
          </h2>
          <button 
            onClick={() => setIsScheduleSheetOpen(false)}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-20 flex flex-col gap-2 overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
          {scheduleData.map((dayData) => {
            const dayStr = String(dayData.day);
            const isCompleted = records[dayStr]?.completedAt || records[dayStr]?.readDate;
            const isTargetDay = dayData.day === daysSince;

            return (
              <div 
                key={dayData.day} 
                ref={isTargetDay ? targetDayRef : null}
                className={`flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 rounded-xl border ${
                  isTargetDay 
                    ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-700 shadow-sm' 
                    : isCompleted
                      ? 'bg-stone-50 dark:bg-stone-900/50 border-green-500 dark:border-green-600/60 opacity-90'
                      : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
                }`}
              >
                <div className="flex items-center mb-0.5 sm:mb-0">
                  <span className={`font-black w-14 whitespace-nowrap flex-shrink-0 ${
                    isTargetDay ? 'text-sky-600 dark:text-sky-400' : isCompleted ? 'text-stone-500' : 'text-stone-700 dark:text-stone-300'
                  }`}>
                    Day {dayData.day}
                  </span>
                </div>
                <span className={`text-[13px] font-semibold flex flex-wrap gap-2 sm:justify-end leading-snug ${
                  isTargetDay ? 'text-stone-800 dark:text-stone-200' : isCompleted ? 'text-stone-400' : 'text-stone-600 dark:text-stone-400'
                }`}>
                  {formatSchedule(dayData).map((p, i, arr) => (
                    <span key={p.category} className="inline-flex items-center">
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
                        isCompleted
                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                            : `bg-stone-100 dark:bg-stone-800 ${getCategoryColor(p.category)}`
                      }`}>
                        {p.category}
                      </span>
                      <span className="ml-1.5">{p.text}{i < arr.length - 1 ? ',' : ''}</span>
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
