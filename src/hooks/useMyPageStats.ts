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
import { signOut, supabase } from "@/lib/supabase";
import { toggleLike } from "@/lib/social";

export interface VerseLikeData {
  count: number;
  isLikedByMe: boolean;
  likers: { id: string; name: string }[];
}

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [likesMap, setLikesMap] = useState<Record<number, VerseLikeData>>({});

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

        const { data: likes } = await supabase
          .from('one_verse_likes')
          .select('liker_id, day_index, profiles!liker_id(name, nickname)')
          .eq('author_id', user.id);
          
        if (likes) {
          const map: Record<number, VerseLikeData> = {};
          likes.forEach(l => {
            if (!map[l.day_index]) {
              map[l.day_index] = { count: 0, isLikedByMe: false, likers: [] };
            }
            map[l.day_index].count++;
            if (l.liker_id === user.id) map[l.day_index].isLikedByMe = true;
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = Array.isArray(l.profiles) ? l.profiles[0] : (l.profiles as any);
            map[l.day_index].likers.push({
              id: l.liker_id,
              name: p?.nickname || p?.name || '알 수 없음'
            });
          });
          setLikesMap(map);
        }
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

  const handleToggleLike = async (dayIndex: number) => {
    if (!authUser) return;
    const success = await toggleLike(authUser.id, dayIndex);
    if (success) {
      setLikesMap(prev => {
        const current = prev[dayIndex] || { count: 0, isLikedByMe: false, likers: [] };
        const newIsLiked = !current.isLikedByMe;
        let newLikers = [...current.likers];
        if (newIsLiked) {
          newLikers.push({ id: authUser.id, name: authUser.nickname || authUser.name || '나' });
        } else {
          newLikers = newLikers.filter(u => u.id !== authUser.id);
        }
        return {
          ...prev,
          [dayIndex]: {
            count: newIsLiked ? current.count + 1 : current.count - 1,
            isLikedByMe: newIsLiked,
            likers: newLikers
          }
        };
      });
    }
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
    toastMessage,
    setToastMessage,
    handleLogout,
    handleShareOneVerse,
    likesMap,
    handleToggleLike
  };
}

