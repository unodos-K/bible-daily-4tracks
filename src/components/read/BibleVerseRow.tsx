import React from "react";
import type { DayRecord, OneVerse } from "@/lib/storage";
import type { VerseData } from "./types";
import { ConfirmedOneVerseActions, SelectedOneVerseActions } from "./OneVerseActions";

interface BibleVerseRowProps {
  trackType: string;
  book: string;
  chapter: number;
  verse: VerseData;
  fontSize: number;
  dayIndex: number;
  selectedVerse: OneVerse | null;
  confirmedVerse: OneVerse | null;
  candidates: OneVerse[];
  record?: DayRecord;
  onVerseClick: (trackType: string, book: string, chapter: number, verse: number, rawText: string, displayText: string, chunks: string[]) => void;
  onConfirmVerse: (verse: OneVerse, event: React.MouseEvent) => void;
  onToggleCandidate: (verse: OneVerse, event: React.MouseEvent) => void;
  onOpenMemory: () => void;
  onShare: (record: DayRecord) => void;
  onRequestReselect: () => void;
  isCompletedDay: boolean;
}

const formatReference = (book: string, chapter: number, verse: number) => book === "시편" ? `${book} ${chapter}편 ${verse}절` : `${book} ${chapter}장 ${verse}절`;

export default function BibleVerseRow({ trackType, book, chapter, verse, fontSize, dayIndex, selectedVerse, confirmedVerse, candidates, record, onVerseClick, onConfirmVerse, onToggleCandidate, onOpenMemory, onShare, onRequestReselect, isCompletedDay }: BibleVerseRowProps) {
  const isSelected = selectedVerse?.book === book && selectedVerse?.chapter === chapter && selectedVerse?.verse === verse.verse;
  const isConfirmed = confirmedVerse?.book === book && confirmedVerse?.chapter === chapter && confirmedVerse?.verse === verse.verse;
  const isCandidate = candidates.some((candidate) => candidate.book === book && candidate.chapter === chapter && candidate.verse === verse.verse);
  const verseValue: OneVerse = { trackType, book, chapter, verse: verse.verse, rawText: verse.rawText, displayText: verse.displayText, chunks: verse.chunks, reference: formatReference(book, chapter, verse.verse) };
  const baseClass = "text-left px-2 sm:px-3 py-2 rounded-xl transition-all duration-200 relative flex flex-col group ";
  const wrapperClass = isConfirmed ? `${baseClass}bg-amber-50 dark:bg-amber-900/20 text-stone-900 dark:text-stone-100 border border-amber-200 dark:border-amber-800/50 shadow-sm mt-1 mb-2` : isSelected ? `${baseClass}bg-sky-50 dark:bg-sky-900/20 text-stone-900 dark:text-stone-100 border border-sky-200 border-dashed dark:border-sky-800/50 mt-1 mb-2` : isCandidate ? `${baseClass}bg-emerald-50/70 dark:bg-emerald-900/10 text-stone-800 dark:text-stone-200 border border-emerald-200/70 dark:border-emerald-800/40` : `${baseClass}text-stone-800 dark:text-stone-200 border border-transparent`;
  const markerClass = isConfirmed ? "absolute left-0 top-3 bottom-3 w-1.5 bg-amber-400 dark:bg-amber-500 rounded-r-md" : isSelected ? "absolute left-0 top-3 bottom-3 w-1 bg-sky-400 dark:bg-sky-500 rounded-r-md" : "absolute left-0 top-3 bottom-3 w-1 bg-emerald-400 dark:bg-emerald-500 rounded-r-md";
  const verseNumberClass = isConfirmed ? "text-amber-600 dark:text-amber-500 font-bold" : isSelected ? "text-sky-600 dark:text-sky-400 font-bold" : isCandidate ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-stone-400 dark:text-stone-500 font-semibold";
  return (
    <div
      id={(isConfirmed || isSelected) ? "one-verse-target" : undefined}
      data-one-verse-candidate={isCandidate ? "true" : undefined}
      className={wrapperClass}
    >
      {(isConfirmed || isSelected || isCandidate) && <div className={markerClass} />}
      <button
        type="button"
        aria-label={`${formatReference(book, chapter, verse.verse)} 선택`}
        aria-pressed={isSelected || isConfirmed}
        onClick={() => onVerseClick(trackType, book, chapter, verse.verse, verse.rawText, verse.displayText, verse.chunks)}
        className="flex items-start flex-1 w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900"
      >
        <span className={`inline-block min-w-[2.5ch] mr-2 sm:mr-3 select-none mt-[0.1em] text-right ${verseNumberClass}`} style={{ fontSize: `${Math.max(fontSize * 0.7, 10)}px` }}>{verse.verse}</span><span className={isConfirmed ? "flex-1 font-medium" : "flex-1"}>{verse.displayText}</span>
      </button>
      {isConfirmed && <ConfirmedOneVerseActions verse={confirmedVerse} dayIndex={dayIndex} record={record} onOpenMemory={onOpenMemory} onShare={onShare} onRequestReselect={onRequestReselect} isCompletedDay={isCompletedDay} />}
      {isSelected && <SelectedOneVerseActions verse={verseValue} isCandidate={isCandidate} onToggleCandidate={onToggleCandidate} onConfirm={onConfirmVerse} />}
    </div>
  );
}
