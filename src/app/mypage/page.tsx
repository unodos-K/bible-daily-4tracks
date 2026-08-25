"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, BrainCircuit, X, Flame, Settings, Share2, PencilLine, FileText, BookOpen } from "lucide-react";
import { 
  ReadingSettings, 
  ReadRecordsMap, 
  DayRecord,
  OneVerse,
  MemoData,
  fetchReadingSettings, 
  fetchReadRecords, 
  updateMemorizeRecord,
  saveViewerDay,
  getNextUnreadDay,
  updateReadRecordOneVerse
} from "@/lib/storage";
import { getAuthUser, AuthUser } from "@/lib/auth";
import { signOut, signInWithKakao } from "@/lib/supabase";
import { shareOneVerse } from "@/lib/share";
import ShareModal from "@/components/ShareModal";
import MemoryTrainerModal from "@/components/MemoryTrainerModal";
import SettingsModal from "@/components/SettingsModal";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function formatDateStr(year: number, month: number, day: number) {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
function getDayOfWeek(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return WEEKDAYS[date.getDay()];
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

export default function MyPage() {
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
  
  // 캐러셀 관련 상태 및 Ref
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  
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

  const handleInvite = async () => {
    if (!authUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    
    const inviteUrl = window.location.origin || process.env.NEXT_PUBLIC_BASE_URL || "";
    const shareData = {
      title: 'One Verse',
      text: '매일 말씀을 읽고 내게 주신 한 구절을 암송하세요\n말씀읽기 & 뇌새김 말씀 암송',
      url: inviteUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("공유 실패:", err);
      }
    } else if (typeof window !== "undefined" && window.Kakao) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: shareData.title,
          description: shareData.text,
          imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=800&auto=format&fit=crop',
          link: {
            mobileWebUrl: inviteUrl,
            webUrl: inviteUrl,
          },
        },
        buttons: [
          {
            title: '함께 시작하기',
            link: {
              mobileWebUrl: inviteUrl,
              webUrl: inviteUrl,
            },
          },
        ],
      });
    } else {
      // 클립보드 복사 폴백
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        alert("초대 링크가 클립보드에 복사되었습니다!");
      } catch (e) {
        alert("공유 기능을 지원하지 않는 브라우저입니다.");
      }
    }
  };

  const handleCopyNickname = async () => {
    if (!authUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    const nickname = (authUser.nickname || authUser.name).split('#')[0];
    const textToCopy = `One Verse에서 저와 함께 말씀 통독을 해요! 제 닉네임은 ${nickname}입니다. (친구 탭에서 검색해 주세요!)`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert("클립보드에 복사되었습니다!");
    } catch (e) {
      alert("복사에 실패했습니다.");
    }
  };

  const handleShareOneVerse = (record: DayRecord) => {
    setSelectedRecordToShare(record);
  };

  if (!isClient || !settings || !settings.hasStarted) {
    return <div className="min-h-[calc(100vh-52px)] bg-stone-50 dark:bg-stone-950 flex justify-center items-center">Loading...</div>;
  }

  const handleDayClick = (dateStr: string) => {
    router.push(`/verse/${dateStr}`);
  };

  const nextUnreadDay = getNextUnreadDay(records);
  const daysSince = calculateDaysSince(settings.startDate);

  // 그룹화: 날짜별 완료한 Day 목록
  const recordsByDate: Record<string, DayRecord[]> = {};
  for (const day in records) {
    const r = records[day];
    if (!recordsByDate[r.readDate]) recordsByDate[r.readDate] = [];
    recordsByDate[r.readDate].push(r);
  }
  
  // 그룹 내에서 Day 순으로 정렬
  for (const date in recordsByDate) {
    recordsByDate[date].sort((a, b) => a.dayIndex - b.dayIndex);
  }

  // 통계 계산
  const totalReadDays = Object.keys(records).length;
  const totalMemorized = Object.values(records).filter(r => r.oneVerse?.isMemorized).length;
  const progressPercent = ((totalReadDays / 365) * 100).toFixed(1);

  // 달력 렌더링을 위한 데이터
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  // 이번 달 One Verse 필터링 로직
  const currentMonthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
  const thisMonthRecords = Object.values(records)
    .filter(record => record.readDate.startsWith(currentMonthPrefix) && record.oneVerse)
    .sort((a, b) => b.readDate.localeCompare(a.readDate) || b.dayIndex - a.dayIndex); // 내림차순 정렬 (최신순)

  const thisMonthTotal = thisMonthRecords.length;
  const thisMonthMemorized = thisMonthRecords.filter(r => r.oneVerse?.isMemorized).length;

  const handleCarouselScroll = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft;
      const width = carouselRef.current.clientWidth;
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentSlideIndex) {
        setCurrentSlideIndex(newIndex);
      }
    }
  };

  const scrollToSlide = (index: number) => {
    if (carouselRef.current) {
      const width = carouselRef.current.clientWidth;
      carouselRef.current.scrollTo({ left: width * index, behavior: 'smooth' });
      setCurrentSlideIndex(index);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center bg-transparent pb-10">
      <div className="w-full max-w-2xl flex flex-col">
        
        {/* 헤더 및 프로필 (고정 헤더) */}
        <header className="sticky top-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md pt-6 pb-4 px-6 border-b border-stone-200/50 dark:border-stone-800/50 flex items-center justify-between w-full mb-6">
          <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
            나의 기록 보관소
          </h1>
          <div className="flex items-center gap-3">
            {authUser ? (
              <button
                onClick={handleLogout}
                className="text-xs sm:text-sm font-semibold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors whitespace-nowrap"
              >
                🚪 로그아웃
              </button>
            ) : (
              <button
                onClick={signInWithKakao}
                className="text-xs sm:text-sm font-bold bg-[#FEE500] text-black hover:bg-[#FDD800] px-3 py-1.5 rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                💬 카카오 로그인
              </button>
            )}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full shadow-sm"
              aria-label="환경 설정"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex flex-col gap-8 px-6 w-full">
          {/* 인터랙티브 달력 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
                className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
              >
                <ChevronLeft className="text-stone-600 dark:text-stone-300" />
              </button>
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                {year}년 {month}월
              </h3>
              <button 
                onClick={() => setCurrentDate(new Date(year, month, 1))}
                className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
              >
                <ChevronRight className="text-stone-600 dark:text-stone-300" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-stone-400">
              <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-14 sm:h-20" />;
                }

                const dateStr = formatDateStr(year, month, day);
                const isBeforeStart = dateStr < settings.startDate;
                const dayRecords = recordsByDate[dateStr] || [];
                const count = dayRecords.length;
                const isCompleted = count > 0;
                
                const isToday = formatDateStr(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()) === dateStr;
                const isSelected = selectedRecordStr === dateStr;

                // 메달 및 UI 설정
                let medalStr = "";
                let borderClass = "";
                let bgClass = "";
                
                if (isCompleted) {
                  if (count === 3) {
                    medalStr = "🏅🏅🏅";
                    borderClass = "border-amber-400 dark:border-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]";
                    bgClass = "bg-amber-50/50 dark:bg-amber-900/10";
                  } else if (count === 2) {
                    medalStr = "🏅🏅";
                    borderClass = "border-sky-300 dark:border-sky-700";
                    bgClass = "bg-sky-50 dark:bg-sky-900/20";
                  } else {
                    medalStr = "🏅";
                    borderClass = "border-sky-200 dark:border-sky-800";
                    bgClass = "bg-sky-50 dark:bg-sky-900/20";
                  }
                }

                return (
                  <div 
                    key={day}
                    onClick={() => {
                      if (!isBeforeStart || isCompleted) {
                        handleDayClick(dateStr);
                      }
                    }}
                    className={`
                      relative h-14 sm:h-20 flex flex-col items-center justify-start pt-2 rounded-xl transition-all border select-none
                      ${isBeforeStart && !isCompleted ? 'opacity-30 cursor-not-allowed bg-stone-50 dark:bg-stone-900 border-transparent' : 'cursor-pointer'}
                      ${isSelected ? 'ring-2 ring-sky-500 bg-sky-100 dark:bg-sky-900/60' : ''}
                      ${isCompleted && !isSelected ? `${bgClass} ${borderClass} hover:brightness-95` : ''}
                      ${!isCompleted && !isSelected && !isBeforeStart ? 'bg-transparent border-transparent hover:border-stone-200 dark:hover:border-stone-800' : ''}
                    `}
                  >
                    <span className={`text-sm font-medium ${isToday ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-stone-700 dark:text-stone-300'}`}>
                      {day}
                    </span>
                    {isCompleted && (
                      <div className="flex mt-1 justify-center gap-1 items-center">
                        {count > 3 ? (
                          <span className="bg-stone-700 dark:bg-stone-600 text-stone-100 text-[10px] font-bold px-1.5 py-0.5 leading-none rounded-full">
                            +{count}
                          </span>
                        ) : (
                          Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 이번 달 One Verse 아카이브 리스트 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 sm:p-6 flex flex-col">
            <div className="flex flex-col gap-4 mb-6">
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                📅 {year}년 {month}월의 One Verse
                <span className="text-sm font-medium text-stone-500 bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 rounded-full">
                  총 {thisMonthTotal}개
                </span>
              </h3>
              <div className="flex gap-2">
                <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-md">
                  👑 암송 완료: {thisMonthMemorized}개
                </span>
                <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-md">
                  📖 통독: {thisMonthTotal}개
                </span>
              </div>
            </div>

            {thisMonthTotal === 0 ? (
              <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-100 dark:border-stone-800 flex flex-col items-center justify-center py-12 text-center">
                <p className="text-stone-500 dark:text-stone-400 mb-2 font-medium">이번 달에 등록된 One Verse가 아직 없습니다.</p>
                <p className="text-stone-400 dark:text-stone-500 text-sm">오늘의 말씀을 읽고 마음에 닿는 구절을 남겨보세요! ✨</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {thisMonthRecords.map((record) => {
                  const [yStr, mStr, dStr] = record.readDate.split("-");
                  const dayNum = parseInt(dStr, 10);
                  const weekDay = getDayOfWeek(parseInt(yStr), parseInt(mStr), dayNum);
                  const verse = record.oneVerse!;
                  const isMem = verse.isMemorized;
                  // @ts-expect-error: compatibility with older data structure
                  const displayTxt = verse.displayText || verse.text || "";
                  const formattedRef = verse.book === "시편" ? `${verse.book} ${verse.chapter}편 ${verse.verse}절` : `${verse.book} ${verse.chapter}장 ${verse.verse}절`;

                  return (
                    <div key={`${record.readDate}-${record.dayIndex}`} className="flex flex-col bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      
                      <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800 dark:text-stone-200">
                            {parseInt(mStr)}월 {dayNum}일 ({weekDay})
                          </span>
                          <span className="text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-2.5 py-0.5 rounded-full">
                            Day {record.dayIndex}
                          </span>
                        </div>
                        
                        <div className={`text-xs font-bold px-2 py-1 rounded-md border ${
                          isMem
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {isMem ? '👑 암송 완료' : '📖 통독 완료'}
                        </div>
                      </div>

                      <div className="p-5 flex flex-col gap-3">
                        <blockquote className="text-base sm:text-lg text-stone-800 dark:text-stone-200 font-medium leading-relaxed italic break-keep">
                          {displayTxt}
                        </blockquote>
                        <div className="text-right text-stone-500 dark:text-stone-400 font-bold text-xs sm:text-sm">
                          - {formattedRef} -
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-6 pt-4 border-t border-stone-100 dark:border-stone-800">
                          <button
                            onClick={() => router.push(`/memo?day=${record.dayIndex}&mode=${verse.memo ? 'view' : 'edit'}`)}
                            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                          >
                            <FileText size={20} strokeWidth={2.5} className="text-emerald-500 dark:text-emerald-400" />
                            <span className="text-[10px] sm:text-xs font-bold tracking-tight">{verse.memo ? "메모 보기" : "메모 작성"}</span>
                          </button>
                          <button
                            onClick={() => handleShareOneVerse(record)}
                            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                          >
                            <Share2 size={20} strokeWidth={2.5} className="text-sky-500 dark:text-sky-400" />
                            <span className="text-[10px] sm:text-xs font-bold tracking-tight">공유하기</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRecordStr(record.readDate);
                              setSelectedDayIndexForMemory(record.dayIndex);
                              setIsMemoryModalOpen(true);
                            }}
                            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                          >
                            <BrainCircuit size={20} strokeWidth={2.5} className="text-amber-500 dark:text-amber-400" />
                            <span className="text-[10px] sm:text-xs font-bold tracking-tight">{isMem ? '암송 복습' : '암송 훈련'}</span>
                          </button>
                          <button
                            onClick={() => {
                              try {
                                saveViewerDay(record.dayIndex);
                              } catch {}
                              router.push("/read?day=" + record.dayIndex);
                            }}
                            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                          >
                            <BookOpen size={20} strokeWidth={2.5} className="text-indigo-500 dark:text-indigo-400" />
                            <span className="text-[10px] sm:text-xs font-bold tracking-tight">본문 보기</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 소셜 및 기능 섹션 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 sm:p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 mb-2">
              🤝 소셜 및 설정
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleInvite}
                className="flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD800] text-black font-bold py-3.5 rounded-xl transition-colors shadow-sm w-full"
              >
                친구에게 One Verse 추천하기
              </button>
              <button
                onClick={handleCopyNickname}
                className="flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold py-3.5 rounded-xl transition-colors shadow-sm w-full"
              >
                내 닉네임 복사하기
              </button>
            </div>
          </div>
        </div>



      </div>
      
      {/* 암송 트레이너 모달 연동 */}
      {isMemoryModalOpen && selectedDayIndexForMemory && records[selectedDayIndexForMemory]?.oneVerse && (
        <MemoryTrainerModal
          oneVerse={records[selectedDayIndexForMemory].oneVerse as OneVerse}
          onClose={() => setIsMemoryModalOpen(false)}
          onComplete={async () => {
            const verse = records[selectedDayIndexForMemory].oneVerse;
            if (verse) {
              await updateMemorizeRecord(selectedDayIndexForMemory, true, verse);
              const r = await fetchReadRecords();
              setRecords(r);
            }
            setIsMemoryModalOpen(false);
          }}
        />
      )}

      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <ShareModal
        isOpen={!!selectedRecordToShare}
        onClose={() => setSelectedRecordToShare(null)}
        record={selectedRecordToShare}
        onShare={(orderedItems) => {
          if (selectedRecordToShare) {
            const nickname = authUser ? (authUser.nickname || authUser.name).split('#')[0] : '순례자';
            shareOneVerse(selectedRecordToShare, nickname, orderedItems);
          }
        }}
      />

      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-stone-800 text-white px-4 py-2 rounded-full shadow-lg z-[100] animate-fade-in-up text-sm whitespace-nowrap">
          {toastMessage}
        </div>
      )}

    </div>
  );
}
