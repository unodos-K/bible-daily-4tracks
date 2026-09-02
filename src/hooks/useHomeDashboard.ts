import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ReadingSettings, 
  ReadRecordsMap, 
  fetchReadingSettings, 
  fetchReadRecords,
} from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";
import { getNextUnreadDay } from "@/lib/readingRecords";

export function useHomeDashboard() {
  const router = useRouter();
  
  const [settings, setSettings] = useState<ReadingSettings | null>(null);
  const [records, setRecords] = useState<ReadRecordsMap>({});
  const { authUser, isAuthLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [nextUnreadDay, setNextUnreadDay] = useState(1);
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const targetDayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    if (isAuthLoading) return;
    const loadDashboard = async () => {
      if (authUser) {
        const s = await fetchReadingSettings(authUser.id);
        if (s && s.hasStarted) {
          setSettings(s);
          const r = await fetchReadRecords(authUser.id);
          setRecords(r);
          setNextUnreadDay(getNextUnreadDay(r));
        }
      } else {
        setSettings(null);
        setRecords({});
        setNextUnreadDay(1);
      }
      setIsLoading(false);
    };
    void loadDashboard();
  }, [authUser, isAuthLoading]);

  useEffect(() => {
    if (isScheduleSheetOpen && targetDayRef.current) {
      setTimeout(() => {
        targetDayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [isScheduleSheetOpen]);

  return {
    router,
    settings,
    records,
    authUser,
    isClient,
    nextUnreadDay,
    isScheduleSheetOpen,
    setIsScheduleSheetOpen,
    isLoading,
    targetDayRef
  };
}
