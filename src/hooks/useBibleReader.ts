import { useState, useEffect, useRef } from "react";
import { 
  ReadingSettings, ReadRecordsMap, DayRecord, OneVerse, OneVerseCandidate,
  fetchReadingSettings, fetchReadRecords,
  saveDayRecord, updateReadRecordOneVerse, updateReadRecordCompletion, updateMemorizeRecord,
  saveReadingSettings, fetchOneVerseCandidates, saveOneVerseCandidate, removeOneVerseCandidate
} from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";
import { calculateDaysSince, clampReadingDay, getMaxAllowedDay } from "@/hooks/bible-reader/dayUtils";
import { getLastOneVerseDay } from "@/lib/readingRecords";
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
  const [oneVerseCandidates, setOneVerseCandidates] = useState<OneVerseCandidate[]>([]);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showCompletionCancelModal, setShowCompletionCancelModal] = useState(false);
  const [showReselectModal, setShowReselectModal] = useState(false);
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
    setConfirmedVerse(null);
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
    let isActive = true;
    if (!authUser || !isDataLoaded) {
      setOneVerseCandidates([]);
      return () => { isActive = false; };
    }

    void fetchOneVerseCandidates(dayIndex, authUser.id)
      .then((candidates) => {
        if (isActive) setOneVerseCandidates(candidates);
      })
      .catch((error: unknown) => {
        console.error("Failed to load One Verse candidates:", error);
        if (isActive) {
          setOneVerseCandidates([]);
          showToast("One Verse 후보를 불러오지 못했습니다.");
        }
      });

    return () => { isActive = false; };
  }, [authUser, dayIndex, isDataLoaded]);

  useEffect(() => {
    if (isClient && settings?.hasStarted) {
      const record = records[dayIndex];
      if (record) {
        setIsCompletedDay(true);
        setConfirmedVerse(record.oneVerse || null);
        setSelectedVerse(null);
      } else {
        setIsCompletedDay(false);
      }
    }
  }, [isClient, dayIndex, settings, records]);

  const handleGoToLastRead = () => {
    const lastDay = getLastOneVerseDay(records);
    handleSetDay(lastDay);
    setIsDaySelectorOpen(false);
  };

  const handleVerseClick = async (trackType: string, book: string, chapter: number, verse: number, rawText: string, displayText: string, chunks: string[]) => {
    if (isCompletedDay) return;
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

  const isSameVerse = (left: OneVerse, right: OneVerse) =>
    left.book === right.book && left.chapter === right.chapter && left.verse === right.verse;

  const ensureCandidate = async (verse: OneVerse): Promise<boolean> => {
    if (oneVerseCandidates.some((candidate) => isSameVerse(candidate, verse))) return true;
    const success = await saveOneVerseCandidate(dayIndex, verse, authUser?.id);
    if (!success) {
      showToast("One Verse 후보 저장에 실패했습니다.");
      return false;
    }
    setOneVerseCandidates((current) => (
      current.some((candidate) => isSameVerse(candidate, verse)) ? current : [...current, verse]
    ));
    return true;
  };

  const handleToggleCandidate = async (verse: OneVerse, event: React.MouseEvent) => {
    event.stopPropagation();
    if (isCompletedDay) {
      showToast("완료한 Day의 후보는 변경할 수 없습니다.");
      return;
    }
    if (confirmedVerse && isSameVerse(confirmedVerse, verse)) {
      showToast("오늘의 One Verse는 후보에서 해제할 수 없습니다.");
      return;
    }

    const isCandidate = oneVerseCandidates.some((candidate) => isSameVerse(candidate, verse));
    const success = isCandidate
      ? await removeOneVerseCandidate(dayIndex, verse, authUser?.id)
      : await saveOneVerseCandidate(dayIndex, verse, authUser?.id);

    if (!success) {
      showToast(isCandidate ? "후보 해제에 실패했습니다." : "후보 저장에 실패했습니다.");
      return;
    }

    setOneVerseCandidates((current) => (
      isCandidate
        ? current.filter((candidate) => !isSameVerse(candidate, verse))
        : [...current, verse]
    ));
    showToast(isCandidate ? "One Verse 후보를 해제했습니다." : "One Verse 후보에 담았습니다.");
  };

  const executeReplaceVerse = async (verse: OneVerse) => {
    if (!await ensureCandidate(verse)) return;
    let success = false;
    
    if (isCompletedDay) {
      success = await updateReadRecordOneVerse(dayIndex, verse, authUser?.id);
    } else {
      setConfirmedVerse(verse);
      setSelectedVerse(null);
      setVerseToReplace(null);
      showToast("오늘의 One Verse가 지정되었습니다. 통독을 완료해 주세요.");
      return;
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
    if (isCompletedDay) {
      showToast("완료한 Day의 One Verse는 변경할 수 없습니다.");
      return;
    }
    if (!await ensureCandidate(verse)) return;
    if (!confirmedVerse) {
      setConfirmedVerse(verse);
      setSelectedVerse(null);
      showToast("오늘의 One Verse가 지정되었습니다. 통독을 완료해 주세요.");
      return;
    }
    if (!isSameVerse(confirmedVerse, verse)) {
      if (isCompletedDay) setVerseToReplace(verse);
      else {
        setConfirmedVerse(verse);
        setSelectedVerse(null);
        showToast("오늘의 One Verse를 변경했습니다.");
      }
    }
  };

  const handleRequestReselect = () => {
    setShowReselectModal(true);
  };

  const handleConfirmReselect = () => {
    setShowReselectModal(false);
    if (isCompletedDay) {
      showToast("새 구절을 선택하면 기존 One Verse가 교체됩니다.");
      return;
    }
    setConfirmedVerse(null);
    setSelectedVerse(null);
    showToast("One Verse 선택이 취소되었습니다. 후보에서 다시 선택해 주세요.");
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
    if (isCompletedDay) {
      setShowCompletionCancelModal(true);
      return;
    }
    if (!confirmedVerse) {
      setShowWarningModal(true);
      return;
    }
    if (confirmedVerse) {
      setShowCompletionModal(true);
    }
  };

  const handleCancelCompletion = async () => {
    const success = await updateReadRecordCompletion(dayIndex, null, authUser?.id);
    if (!success) {
      showToast("읽기 완료 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setIsCompletedDay(false);
    try {
      const updatedRecords = await fetchReadRecords(authUser?.id);
      setRecords(updatedRecords);
    } catch (error) {
      console.error("Failed to refresh records after cancelling completion:", error);
      setRecords((current) => {
        const remainingRecords = { ...current };
        delete remainingRecords[dayIndex];
        return remainingRecords;
      });
    }
    showToast("읽기 완료를 취소했어요. One Verse와 발자국은 그대로 유지됩니다.");
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
    const isAnyModalOpen = showConfirmModal || showCompletionModal || showCompletionCancelModal || showReselectModal || showSuccessModal || showWarningModal || isMemoryModalOpen || showAccessDeniedModal;
    if (isAnyModalOpen) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [showConfirmModal, showCompletionModal, showCompletionCancelModal, showReselectModal, showSuccessModal, showWarningModal, isMemoryModalOpen, showAccessDeniedModal]);

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
    handleToggleCandidate,
    handleConfirmVerse,
    handleRequestReselect,
    handleConfirmReselect,
    executeReplaceVerse,
    handleBottomButtonClick,
    handleCancelCompletion,
    completeReadingAndShowSuccess,
    handleMemoryComplete,
    calculateDaysSince
  };
}
