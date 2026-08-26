"use client";

import React, { useRef } from "react";
import { AlertCircle } from "lucide-react";
import { getDailyReadingByIndex, getAllSchedules } from "@/lib/bible";
import MemoryTrainerModal from "@/components/MemoryTrainerModal";
import ShareModal from "@/components/ShareModal";
import { signInWithKakao } from "@/lib/supabase";
import { useBibleReader } from "@/hooks/useBibleReader";
import ReadHeader from "@/components/read/ReadHeader";
import BibleContent from "@/components/read/BibleContent";
import DaySelectorSheet from "@/components/read/DaySelectorSheet";
import VerseInteractionModals from "@/components/read/VerseInteractionModals";
import { shareOneVerse } from "@/lib/share";
import { getNextUnreadDay } from "@/lib/storage";
import { useSettings } from "@/contexts/SettingsContext";

const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    const headerOffset = 60;
    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    });
  }
};
export default function BibleViewerPage() {
  const { fontSize } = useSettings();
  
  const {
    isClient,
    authUser,
    settings,
    records,
    dayIndex,
    setDayIndex,
    isDaySelectorOpen,
    setIsDaySelectorOpen,
    isCompletedDay,
    selectedVerse,
    setSelectedVerse,
    confirmedVerse,
    setConfirmedVerse,
    isMemoryModalOpen,
    setIsMemoryModalOpen,
    showWarningModal,
    setShowWarningModal,
    showConfirmModal,
    setShowConfirmModal,
    verseToReplace,
    setVerseToReplace,
    showSuccessModal,
    setShowSuccessModal,
    showAccessDeniedModal,
    setShowAccessDeniedModal,
    showDailyLimitModal,
    setShowDailyLimitModal,
    selectedRecordToShare,
    setSelectedRecordToShare,
    toastMessage,
    headerRef,
    headerHeight,
    handleSetDay,
    handleGoToLastRead,
    handleVerseClick,
    handleConfirmVerse,
    executeReplaceVerse,
    handleBottomButtonClick,
    completeReadingAndShowSuccess,
    handleMemoryComplete,
    calculateDaysSince
  } = useBibleReader();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const allSchedules = getAllSchedules();



  if (!isClient) {
    return <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex justify-center items-center text-stone-500">Loading...</div>;
  }

  // 첫 화면: 로그인 전용 랜딩
  if (!authUser) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 p-6 px-4">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 rounded-3xl shadow-xl border border-stone-200 dark:border-stone-800 p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 text-center items-center">
          <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/50 rounded-full flex items-center justify-center text-3xl mb-1">
            🕊️
          </div>
          <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100">말씀 통독 & 뇌새김 암송</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">매일 말씀과 동행하는 삶을 시작해보세요.</p>
          
          <button
            onClick={signInWithKakao}
            className="w-full py-4 mt-4 bg-[#FEE500] hover:bg-[#FDD800] text-black font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-lg">💬</span> 카카오 로그인하고 시작하기
          </button>
        </div>
      </div>
    );
  }



  const readingData = getDailyReadingByIndex(dayIndex);
  if (!readingData) {
    return <div className="p-8 text-center text-stone-500">데이터를 불러올 수 없습니다.</div>;
  }

  return (
    <div className="w-full min-h-[calc(100vh-52px)] flex justify-center bg-stone-200/50 dark:bg-stone-950 pb-20 relative">
      
      {/* Toast */}
      {toastMessage && (
        <div 
          style={{ top: `${headerHeight + 12}px` }}
          className="fixed left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4"
        >
          {toastMessage}
        </div>
      )}

      {/* Access Denied Modal */}
      {showAccessDeniedModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-xl w-full max-w-sm flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 text-center">아직 열리지 않은 Day입니다 🔒</h3>
            <p className="text-stone-500 dark:text-stone-400 text-center text-sm mb-2">
              <span className="block">이전 Day를 먼저 통독해 주세요! ✨</span>
              <span className="block">한 걸음씩 차근차근 나아가는 것이 중요합니다.</span>
            </p>
            <button
              onClick={() => {
                setShowAccessDeniedModal(false);
                handleSetDay(getNextUnreadDay(records));
              }}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-colors"
            >
              현재 차례(Day {getNextUnreadDay(records)})로 이동하기
            </button>
          </div>
        </div>
      )}

      <VerseInteractionModals
        showDailyLimitModal={showDailyLimitModal}
        setShowDailyLimitModal={setShowDailyLimitModal}
        showWarningModal={showWarningModal}
        setShowWarningModal={setShowWarningModal}
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={setShowSuccessModal}
        verseToReplace={verseToReplace}
        setVerseToReplace={setVerseToReplace}
        confirmedVerse={confirmedVerse}
        setConfirmedVerse={setConfirmedVerse}
        selectedVerse={selectedVerse}
        setSelectedVerse={setSelectedVerse}
        executeReplaceVerse={executeReplaceVerse}
        completeReadingAndShowSuccess={completeReadingAndShowSuccess}
        setIsMemoryModalOpen={setIsMemoryModalOpen}
        setDayIndex={setDayIndex}
        getNextUnreadDay={getNextUnreadDay}
        records={records}
      />

      {/* 플로팅 퀵 네비게이터 */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 ios-pwa-bottom-safe mr-1 md:mr-2">
        <div className="flex flex-col gap-1 md:gap-1.5 p-1 md:p-2 bg-zinc-900/80 backdrop-blur-md rounded-[2rem] shadow-lg">
          <button 
            onClick={() => {
              const main = document.querySelector('main');
              if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center w-[38px] h-[38px] md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1" 
            title="처음"
          >
            <span className="text-[14px] md:text-2xl leading-none mt-0.5">🏠</span>
            <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">홈</span>
          </button>
          <button 
            onClick={() => scrollToSection('track-old-testament')} 
            className="flex flex-col items-center justify-center w-[38px] h-[38px] md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1" 
            title="구약"
          >
            <span className="text-[14px] md:text-2xl leading-none mt-0.5">📜</span>
            <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">구약</span>
          </button>
          <button 
            onClick={() => scrollToSection('track-new-testament')} 
            className="flex flex-col items-center justify-center w-[38px] h-[38px] md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1" 
            title="신약"
          >
            <span className="text-[14px] md:text-2xl leading-none mt-0.5">🕊️</span>
            <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">신약</span>
          </button>
          <button 
            onClick={() => scrollToSection('track-psalms')} 
            className="flex flex-col items-center justify-center w-[38px] h-[38px] md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1" 
            title="시편"
          >
            <span className="text-[14px] md:text-2xl leading-none mt-0.5">🎵</span>
            <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">시편</span>
          </button>
          <button 
            onClick={() => scrollToSection('track-proverbs')} 
            className="flex flex-col items-center justify-center w-[38px] h-[38px] md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1" 
            title="잠언"
          >
            <span className="text-[14px] md:text-2xl leading-none mt-0.5">💡</span>
            <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">잠언</span>
          </button>
          <button 
            onClick={() => {
              const el = document.getElementById('one-verse-target');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                alert("오늘의 One Verse를 먼저 지정해주세요.");
              }
            }} 
            className="flex flex-col items-center justify-center w-[38px] h-[38px] md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1" 
            title="One"
          >
            <span className="text-[14px] md:text-2xl leading-none mt-0.5">📌</span>
            <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">One</span>
          </button>
          <button 
            onClick={() => scrollToSection('viewer-bottom')} 
            className="flex flex-col items-center justify-center w-[38px] h-[38px] md:w-16 md:h-16 aspect-square rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-105 gap-0 md:gap-1" 
            title="완료"
          >
            <span className="text-[14px] md:text-2xl leading-none mt-0.5">✅</span>
            <span className="text-[9px] md:text-xs font-medium whitespace-nowrap">완료</span>
          </button>
        </div>
      </div>



      <div className="w-full max-w-2xl bg-transparent shadow-2xl flex flex-col relative min-h-full">
        
        {/* 상단 네비게이터 */}
        <ReadHeader
          dayIndex={dayIndex}
          handleSetDay={handleSetDay}
          isDaySelectorOpen={isDaySelectorOpen}
          setIsDaySelectorOpen={setIsDaySelectorOpen}
          readingData={readingData}
          isCompletedDay={isCompletedDay}
          records={records}
          settings={settings}
          headerRef={headerRef}
          calculateDaysSince={calculateDaysSince}
        />

        <DaySelectorSheet
          isDaySelectorOpen={isDaySelectorOpen}
          setIsDaySelectorOpen={setIsDaySelectorOpen}
          headerHeight={headerHeight}
          scrollContainerRef={scrollContainerRef}
          handleGoToLastRead={handleGoToLastRead}
          allSchedules={allSchedules}
          records={records}
          dayIndex={dayIndex}
          handleSetDay={handleSetDay}
          getNextUnreadDay={getNextUnreadDay}
        />

        <BibleContent
          readingData={readingData}
          headerHeight={headerHeight}
          fontSize={fontSize}
          selectedVerse={selectedVerse}
          confirmedVerse={confirmedVerse}
          records={records}
          dayIndex={dayIndex}
          isCompletedDay={isCompletedDay}
          setIsMemoryModalOpen={setIsMemoryModalOpen}
          handleShareOneVerseClick={(record) => setSelectedRecordToShare(record)}
          handleConfirmVerse={handleConfirmVerse}
          handleVerseClick={handleVerseClick}
          handleBottomButtonClick={handleBottomButtonClick}
        />
      </div>

      {/* 암송 트레이너 모달 */}
      {isMemoryModalOpen && confirmedVerse && (
        <MemoryTrainerModal
          oneVerse={confirmedVerse}
          onClose={() => setIsMemoryModalOpen(false)}
          onComplete={handleMemoryComplete}
        />
      )}

      <ShareModal 
        isOpen={!!selectedRecordToShare} 
        onClose={() => setSelectedRecordToShare(null)} 
        record={selectedRecordToShare} 
        onShare={(orderedItems) => {
          const nickname = authUser ? (authUser.nickname || authUser.name).split('#')[0] : '순례자';
          shareOneVerse(selectedRecordToShare!, nickname, orderedItems);
          setSelectedRecordToShare(null);
        }}
      />

    </div>
  );
}
