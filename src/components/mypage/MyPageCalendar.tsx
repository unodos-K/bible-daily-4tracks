import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayRecord, ReadingSettings } from "@/lib/storage";

interface MyPageCalendarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  year: number;
  month: number;
  settings: ReadingSettings;
  recordsByDate: Record<string, DayRecord[]>;
  selectedRecordStr: string | null;
  handleDayClick: (dateStr: string) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function formatDateStr(year: number, month: number, day: number) {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default function MyPageCalendar({
  setCurrentDate,
  year,
  month,
  settings,
  recordsByDate,
  selectedRecordStr,
  handleDayClick
}: MyPageCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
          className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
        >
          <ChevronLeft className="text-stone-600 dark:text-stone-300" />
        </button>
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">
          {year}년 {month}월
        </h3>
        <button 
          onClick={() => setCurrentDate(new Date(year, month, 1))}
          className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
        >
          <ChevronRight className="text-stone-600 dark:text-stone-300" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-stone-400">
        <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-14 sm:h-20" />;
          }

          const dateStr = formatDateStr(year, month, day);
          const isBeforeStart = dateStr < settings.startDate;
          const dayRecords = recordsByDate[dateStr] || [];
          const count = dayRecords.length;
          const isCompleted = count > 0;
          
          const isToday = formatDateStr(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()) === dateStr;
          const isSelected = selectedRecordStr === dateStr;

          let borderClass = "";
          let bgClass = "";
          
          if (isCompleted) {
            if (count === 3) {
              borderClass = "border-amber-400 dark:border-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]";
              bgClass = "bg-amber-50/50 dark:bg-amber-900/10";
            } else if (count === 2) {
              borderClass = "border-sky-300 dark:border-sky-700";
              bgClass = "bg-sky-50 dark:bg-sky-900/20";
            } else {
              borderClass = "border-sky-200 dark:border-sky-800";
              bgClass = "bg-sky-50 dark:bg-sky-900/20";
            }
          }

          return (
            <div 
              key={day}
              onClick={() => {
                if (!isBeforeStart || isCompleted) {
                  handleDayClick(dateStr);
                }
              }}
              className={`
                relative h-14 sm:h-20 flex flex-col items-center justify-start pt-2 rounded-xl transition-all border select-none
                ${isBeforeStart && !isCompleted ? 'opacity-30 cursor-not-allowed bg-stone-50 dark:bg-stone-900 border-transparent' : 'cursor-pointer'}
                ${isSelected ? 'ring-2 ring-sky-500 bg-sky-100 dark:bg-sky-900/60' : ''}
                ${isCompleted && !isSelected ? `${bgClass} ${borderClass} hover:brightness-95` : ''}
                ${!isCompleted && !isSelected && !isBeforeStart ? 'bg-transparent border-transparent hover:border-stone-200 dark:hover:border-stone-800' : ''}
              `}
            >
              <span className={`text-sm font-medium ${isToday ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-stone-700 dark:text-stone-300'}`}>
                {day}
              </span>
              {isCompleted && (
                <div className="flex mt-1 justify-center gap-1 items-center">
                  {count > 3 ? (
                    <span className="bg-stone-700 dark:bg-stone-600 text-stone-100 text-[10px] font-bold px-1.5 py-0.5 leading-none rounded-full">
                      +{count}
                    </span>
                  ) : (
                    Array.from({ length: count }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
