import React from "react";
import { useRouter } from "next/navigation";
import { Crown, BrainCircuit, PencilLine, FileText, Share2, CheckCircle2 } from "lucide-react";
import { TRACK_INFO } from "@/lib/bible";
import { OneVerse, ReadRecordsMap, DayRecord } from "@/lib/storage";

export interface VerseData {
  verse: number;
  rawText: string;
  displayText: string;
  chunks: string[];
}

export interface ChapterData {
  name: string;
  chapter: number;
  chapterUnit?: string;
  verses: VerseData[];
}

export interface TrackData {
  track: {
    type: string;
    range: string;
  };
  chapters: ChapterData[];
}

export interface ReadingData {
  dayIndex: number;
  tracks: TrackData[];
}

const TRACK_ICONS: Record<string, string> = {
  "구약": "📖",
  "신약": "✨",
  "시편": "🎵",
  "잠언": "💡",
};

const TRACK_ID_MAP: Record<string, string> = {
  "구약": "track-ot",
  "신약": "track-nt",
  "시편": "track-psalms",
  "잠언": "track-proverbs"
};

const formatReference = (book: string, chapter: number, verse: number) => {
  return book === "시편" ? `${book} ${chapter}편 ${verse}절` : `${book} ${chapter}장 ${verse}절`;
};

interface BibleContentProps {
  readingData: ReadingData;
  headerHeight: number;
  fontSize: number;
  selectedVerse: OneVerse | null;
  confirmedVerse: OneVerse | null;
  records: ReadRecordsMap;
  dayIndex: number;
  isCompletedDay: boolean;
  setIsMemoryModalOpen: (open: boolean) => void;
  handleShareOneVerseClick: (record: DayRecord) => void;
  handleConfirmVerse: (verse: OneVerse, e: React.MouseEvent) => void;
  handleVerseClick: (trackType: string, book: string, chapter: number, verse: number, rawText: string, displayText: string, chunks: string[]) => void;
  handleBottomButtonClick: () => void;
}

