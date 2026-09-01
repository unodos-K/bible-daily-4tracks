"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Heart, HeartHandshake, BookOpen, Quote, Footprints } from "lucide-react";
import { 
  ReadRecordsMap, 
  DayRecord,
  OneVerse,
  fetchReadRecords, 
  updateMemorizeRecord
} from "@/lib/storage";
import { getAuthUser, AuthUser } from "@/lib/auth";
import { shareOneVerse } from "@/lib/share";
import ShareModal from "@/components/ShareModal";
import MemoryTrainerModal from "@/components/MemoryTrainerModal";

export default function VerseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dateParam = params?.date as string;
  
  const [records, setRecords] = useState<ReadRecordsMap>({});
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  const [selectedDayIndexForMemory, setSelectedDayIndexForMemory] = useState<number | null>(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [selectedRecordToShare, setSelectedRecordToShare] = useState<DayRecord | null>(null);

  useEffect(() => {
    setIsClient(true);
    getAuthUser().then(async (user) => {
      setAuthUser(user);
      const r = await fetchReadRecords();
      setRecords(r);
    });
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-[100dvh] bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-3 text-stone-500">
        <BookOpen className="animate-pulse w-8 h-8" />
        <span className="text-sm font-medium">오늘의 말씀을 펴는 중...</span>
      </div>
    );
  }

  // Parse date for title
  const [y, m, d] = (dateParam || "").split("-");
  const hasValidDate = y && m && d;

  // Get records for this date and sort by dayIndex
  const dayRecords = Object.values(records)
    .filter(r => r.readDate === dateParam)
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const handleShareOneVerse = (record: DayRecord) => {
    setSelectedRecordToShare(record);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-stone-50 dark:bg-stone-950 flex flex-col">
      {/* 고정 헤더 */}
      <header className="sticky top-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md pt-[calc(1rem+env(safe-area-inset-top))] pb-4 px-4 border-b border-stone-200/50 dark:border-stone-800/50 flex items-center shadow-sm">
        <button 
          onClick={() => router.back()}
          className="p-2 mr-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full text-stone-600 dark:text-stone-300 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-stone-800 dark:text-stone-100">
          {hasValidDate ? `${parseInt(m)}월 ${parseInt(d)}일의 One Verse` : 'One Verse'}
        </h1>
      </header>

      {/* 메인 스크롤 영역 */}
      <main className="flex-1 w-full overflow-y-auto pb-20 px-4 sm:px-6">
        {dayRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
            <p className="text-stone-500 dark:text-stone-400 font-medium">해당 날짜에는 남겨진 발자국이 없어요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto mt-6 md:mt-10">
            {dayRecords.map((record) => {
              const verse = record.oneVerse;
              if (!verse) return null;
              
              const isMem = verse.isMemorized;
              // @ts-expect-error: compatibility with older data structure
              const displayTxt = verse.displayText || verse.text || "";
              const formattedRef = verse.book === "시편" ? `${verse.book} ${verse.chapter}편 ${verse.verse}절` : `${verse.book} ${verse.chapter}장 ${verse.verse}절`;

              return (
                <div key={record.dayIndex} className="flex flex-col mb-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden">
                  
                  {/* Day 라벨 (여러 개일 경우 구분) */}
                  <div className="flex justify-between items-center px-5 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                    <span className="font-bold text-stone-700 dark:text-stone-300 text-sm md:text-base">
                      Day {record.dayIndex}
                    </span>
                    <div className={`px-2 py-1 rounded-md text-xs font-bold ${
                      isMem 
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800' 
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                    }`}>
                      {isMem ? '👑 암송 완료' : '📖 통독 완료'}
                    </div>
                  </div>

                  {/* 말씀 본문 영역 (UI 확대 및 여백) */}
                  <div className="relative p-6 md:p-10 bg-stone-800 dark:bg-stone-800/40 text-stone-100 flex flex-col">
                    <Quote className="absolute top-4 left-4 md:top-6 md:left-6 text-white/10 w-12 h-12 md:w-16 md:h-16 -scale-x-100" />
                    
                    <blockquote className="relative z-10 text-lg md:text-2xl leading-relaxed md:leading-loose font-medium italic break-words break-keep mt-6">
                      {displayTxt}
                    </blockquote>
                    
                    <div className="text-right mt-6 md:mt-8 text-sm md:text-base text-stone-400 font-bold">
                      - {formattedRef} -
                    </div>
                  </div>

                  {/* 4열 액션 버튼 (마이페이지와 동일) */}
                  <div className="grid grid-cols-4 gap-1 p-3 bg-white dark:bg-stone-900">
                    <button
                      onClick={() => router.push(`/memo?day=${record.dayIndex}&mode=${verse.memo ? 'view' : 'edit'}`)}
                      className="flex flex-col items-center justify-center gap-1.5 py-4 bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                    >
                      {verse.memo ? (
                        <Footprints size={22} strokeWidth={2.5} className="text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Footprints size={22} strokeWidth={2.5} className="text-emerald-500 dark:text-emerald-400" />
                      )}
                      <span className="text-xs font-bold tracking-tight">{verse.memo ? "발자국 보기" : "발자국 남기기"}</span>
                    </button>
                    <button
                      onClick={() => handleShareOneVerse(record)}
                      className="flex flex-col items-center justify-center gap-1.5 py-4 bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                    >
                      <HeartHandshake size={22} strokeWidth={2.5} className="text-sky-500 dark:text-sky-400" />
                      <span className="text-xs font-bold tracking-tight">나눔</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDayIndexForMemory(record.dayIndex);
                        setIsMemoryModalOpen(true);
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 py-4 bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                    >
                      <Heart size={22} strokeWidth={2.5} className="text-amber-500 dark:text-amber-400" />
                      <span className="text-xs font-bold tracking-tight">{isMem ? '다시 새김' : '마음 새김'}</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push("/read?day=" + record.dayIndex);
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 py-4 bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 dark:text-stone-300 rounded-xl transition-all active:scale-95"
                    >
                      <BookOpen size={22} strokeWidth={2.5} className="text-indigo-500 dark:text-indigo-400" />
                      <span className="text-xs font-bold tracking-tight">본문 보기</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 암송 트레이너 모달 */}
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

      {/* 나눔 모달 */}
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
    </div>
  );
}
