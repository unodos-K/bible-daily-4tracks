"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ZoomIn, ZoomOut, ChevronDown, CheckCircle2, Bookmark, BrainCircuit, AlertCircle, Leaf, Crown } from "lucide-react";
import { getDailyReadingByIndex, getAllSchedules, TRACK_INFO } from "@/lib/bible";
import MemoryTrainerModal from "@/components/MemoryTrainerModal";
import { 
  ReadingSettings,
  ReadRecordsMap,
  OneVerse,
  fetchReadingSettings, 
  fetchReadRecords,
  startNewReading,
  getNextUnreadDay,
  saveDayRecord,
  updateReadRecordOneVerse,
  updateMemorizeRecord,
  getTodayReadCount,
  saveViewerDay,
  getSavedViewerDay
} from "@/lib/storage";
import { getAuthUser, AuthUser } from "@/lib/auth";
import { signInWithKakao } from "@/lib/supabase";
import { useSettings } from "@/contexts/SettingsContext";

const TRACK_ICONS: Record<string, string> = {
  "구약": "📖",
  "신약": "✝️",
  "시편": "🕊️",
  "잠언": "💡",
};

const TRACK_ID_MAP: Record<string, string> = {
  "구약": "track-old-testament",
  "신약": "track-new-testament",
  "시편": "track-psalms",
  "잠언": "track-proverbs",
};

const formatReference = (book: string, chapter: number, verse: number) => {
  return book === "시편" ? `${book} ${chapter}편 ${verse}절` : `${book} ${chapter}장 ${verse}절`;
};

