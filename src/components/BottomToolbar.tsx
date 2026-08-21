"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BottomToolbarProps {
  fontSize: number;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  fontSize,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
}) => {
  const minFontSize = 14;
  const maxFontSize = 26;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 bg-[#fcfbf9]/95 dark:bg-[#18181b]/95 backdrop-blur-md border-t border-stone-200/80 dark:border-stone-800 shadow-lg transition-colors">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* 폰트 크기 조절 영역 */}
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl border border-stone-200/70 dark:border-stone-700/70">
          <button
            type="button"
            aria-label="글자 크기 축소"
            onClick={onDecreaseFontSize}
            disabled={fontSize <= minFontSize}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-0.5"
          >
            <span>가-</span>
          </button>
          
          <span className="text-[11px] font-mono font-medium text-stone-500 dark:text-stone-400 px-1 select-none min-w-[2rem] text-center">
            {fontSize}
          </span>

          <button
            type="button"
            aria-label="글자 크기 확대"
            onClick={onIncreaseFontSize}
            disabled={fontSize >= maxFontSize}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-0.5"
          >
            <span>가+</span>
          </button>
        </div>

        {/* 이전 / 다음 장 네비게이션 버튼 */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="이전 장으로 이동"
            onClick={onPrevChapter}
            disabled={!hasPrevChapter}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>이전 장</span>
          </button>

          <button
            type="button"
            aria-label="다음 장으로 이동"
            onClick={onNextChapter}
            disabled={!hasNextChapter}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 border border-stone-900 dark:border-stone-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
          >
            <span>다음 장</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
