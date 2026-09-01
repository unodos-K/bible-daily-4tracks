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
  track: { type: string; range: string };
  chapters: ChapterData[];
}

export interface ReadingData {
  dayIndex: number;
  tracks: TrackData[];
}
