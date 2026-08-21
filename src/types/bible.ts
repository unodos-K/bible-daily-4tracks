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

export type TrackType = "OLD" | "NEW" | "PSALMS" | "PROVERBS";

export interface MccheyneTrack {
  type: TrackType;
  title: string;
  range: string;
  book: string;
  startChapter: number;
  endChapter: number;
  startVerse: number | null;
  endVerse: number | null;
}

export interface MccheyneDaySchedule {
  dayIndex: number;
  date: string;
  month: number;
  day: number;
  tracks: MccheyneTrack[];
}

export interface TrackReading {
  track: MccheyneTrack;
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
