import React from "react";
import { Crown, Heart, HeartHandshake, Footprints } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DayRecord, OneVerse } from "@/lib/storage";

interface ConfirmedOneVerseActionsProps {
  verse: OneVerse;
  dayIndex: number;
  record?: DayRecord;
  onOpenMemory: () => void;
  onShare: (record: DayRecord) => void;
  onRequestReselect: () => void;
}

export function ConfirmedOneVerseActions({ verse, dayIndex, record, onOpenMemory, onShare, onRequestReselect }: ConfirmedOneVerseActionsProps) {
  const router = useRouter();
  const isMemorized = verse.isMemorized;
  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2 pl-[2.5ch] sm:pl-[3ch]">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isMemorized ? "bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md" : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400"}`}>
          <Crown size={14} className={isMemorized ? "text-white" : ""} />
          {isMemorized ? "암송 완료" : "오늘의 One Verse"}
        </div>
        <button onClick={(event) => { event.stopPropagation(); onOpenMemory(); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${isMemorized ? "bg-white dark:bg-stone-800 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-stone-700" : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700"}`}>
          <Heart size={14} />{isMemorized ? "다시 새김하기" : "마음 새김"}
        </button>
      </div>
      <div className="pl-[2ch] sm:pl-[2.5ch] mt-4 flex items-center gap-2 border-t border-stone-200 dark:border-stone-800/50 pt-3">
        <button onClick={(event) => { event.stopPropagation(); router.push(`/memo?day=${dayIndex}&mode=edit`); }} className="flex-1 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-stone-700 shadow-sm">
          <Footprints size={16} />{verse.memo ? "발자국 수정" : "발자국 남기기"}
        </button>
        {verse.memo && <button onClick={(event) => { event.stopPropagation(); router.push(`/memo?day=${dayIndex}&mode=view`); }} className="flex-1 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-stone-700 shadow-sm"><Footprints size={16} />발자국 보기</button>}
        <button onClick={(event) => { event.stopPropagation(); if (record) onShare(record); }} className="flex-1 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-stone-700 shadow-sm"><HeartHandshake size={16} />나눔</button>
      </div>
      <div className="mt-2 pl-[2ch] sm:pl-[2.5ch]">
        <button onClick={(event) => { event.stopPropagation(); onRequestReselect(); }} className="min-h-11 px-3 text-xs font-bold text-stone-500 underline underline-offset-4 transition-colors hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
          다시 선택하기
        </button>
      </div>
    </>
  );
}

interface SelectedOneVerseActionsProps {
  verse: OneVerse;
  isCandidate: boolean;
  onToggleCandidate: (verse: OneVerse, event: React.MouseEvent) => void;
  onConfirm: (verse: OneVerse, event: React.MouseEvent) => void;
}

export function SelectedOneVerseActions({ verse, isCandidate, onToggleCandidate, onConfirm }: SelectedOneVerseActionsProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 pl-[2.5ch] sm:pl-[3ch]">
      <button onClick={(event) => onToggleCandidate(verse, event)} className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700">
        {isCandidate ? "후보 해제" : "후보로 담기"}
      </button>
      <button onClick={(event) => onConfirm(verse, event)} className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5">📌 오늘의 One Verse로 지정</button>
    </div>
  );
}
