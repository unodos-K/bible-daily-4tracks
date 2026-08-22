export interface Verse {
  verse: number;
  rawText: string;
  displayText: string;
  chunks: string[];
}

export interface ChapterData {
  name: string;
  chapter: number;
  chapterUnit?: string;
  verses: Verse[];
}

export interface BibleData {
  translation: string;
  books: ChapterData[];
}

export type TrackType = "구약" | "신약" | "시편" | "잠언";

export interface ReadingTrack {
  type: TrackType;
  title: string;
  range: string;
  book: string;
  startChapter: number;
  endChapter: number;
  startVerse: number | null;
  endVerse: number | null;
}

export interface DaySchedule {
  dayIndex: number;
  date: string;
  month: number;
  day: number;
  tracks: ReadingTrack[];
}

export interface TrackReading {
  track: ReadingTrack;
  chapters: ChapterData[];
}

export interface DailyReading {
  dayIndex: number;
  date: string;
  month: number;
  day: number;
  translation: string;
  tracks: TrackReading[];
}
