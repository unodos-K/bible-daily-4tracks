import { useState, useEffect, useRef } from "react";
import { 
  ReadingSettings, ReadRecordsMap, DayRecord, OneVerse,
  fetchReadingSettings, fetchReadRecords,
  saveDayRecord, updateReadRecordOneVerse, updateMemorizeRecord,
  saveReadingSettings
} from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";
import { calculateDaysSince, clampReadingDay, getMaxAllowedDay } from "@/hooks/bible-reader/dayUtils";
export function useBibleReader() {
  const [isClient, setIsClient] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { authUser, isAuthLoading } = useAuth();
  const [settings, setSettings] = useState<ReadingSettings | null>(null);
  const [records, setRecords] = useState<ReadRecordsMap>({});
  
  const [dayIndex, setDayIndex] = useState<number>(1);
  const [isDaySelectorOpen, setIsDaySelectorOpen] = useState(false);
  const [isCompletedDay, setIsCompletedDay] = useState(false);
  
  const [selectedVerse, setSelectedVerse] = useState<OneVerse | null>(null);
  const [confirmedVerse, setConfirmedVerse] = useState<OneVerse | null>(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [verseToReplace, setVerseToReplace] = useState<OneVerse | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  
  const [selectedRecordToShare, setSelectedRecordToShare] = useState<DayRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(64);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!headerRef.current) return;
    const updateHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        setHeaderHeight((currentHeight) => (
          Math.abs(currentHeight - height) < 0.01 ? currentHeight : height
        ));
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(headerRef.current);
    window.addEventListener("resize", updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [isClient, isDataLoaded]);

  const handleSetDay = (newDay: number, currentRecords: ReadRecordsMap = records) => {
    const validDay = clampReadingDay(newDay);
    const maxAllowedDay = getMaxAllowedDay(settings, currentRecords);

    
    if (validDay > maxAllowedDay) {
      showToast("이 진도는 내일 열려요! 내일 만나요 👋");
      setIsDaySelectorOpen(false);
      return;
    }

    setDayIndex(validDay);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsDaySelectorOpen(false);
    setSelectedVerse(null);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    let isActive = true;

    const loadReader = async () => {
      let currentRecords: ReadRecordsMap = {};
      let currentSettings: ReadingSettings | null = null;
      
      if (authUser) {
        try {
          currentSettings = await fetchReadingSettings(authUser.id);
          currentRecords = await fetchReadRecords(authUser.id);
        } catch (error) {
          console.error("Failed to load user data due to network error", error);
          showToast("데이터를 불러오는데 실패했습니다. 네트워크 상태를 확인해주세요.");
          return;
        }
      }
      
      if (!currentSettings || !currentSettings.hasStarted) {
        const dateObj = new Date();
        const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        if (authUser) await saveReadingSettings(todayStr, authUser.id);
        currentSettings = {
          startDate: todayStr,
          currentDay: 1,
          hasStarted: true
        };
        currentRecords = {};
      }
      
      if (!isActive) return;
      setSettings(currentSettings);
      setRecords(currentRecords);

      try {
        const maxAllowed = getMaxAllowedDay(currentSettings, currentRecords);
        const requestedDay = Number(new URLSearchParams(window.location.search).get('day'));
        const initialDay = Number.isInteger(requestedDay) && requestedDay >= 1
          ? Math.min(requestedDay, maxAllowed)
          : maxAllowed;

        if (isActive) setDayIndex(initialDay);
      } catch {
        // ignore
      } finally {
        if (isActive) setIsDataLoaded(true);
      }
    };

    void loadReader();

    const handleRecordsUpdated = async () => {
      if (!authUser) return;
      const r = await fetchReadRecords(authUser.id);
      if (isActive) setRecords(r);
    };
    window.addEventListener('records_updated', handleRecordsUpdated);
    return () => {
      isActive = false;
      window.removeEventListener('records_updated', handleRecordsUpdated);
    };
  }, [authUser, isAuthLoading]);

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

  const handleGoToLastRead = () => {
    const completedDays = Object.keys(records)
      .map((k) => Number(k))
      .filter((day) => !!records[day]?.oneVerse);
    const lastDay = completedDays.length > 0 ? Math.max(...completedDays) : 1;
    handleSetDay(lastDay);
    setIsDaySelectorOpen(false);
  };

  const handleVerseClick = async (trackType: string, book: string, chapter: number, verse: number, rawText: string, displayText: string, chunks: string[]) => {
    const verseObj = {
      trackType, book, chapter, verse, rawText, displayText, chunks,
      reference: `${book} ${chapter}:${verse}`
    };

    const isConfirmed = confirmedVerse?.book === book && confirmedVerse?.chapter === chapter && confirmedVerse?.verse === verse;
    if (isConfirmed) return;

    const isSelected = selectedVerse?.book === book && selectedVerse?.chapter === chapter && selectedVerse?.verse === verse;
    if (isSelected) {
      setSelectedVerse(null);
    } else {
      setSelectedVerse(verseObj);
    }
  };

  const executeReplaceVerse = async (verse: OneVerse) => {
    let success = false;
    
    if (isCompletedDay) {
      success = await updateReadRecordOneVerse(dayIndex, verse, authUser?.id);
    } else {
      const dateObj = new Date();
      const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      
      success = await saveDayRecord({
        dayIndex: dayIndex,
        readDate: todayStr,
        completedAt: new Date().toISOString(),
        oneVerse: verse,
      }, authUser?.id);
      if (success) {
        setIsCompletedDay(true);
      }
    }

    if (success) {
      setConfirmedVerse(verse);
      setSelectedVerse(null);
      setVerseToReplace(null);
      const r = await fetchReadRecords(authUser?.id);
      setRecords(r);
      showToast("One Verse가 새로 지정되었습니다.");
    } else {
      alert("저장에 실패했습니다.");
    }
  };

  const handleConfirmVerse = async (verse: OneVerse, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmedVerse) {
      await executeReplaceVerse(verse);
      return;
    }
    if (confirmedVerse.book !== verse.book || confirmedVerse.chapter !== verse.chapter || confirmedVerse.verse !== verse.verse) {
      setVerseToReplace(verse);
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
      }, authUser?.id);
      if (success) {
        setIsCompletedDay(true);
        const r = await fetchReadRecords(authUser?.id);
        setRecords(r);
        setShowSuccessModal(true);
      } else {
        alert("저장에 실패했습니다.");
      }
    } else {
      setShowSuccessModal(true);
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

  const handleMemoryComplete = async () => {
    if (confirmedVerse) {
      await updateMemorizeRecord(dayIndex, true, confirmedVerse, authUser?.id);
      setConfirmedVerse({ ...confirmedVerse, isMemorized: true, memorizedAt: new Date().toISOString() });
      const r = await fetchReadRecords(authUser?.id);
      setRecords(r);
      setIsMemoryModalOpen(false);
    }
  };

  useEffect(() => {
    const isAnyModalOpen = showConfirmModal || showSuccessModal || showWarningModal || isMemoryModalOpen || showAccessDeniedModal;
    if (isAnyModalOpen) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [showConfirmModal, showSuccessModal, showWarningModal, isMemoryModalOpen, showAccessDeniedModal]);

  return {
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
    selectedRecordToShare,
    setSelectedRecordToShare,
    toastMessage,
    headerRef,
    headerHeight,
    isDataLoaded,
    handleSetDay,
    handleGoToLastRead,
    handleVerseClick,
    handleConfirmVerse,
    executeReplaceVerse,
    handleBottomButtonClick,
    completeReadingAndShowSuccess,
    handleMemoryComplete,
    calculateDaysSince
  };
}
