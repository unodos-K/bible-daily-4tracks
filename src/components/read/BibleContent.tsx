import React from "react";
import { CheckCircle2 } from "lucide-react";
import { TRACK_INFO } from "@/lib/bible";
import type { OneVerse, ReadRecordsMap, DayRecord } from "@/lib/storage";
import { useActiveReaderTrack } from "./useActiveReaderTrack";
import BibleVerseRow from "./BibleVerseRow";
import type { ReadingData, TrackData } from "./types";

export type { ReadingData } from "./types";

const TRACK_ICONS: Record<string, string> = { 구약: "📖", 신약: "✨", 시편: "🎵", 잠언: "💡" };
const TRACK_ID_MAP: Record<string, string> = { 구약: "track-ot", 신약: "track-nt", 시편: "track-psalms", 잠언: "track-proverbs" };

interface BibleContentProps {
  readingData: ReadingData;
  headerHeight?: number;
  fontSize: number;
  selectedVerse: OneVerse | null;
  confirmedVerse: OneVerse | null;
  markedVerses: OneVerse[];
  records: ReadRecordsMap;
  dayIndex: number;
  isCompletedDay: boolean;
  setIsMemoryModalOpen: (open: boolean) => void;
  handleShareOneVerseClick: (record: DayRecord) => void;
  handleConfirmVerse: (verse: OneVerse, event: React.MouseEvent) => void;
  handleToggleMark: (verse: OneVerse, event: React.MouseEvent) => void;
  handleRequestReselect: () => void;
  handleVerseClick: (trackType: string, book: string, chapter: number, verse: number, rawText: string, displayText: string, chunks: string[]) => void;
  handleBottomButtonClick: () => void;
}

export default function BibleContent({ readingData, fontSize, selectedVerse, confirmedVerse, markedVerses, records, dayIndex, isCompletedDay, setIsMemoryModalOpen, handleShareOneVerseClick, handleConfirmVerse, handleToggleMark, handleRequestReselect, handleVerseClick, handleBottomButtonClick }: BibleContentProps) {
  const tracks = readingData.tracks;
  const { activeTrackType, stickyHeaderRef, trackRefs } = useActiveReaderTrack(tracks);
  const activeTrack = tracks.find((track) => track.track.type === activeTrackType) ?? tracks[0];
  const activeTrackInfo = activeTrack && TRACK_INFO[activeTrack.track.type as keyof typeof TRACK_INFO];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {activeTrack && activeTrackInfo && (
        <div ref={stickyHeaderRef} className="shrink-0 relative z-20 py-2 px-4 text-sm font-semibold bg-stone-100/90 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 transition-colors">
          <h2 className="flex items-center gap-2" style={{ color: activeTrackInfo.accentColor }}><span>{TRACK_ICONS[activeTrack.track.type] || "📖"}</span>{activeTrackInfo.title.split(" ")[0]} <span className="text-stone-500 font-normal mx-0.5">·</span> <span className="text-stone-700 dark:text-stone-300">{activeTrack.track.range}</span></h2>
        </div>
      )}
      <div id="bible-content-scroll" className="flex-1 overflow-y-auto overscroll-y-contain flex flex-col">
        {tracks.map((track: TrackData) => (
          <div key={track.track.type} id={TRACK_ID_MAP[track.track.type]} className="flex flex-col border-b border-stone-200 dark:border-stone-800/60 pb-10" ref={(element) => { if (element) trackRefs.current.set(track.track.type, element); else trackRefs.current.delete(track.track.type); }}>
            <div className="pl-3 pr-14 sm:pl-6 sm:pr-8 py-6 sm:py-8 flex flex-col gap-6" style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
              {track.chapters.map((chapter) => (
                <div key={`${chapter.name}-${chapter.chapter}`} className="flex flex-col">
                  <h3 className="font-bold mb-4 px-2 text-stone-800 dark:text-stone-200 border-b border-stone-200 dark:border-stone-800 pb-2">{chapter.name} {chapter.chapter}{chapter.chapterUnit || (chapter.name === "시편" ? "편" : "장")}</h3>
                  {chapter.verses.length === 0 ? <p className="text-stone-400 italic px-2">본문 데이터가 없습니다.</p> : <div className="flex flex-col gap-1">{chapter.verses.map((verse) => <BibleVerseRow key={verse.verse} trackType={track.track.type} book={chapter.name} chapter={chapter.chapter} verse={verse} fontSize={fontSize} dayIndex={dayIndex} selectedVerse={selectedVerse} confirmedVerse={confirmedVerse} markedVerses={markedVerses} record={records[dayIndex]} onVerseClick={handleVerseClick} onConfirmVerse={handleConfirmVerse} onToggleMark={handleToggleMark} onRequestReselect={handleRequestReselect} isCompletedDay={isCompletedDay} onOpenMemory={() => setIsMemoryModalOpen(true)} onShare={handleShareOneVerseClick} />)}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div id="viewer-bottom" className="px-5 sm:px-8 py-12 flex justify-center bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 relative z-10">
          <button onClick={handleBottomButtonClick} className={`flex items-center gap-2 px-6 py-4 rounded-2xl shadow-sm transition-all duration-300 font-bold text-lg w-full max-w-sm justify-center ${isCompletedDay ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 scale-[0.98]" : "bg-sky-600 hover:bg-sky-700 text-white shadow-md hover:-translate-y-1"}`}>
            {isCompletedDay ? <><CheckCircle2 size={24} />Day {readingData.dayIndex} 말씀 통독 완료 🎉</> : <>Day {readingData.dayIndex} 말씀 통독 완료하기</>}
          </button>
          {!isCompletedDay && <p className="mt-3 text-center text-xs font-medium text-stone-500 dark:text-stone-400">{confirmedVerse ? "오늘의 One Verse가 선택되었습니다." : "오늘의 One Verse를 선택해 주세요."}</p>}
        </div>
      </div>
    </div>
  );
}
