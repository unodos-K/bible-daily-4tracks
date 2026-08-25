"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, AlertCircle, CalendarDays, X, ChevronRight } from "lucide-react";
import scheduleData from "@/data/Bible_Reading_Schedule_365.json";
import { 
  ReadingSettings, 
  ReadRecordsMap, 
  fetchReadingSettings, 
  fetchReadRecords,
  getNextUnreadDay
} from "@/lib/storage";
import { getAuthUser, AuthUser } from "@/lib/auth";

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

const BIBLE_ABBREVIATIONS: Record<string, string> = {
  "창세기": "창", "출애굽기": "출", "레위기": "레", "민수기": "민", "신명기": "신",
  "여호수아": "수", "사사기": "삿", "룻기": "룻", "사무엘상": "삼상", "사무엘하": "삼하",
  "열왕기상": "왕상", "열왕기하": "왕하", "역대상": "대상", "역대하": "대하",
  "에스라": "스", "느헤미야": "느", "에스더": "에", "욥기": "욥", "시편": "시",
  "잠언": "잠", "전도서": "전", "아가": "아", "이사야": "사", "예레미야": "렘",
  "예레미야 애가": "애", "에스겔": "겔", "다니엘": "단", "호세아": "호", "요엘": "욜",
  "아모스": "암", "오바댜": "옵", "요나": "욘", "미가": "미", "나훔": "나",
  "하박국": "합", "스바냐": "습", "학개": "학", "스가랴": "슥", "말라기": "말",
  "마태복음": "마", "마가복음": "막", "누가복음": "눅", "요한복음": "요", "사도행전": "행",
  "로마서": "롬", "고린도전서": "고전", "고린도후서": "고후", "갈라디아서": "갈",
  "에베소서": "엡", "빌립보서": "빌", "골로새서": "골", "데살로니가전서": "살전",
  "데살로니가후서": "살후", "디모데전서": "딤전", "디모데후서": "딤후", "디도서": "딛",
  "빌레몬서": "몬", "히브리서": "히", "야고보서": "약", "베드로전서": "벧전",
  "베드로후서": "벧후", "요한일서": "요일", "요한이서": "요이", "요한삼서": "요삼",
  "유다서": "유", "요한계시록": "계"
};

const getCategoryColor = (category: string) => {
  switch(category) {
    case '구약': return 'text-sky-600 dark:text-sky-300';
    case '신약': return 'text-rose-600 dark:text-rose-300';
    case '시편': return 'text-purple-600 dark:text-purple-300';
    case '잠언': return 'text-amber-600 dark:text-amber-300';
    default: return 'text-stone-600 dark:text-stone-300';
  }
};

function formatSchedule(dayData: any) {
  if (!dayData) return [];
  const tracks = dayData.tracks;
  const parts: { category: string; text: string }[] = [];
  const getAbbr = (bookName: string) => BIBLE_ABBREVIATIONS[bookName] || bookName.substring(0, 1);
  
  const formatTrack = (category: string, tData: any) => {
    if (!tData) return;
    const abbr = getAbbr(tData.Book);
    let rangeStr = "";
    if (tData.startChapter === tData.endChapter) {
      if (tData.startVerse === null || tData.endVerse === null) {
        rangeStr = `${tData.startChapter}`;
      } else {
        rangeStr = `${tData.startChapter}:${tData.startVerse}-${tData.endVerse}`;
      }
    } else {
      if (tData.startVerse === null || tData.endVerse === null) {
        rangeStr = `${tData.startChapter}-${tData.endChapter}`;
      } else {
        rangeStr = `${tData.startChapter}:${tData.startVerse}-${tData.endChapter}:${tData.endVerse}`;
      }
    }
    parts.push({ category, text: `${abbr} ${rangeStr}` });
  };

  formatTrack("구약", tracks["구약"]);
  formatTrack("신약", tracks["신약"]);
  formatTrack("시편", tracks["시편"]);
  formatTrack("잠언", tracks["잠언"]);
  
  return parts;
}

