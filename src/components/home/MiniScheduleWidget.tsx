import React from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import { formatSchedule, getCategoryColor } from "@/lib/bibleFormat";
import scheduleData from "@/data/Bible_Reading_Schedule_365.json";

interface MiniScheduleWidgetProps {
  daysSince: number;
  setIsScheduleSheetOpen: (isOpen: boolean) => void;
}

export default function MiniScheduleWidget({ daysSince, setIsScheduleSheetOpen }: MiniScheduleWidgetProps) {
  return (
    <div data-v2-schedule className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 flex flex-col shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-sky-500" />
          <span className="font-bold text-stone-700 dark:text-stone-300">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <span className="text-xs font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 px-2 py-1 rounded-md">
          Day {daysSince}
        </span>
      </div>
      <div className="text-lg font-black text-stone-800 dark:text-stone-100 mb-4 flex flex-wrap gap-x-3 gap-y-2">
        {formatSchedule(scheduleData[daysSince - 1]).map((p, i, arr) => (
          <span key={p.category} className="inline-flex items-center">
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 dark:bg-stone-800 ${getCategoryColor(p.category)}`}>
              {p.category}
            </span>
            <span className="ml-1.5">{p.text}{i < arr.length - 1 ? ',' : ''}</span>
          </span>
        ))}
      </div>
      <button 
        onClick={() => setIsScheduleSheetOpen(true)}
        className="self-end flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
      >
        전체 일정 보기 <ChevronRight size={16} />
      </button>
    </div>
  );
}
