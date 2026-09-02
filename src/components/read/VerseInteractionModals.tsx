import React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Bookmark, X, CheckCircle2, Heart, Footprints } from "lucide-react";
import { OneVerse } from "@/lib/storage";

interface VerseInteractionModalsProps {
  showWarningModal: boolean;
  setShowWarningModal: (open: boolean) => void;
  showConfirmModal: boolean;
  setShowConfirmModal: (open: boolean) => void;
  showReselectModal: boolean;
  setShowReselectModal: (open: boolean) => void;
  showSuccessModal: boolean;
  setShowSuccessModal: (open: boolean) => void;
  verseToReplace: OneVerse | null;
  setVerseToReplace: (verse: OneVerse | null) => void;
  confirmedVerse: OneVerse | null;
  setConfirmedVerse: (verse: OneVerse | null) => void;
  selectedVerse: OneVerse | null;
  setSelectedVerse: (verse: OneVerse | null) => void;
  executeReplaceVerse: (verse: OneVerse) => void;
  completeReadingAndShowSuccess: (verse: OneVerse) => void;
  handleConfirmReselect: () => void;
  isCompletedDay: boolean;
  setIsMemoryModalOpen: (open: boolean) => void;
  dayIndex: number;
}

export default function VerseInteractionModals({
  showWarningModal,
  setShowWarningModal,
  showConfirmModal,
  setShowConfirmModal,
  showReselectModal,
  setShowReselectModal,
  showSuccessModal,
  setShowSuccessModal,
  verseToReplace,
  setVerseToReplace,
  confirmedVerse,
  setConfirmedVerse,
  selectedVerse,
  setSelectedVerse,
  executeReplaceVerse,
  completeReadingAndShowSuccess,
  handleConfirmReselect,
  isCompletedDay,
  setIsMemoryModalOpen,
  dayIndex
}: VerseInteractionModalsProps) {
  const router = useRouter();

  const formatReference = (book: string, chapter: number, verse: number) => {
    return book === "시편" ? `${book} ${chapter}편 ${verse}절` : `${book} ${chapter}장 ${verse}절`;
  };

  return (
    <>

      {verseToReplace && confirmedVerse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col p-6 items-center text-center">
            <h2 className="text-xl font-bold text-stone-100 mb-4">One Verse를 교체하시겠습니까?</h2>
            
            <div className="bg-stone-800/50 p-4 rounded-xl mb-4 w-full text-left">
              <div className="text-xs text-stone-400 mb-1 font-bold">기존 One Verse</div>
              <p className="text-stone-300 text-sm leading-relaxed mb-2 line-clamp-3">
                {confirmedVerse.displayText}
              </p>
              <div className="text-xs text-stone-500 font-bold">
                {confirmedVerse.book} {confirmedVerse.chapter}:{confirmedVerse.verse}
              </div>
            </div>

            <p className="text-red-400 text-sm mb-6 font-bold flex items-center justify-center gap-1.5 leading-relaxed bg-red-950/30 p-3 rounded-lg w-full">
              <AlertCircle size={16} className="shrink-0" />
              One Verse를 교체할 경우 남겨둔 발자국과 암송 데이터는 복구할 수 없습니다.
            </p>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setVerseToReplace(null)}
                className="flex-1 py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl transition-colors"
              >
                취소
              </button>
              <button 
                onClick={() => executeReplaceVerse(verseToReplace)}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
              >
                교체
              </button>
            </div>
          </div>
        </div>
      )}

      {showWarningModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-xl w-full max-w-sm flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:bg-amber-400 flex items-center justify-center mb-2">
              <Bookmark size={24} />
            </div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 text-center">One Verse를 선택해주세요 ✨</h3>
            <p className="text-stone-500 dark:text-stone-400 text-center text-sm mb-2">
              마음에 남는 구절을 후보로 담고, 그중 오늘의 One Verse를 지정해야 통독이 완료됩니다.
            </p>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-3 bg-stone-800 hover:bg-stone-900 dark:bg-stone-200 dark:hover:bg-stone-300 dark:text-stone-900 text-white font-bold rounded-xl transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {showReselectModal && confirmedVerse && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-900 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">One Verse를 다시 선택할까요?</h3>
            <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              {isCompletedDay
                ? "완료한 Day의 One Verse는 비워둘 수 없어요. 새 구절을 선택하면 현재 One Verse가 교체됩니다."
                : "현재 선택한 One Verse가 취소됩니다. 후보 목록은 유지되며, 다시 하나를 선택해야 오늘의 읽기를 완료할 수 있어요."}
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowReselectModal(false)} className="flex-1 rounded-xl bg-stone-100 py-3 font-bold text-stone-700 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700">아니요</button>
              <button onClick={handleConfirmReselect} className="flex-1 rounded-xl bg-amber-500 py-3 font-bold text-white transition-colors hover:bg-amber-600">{isCompletedDay ? "새 구절 고르기" : "다시 선택하기"}</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && selectedVerse && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in md:p-4">
          <div className="bg-white dark:bg-stone-900 rounded-none md:rounded-2xl px-6 shadow-xl w-full h-full md:h-auto md:max-h-[85vh] max-w-sm flex flex-col items-center justify-center gap-4 animate-in zoom-in-95 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] md:py-6 overflow-y-auto">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 text-center mb-2 leading-relaxed">
              <span className="block">&apos;{formatReference(selectedVerse.book, selectedVerse.chapter, selectedVerse.verse)}&apos;을(를)</span>
              <span className="block">오늘의 One Verse로 선택하시겠습니까?</span>
            </h3>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors"
              >
                다시 선택하기
              </button>
              <button
                onClick={() => {
                  setConfirmedVerse(selectedVerse);
                  setSelectedVerse(null);
                  setShowConfirmModal(false);
                  completeReadingAndShowSuccess(selectedVerse);
                }}
                className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && confirmedVerse && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in md:p-4">
          <div className="bg-white dark:bg-stone-900 rounded-none md:rounded-3xl p-6 md:p-8 shadow-2xl w-full h-full md:h-auto md:max-h-[85vh] max-w-lg flex flex-col justify-between relative animate-in zoom-in-95 border border-stone-200 dark:border-stone-800 text-center overflow-hidden pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] md:py-8">
            
            <div className="flex-shrink-0 relative">
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="absolute right-0 top-0 p-2 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-emerald-500 w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2 mt-4 md:mt-0">
                오늘 말씀 통독 완료! 🎉
              </h3>
              <p className="text-stone-500 dark:text-stone-400 text-sm sm:text-base mb-4 sm:mb-6">
                오늘의 4개 트랙 말씀을 모두 읽으셨습니다! 👏
              </p>
            </div>
            
            <div className="flex-1 min-h-0 bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-4 sm:p-6 mb-6 border border-stone-100 dark:border-stone-700 flex flex-col items-center justify-center overflow-y-auto">
              <div className="w-full flex flex-col items-center justify-center my-auto">
                <p className={`text-stone-800 dark:text-stone-200 leading-relaxed mb-4 text-center break-keep w-full ${
                  confirmedVerse.displayText.length <= 50 
                    ? "text-2xl sm:text-3xl font-bold" 
                    : confirmedVerse.displayText.length <= 100 
                      ? "text-xl sm:text-2xl font-semibold" 
                      : "text-base sm:text-lg font-medium"
                }`}>
                  {confirmedVerse.displayText}
                </p>
                <p className="text-sm font-bold text-stone-400 dark:text-stone-500 w-full text-center mt-2">
                  {formatReference(confirmedVerse.book, confirmedVerse.chapter, confirmedVerse.verse)}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 flex flex-col gap-3 w-full">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setIsMemoryModalOpen(true);
                }}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Heart size={20} />
                지금 마음 새기기
              </button>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push(`/mypage?action=add-footprint&day=${dayIndex}`);
                }}
                className="w-full py-3.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Footprints size={18} />
                발자국 찍기
              </button>
              
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/mypage");
                }}
                className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors"
              >
                마이페이지로 이동
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