export default function BibleContent({
  readingData,
  headerHeight,
  fontSize,
  selectedVerse,
  confirmedVerse,
  records,
  dayIndex,
  isCompletedDay,
  setIsMemoryModalOpen,
  handleShareOneVerseClick,
  handleConfirmVerse,
  handleVerseClick,
  handleBottomButtonClick
}: BibleContentProps) {
  const router = useRouter();

  return (
    <>
      <div className="flex flex-col flex-1">
        {readingData.tracks.map((trackReading: TrackData) => {
          const trackInfo = TRACK_INFO[trackReading.track.type as keyof typeof TRACK_INFO];
          const icon = TRACK_ICONS[trackReading.track.type] || "📖";
          
          return (
            <div 
              key={trackReading.track.type} 
              id={TRACK_ID_MAP[trackReading.track.type]} 
              className="flex flex-col border-b border-stone-200 dark:border-stone-800/60 pb-10"
              style={{ scrollMarginTop: `${headerHeight}px` }}
            >
              <div 
                className="sticky z-20 py-2 px-4 text-sm font-semibold bg-stone-50/95 dark:bg-stone-900/90 backdrop-blur border-b border-stone-200 dark:border-stone-800 shadow-sm transition-colors"
                style={{ top: `${headerHeight}px` }}
              >
                <h2 className="flex items-center gap-2" style={{ color: trackInfo.accentColor }}>
                  <span>{icon}</span> {trackInfo.title.split(" ")[0]} <span className="text-stone-500 font-normal mx-0.5">·</span> <span className="text-stone-700 dark:text-stone-300">{trackReading.track.range}</span>
                </h2>
              </div>

              <div className="pl-3 pr-14 sm:pl-6 sm:pr-8 py-6 sm:py-8 flex flex-col gap-6" style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
                {trackReading.chapters.map((chapterData: ChapterData) => (
                  <div key={`${chapterData.name}-${chapterData.chapter}`} className="flex flex-col">
                    <h3 className="font-bold mb-4 px-2 text-stone-800 dark:text-stone-200 border-b border-stone-200 dark:border-stone-800 pb-2">
                      {chapterData.name} {chapterData.chapter}{chapterData.chapterUnit || (chapterData.name === "시편" ? "편" : "장")}
                    </h3>
                    
                    {chapterData.verses.length === 0 ? (
                      <p className="text-stone-400 italic px-2">본문 데이터가 없습니다.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {chapterData.verses.map((v: VerseData) => {
                          const isSelected = selectedVerse?.book === chapterData.name 
                                          && selectedVerse?.chapter === chapterData.chapter 
                                          && selectedVerse?.verse === v.verse;
                          
                          const isConfirmed = confirmedVerse?.book === chapterData.name 
                                           && confirmedVerse?.chapter === chapterData.chapter 
                                           && confirmedVerse?.verse === v.verse;

                          let wrapperClass = "text-left px-2 sm:px-3 py-2 rounded-xl transition-all duration-200 relative flex flex-col group ";
                          let markerClass = "";
                          let verseNumberClass = "";
                          let textClass = "flex-1";
                          let actionArea = null;

                          if (isConfirmed) {
                            wrapperClass += "bg-amber-50 dark:bg-amber-900/20 text-stone-900 dark:text-stone-100 border border-amber-200 dark:border-amber-800/50 shadow-sm mt-1 mb-2";
                            markerClass = "absolute left-0 top-3 bottom-3 w-1.5 bg-amber-400 dark:bg-amber-500 rounded-r-md";
                            verseNumberClass = "text-amber-600 dark:text-amber-500 font-bold";
                            textClass += " font-medium";
                            
                            const isMem = confirmedVerse?.isMemorized;
                            actionArea = (
                              <div className="mt-3 flex flex-wrap items-center gap-2 pl-[2.5ch] sm:pl-[3ch]">
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                                  isMem 
                                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md"
                                    : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400"
                                }`}>
                                  <Crown size={14} className={isMem ? "text-white" : ""} />
                                  {isMem ? "암송 완료" : "오늘의 One Verse"}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMemoryModalOpen(true);
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                                    isMem
                                      ? "bg-white dark:bg-stone-800 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-stone-700"
                                      : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700"
                                  }`}
                                >
                                  <BrainCircuit size={14} />
                                  {isMem ? "✅ 암송 복습하기" : "🧠 암송 도전"}
                                </button>
                              </div>
                            );
                            actionArea = (
                              <>
                                {actionArea}
                                <div className="pl-[2ch] sm:pl-[2.5ch] mt-4 flex items-center gap-2 border-t border-stone-200 dark:border-stone-800/50 pt-3">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); router.push(`/memo?day=${dayIndex}&mode=edit`); }}
                                    className="flex-1 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-stone-700 shadow-sm"
                                  >
                                    <PencilLine size={16} />
                                    {confirmedVerse.memo ? "발자국 수정" : "발자국 남기기"}
                                  </button>
                                  {confirmedVerse.memo && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); router.push(`/memo?day=${dayIndex}&mode=view`); }}
                                      className="flex-1 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-stone-700 shadow-sm"
                                    >
                                      <FileText size={16} />
                                      발자국 보기
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (records[dayIndex]) handleShareOneVerseClick(records[dayIndex]); }}
                                    className="flex-1 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-stone-700 shadow-sm"
                                  >
                                    <Share2 size={16} />
                                    공유하기
                                  </button>
                                </div>
                              </>
                            );
                          } else if (isSelected) {
                            wrapperClass += "bg-sky-50 dark:bg-sky-900/20 text-stone-900 dark:text-stone-100 border border-sky-200 border-dashed dark:border-sky-800/50 mt-1 mb-2";
                            markerClass = "absolute left-0 top-3 bottom-3 w-1 bg-sky-400 dark:bg-sky-500 rounded-r-md";
                            verseNumberClass = "text-sky-600 dark:text-sky-400 font-bold";
                            actionArea = (
                              <div className="mt-3 pl-[2.5ch] sm:pl-[3ch]">
                                <button
                                  onClick={(e) => handleConfirmVerse({
                                    trackType: trackReading.track.type,
                                    book: chapterData.name,
                                    chapter: chapterData.chapter,
                                    verse: v.verse,
                                    rawText: v.rawText,
                                    displayText: v.displayText,
                                    chunks: v.chunks,
                                    reference: formatReference(chapterData.name, chapterData.chapter, v.verse)
                                  }, e)}
                                  className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5"
                                >
                                  📌 오늘의 One Verse로 지정
                                </button>
                              </div>
                            );
                          } else {
                            wrapperClass += "text-stone-800 dark:text-stone-200 border border-transparent";
                            verseNumberClass = "text-stone-400 dark:text-stone-500 font-semibold";
                          }
                          
                          return (
                            <button
                              key={v.verse}
                              id={(isConfirmed || isSelected) ? "one-verse-target" : undefined}
                              onClick={() => handleVerseClick(trackReading.track.type, chapterData.name, chapterData.chapter, v.verse, v.rawText, v.displayText, v.chunks)}
                              className={wrapperClass}
                            >
                              {(isConfirmed || isSelected) && <div className={markerClass}></div>}
                              
                              <div className="flex items-start flex-1 w-full">
                                <span 
                                  className={`inline-block min-w-[2.5ch] mr-2 sm:mr-3 select-none mt-[0.1em] text-right ${verseNumberClass}`}
                                  style={{ fontSize: `${Math.max(fontSize * 0.7, 10)}px` }}
                                >
                                  {v.verse}
                                </span>
                                <span className={textClass}>
                                  {v.displayText}
                                </span>
                              </div>

                              {actionArea}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div id="viewer-bottom" className="px-5 sm:px-8 py-12 flex justify-center bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 relative z-10">
        <button
          onClick={handleBottomButtonClick}
          className={`flex items-center gap-2 px-6 py-4 rounded-2xl shadow-sm transition-all duration-300 font-bold text-lg w-full max-w-sm justify-center ${
            isCompletedDay 
              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 scale-[0.98]" 
              : "bg-sky-600 hover:bg-sky-700 text-white shadow-md hover:-translate-y-1"
          }`}
        >
          {isCompletedDay ? (
            <React.Fragment>
              <CheckCircle2 size={24} />
              Day {readingData.dayIndex} 말씀 통독 완료 🎉
            </React.Fragment>
          ) : (
            <React.Fragment>
              Day {readingData.dayIndex} 말씀 통독 완료하기
            </React.Fragment>
          )}
        </button>
      </div>
    </>
  );
}
