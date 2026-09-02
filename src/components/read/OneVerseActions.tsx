import React from "react";
import { Heart, HeartHandshake, Footprints } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DayRecord, OneVerse } from "@/lib/storage";

interface ConfirmedOneVerseActionsProps {
  verse: OneVerse;
  dayIndex: number;
  record?: DayRecord;
  onOpenMemory: () => void;
  onShare: (record: DayRecord) => void;
  onRequestReselect: () => void;
  isCompletedDay: boolean;
}

export function ConfirmedOneVerseActions({ verse, dayIndex, record, onOpenMemory, onShare, onRequestReselect, isCompletedDay }: ConfirmedOneVerseActionsProps) {
  const router = useRouter();
  const isMemorized = verse.isMemorized;
  return (
    <>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-stone-200 pt-3 pl-[2ch] sm:pl-[2.5ch] dark:border-stone-800/50">
        <button type="button" onClick={(event) => { event.stopPropagation(); onOpenMemory(); }} className={`min-h-11 min-w-0 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-colors ${isMemorized ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"}`}>
          <Heart size={15} />마음새김
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); router.push(`/memo?day=${dayIndex}&mode=${verse.memo ? "view" : "edit"}`); }} className="min-h-11 min-w-0 rounded-lg border border-stone-200 bg-white text-xs font-bold text-stone-700 flex items-center justify-center gap-1 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700">
          <Footprints size={15} />발자국
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); if (record) onShare(record); }} className="min-h-11 min-w-0 rounded-lg border border-stone-200 bg-white text-xs font-bold text-stone-700 flex items-center justify-center gap-1 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"><HeartHandshake size={15} />나눔</button>
      </div>
      {!isCompletedDay && <div className="mt-2 pl-[2ch] sm:pl-[2.5ch]">
        <button type="button" onClick={(event) => { event.stopPropagation(); onRequestReselect(); }} className="min-h-11 px-3 text-xs font-bold text-stone-500 underline underline-offset-4 transition-colors hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
          다시 선택하기
        </button>
      </div>}
    </>
  );
}

interface SelectedOneVerseActionsProps {
  verse: OneVerse;
  isMarked: boolean;
  onToggleMark: (verse: OneVerse, event: React.MouseEvent) => void;
  onConfirm: (verse: OneVerse, event: React.MouseEvent) => void;
}

export function SelectedOneVerseActions({ verse, isMarked, onToggleMark, onConfirm }: SelectedOneVerseActionsProps) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 pl-[2.5ch] sm:pl-[3ch]">
      <button type="button" onClick={(event) => onConfirm(verse, event)} className="min-h-11 rounded-lg bg-sky-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-sky-700">One Verse로 지정</button>
      <button type="button" onClick={(event) => onToggleMark(verse, event)} className="min-h-11 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700">
        {isMarked ? "마킹 해제" : "마킹"}
      </button>
    </div>
  );
}
