"use client";

import React from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import { ChapterData } from "@/types/bible";

interface HeaderProps {
  translation: string;
  books: ChapterData[];
  selectedBookName: string;
  selectedChapter: number;
  onSelectBookName: (bookName: string) => void;
  onSelectChapter: (chapter: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  translation,
  books,
  selectedBookName,
  selectedChapter,
  onSelectBookName,
  onSelectChapter,
}) => {
  // 고유한 성경 책 이름 목록
  const uniqueBookNames = Array.from(new Set(books.map((b) => b.name)));

  // 현재 선택된 책의 사용 가능한 장 목록
  const availableChapters = books.filter((b) => b.name === selectedBookName);

  return (
    <header className="sticky top-0 z-30 w-full bg-[#fcfbf9]/95 dark:bg-[#18181b]/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors shadow-sm">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* 번역본 표기 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-6 h-6 rounded-md bg-amber-700/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-800 dark:text-amber-300">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 tracking-tight">
            {translation}
          </span>
        </div>

        {/* 성경 책 / 장 선택 드롭다운 (예: [창세기 ▼] [1장 ▼]) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* 성경 권(책) 선택 */}
          <div className="relative inline-block">
            <select
              aria-label="성경 책 선택"
              value={selectedBookName}
              onChange={(e) => onSelectBookName(e.target.value)}
              className="appearance-none bg-stone-100/90 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-medium text-xs sm:text-sm pl-2.5 pr-6 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-600/30 transition-all"
            >
              {uniqueBookNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-stone-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 장/편 선택 */}
          <div className="relative inline-block">
            <select
              aria-label="성경 장 선택"
              value={selectedChapter}
              onChange={(e) => onSelectChapter(Number(e.target.value))}
              className="appearance-none bg-stone-100/90 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-medium text-xs sm:text-sm pl-2.5 pr-6 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-600/30 transition-all"
            >
              {availableChapters.map((b) => {
                const unit = b.name === "시편" ? "편" : "장";
                return (
                  <option key={b.chapter} value={b.chapter}>
                    {b.chapter}{unit}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3 h-3 text-stone-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </header>
  );
};
