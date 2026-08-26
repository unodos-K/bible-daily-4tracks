import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ReadingSettings, 
  ReadRecordsMap, 
  DayRecord,
  fetchReadingSettings, 
  fetchReadRecords 
} from "@/lib/storage";
import { getAuthUser, AuthUser } from "@/lib/auth";
import { signOut } from "@/lib/supabase";

export function useMyPageStats() {
  const router = useRouter();
  
  const [settings, setSettings] = useState<ReadingSettings | null>(null);
  const [records, setRecords] = useState<ReadRecordsMap>({});
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  
  const [selectedRecordStr, setSelectedRecordStr] = useState<string | null>(null);
  const [selectedDayIndexForMemory, setSelectedDayIndexForMemory] = useState<number | null>(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  
  const [selectedRecordToShare, setSelectedRecordToShare] = useState<DayRecord | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    getAuthUser().then(async (user) => {
      setAuthUser(user);
      if (user) {
        const s = await fetchReadingSettings();
        if (!s || !s.hasStarted) {
          router.push("/");
          return;
        }
        setSettings(s);
        const r = await fetchReadRecords();
        setRecords(r);
      } else {
        router.push("/");
      }
    });
  }, [router]);

  useEffect(() => {
    if (selectedRecordStr || isMemoryModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedRecordStr, isMemoryModalOpen]);

  useEffect(() => {
    const handleRecordsUpdated = async () => {
      if (authUser) {
        const r = await fetchReadRecords();
        setRecords(r);
      }
    };
    window.addEventListener('records_updated', handleRecordsUpdated);
    return () => window.removeEventListener('records_updated', handleRecordsUpdated);
  }, [authUser]);

  const handleLogout = async () => {
    await signOut();
    setAuthUser(null);
    window.location.href = "/";
  };

  const handleShareOneVerse = (record: DayRecord) => {
    setSelectedRecordToShare(record);
  };

  return {
    router,
    settings,
    records,
    setRecords,
    authUser,
    currentDate,
    setCurrentDate,
    isClient,
    selectedRecordStr,
    setSelectedRecordStr,
    selectedDayIndexForMemory,
    setSelectedDayIndexForMemory,
    isMemoryModalOpen,
    setIsMemoryModalOpen,
    selectedRecordToShare,
    setSelectedRecordToShare,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    toastMessage,
    setToastMessage,
    handleLogout,
    handleShareOneVerse
  };
}