export default function BibleViewerPage() {
  const router = useRouter();
  
  const [isClient, setIsClient] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<ReadingSettings | null>(null);
  const [records, setRecords] = useState<ReadRecordsMap>({});
  
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");


  const [dayIndex, setDayIndex] = useState<number>(1);
  const { fontSize, setFontSize } = useSettings();
  const [isDaySelectorOpen, setIsDaySelectorOpen] = useState(false);
  
  const [isCompletedDay, setIsCompletedDay] = useState(false);
  
  const [selectedVerse, setSelectedVerse] = useState<OneVerse | null>(null);
  const [confirmedVerse, setConfirmedVerse] = useState<OneVerse | null>(null);
  
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const allSchedules = getAllSchedules();

  const handleSetDay = (newDay: number, currentRecords: ReadRecordsMap = records) => {
    const validDay = Math.max(1, Math.min(365, newDay));
    const maxAllowedDay = getNextUnreadDay(currentRecords);
    const isAlreadyRead = !!currentRecords[validDay];
    
    // 권한 체크: 열리지 않은 미래의 Day
    if (validDay > maxAllowedDay) {
      setShowAccessDeniedModal(true);
      setIsDaySelectorOpen(false);
      return;
    }

    // 일일 3개 제한 체크: 열리지 않은 '오늘의 새로운 Day'를 열려고 할 때만 발동
    const dateObj = new Date();
    const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    if (!isAlreadyRead && getTodayReadCount(todayStr, currentRecords) >= 3) {
      setShowDailyLimitModal(true);
      setIsDaySelectorOpen(false);
      return;
    }

    setDayIndex(validDay);
    saveViewerDay(validDay);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsDaySelectorOpen(false);
    setSelectedVerse(null);
  };

  useEffect(() => {
    setIsClient(true);
    
    getAuthUser().then(async (user) => {
      setAuthUser(user);
      
      let currentRecords: ReadRecordsMap = {};
      let currentSettings: ReadingSettings | null = null;
      
      if (user) {
        // Handle invite code
        const searchParams = new URLSearchParams(window.location.search);
        const inviteCode = searchParams.get('inviteCode');
        if (inviteCode) {
          import('@/lib/social').then(m => m.addFriend(inviteCode).catch(e => console.error(e)));
          window.history.replaceState({}, '', window.location.pathname);
        }
        currentSettings = await fetchReadingSettings();
        currentRecords = await fetchReadRecords();
      }
      
      if (!currentSettings || !currentSettings.hasStarted) {
        const dateObj = new Date();
        const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        await startNewReading(todayStr);
        currentSettings = {
          startDate: todayStr,
          currentDay: 1,
          hasStarted: true
        };
        currentRecords = {};
      }
      
      setSettings(currentSettings);
      setRecords(currentRecords);

      try {
        const dateObj = new Date();
        const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        const maxAllowed = getNextUnreadDay(currentRecords);
        const isLimitReached = getTodayReadCount(todayStr, currentRecords) >= 3;

        let initialDay = maxAllowed;
        const savedDay = getSavedViewerDay();
        
        if (savedDay) {
          if (savedDay >= 1 && savedDay <= 365) {
            initialDay = Math.min(savedDay, maxAllowed);
          }
        }

        // 초기 진입 시 제한에 걸려있는데 새로운 Day를 열려고 하는 경우
        if (initialDay === maxAllowed && isLimitReached) {
          initialDay = Math.max(1, maxAllowed - 1);
          setShowDailyLimitModal(true);
        }

        setDayIndex(initialDay);
      } catch {
        // ignore
      }
    });
  }, []);

  // Load record for the current dayIndex
  useEffect(() => {
    if (isClient && settings?.hasStarted) {
      const record = records[dayIndex];
      if (record) {
        setIsCompletedDay(true);
        setConfirmedVerse(record.oneVerse || null);
        setSelectedVerse(null);
      } else {
        setIsCompletedDay(false);
        setConfirmedVerse(null);
      }
    }
  }, [isClient, dayIndex, settings, records]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 90; // 상단 고정 헤더 높이만큼 오프셋 보정
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // 마지막으로 읽은(완료된) Day로 이동하는 핸들러
  const handleGoToLastRead = () => {
    const completedDays = Object.keys(records)
      .map((k) => Number(k))
      .filter((day) => !!records[day]?.oneVerse);
    const lastDay = completedDays.length > 0 ? Math.max(...completedDays) : 1;
    handleSetDay(lastDay);
    setIsDaySelectorOpen(false); // 드롭다운 닫기
  };




  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize);
  };


  const handleVerseClick = async (trackType: string, book: string, chapter: number, verse: number, rawText: string, displayText: string, chunks: string[]) => {
    const verseObj = {
      trackType,
      book,
      chapter,
      verse,
      rawText,
      displayText,
      chunks,
      reference: `${book} ${chapter}:${verse}`
    };

    const isConfirmed = confirmedVerse?.book === book && confirmedVerse?.chapter === chapter && confirmedVerse?.verse === verse;
    if (isConfirmed) {
      if (isCompletedDay) {
        const success = await updateReadRecordOneVerse(dayIndex, null);
        if (success) {
          setConfirmedVerse(null);
          const r = await fetchReadRecords();
          setRecords(r);
          showToast("One Verse 선택이 해제되었습니다.");
        } else {
          alert("저장에 실패했습니다.");
        }
      } else {
        setConfirmedVerse(null);
      }
      return;
    }

    const isSelected = selectedVerse?.book === book && selectedVerse?.chapter === chapter && selectedVerse?.verse === verse;
    if (isSelected) {
      setSelectedVerse(null);
    } else {
      setSelectedVerse(verseObj);
    }
  };

  const handleConfirmVerse = async (verse: OneVerse, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isCompletedDay) {
      const success = await updateReadRecordOneVerse(dayIndex, verse);
      if (success) {
        setConfirmedVerse(verse);
        setSelectedVerse(null);
        const r = await fetchReadRecords();
        setRecords(r);
        showToast("One Verse가 새로 지정되었습니다.");
      } else {
        alert("저장에 실패했습니다.");
      }
    } else {
      setConfirmedVerse(verse);
      setSelectedVerse(null);
    }
  };

  const handleBottomButtonClick = () => {
    if (!confirmedVerse && !selectedVerse) {
      setShowWarningModal(true);
      return;
    }
    if (!confirmedVerse && selectedVerse) {
      setShowConfirmModal(true);
      return;
    }
    if (confirmedVerse) {
      completeReadingAndShowSuccess(confirmedVerse);
    }
  };

  const completeReadingAndShowSuccess = async (verse: OneVerse) => {
    const dateObj = new Date();
    const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    if (!isCompletedDay) {
      const success = await saveDayRecord({
        dayIndex: dayIndex,
        readDate: todayStr,
        completedAt: new Date().toISOString(),
        oneVerse: verse,
      });
      if (success) {
        setIsCompletedDay(true);
        const r = await fetchReadRecords();
        setRecords(r);
        setShowSuccessModal(true);
      } else {
        alert("저장에 실패했습니다.");
      }
    } else {
      setShowSuccessModal(true);
    }
  };

  const handleMemoryComplete = async () => {
    if (confirmedVerse) {
      await updateMemorizeRecord(dayIndex, true, confirmedVerse);
      setConfirmedVerse({ ...confirmedVerse, isMemorized: true, memorizedAt: new Date().toISOString() });
      const r = await fetchReadRecords();
      setRecords(r);
      setIsMemoryModalOpen(false);
    }
  };


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
        <div className="fixed top-[64px] left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900 px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      {/* Access Denied Modal */}
      {showAccessDeniedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-xl w-full max-w-sm flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 text-center">아직 열리지 않은 Day입니다 🔒</h3>
            <p className="text-stone-500 dark:text-stone-400 text-center text-sm mb-2">
              이전 Day를 먼저 통독해 주세요! ✨<br/>한 걸음씩 차근차근 나아가는 것이 중요합니다.
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

      {/* Daily Limit Modal (최대 3개 제한) */}
      {showDailyLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-xl w-full max-w-md flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <Leaf size={32} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 text-center">오늘의 권장 통독 분량을<br/>달성했습니다! 🌿</h3>
            <p className="text-stone-500 dark:text-stone-400 text-center text-sm mb-4 leading-relaxed">
              말씀의 깊은 묵상을 위해 하루에 최대 3개 Day까지만 읽을 수 있습니다.<br/>내일 새로운 마음으로 다음 말씀을 이어가보세요! ✨
            </p>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => {
                  setShowDailyLimitModal(false);
                  router.push("/mypage");
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                마이페이지로 이동
              </button>
              <button
                onClick={() => {
                  setShowDailyLimitModal(false);
                  setDayIndex(Math.max(1, getNextUnreadDay(records) - 1));
                  window.scrollTo(0, 0);
                }}
                className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors"
              >
                오늘 읽은 말씀 복습하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal (경우 1) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 shadow-xl w-full max-w-sm flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
              <Bookmark size={24} />
            </div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 text-center">One Verse를 선택해주세요 ✨</h3>
            <p className="text-stone-500 dark:text-stone-400 text-center text-sm mb-2">
              오늘 마음에 깊이 닿은 구절을 1개 선택해야 통독이 완료됩니다. 본문에서 구절을 클릭해 보세요.
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

      {/* Confirm Modal (경우 2) */}
      {showConfirmModal && selectedVerse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in md:p-4">
          <div className="bg-white dark:bg-stone-900 rounded-none md:rounded-2xl px-6 shadow-xl w-full h-full md:h-auto md:max-h-[90vh] max-w-sm flex flex-col items-center justify-center gap-4 animate-in zoom-in-95 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:py-6 overflow-y-auto">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 text-center mb-2 leading-relaxed">
              &apos;{formatReference(selectedVerse.book, selectedVerse.chapter, selectedVerse.verse)}&apos;을(를)<br/>오늘의 One Verse로 선택하시겠습니까?
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

      {/* Success Modal (경우 3) */}
      {showSuccessModal && confirmedVerse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-md flex flex-col relative animate-in zoom-in-95 border border-stone-200 dark:border-stone-800 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
              오늘 말씀 통독 완료! 🎉
            </h3>
            <p className="text-stone-500 dark:text-stone-400 mb-6">
              오늘의 4개 트랙 말씀을 모두 읽으셨습니다! 👏
            </p>
            
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-6 mb-8 border border-stone-100 dark:border-stone-700 text-left">
              <p className="text-lg font-semibold text-stone-800 dark:text-stone-200 leading-relaxed mb-4">
                {confirmedVerse.displayText}
              </p>
              <p className="text-sm font-bold text-stone-400 dark:text-stone-500 text-right">
                {formatReference(confirmedVerse.book, confirmedVerse.chapter, confirmedVerse.verse)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setIsMemoryModalOpen(true);
                }}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <BrainCircuit size={20} />
                🧠 지금 암송 도전하기
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/mypage")}
                  className="flex-1 py-3.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors"
                >
                  마이페이지로 이동
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 py-3.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 플로팅 퀵 네비게이터 */}
      <div className="fixed right-3 md:right-8 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 md:gap-3">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
          className="flex flex-col items-center justify-center p-2 md:p-3 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-110" 
          title="처음"
        >
          <span className="text-base md:text-xl mb-1 leading-none">🏠</span>
          <span className="text-[10px] md:text-xs font-bold leading-none">처음</span>
        </button>
        <button 
          onClick={() => scrollToSection('track-old-testament')} 
          className="flex flex-col items-center justify-center p-2 md:p-3 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-110" 
          title="구약"
        >
          <span className="text-base md:text-xl mb-1 leading-none">📜</span>
          <span className="text-[10px] md:text-xs font-bold leading-none">구약</span>
        </button>
        <button 
          onClick={() => scrollToSection('track-new-testament')} 
          className="flex flex-col items-center justify-center p-2 md:p-3 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-110" 
          title="신약"
        >
          <span className="text-base md:text-xl mb-1 leading-none">🕊️</span>
          <span className="text-[10px] md:text-xs font-bold leading-none">신약</span>
        </button>
        <button 
          onClick={() => scrollToSection('track-psalms')} 
          className="flex flex-col items-center justify-center p-2 md:p-3 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-110" 
          title="시편"
        >
          <span className="text-base md:text-xl mb-1 leading-none">🎵</span>
          <span className="text-[10px] md:text-xs font-bold leading-none">시편</span>
        </button>
        <button 
          onClick={() => scrollToSection('track-proverbs')} 
          className="flex flex-col items-center justify-center p-2 md:p-3 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-110" 
          title="잠언"
        >
          <span className="text-base md:text-xl mb-1 leading-none">💡</span>
          <span className="text-[10px] md:text-xs font-bold leading-none">잠언</span>
        </button>
        <button 
          onClick={() => scrollToSection('viewer-bottom')} 
          className="flex flex-col items-center justify-center p-2 md:p-3 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/50 shadow-md transition-all hover:scale-110" 
          title="완료"
        >
          <span className="text-base md:text-xl mb-1 leading-none">✅</span>
          <span className="text-[10px] md:text-xs font-bold leading-none">완료</span>
        </button>
      </div>



      <div className="w-full max-w-2xl bg-transparent shadow-2xl flex flex-col relative min-h-full">
        
        {/* 상단 네비게이터 */}
        <header className="sticky top-0 z-30 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-sm flex flex-col px-3 py-2 gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => handleSetDay(dayIndex - 10)}
                disabled={dayIndex <= 1}
                className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
                title="10일 이전"
              >
                <ChevronsLeft size={22} className="text-stone-700 dark:text-stone-300" />
              </button>
              <button
                onClick={() => handleSetDay(dayIndex - 1)}
                disabled={dayIndex <= 1}
                className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
                title="1일 이전"
              >
                <ChevronLeft size={22} className="text-stone-700 dark:text-stone-300" />
              </button>
            </div>
            
            <div 
              className="flex flex-col items-center flex-1 cursor-pointer select-none py-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors mx-2" 
              onClick={() => setIsDaySelectorOpen(!isDaySelectorOpen)}
            >
              <h1 className="font-bold text-lg sm:text-xl text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                Day {readingData.dayIndex} 
                <ChevronDown size={18} className={`text-stone-400 transition-transform ${isDaySelectorOpen ? 'rotate-180' : ''}`} />
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => handleSetDay(dayIndex + 1)}
                disabled={dayIndex >= 365}
                className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
                title="1일 다음"
              >
                <ChevronRight size={22} className="text-stone-700 dark:text-stone-300" />
              </button>
              <button
                onClick={() => handleSetDay(dayIndex + 10)}
                disabled={dayIndex >= 365}
                className="p-1.5 sm:p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"
                title="10일 다음"
              >
                <ChevronsRight size={22} className="text-stone-700 dark:text-stone-300" />
              </button>
            </div>
          </div>
        </header>

        {/* Day 빠른 이동 드롭다운 / 모달 */}
        {isDaySelectorOpen && (
          <div className="absolute top-[104px] left-0 right-0 z-40 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col animate-in slide-in-from-top-2 h-[75vh] max-h-[600px]">
            {/* Day 리스트 */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              <button
                onClick={handleGoToLastRead}
                className="w-full py-2.5 px-4 mb-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 hover:bg-cyan-900/50 text-cyan-300 font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
              >
                📌 마지막으로 읽은 본문으로 이동하기
              </button>
              {(() => {
                return allSchedules.map((s) => {
                  const maxAllowed = getNextUnreadDay(records);
                  const isLocked = s.dayIndex > maxAllowed;
                  const dayRecord = records[s.dayIndex];
                  const hasOneVerse = !!dayRecord?.oneVerse;
                  const isMemorized = !!dayRecord?.oneVerse?.isMemorized;

                return (
                  <React.Fragment key={s.dayIndex}>
                    <button
                      onClick={() => handleSetDay(s.dayIndex)}
                      className={`text-left rounded-xl transition-colors flex items-center justify-between gap-3 p-4 ${
                        s.dayIndex === dayIndex
                          ? "bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800"
                          : isLocked
                          ? "opacity-40 hover:opacity-60 border border-transparent"
                          : "hover:bg-stone-50 dark:hover:bg-stone-800 border border-transparent"
                      }`}
                    >
                      {/* 좌측 텍스트 영역 */}
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                          Day {s.dayIndex}
                          {isLocked && <AlertCircle size={14} className="text-stone-400" />}
                        </span>
                        
                        <div className="text-xs text-stone-500 dark:text-stone-400 truncate mt-1 leading-relaxed flex flex-wrap gap-x-2">
                          <span>📖 {s.tracks.find(t => t.type === '구약')?.range}</span>
                          <span>✝️ {s.tracks.find(t => t.type === '신약')?.range}</span>
                          <span>🕊️ {s.tracks.find(t => t.type === '시편')?.range}</span>
                          <span>💡 {s.tracks.find(t => t.type === '잠언')?.range}</span>
                        </div>
                      </div>

                      {/* 뱃지 영역 */}
                      {hasOneVerse && (
                        <div className="flex flex-col items-end justify-center gap-1.5 shrink-0 self-center">
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                            📌 One Verse
                          </span>
                          {isMemorized ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                              👑 암송 완료
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-700/60 text-stone-400 border border-stone-600/40">
                              🧠 암송 도전
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </React.Fragment>
                );
              })})()}
            </div>
            
            {/* 닫기 영역 */}
            <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex justify-center">
              <button
                onClick={() => setIsDaySelectorOpen(false)}
                className="text-sm font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 py-1 px-4"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 본문 연속 렌더링 컨테이너 */}
        <div className="flex flex-col flex-1">
          {readingData.tracks.map((trackReading) => {
            const trackInfo = TRACK_INFO[trackReading.track.type];
            const icon = TRACK_ICONS[trackReading.track.type as keyof typeof TRACK_ICONS] || "📖";
            
            return (
              <div key={trackReading.track.type} id={TRACK_ID_MAP[trackReading.track.type as keyof typeof TRACK_ID_MAP]} className="flex flex-col border-b border-stone-200 dark:border-stone-800/60 pb-10">
                {/* 섹션 헤더 */}
                <div 
                  className="sticky top-[52px] z-20 py-2 px-4 text-sm font-semibold bg-stone-900/90 backdrop-blur border-b border-stone-800"
                >
                  <h2 className="flex items-center gap-2" style={{ color: trackInfo.accentColor }}>
                    <span>{icon}</span> {trackInfo.title.split(" ")[0]} <span className="text-stone-500 font-normal mx-0.5">·</span> <span className="text-stone-300">{trackReading.track.range}</span>
                  </h2>
                </div>

                {/* 성경 본문 */}
                <div className="pl-3 pr-14 sm:pl-6 sm:pr-8 py-6 sm:py-8 flex flex-col gap-6" style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
                  {trackReading.chapters.map((chapterData) => (
                    <div key={`${chapterData.name}-${chapterData.chapter}`} className="flex flex-col">
                      {/* 장 제목 (같은 범위 내에 여러 장이 있을 때 구분) */}
                      {trackReading.chapters.length > 1 && (
                        <h3 className="font-bold mb-4 px-2 text-stone-800 dark:text-stone-200 border-b border-stone-200 dark:border-stone-800 pb-2">
                          {chapterData.name} {chapterData.chapter}{chapterData.chapterUnit || "장"}
                        </h3>
                      )}
                      
                      {chapterData.verses.length === 0 ? (
                        <p className="text-stone-400 italic px-2">본문 데이터가 없습니다.</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {chapterData.verses.map((v) => {
                            const isSelected = selectedVerse?.book === chapterData.name 
                                            && selectedVerse?.chapter === chapterData.chapter 
                                            && selectedVerse?.verse === v.verse;
                            
                            const isConfirmed = confirmedVerse?.book === chapterData.name 
                                             && confirmedVerse?.chapter === chapterData.chapter 
                                             && confirmedVerse?.verse === v.verse;

                            // 스타일 분기
                            let wrapperClass = "text-left px-2 sm:px-3 py-2 rounded-xl transition-all duration-200 relative flex flex-col group ";
                            let markerClass = "";
                            let verseNumberClass = "";
                            let textClass = "flex-1";
                            let actionArea = null;

                            if (isConfirmed) {
                              wrapperClass += "bg-amber-50 dark:bg-amber-900/20 text-stone-900 dark:text-stone-100 border border-amber-200 dark:border-amber-800/50 shadow-sm mt-1 mb-2";
                              markerClass = "absolute left-0 top-3 bottom-3 w-1.5 bg-amber-400 dark:bg-amber-500 rounded-r-md";
                              verseNumberClass = "text-amber-600 dark:text-amber-500 font-bold";
                              textClass += " font-medium";
                              
                              const isMem = confirmedVerse?.isMemorized;
                              actionArea = (
                                <div className="mt-3 flex flex-wrap items-center gap-2 pl-[2.5ch] sm:pl-[3ch]">
                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                                    isMem 
                                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md"
                                      : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400"
                                  }`}>
                                    <Crown size={14} className={isMem ? "text-white" : ""} />
                                    {isMem ? "암송 완료" : "오늘의 One Verse"}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsMemoryModalOpen(true);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                                      isMem
                                        ? "bg-white dark:bg-stone-800 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-stone-700"
                                        : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700"
                                    }`}
                                  >
                                    <BrainCircuit size={14} />
                                    {isMem ? "✅ 암송 복습하기" : "🧠 암송 도전"}
                                  </button>
                                </div>
                              );
                            } else if (isSelected) {
                              wrapperClass += "bg-sky-50 dark:bg-sky-900/20 text-stone-900 dark:text-stone-100 border border-sky-200 border-dashed dark:border-sky-800/50 mt-1 mb-2";
                              markerClass = "absolute left-0 top-3 bottom-3 w-1 bg-sky-400 dark:bg-sky-500 rounded-r-md";
                              verseNumberClass = "text-sky-600 dark:text-sky-400 font-bold";
                              actionArea = (
                                <div className="mt-3 pl-[2.5ch] sm:pl-[3ch]">
                                  <button
                                    onClick={(e) => handleConfirmVerse({
                                      trackType: trackReading.track.type,
                                      book: chapterData.name,
                                      chapter: chapterData.chapter,
                                      verse: v.verse,
                                      rawText: v.rawText,
                                      displayText: v.displayText,
                                      chunks: v.chunks,
                                      reference: formatReference(chapterData.name, chapterData.chapter, v.verse)
                                    }, e)}
                                    className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5"
                                  >
                                    📌 오늘의 One Verse로 지정
                                  </button>
                                </div>
                              );
                            } else {
                              wrapperClass += "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border border-transparent";
                              verseNumberClass = "text-stone-400 dark:text-stone-500 font-semibold";
                            }
                            
                            return (
                              <button
                                key={v.verse}
                                onClick={() => handleVerseClick(trackReading.track.type, chapterData.name, chapterData.chapter, v.verse, v.rawText, v.displayText, v.chunks)}
                                className={wrapperClass}
                              >
                                {(isConfirmed || isSelected) && <div className={markerClass}></div>}
                                
                                <div className="flex items-start flex-1 w-full">
                                  <span 
                                    className={`inline-block min-w-[2.5ch] mr-2 sm:mr-3 select-none mt-[0.1em] text-right ${verseNumberClass}`}
                                    style={{ fontSize: `${Math.max(fontSize * 0.7, 10)}px` }}
                                  >
                                    {v.verse}
                                  </span>
                                  <span className={textClass}>
                                    {v.displayText}
                                  </span>
                                </div>

                                {actionArea}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 완독 체크 액션 */}
        <div id="viewer-bottom" className="px-5 sm:px-8 py-12 flex justify-center bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 relative z-10">
          <button
            onClick={handleBottomButtonClick}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl shadow-sm transition-all duration-300 font-bold text-lg w-full max-w-sm justify-center ${
              isCompletedDay 
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 scale-[0.98]" 
                : "bg-sky-600 hover:bg-sky-700 text-white shadow-md hover:-translate-y-1"
            }`}
          >
            {isCompletedDay ? (
              <React.Fragment>
                <CheckCircle2 size={24} />
                Day {readingData.dayIndex} 말씀 통독 완료 🎉
              </React.Fragment>
            ) : (
              <React.Fragment>
                Day {readingData.dayIndex} 말씀 통독 완료하기
              </React.Fragment>
            )}
          </button>
        </div>

      </div>

      {/* 암송 트레이너 모달 */}
      {isMemoryModalOpen && confirmedVerse && (
        <MemoryTrainerModal
          oneVerse={confirmedVerse}
          onClose={() => setIsMemoryModalOpen(false)}
          onComplete={handleMemoryComplete}
        />
      )}

    </div>
  );
}
