"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, BookOpen } from "lucide-react";
import { getDailyReadingByIndex, getAllSchedules } from "@/lib/bible";
import type { DailyReading } from "@/types/bible";
import MemoryTrainerModal from "@/components/MemoryTrainerModal";
import ShareModal from "@/components/ShareModal";
import { signInWithKakao } from "@/lib/supabase";
import { useBibleReader } from "@/hooks/useBibleReader";
import ReadHeader from "@/components/read/ReadHeader";
import BibleContent from "@/components/read/BibleContent";
import DaySelectorSheet from "@/components/read/DaySelectorSheet";
import VerseInteractionModals from "@/components/read/VerseInteractionModals";
import ReaderQuickNavigation from "@/components/read/ReaderQuickNavigation";
import { shareOneVerse } from "@/lib/share";
import { getNextUnreadDay } from "@/lib/storage";
import { useSettings } from "@/contexts/SettingsContext";

const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    const scrollContainer = document.getElementById('bible-content-scroll');
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetTop = scrollContainer.scrollTop + (elRect.top - containerRect.top);
      scrollContainer.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth"
      });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
};

const scrollElementToCenter = (element: HTMLElement) => {
  const scrollContainer = document.getElementById('bible-content-scroll');
  if (!scrollContainer) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const containerRect = scrollContainer.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const targetTop = scrollContainer.scrollTop
    + (elementRect.top + elementRect.height / 2)
    - (containerRect.top + containerRect.height / 2);
  const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
  scrollContainer.scrollTo({
    top: Math.min(Math.max(0, targetTop), maxScrollTop),
    behavior: 'smooth',
  });
};