export default function HomePage() {
  const router = useRouter();
  
  const [settings, setSettings] = useState<ReadingSettings | null>(null);
  const [records, setRecords] = useState<ReadRecordsMap>({});
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [nextUnreadDay, setNextUnreadDay] = useState(1);
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
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
    });
  }, []);

  useEffect(() => {
    if (isScheduleSheetOpen && targetDayRef.current) {
      setTimeout(() => {
        targetDayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [isScheduleSheetOpen]);



  if (!isClient) return null;

  const recordsArray = Object.values(records);
  const totalReadDays = recordsArray.filter(r => r.completedAt || r.readDate).length;
  const achievementRate = Math.round((totalReadDays / 365) * 100);
  const daysSince = settings ? calculateDaysSince(settings.startDate) : 1;
  const memorizedCount = recordsArray.filter(r => r.oneVerse?.isMemorized).length;
  
  const missedDays = Math.max(0, daysSince - totalReadDays);
  const isOnTrack = missedDays === 0;

  return (
    <div className="w-full min-h-full flex flex-col items-center bg-transparent pb-10">
      <div className="w-full max-w-xl flex flex-col">
        
        {/* 환영 메시지 (고정 헤더) */}
        <header className="sticky top-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md pt-6 pb-4 px-6 border-b border-stone-200/50 dark:border-stone-800/50 mb-6">
          <h1 className="flex flex-col gap-1.5 w-full">
            {authUser ? (
              <>
                <div className="flex items-center text-lg font-bold text-amber-600 dark:text-amber-500">
                  <span className="truncate max-w-[80%] inline-block">{(authUser.nickname || authUser.name).split('#')[0]}</span>
                  <span>님,</span>
                </div>
                <div className="text-xl font-black text-stone-800 dark:text-stone-100 break-keep">
                  오늘도 말씀을 마음에 새겨볼까요? ✨
                </div>
              </>
            ) : (
              <div className="text-xl font-black text-stone-800 dark:text-stone-100">
                나의 통독 대시보드 ✨
              </div>
            )}
          </h1>
        </header>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex flex-col gap-8 px-6">
          
          {/* 오늘의 분량 미니 스케줄 */}
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-sky-500" />
                <span className="font-bold text-stone-700 dark:text-stone-300">
                  {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </span>
              </div>
              <span className="text-xs font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 px-2 py-1 rounded-md">
                Day {daysSince}
              </span>
            </div>
            <div className="text-lg font-black text-stone-800 dark:text-stone-100 mb-4 flex flex-wrap gap-x-3 gap-y-2">
              {formatSchedule(scheduleData[daysSince - 1]).map((p, i, arr) => (
                <span key={p.category} className="inline-flex items-center">
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 dark:bg-stone-800 ${getCategoryColor(p.category)}`}>
                    {p.category}
                  </span>
                  <span className="ml-1.5">{p.text}{i < arr.length - 1 ? ',' : ''}</span>
                </span>
              ))}
            </div>
            <button 
              onClick={() => setIsScheduleSheetOpen(true)}
              className="self-end flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
            >
              전체 일정 보기 <ChevronRight size={16} />
            </button>
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
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-stone-50 dark:bg-stone-950 rounded-xl p-3 flex flex-col items-center justify-center border border-stone-100 dark:border-stone-800">
              <span className="text-xs font-semibold text-stone-500 mb-0.5">목표 진도</span>
              <span className="text-lg font-black text-stone-700 dark:text-stone-300">Day {daysSince}</span>
            </div>
            <div className="bg-stone-50 dark:bg-stone-950 rounded-xl p-3 flex flex-col items-center justify-center border border-stone-100 dark:border-stone-800">
              <span className="text-xs font-semibold text-stone-500 mb-0.5">암송 완료</span>
              <span className="text-lg font-black text-stone-700 dark:text-stone-300">{memorizedCount}절</span>
            </div>
            
            <div className="bg-stone-50 dark:bg-stone-950 rounded-xl p-3 flex flex-col items-center justify-center border border-stone-100 dark:border-stone-800 col-span-2">
              <span className="text-xs font-semibold text-stone-500 mb-1">오늘의 통독 상태</span>
              {isOnTrack ? (
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> 목표 진도 달성 완료! 멋져요 🎉
                </span>
              ) : (
                <span className="text-sm font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle size={16} /> 밀린 진도가 {missedDays}일 있어요! 몰아보기 추천 🔥
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              if (Object.keys(records).length === 0) {
                alert("아직 읽은 기록이 없어요. 오늘 진도부터 시작해 보세요!");
                return;
              }
              const nextDay = getNextUnreadDay(records);
              router.push("/read?day=" + nextDay);
            }}
            className="w-full py-3.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-2xl transition-transform hover:-translate-y-1 shadow-sm flex items-center justify-center gap-2 text-[15px] sm:text-base active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <BookOpen size={20} />
            마지막 읽은 본문 이어서 읽기
          </button>
          
          <button
            onClick={() => router.push("/read?day=" + daysSince)}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black rounded-2xl transition-transform hover:-translate-y-1 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-lg active:translate-y-0"
          >
            <CalendarDays size={22} />
            오늘 목표 진도 읽기 (Day {daysSince})
          </button>
        </div>

        {/* 앱 활용 가이드 */}
        <div className="flex flex-col gap-3 mt-2 mb-8 text-sm text-stone-500 dark:text-stone-400 leading-relaxed px-1 break-keep">
          <h3 className="font-semibold text-stone-700 dark:text-stone-300">💡 One Verse 100% 활용 가이드</h3>
          <ul className="flex flex-col space-y-3 pl-0.5">
            <li className="flex items-start gap-2">
              <span className="mt-[1px]">•</span>
              <span><strong>말씀 읽기:</strong> 매일 구약, 신약, 시편, 잠언으로 구성된 분량을 읽으며 1년 1독에 도전해 보세요. 마음에 와닿는 단 하나의 구절(One Verse)에 나만의 묵상 메모를 남기고 카카오톡으로 공유할 수도 있습니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[1px]">•</span>
              <span><strong>친구:</strong> 카카오톡 친구를 앱으로 초대해 보세요. 서로가 선택한 One Verse와 묵상을 나누며 함께 은혜를 풍성하게 누릴 수 있습니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[1px]">•</span>
              <span><strong>암송 기능:</strong> 빈칸 채우기 기반의 '뇌새김' 방식을 통해, 오늘 내게 주신 말씀을 하루 종일 머리와 가슴에 깊이 새겨보세요.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[1px]">•</span>
              <span><strong>홈 화면 설치:</strong> 브라우저 메뉴에서 '홈 화면에 추가'를 누르면 네이티브 앱처럼 편하게 쓸 수 있어요. (Safari: 하단 공유 아이콘 ➔ 홈 화면에 추가 / Chrome: 우측 상단 메뉴 ➔ 앱 설치)</span>
            </li>
          </ul>
        </div>

        </div>
      </div>

      {/* 365일 바텀 시트 */}
      {isScheduleSheetOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsScheduleSheetOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-white dark:bg-stone-950 rounded-t-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center p-5 border-b border-stone-200 dark:border-stone-800 shrink-0">
              <h2 className="text-xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <CalendarDays size={20} className="text-sky-500" /> 365일 전체 일정
              </h2>
              <button 
                onClick={() => setIsScheduleSheetOpen(false)}
                className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-20 flex flex-col gap-2 overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
              {scheduleData.map((dayData, index) => {
                const dayStr = String(dayData.day);
                const isCompleted = records[dayStr]?.completedAt || records[dayStr]?.readDate;
                const isTargetDay = dayData.day === daysSince;

                return (
                  <div 
                    key={dayData.day} 
                    ref={isTargetDay ? targetDayRef : null}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 rounded-xl border ${
                      isTargetDay 
                        ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-700 shadow-sm' 
                        : isCompleted
                          ? 'bg-stone-50 dark:bg-stone-900/50 border-green-500 dark:border-green-600/60 opacity-90'
                          : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
                    }`}
                  >
                    <div className="flex items-center mb-0.5 sm:mb-0">
                      <span className={`font-black w-14 whitespace-nowrap flex-shrink-0 ${
                        isTargetDay ? 'text-sky-600 dark:text-sky-400' : isCompleted ? 'text-stone-500' : 'text-stone-700 dark:text-stone-300'
                      }`}>
                        Day {dayData.day}
                      </span>
                    </div>
                    <span className={`text-[13px] font-semibold flex flex-wrap gap-2 sm:justify-end leading-snug ${
                      isTargetDay ? 'text-stone-800 dark:text-stone-200' : isCompleted ? 'text-stone-400' : 'text-stone-600 dark:text-stone-400'
                    }`}>
                      {formatSchedule(dayData).map((p, i, arr) => (
                        <span key={p.category} className="inline-flex items-center">
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
                            isCompleted
                                ? 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                                : `bg-stone-100 dark:bg-stone-800 ${getCategoryColor(p.category)}`
                          }`}>
                            {p.category}
                          </span>
                          <span className="ml-1.5">{p.text}{i < arr.length - 1 ? ',' : ''}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
