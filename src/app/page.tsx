"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Share2 } from "lucide-react";
import { 
  ReadingSettings, 
  ReadRecordsMap, 
  fetchReadingSettings, 
  fetchReadRecords,
  getNextUnreadDay
} from "@/lib/storage";
import { getAuthUser, AuthUser } from "@/lib/auth";
import FriendsList from "@/components/FriendsList";

declare global {
  interface Window {
    Kakao: any;
  }
}

function calculateDaysSince(startDateStr: string): number {
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

export default function HomePage() {
  const router = useRouter();
  
  const [settings, setSettings] = useState<ReadingSettings | null>(null);
  const [records, setRecords] = useState<ReadRecordsMap>({});
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [nextUnreadDay, setNextUnreadDay] = useState(1);

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
    });
  }, []);

  const handleInvite = () => {
    if (!authUser || typeof window === "undefined" || !window.Kakao) return;
    
    if (!window.Kakao.isInitialized()) {
      alert("카카오톡 SDK가 아직 로드되지 않았습니다.");
      return;
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '함께하는 4Tracks 통독',
        description: `📖 ${authUser.nickname || authUser.name}님과 함께 매일 말씀 통독과 One Verse 묵상을 시작해보세요!`,
        imageUrl: 'https://i.ibb.co/30B3bM2/bible-daily.png',
        link: {
          mobileWebUrl: window.location.origin,
          webUrl: window.location.origin,
        },
      },
      buttons: [
        {
          title: '초대 수락하고 시작하기',
          link: {
            mobileWebUrl: `${window.location.origin}/?inviteCode=${authUser.id}`,
            webUrl: `${window.location.origin}/?inviteCode=${authUser.id}`,
          },
        },
      ],
    });
  };

  if (!isClient) return null;

  const recordsArray = Object.values(records);
  const totalReadDays = recordsArray.filter(r => r.completedAt || r.readDate).length;
  const achievementRate = Math.round((totalReadDays / 365) * 100);
  const daysSince = settings ? calculateDaysSince(settings.startDate) : 1;
  const memorizedCount = recordsArray.filter(r => r.oneVerse?.isMemorized).length;

  return (
    <div className="w-full min-h-full flex flex-col items-center bg-transparent p-6 pb-10">
      <div className="w-full max-w-xl flex flex-col gap-8">
        
        {/* 환영 메시지 */}
        <div className="pt-4">
          <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100 flex flex-col gap-1">
            <span className="text-sm font-bold text-stone-500 dark:text-stone-400">4Tracks 성경 통독</span>
            <span>
              {authUser ? <><span className="text-amber-600 dark:text-amber-500">{authUser.nickname || authUser.name}</span>님 환영합니다 ✨</> : '나의 통독 대시보드 ✨'}
            </span>
          </h1>
        </div>

        {/* 통독 요약 위젯 */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-stone-500 dark:text-stone-400 text-sm font-semibold mb-1">나의 통독 여정</p>
              <h2 className="text-3xl font-black text-stone-800 dark:text-stone-100">
                {totalReadDays} <span className="text-lg font-bold text-stone-400">/ 365일</span>
              </h2>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
                달성률 {achievementRate}%
              </span>
            </div>
          </div>
          
          <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden mt-1">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${achievementRate}%` }}
            ></div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-stone-50 dark:bg-stone-950 rounded-xl p-3 flex flex-col items-center justify-center border border-stone-100 dark:border-stone-800">
              <span className="text-xs font-semibold text-stone-500 mb-0.5">암송 완료</span>
              <span className="text-lg font-black text-stone-700 dark:text-stone-300">{memorizedCount}절</span>
            </div>
            <div className="bg-stone-50 dark:bg-stone-950 rounded-xl p-3 flex flex-col items-center justify-center border border-stone-100 dark:border-stone-800">
              <span className="text-xs font-semibold text-stone-500 mb-0.5">통독 일차</span>
              <span className="text-lg font-black text-stone-700 dark:text-stone-300">Day {daysSince}</span>
            </div>
          </div>
        </div>

        {/* CTA 버튼 */}
        <button
          onClick={() => router.push("/read")}
          className="w-full py-4 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-black rounded-2xl transition-transform hover:-translate-y-1 shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 text-lg active:translate-y-0"
        >
          <BookOpen size={22} />
          오늘의 말씀 읽기
        </button>

        {/* 친구 목록 영역 */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              🤝 함께하는 순례자들
            </h3>
            {authUser && (
              <button
                onClick={handleInvite}
                className="text-xs font-bold bg-[#FEE500] text-black hover:bg-[#FDD800] px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Share2 size={12} />
                카카오톡 초대
              </button>
            )}
          </div>
          
          <FriendsList />
        </div>
      </div>
    </div>
  );
}
