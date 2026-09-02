import React from "react";

const items = [
  ["track-ot", "📜", "구약"],
  ["track-nt", "🕊️", "신약"],
  ["track-psalms", "🎵", "시편"],
  ["track-proverbs", "💡", "잠언"],
] as const;

interface ReaderQuickNavigationProps {
  onNavigate: (id: string) => void;
  onOneVerse: () => void;
}

export default function ReaderQuickNavigation({ onNavigate, onOneVerse }: ReaderQuickNavigationProps) {
  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 ios-pwa-bottom-safe mr-1 md:mr-2 pointer-events-auto select-none touch-manipulation">
      <div className="flex flex-col gap-1 md:gap-1.5 p-1 md:p-2 bg-zinc-900/80 backdrop-blur-md rounded-[2rem] shadow-lg">
        {items.map(([id, icon, label]) => (
          <button key={id} onClick={() => onNavigate(id)} aria-label={`${label} 본문으로 이동`} className="flex flex-col items-center justify-center w-11 h-11 md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1 cursor-pointer" title={label}>
            <span className="text-[14px] md:text-2xl leading-none mt-0.5 pointer-events-none">{icon}</span>
            <span className="text-[9px] md:text-xs font-medium whitespace-nowrap pointer-events-none">{label}</span>
          </button>
        ))}
        <button onClick={onOneVerse} aria-label="오늘의 One Verse로 이동" className="flex flex-col items-center justify-center w-11 h-11 md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1 cursor-pointer" title="One">
          <span className="text-[14px] md:text-2xl leading-none mt-0.5 pointer-events-none">📌</span><span className="text-[9px] md:text-xs font-medium whitespace-nowrap pointer-events-none">One</span>
        </button>
        <button onClick={() => onNavigate("viewer-bottom")} aria-label="읽기 완료 영역으로 이동" className="flex flex-col items-center justify-center w-11 h-11 md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 active:scale-95 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1 cursor-pointer" title="완료">
          <span className="text-[14px] md:text-2xl leading-none mt-0.5 pointer-events-none">✅</span><span className="text-[9px] md:text-xs font-medium whitespace-nowrap pointer-events-none">완료</span>
        </button>
      </div>
    </div>
  );
}
