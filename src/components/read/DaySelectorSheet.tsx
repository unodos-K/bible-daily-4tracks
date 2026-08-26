import React from "react";
import { AlertCircle } from "lucide-react";

import { ReadRecordsMap } from "@/lib/storage";

interface ScheduleTrack {
  type: string;
  range: string;
}

interface ScheduleItem {
  dayIndex: number;
  tracks: ScheduleTrack[];
}

interface DaySelectorSheetProps {
  isDaySelectorOpen: boolean;
  setIsDaySelectorOpen: (open: boolean) => void;
  headerHeight: number;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  handleGoToLastRead: () => void;
  allSchedules: ScheduleItem[];
  records: ReadRecordsMap;
  dayIndex: number;
  handleSetDay: (day: number) => void;
  getNextUnreadDay: (records: ReadRecordsMap) => number;
}

export default function DaySelectorSheet({
  isDaySelectorOpen,
  setIsDaySelectorOpen,
  headerHeight,
  scrollContainerRef,
  handleGoToLastRead,
  allSchedules,
  records,
  dayIndex,
  handleSetDay,
  getNextUnreadDay
}: DaySelectorSheetProps) {
  if (!isDaySelectorOpen) return null;

  return (
    <div 
      style={{ top: `${headerHeight}px` }}
      className="absolute left-0 right-0 z-40 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col animate-in slide-in-from-top-2 h-[75vh] max-h-[600px]"
    >
      <div ref={scrollContainerRef as React.RefObject<HTMLDivElement>} className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        <button
          onClick={handleGoToLastRead}
          className="w-full py-2.5 px-4 mb-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-900/50 text-cyan-300 font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
        >
          📌 마지막으로 읽은 본문으로 이동하기
        </button>
        {allSchedules.map((s) => {
          const maxAllowed = getNextUnreadDay(records);
          const isLocked = s.dayIndex > maxAllowed;
          const dayRecord = records[s.dayIndex];
          const hasOneVerse = !!dayRecord?.oneVerse;
          const isMemorized = !!dayRecord?.oneVerse?.isMemorized;

          return (
            <React.Fragment key={s.dayIndex}>
              <button
                onClick={() => handleSetDay(s.dayIndex)}
                className={`text-left rounded-xl transition-colors flex items-center justify-between gap-3 p-4 ${
                  s.dayIndex === dayIndex
                    ? "bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800"
                    : isLocked
                    ? "opacity-40 hover:opacity-60 border border-transparent"
                    : "hover:bg-stone-50 dark:hover:bg-stone-800 border border-transparent"
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                    Day {s.dayIndex}
                    {isLocked && <AlertCircle size={14} className="text-stone-400" />}
                  </span>
                  
                  <div className="text-xs text-stone-500 dark:text-stone-400 truncate mt-1 leading-relaxed flex flex-wrap gap-x-2">
                    <span>📖 {s.tracks.find((t: ScheduleTrack) => t.type === '구약')?.range}</span>
                    <span>✝️ {s.tracks.find((t: ScheduleTrack) => t.type === '신약')?.range}</span>
                    <span>🕊️ {s.tracks.find((t: ScheduleTrack) => t.type === '시편')?.range}</span>
                    <span>💡 {s.tracks.find((t: ScheduleTrack) => t.type === '잠언')?.range}</span>
                  </div>
                </div>

                {hasOneVerse && (
                  <div className="flex flex-col items-end justify-center gap-1.5 shrink-0 self-center">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                      📌 One Verse
                    </span>
                    {isMemorized ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                        👑 암송 완료
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-700/60 text-stone-400 border border-stone-600/40">
                        🧠 암송 도전
                      </span>
                    )}
                  </div>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      
      <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex justify-center">
        <button
          onClick={() => setIsDaySelectorOpen(false)}
          className="text-sm font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 py-1 px-4"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
