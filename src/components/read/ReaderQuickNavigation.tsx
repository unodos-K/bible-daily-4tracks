import React from "react";
import { BookMarked, BookOpen, CircleCheck, Highlighter, Lightbulb, Music2, Pin, type LucideIcon } from "lucide-react";

const items = [
  ["track-ot", BookOpen, "구약"],
  ["track-nt", BookMarked, "신약"],
  ["track-psalms", Music2, "시편"],
  ["track-proverbs", Lightbulb, "잠언"],
] as const satisfies ReadonlyArray<readonly [string, LucideIcon, string]>;

interface ReaderQuickNavigationProps {
  onNavigate: (id: string) => void;
  onOneVerse: () => void;
  onMark: () => void;
}

export default function ReaderQuickNavigation({ onNavigate, onOneVerse, onMark }: ReaderQuickNavigationProps) {
  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 ios-pwa-bottom-safe mr-1 md:mr-2 pointer-events-auto select-none touch-manipulation">
      <div className="flex flex-col gap-1 md:gap-1.5">
        {items.map(([id, Icon, label]) => (
          <button key={id} onClick={() => onNavigate(id)} aria-label={`${label} 본문으로 이동`} className="flex flex-col items-center justify-center w-11 h-11 md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1 cursor-pointer" title={label}>
            <Icon size={18} strokeWidth={2} className="pointer-events-none md:h-6 md:w-6" />
            <span className="text-[9px] md:text-xs font-medium whitespace-nowrap pointer-events-none">{label}</span>
          </button>
        ))}
        <button onClick={onOneVerse} aria-label="오늘의 One Verse로 이동" className="flex flex-col items-center justify-center w-11 h-11 md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1 cursor-pointer" title="One">
          <Pin size={18} strokeWidth={2} className="pointer-events-none md:h-6 md:w-6" /><span className="text-[9px] md:text-xs font-medium whitespace-nowrap pointer-events-none">One</span>
        </button>
        <button onClick={onMark} aria-label="마킹한 구절로 이동" className="flex flex-col items-center justify-center w-11 h-11 md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1 cursor-pointer" title="마킹">
          <Highlighter size={18} strokeWidth={2} className="pointer-events-none md:h-6 md:w-6" /><span className="text-[9px] md:text-xs font-medium whitespace-nowrap pointer-events-none">Mark</span>
        </button>
        <button onClick={() => onNavigate("viewer-bottom")} aria-label="읽기 완료 영역으로 이동" className="flex flex-col items-center justify-center w-11 h-11 md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1 cursor-pointer" title="완료">
          <CircleCheck size={18} strokeWidth={2} className="pointer-events-none md:h-6 md:w-6" /><span className="text-[9px] md:text-xs font-medium whitespace-nowrap pointer-events-none">완료</span>
        </button>
      </div>
    </div>
  );
}
