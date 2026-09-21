import { useEffect, useRef } from "react";
import type { OneVerse } from "@/lib/storage";

interface Props {
  showReselectModal: boolean;
  setShowReselectModal: (open: boolean) => void;
  confirmedVerse: OneVerse | null;
  pendingVerse: OneVerse | null;
  setPendingVerse: (verse: OneVerse | null) => void;
  isSaving: boolean;
  error: string | null;
  handleConfirmReselect: () => Promise<void>;
  handleSaveSelection: () => Promise<void>;
}

export default function VerseInteractionModals({ showReselectModal, setShowReselectModal, confirmedVerse, pendingVerse, setPendingVerse, isSaving, error, handleConfirmReselect, handleSaveSelection }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const isOpen = showReselectModal || !!pendingVerse;
  const isChanging = !!confirmedVerse && !!pendingVerse;
  const title = showReselectModal ? "One Verse를 다시 선택할까요?" : isChanging ? "One Verse를 변경할까요?" : "오늘의 One Verse로 선택할까요?";
  const close = () => {
    if (isSaving) return;
    setShowReselectModal(false);
    setPendingVerse(null);
  };
  useEffect(() => {
    const element = dialog.current;
    if (isOpen && !element?.open) element?.showModal();
    if (!isOpen) element?.close();
    return () => element?.close();
  }, [isOpen]);

  return <dialog ref={dialog} aria-labelledby="verse-choice-title" aria-describedby="verse-choice-description" onCancel={event => { event.preventDefault(); close(); }} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-5 text-stone-800 shadow-xl backdrop:bg-black/60 dark:bg-stone-900 dark:text-stone-100 sm:p-6">
    <h3 id="verse-choice-title" className="text-lg font-bold">{title}</h3>
    <p id="verse-choice-description" className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
      {showReselectModal ? "현재 선택한 One Verse가 취소됩니다. 원하는 구절을 다시 선택할 수 있습니다." : "One Verse 저장에 성공하면 해당 Day의 읽기가 완료됩니다. 이미 완료한 Day의 완료 시각과 읽은 날짜는 유지됩니다."}
    </p>
    {isChanging && <section className="mt-4 rounded-xl bg-stone-100 p-3 text-sm dark:bg-stone-800"><h4 className="font-bold">기존 One Verse · {confirmedVerse.reference}</h4><p className="mt-2 whitespace-pre-wrap break-words">{confirmedVerse.displayText}</p></section>}
    {pendingVerse && <section className="mt-3 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950"><h4 className="font-bold">{isChanging ? "새 One Verse" : "선택한 One Verse"} · {pendingVerse.reference}</h4><p className="mt-2 whitespace-pre-wrap break-words">{pendingVerse.displayText}</p></section>}
    {confirmedVerse && <p className="mt-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">기존 발자국·마음새김은 비공개 이력에 보관되며 새 구절로 이전되거나 화면에서 자동 복원되지 않습니다. 읽은 날짜·완료 시각·Mark·기존 아멘과 알림은 유지됩니다. 아멘은 구절별이 아닌 Day별 기록입니다.</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
    <div className="mt-6 flex gap-3">
      <button type="button" disabled={isSaving} onClick={close} className="min-h-11 flex-1 rounded-xl bg-stone-100 px-3 py-3 font-bold disabled:opacity-50 dark:bg-stone-800">취소</button>
      <button type="button" disabled={isSaving} onClick={() => void (showReselectModal ? handleConfirmReselect() : handleSaveSelection())} className="min-h-11 flex-1 rounded-xl bg-amber-500 px-3 py-3 font-bold text-white disabled:opacity-50">{isSaving ? "저장 중…" : showReselectModal ? "다시 선택하기" : isChanging ? "변경하기" : "One Verse 지정"}</button>
    </div>
  </dialog>;
}
