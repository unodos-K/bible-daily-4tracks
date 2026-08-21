"use client";

import React, { useState } from "react";
import { ChapterData } from "@/types/bible";

interface VerseListProps {
  chapterData: ChapterData;
  fontSize: number;
}

export const VerseList: React.FC<VerseListProps> = ({
  chapterData,
  fontSize,
}) => {
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  const unit = chapterData.name === "시편" ? "편" : "장";

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-5 py-6 pb-28">
      {/* 장 제목 헤더 */}
      <div className="mb-6 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">
          {chapterData.name} {chapterData.chapter}{unit}
        </h1>
        <div className="mt-2 mx-auto w-12 h-0.5 bg-amber-700/20 dark:bg-amber-400/20 rounded-full" />
      </div>

      {/* 성경 구절 목록 */}
      <div className="space-y-4">
        {chapterData.verses.map((verse) => {
          const isSelected = selectedVerse === verse.verse;

          return (
            <div
              key={verse.verse}
              id={`verse-${verse.verse}`}
              onClick={() =>
                setSelectedVerse(isSelected ? null : verse.verse)
              }
              className={`group relative flex items-start gap-2.5 p-2 rounded-xl transition-colors cursor-pointer ${
                isSelected
                  ? "bg-amber-100/60 dark:bg-amber-950/40 ring-1 ring-amber-300 dark:ring-amber-800/60"
                  : "hover:bg-stone-100/50 dark:hover:bg-stone-800/40"
              }`}
            >
              {/* 절 번호 */}
              <span
                className="flex-shrink-0 inline-flex items-center justify-center min-w-[1.5rem] pt-0.5 font-bold text-amber-800/75 dark:text-amber-400/85 select-none"
                style={{ fontSize: `${Math.max(12, fontSize * 0.75)}px` }}
              >
                {verse.verse}
              </span>

              {/* 본문 텍스트 */}
              <p
                className="text-stone-800 dark:text-stone-200 font-normal break-keep tracking-[-0.015em]"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: `${fontSize * 1.85}px`,
                }}
              >
                {verse.displayText}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
};
