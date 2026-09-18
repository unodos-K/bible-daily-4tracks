import React, { useEffect } from "react";
import { AlertCircle, BadgeCheck, BookMarked, BookOpen, Heart, Lightbulb, Music2, Pin } from "lucide-react";

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
  useEffect(() => {
    if (!isDaySelectorOpen) return;

    const readerScrollContainer = document.getElementById("bible-content-scroll") as HTMLDivElement | null;
    const previousOverflow = readerScrollContainer?.style.overflowY;
    if (readerScrollContainer) readerScrollContainer.style.overflowY = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDaySelectorOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (readerScrollContainer) readerScrollContainer.style.overflowY = previousOverflow ?? "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDaySelectorOpen, scrollContainerRef, setIsDaySelectorOpen]);

  if (!isDaySelectorOpen) return null;

  return (
    <div 
      style={{ top: `${headerHeight}px` }}
      id="day-selector-sheet"
      role="dialog"
      aria-label="Day 선택"
      className="absolute inset-x-0 bottom-0 z-40 flex min-h-0 flex-col overflow-hidden border-b border-stone-200 bg-white shadow-2xl animate-in slide-in-from-top-2 dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="shrink-0 border-b border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-900">
        <button
          onClick={handleGoToLastRead}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-2.5 text-sm font-medium text-cyan-300 shadow-sm transition-all hover:bg-cyan-900/50"
        >
          <Pin size={16} /> 마지막으로 읽은 본문으로 이동하기
        </button>
      </div>

      <div ref={scrollContainerRef as React.RefObject<HTMLDivElement>} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pt-1">
        <div className="flex flex-col gap-1">
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
                    <span className="inline-flex items-center gap-1"><BookOpen size={13} />{s.tracks.find((t: ScheduleTrack) => t.type === '구약')?.range}</span>
                    <span className="inline-flex items-center gap-1"><BookMarked size={13} />{s.tracks.find((t: ScheduleTrack) => t.type === '신약')?.range}</span>
                    <span className="inline-flex items-center gap-1"><Music2 size={13} />{s.tracks.find((t: ScheduleTrack) => t.type === '시편')?.range}</span>
                    <span className="inline-flex items-center gap-1"><Lightbulb size={13} />{s.tracks.find((t: ScheduleTrack) => t.type === '잠언')?.range}</span>
                  </div>
                </div>

                {hasOneVerse && (
                  <div className="flex flex-col items-end justify-center gap-1.5 shrink-0 self-center">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                      <Pin size={12} /> One Verse
                    </span>
                    {isMemorized ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                        <BadgeCheck size={12} /> 마음새김 완료
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-700/60 text-stone-400 border border-stone-600/40">
                        <Heart size={12} /> 마음 새김
                      </span>
                    )}
                  </div>
                )}
              </button>
            </React.Fragment>
          );
        })}
        </div>
      </div>
      
      <div className="shrink-0 border-t border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950">
        <button
          onClick={() => setIsDaySelectorOpen(false)}
          className="w-full rounded-xl px-4 py-2 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-800 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
