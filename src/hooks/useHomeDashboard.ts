import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ReadingSettings, 
  ReadRecordsMap, 
  fetchReadingSettings, 
  fetchReadRecords,
  getNextUnreadDay
} from "@/lib/storage";
import { getAuthUser, AuthUser } from "@/lib/auth";

export function calculateDaysSince(startDateStr: string): number {
  if (!startDateStr) return 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = startDateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  start.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, diffDays + 1);
}

export function useHomeDashboard() {
  const router = useRouter();
  
  const [settings, setSettings] = useState<ReadingSettings | null>(null);
  const [records, setRecords] = useState<ReadRecordsMap>({});
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [nextUnreadDay, setNextUnreadDay] = useState(1);
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const targetDayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    getAuthUser().then(async (user) => {
      setAuthUser(user);
      if (user) {
        const s = await fetchReadingSettings();
        if (s && s.hasStarted) {
          setSettings(s);
          const r = await fetchReadRecords();
          setRecords(r);
          setNextUnreadDay(await getNextUnreadDay(r));
        }
      }
      setIsLoading(false);
    });
  }, []);

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
