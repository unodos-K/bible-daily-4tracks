import { useState, useEffect, useRef } from "react";
import { 
  ReadingSettings, ReadRecordsMap, OneVerse, OneVerseCandidate, ShareableOneVerseRecord,
  fetchReadingSettings, fetchReadRecords, fetchOneVerseRecord,
  saveOneVerseSelection, updateMemorizeRecord,
  saveReadingSettings, fetchOneVerseCandidates, saveOneVerseCandidate, removeOneVerseCandidate
} from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";
import { calculateDaysSince, clampReadingDay, getMaxAllowedDay } from "@/hooks/bible-reader/dayUtils";
import { getLastOneVerseDay } from "@/lib/readingRecords";
import { getLastReadingDay } from "@/lib/readingProgress";
import { getVerseLikes, toggleLike, type VerseLikeData } from "@/lib/social";
export function useBibleReader() {
  const [isClient, setIsClient] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { authUser, isAuthLoading } = useAuth();
  const readerUserId = authUser?.id;
  const [settings, setSettings] = useState<ReadingSettings | null>(null);
  const [records, setRecords] = useState<ReadRecordsMap>({});
  
  const [dayIndex, setDayIndex] = useState<number>(1);
  const [isDaySelectorOpen, setIsDaySelectorOpen] = useState(false);
  const [isCompletedDay, setIsCompletedDay] = useState(false);
  
  const [selectedVerse, setSelectedVerse] = useState<OneVerse | null>(null);
  const [confirmedVerse, setConfirmedVerse] = useState<OneVerse | null>(null);
  const [isVerseLoaded, setIsVerseLoaded] = useState(false);
  const [oneVerseCandidates, setOneVerseCandidates] = useState<OneVerseCandidate[]>([]);
  const [verseLikes, setVerseLikes] = useState<VerseLikeData | null>(null);
  const [isLikeBusy, setIsLikeBusy] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  
  const [showReselectModal, setShowReselectModal] = useState(false);
  const [pendingVerse, setPendingVerse] = useState<OneVerse | null>(null);
  const [isSelectionSaving, setIsSelectionSaving] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const selectionLock = useRef(false);
  const scope = useRef('');
  scope.current = `${readerUserId}:${dayIndex}`;
  useEffect(() => {
    setPendingVerse(null);
    setShowReselectModal(false);
    setSelectionError(null);
  }, [readerUserId, dayIndex]);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  
  const [selectedRecordToShare, setSelectedRecordToShare] = useState<ShareableOneVerseRecord | null>(null);
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
    if (selectionLock.current) return;
    const validDay = clampReadingDay(newDay);
    const maxAllowedDay = getMaxAllowedDay(settings, currentRecords);

    
    if (validDay > maxAllowedDay) {
      showToast("이 진도는 내일 열려요! 내일 만나요 👋");
      setIsDaySelectorOpen(false);
      return;
    }

    setDayIndex(validDay);
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
      
      if (readerUserId) {
        try {
          currentSettings = await fetchReadingSettings(readerUserId);
          currentRecords = await fetchReadRecords(readerUserId);
        } catch (error) {
          console.error("Failed to load user data due to network error", error);
          showToast("데이터를 불러오는데 실패했습니다. 네트워크 상태를 확인해주세요.");
          return;
        }
      }
      
      if (!currentSettings || !currentSettings.hasStarted) {
        const dateObj = new Date();
        const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        if (readerUserId) await saveReadingSettings(todayStr, readerUserId);
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
        const lastDay = readerUserId ? getLastReadingDay(readerUserId) : null;
        const initialDay = Number.isInteger(requestedDay) && requestedDay >= 1
          ? Math.min(requestedDay, maxAllowed)
          : Math.min(lastDay ?? maxAllowed, maxAllowed);

        if (isActive) setDayIndex(initialDay);
      } catch {
        // ignore
      } finally {
        if (isActive) setIsDataLoaded(true);
      }
    };

    void loadReader();

    const handleRecordsUpdated = async () => {
      if (!readerUserId) return;
      const r = await fetchReadRecords(readerUserId);
      if (isActive) setRecords(r);
    };
    window.addEventListener('records_updated', handleRecordsUpdated);
    return () => {
      isActive = false;
      window.removeEventListener('records_updated', handleRecordsUpdated);
    };
  }, [readerUserId, isAuthLoading]);

  useEffect(() => {
    let isActive = true;
    if (!readerUserId || !isDataLoaded) {
      setOneVerseCandidates([]);
      return () => { isActive = false; };
    }

    void fetchOneVerseCandidates(dayIndex, readerUserId)
      .then((candidates) => {
        if (isActive) setOneVerseCandidates(candidates);
      })
      .catch((error: unknown) => {
        console.error("Failed to load One Verse candidates:", error);
        if (isActive) {
          setOneVerseCandidates([]);
          showToast("마킹한 구절을 불러오지 못했습니다.");
        }
      });

    return () => { isActive = false; };
  }, [readerUserId, dayIndex, isDataLoaded]);

  useEffect(() => {
    let isActive = true;
    setVerseLikes(null);
    if (!readerUserId || !confirmedVerse || !isDataLoaded) return () => { isActive = false; };

    void getVerseLikes(readerUserId, dayIndex, readerUserId)
      .then((likes) => { if (isActive) setVerseLikes(likes); })
      .catch((error: unknown) => console.error("Failed to load One Verse amens:", error));
    return () => { isActive = false; };
  }, [readerUserId, dayIndex, confirmedVerse, isDataLoaded]);

  useEffect(() => {
    if (isClient && settings?.hasStarted) {
      const record = records[dayIndex];
      setIsCompletedDay(Boolean(record));
      setSelectedVerse(null);
    }
  }, [isClient, dayIndex, settings, records]);

  // `fetchReadRecords` intentionally contains completed records only. Final One
  // Verse drafts must be restored separately so they remain visible before a
  // Day is completed and after returning to the reader.
  useEffect(() => {
    let isActive = true;
    setIsVerseLoaded(false);

    if (!readerUserId || !isDataLoaded) {
      setConfirmedVerse(null);
      return () => { isActive = false; };
    }

    setConfirmedVerse(null);
    void fetchOneVerseRecord(dayIndex, readerUserId)
      .then((record) => {
        if (isActive) {
          setConfirmedVerse(record?.oneVerse ?? null);
          setIsVerseLoaded(true);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to restore One Verse:", error);
        if (isActive) {
          setConfirmedVerse(null);
          showToast("오늘의 One Verse를 불러오지 못했습니다.");
        }
      });

    return () => { isActive = false; };
  }, [readerUserId, dayIndex, isDataLoaded]);

  const handleGoToLastRead = () => {
    const lastDay = getLastOneVerseDay(records);
    handleSetDay(lastDay);
    setIsDaySelectorOpen(false);
  };

  const handleVerseClick = async (trackType: string, book: string, chapter: number, verse: number, rawText: string, displayText: string, chunks: string[]) => {
    if (selectionLock.current) return;
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

  const handleToggleCandidate = async (verse: OneVerse, event: React.MouseEvent) => {
    event.stopPropagation();
    if (isCompletedDay) {
      showToast("완료한 Day의 마킹은 변경할 수 없습니다.");
      return;
    }

    const isCandidate = oneVerseCandidates.some((candidate) => isSameVerse(candidate, verse));
    const success = isCandidate
      ? await removeOneVerseCandidate(dayIndex, verse, authUser?.id)
      : await saveOneVerseCandidate(dayIndex, verse, authUser?.id);

    if (!success) {
      showToast(isCandidate ? "마킹 해제에 실패했습니다." : "마킹 저장에 실패했습니다.");
      return;
    }

    setOneVerseCandidates((current) => (
      isCandidate
        ? current.filter((candidate) => !isSameVerse(candidate, verse))
        : [...current, verse]
    ));
    showToast(isCandidate ? "마킹을 해제했습니다." : "구절을 마킹했습니다.");
  };

  const handleConfirmVerse = (verse: OneVerse, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionLock.current) return;
    if (!isVerseLoaded) {
      showToast("기존 One Verse를 확인 중입니다. 불러오기가 실패했다면 새로고침해 주세요.");
      return;
    }
    if (confirmedVerse && isSameVerse(confirmedVerse, verse)) return;
    setSelectionError(null);
    setPendingVerse(verse);
  };

  const persistSelection = async (verse: OneVerse | null) => {
    if (selectionLock.current) return;
    if (!readerUserId) {
      setSelectionError("로그인 후 다시 시도해 주세요.");
      return;
    }
    const operationScope = scope.current;
    selectionLock.current = true;
    setIsSelectionSaving(true);
    setSelectionError(null);
    try {
      const success = await saveOneVerseSelection(dayIndex, verse, confirmedVerse, readerUserId);
      if (scope.current !== operationScope) return;
      if (!success) {
        setSelectionError("저장하지 못했습니다. 다른 화면에서 기록이 변경되었다면 새로고침 후 다시 시도해 주세요.");
        return;
      }
      setConfirmedVerse(verse);
      setSelectedVerse(null);
      setPendingVerse(null);
      setShowReselectModal(false);
      setRecords(current => current[dayIndex] ? { ...current, [dayIndex]: { ...current[dayIndex], oneVerse: verse ?? undefined } } : current);
      if (verse) setIsCompletedDay(true);
      showToast(verse ? (isCompletedDay ? "오늘의 One Verse를 변경했어요." : "오늘의 One Verse를 저장하고 읽기를 완료했어요.") : "One Verse 선택이 취소되었습니다. 원하는 구절을 다시 선택해 주세요.");
    } catch {
      if (scope.current === operationScope) setSelectionError("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      selectionLock.current = false;
      setIsSelectionSaving(false);
    }
  };
  const handleSaveSelection = () => pendingVerse ? persistSelection(pendingVerse) : Promise.resolve();


  const handleRequestReselect = () => {
    if (selectionLock.current) return;
    setSelectionError(null);
    setShowReselectModal(true);
  };

  const handleToggleLike = async () => {
    if (!readerUserId || !confirmedVerse || !isCompletedDay || isLikeBusy || !verseLikes) return;
    const previous = verseLikes;
    const isLiked = !previous.isLikedByMe;
    const currentUser = authUser?.nickname || authUser?.name || '나';
    setIsLikeBusy(true);
    setVerseLikes({
      count: previous.count + (isLiked ? 1 : -1),
      isLikedByMe: isLiked,
      likers: isLiked
        ? [...previous.likers, { id: readerUserId, name: currentUser }]
        : previous.likers.filter((liker) => liker.id !== readerUserId),
    });
    const success = await toggleLike(readerUserId, dayIndex, readerUserId);
    if (!success) {
      setVerseLikes(previous);
      showToast("아멘 처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
    setIsLikeBusy(false);
  };

  const handleConfirmReselect = async () => {
    await persistSelection(null);
  };

  const handleMemoryComplete = async (method?: 'voice' | 'writing') => {
    if (confirmedVerse) {
      await updateMemorizeRecord(dayIndex, true, confirmedVerse, authUser?.id, method);
      setConfirmedVerse({ ...confirmedVerse, isMemorized: true, memorizedAt: new Date().toISOString(),
        memorizedMethods: method ? Array.from(new Set([...(confirmedVerse.memorizedMethods ?? []), method])) : confirmedVerse.memorizedMethods });
      const r = await fetchReadRecords(authUser?.id);
      setRecords(r);
      setIsMemoryModalOpen(false);
    }
  };

  useEffect(() => {
    const isAnyModalOpen = showReselectModal || !!pendingVerse || isMemoryModalOpen || showAccessDeniedModal;
    if (isAnyModalOpen) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [showReselectModal, pendingVerse, isMemoryModalOpen, showAccessDeniedModal]);

  return {
    isClient,
    pendingVerse,
    setPendingVerse,
    isSelectionSaving,
    selectionError,
    handleSaveSelection,
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
    verseLikes,
    isLikeBusy,
    isMemoryModalOpen,
    setIsMemoryModalOpen,
    showReselectModal,
    setShowReselectModal,
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
    handleToggleLike,
    handleMemoryComplete,
    calculateDaysSince
  };
}
