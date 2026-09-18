import React from "react";

interface VerseInteractionModalsProps {
  showReselectModal: boolean;
  setShowReselectModal: (open: boolean) => void;
  confirmedVerse: { displayText: string } | null;
  handleConfirmReselect: () => Promise<void>;
}

export default function VerseInteractionModals({
  showReselectModal,
  setShowReselectModal,
  confirmedVerse,
  handleConfirmReselect,
}: VerseInteractionModalsProps) {
  if (!showReselectModal || !confirmedVerse) return null;

  return (
    <div data-v2-dialog className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div data-v2-dialog-panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-900 animate-in zoom-in-95">
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">One Verse를 다시 선택할까요?</h3>
        <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          현재 선택한 One Verse가 취소됩니다. 마킹은 유지되며, 새 구절을 저장하는 순간 읽기가 완료됩니다.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setShowReselectModal(false)} className="flex-1 rounded-xl bg-stone-100 py-3 font-bold text-stone-700 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700">아니요</button>
          <button type="button" onClick={() => void handleConfirmReselect()} className="flex-1 rounded-xl bg-amber-500 py-3 font-bold text-white transition-colors hover:bg-amber-600">다시 선택하기</button>
        </div>
      </div>
    </div>
  );
}