export default function BibleViewerPage() {
  const { fontSize } = useSettings();
  const [readingData, setReadingData] = useState<DailyReading | null>(null);
  const [isReadingTextLoading, setIsReadingTextLoading] = useState(true);
  const [readingTextError, setReadingTextError] = useState(false);
  const [readingTextRetryKey, setReadingTextRetryKey] = useState(0);
  const [markNavigationIndex, setMarkNavigationIndex] = useState(0);
  
  const {
    isClient,
    authUser,
    settings,
    records,
    dayIndex,
    isDaySelectorOpen,
    setIsDaySelectorOpen,
    isCompletedDay,
    selectedVerse,
    setSelectedVerse,
    confirmedVerse,
    setConfirmedVerse,
    oneVerseCandidates,
    isMemoryModalOpen,
    setIsMemoryModalOpen,
    showWarningModal,
    setShowWarningModal,
    showConfirmModal,
    setShowConfirmModal,
    showCompletionModal,
    setShowCompletionModal,
    showCompletionCancelModal,
    setShowCompletionCancelModal,
    showReselectModal,
    setShowReselectModal,
    verseToReplace,
    setVerseToReplace,
    showSuccessModal,
    setShowSuccessModal,
    showAccessDeniedModal,
    setShowAccessDeniedModal,
    selectedRecordToShare,
    setSelectedRecordToShare,
    toastMessage,
    showToast,
    headerRef,
    headerHeight,
    isDataLoaded,
    handleSetDay,
    handleGoToLastRead,
    handleVerseClick,
    handleConfirmVerse,
    handleRequestReselect,
    handleConfirmReselect,
    handleToggleCandidate,
    executeReplaceVerse,
    handleBottomButtonClick,
    handleCancelCompletion,
    completeReadingAndShowSuccess,
    handleMemoryComplete,
    calculateDaysSince
  } = useBibleReader();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const allSchedules = getAllSchedules();

  useEffect(() => {
    setMarkNavigationIndex(0);
  }, [dayIndex, oneVerseCandidates]);

  useEffect(() => {
    if (!isClient || !isDataLoaded || !authUser) return;

    let isActive = true;
    setIsReadingTextLoading(true);
    setReadingTextError(false);
    setReadingData(null);

    getDailyReadingByIndex(dayIndex)
      .then((data) => {
        if (isActive) setReadingData(data);
      })
      .catch((error: unknown) => {
        console.error('Failed to load Bible text:', error);
        if (isActive) setReadingTextError(true);
      })
      .finally(() => {
        if (isActive) setIsReadingTextLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [authUser, dayIndex, isClient, isDataLoaded, readingTextRetryKey]);



  if (!isClient) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-3 text-stone-500">
        <BookOpen className="animate-pulse w-8 h-8" />
        <span className="text-sm font-medium">오늘의 말씀을 펴는 중...</span>
      </div>
    );
  }

  // 스켈레톤 UI (로딩 중)
  if (!isDataLoaded) {
    return (
      <div className="w-full min-h-screen bg-stone-50 dark:bg-stone-950 flex justify-center pb-20">
        <div className="w-full max-w-2xl bg-white dark:bg-stone-900 min-h-screen shadow-sm flex flex-col relative pb-32">
          {/* Header Skeleton */}
          <div className="sticky top-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur border-b border-stone-200/50 dark:border-stone-800/50 flex flex-col pt-6 pb-2 px-6">
            <div className="flex items-center gap-2">
              <div className="w-16 h-8 bg-stone-200 dark:bg-stone-800 rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* Content Skeleton */}
          <div className="flex-1 p-6 space-y-12">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-6">
                {/* Track Title Skeleton */}
                <div className="w-24 h-6 bg-stone-200 dark:bg-stone-800 rounded animate-pulse"></div>
                {/* Verses Skeleton */}
                <div className="space-y-4">
                  {[1, 2, 3].map((v) => (
                    <div key={v} className="flex gap-4">
                      <div className="w-4 h-4 mt-1 bg-stone-200 dark:bg-stone-800 rounded-full shrink-0 animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="w-full h-5 bg-stone-200 dark:bg-stone-800 rounded animate-pulse"></div>
                        <div className="w-5/6 h-5 bg-stone-200 dark:bg-stone-800 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 첫 화면: 로그인 전용 랜딩
  if (!authUser) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 p-6 px-4">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 rounded-3xl shadow-xl border border-stone-200 dark:border-stone-800 p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 text-center items-center">
          <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/50 rounded-full flex items-center justify-center text-3xl mb-1">
            🕊️
          </div>
          <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100">말씀 통독 & 마음새김</h1>
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



  // 스켈레톤 UI (로딩 중)
  if (!isDataLoaded) {
    return (
      <div className="w-full min-h-screen bg-stone-50 dark:bg-stone-950 flex justify-center pb-20">
        <div className="w-full max-w-2xl bg-white dark:bg-stone-900 min-h-screen shadow-sm flex flex-col relative pb-32">
          {/* Header Skeleton */}
          <div className="sticky top-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur border-b border-stone-200/50 dark:border-stone-800/50 flex flex-col pt-6 pb-2 px-6">
            <div className="flex items-center gap-2">
              <div className="w-16 h-8 bg-stone-200 dark:bg-stone-800 rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* Content Skeleton */}
          <div className="flex-1 p-6 space-y-12">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-6">
                {/* Track Title Skeleton */}
                <div className="w-24 h-6 bg-stone-200 dark:bg-stone-800 rounded animate-pulse"></div>
                {/* Verses Skeleton */}
                <div className="space-y-4">
                  {[1, 2, 3].map((v) => (
                    <div key={v} className="flex gap-4">
                      <div className="w-4 h-4 mt-1 bg-stone-200 dark:bg-stone-800 rounded-full shrink-0 animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="w-full h-5 bg-stone-200 dark:bg-stone-800 rounded animate-pulse"></div>
                        <div className="w-5/6 h-5 bg-stone-200 dark:bg-stone-800 rounded animate-pulse"></div>
                        {v === 1 && <div className="w-2/3 h-5 bg-stone-200 dark:bg-stone-800 rounded animate-pulse"></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isReadingTextLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-3 text-stone-500">
        <BookOpen className="animate-pulse w-8 h-8" />
        <span className="text-sm font-medium">오늘의 본문을 불러오는 중...</span>
      </div>
    );
  }

  if (readingTextError) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-4 p-8 text-center text-stone-500">
        <p>본문을 불러오지 못했습니다. 네트워크를 확인한 뒤 다시 시도해주세요.</p>
        <button
          type="button"
          onClick={() => setReadingTextRetryKey((key) => key + 1)}
          className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!readingData) {
    return <div className="p-8 text-center text-stone-500">데이터를 불러올 수 없습니다.</div>;
  }

  return (
    <div className="relative flex h-[calc(100vh-4rem)] min-h-0 w-full flex-col overflow-hidden bg-stone-200/50 dark:bg-stone-950">
      
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
        showWarningModal={showWarningModal}
        setShowWarningModal={setShowWarningModal}
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        showCompletionModal={showCompletionModal}
        setShowCompletionModal={setShowCompletionModal}
        showCompletionCancelModal={showCompletionCancelModal}
        setShowCompletionCancelModal={setShowCompletionCancelModal}
        showReselectModal={showReselectModal}
        setShowReselectModal={setShowReselectModal}
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
        handleCancelCompletion={handleCancelCompletion}
        handleConfirmReselect={handleConfirmReselect}
        isCompletedDay={isCompletedDay}
        setIsMemoryModalOpen={setIsMemoryModalOpen}
        dayIndex={dayIndex}
      />

      <ReaderQuickNavigation
        onNavigate={scrollToSection}
        onOneVerse={() => {
          if (confirmedVerse) {
            const target = document.getElementById('one-verse-target');
            if (target) scrollElementToCenter(target);
            return;
          }
          showToast("One Verse를 선택해 주세요.");
        }}
        onMark={() => {
          const markedTargets = Array.from(
            document.querySelectorAll<HTMLElement>('[data-one-verse-marked="true"]'),
          );
          if (markedTargets.length === 0) {
            showToast("마킹한 구절이 없어요.");
            return;
          }
          const targetIndex = markNavigationIndex % markedTargets.length;
          scrollElementToCenter(markedTargets[targetIndex]);
          setMarkNavigationIndex((current) => (current + 1) % markedTargets.length);
        }}
      />

      <div className="relative mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden bg-white shadow-2xl dark:bg-stone-900">
        
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
          markedVerses={oneVerseCandidates}
          records={records}
          dayIndex={dayIndex}
          isCompletedDay={isCompletedDay}
          setIsMemoryModalOpen={setIsMemoryModalOpen}
          handleShareOneVerseClick={(record) => setSelectedRecordToShare(record)}
          handleConfirmVerse={handleConfirmVerse}
          handleToggleMark={handleToggleCandidate}
          handleRequestReselect={handleRequestReselect}
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
