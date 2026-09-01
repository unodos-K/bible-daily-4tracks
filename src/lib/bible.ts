import rawScheduleData from "@/data/Bible_Reading_Schedule_365.json";
import { ChunkedBibleText, loadChunkedBibleText } from "@/lib/chunkedBibleText";
import {
  ChapterData,
  DailyReading,
  DaySchedule,
  ReadingTrack,
  TrackReading,
  TrackType,
  Verse,
} from "@/types/bible";

interface RawScheduleItem {
  day: number;
  tracks: Record<string, {
    Book: string;
    startChapter: number;
    startVerse: number | null;
    endChapter: number;
    endVerse: number | null;
  }>;
}

// 새로운 365 스케줄 데이터 파싱
const rawSchedules = rawScheduleData as RawScheduleItem[];
export const mccheyneSchedules: DaySchedule[] = rawSchedules.map((item) => {
  const dayIndex = item.day;
  
  // 가상의 date, month, day 생성 (1월 1일 기준 365일)
  // 윤년 무시하고 대략적인 월/일 매핑 (UI 달력 렌더링 호환용)
  const d = new Date(2026, 0, dayIndex); 
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dateStr = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const tracksObj = item.tracks;
  const parsedTracks: ReadingTrack[] = [];

  const trackTypes: TrackType[] = ["구약", "신약", "시편", "잠언"];
  for (const tType of trackTypes) {
    if (tracksObj[tType]) {
      const tData = tracksObj[tType];
      
      // 범위 문자열 생성
      let rangeStr = "";
      if (tData.startChapter === tData.endChapter) {
        if (tData.startVerse === null || tData.endVerse === null) {
          rangeStr = `${tData.Book} ${tData.startChapter}장`;
        } else {
          rangeStr = `${tData.Book} ${tData.startChapter}:${tData.startVerse}~${tData.endVerse}`;
        }
      } else {
        rangeStr = `${tData.Book} ${tData.startChapter}~${tData.endChapter}장`;
      }
      if (tData.Book === '시편') {
        rangeStr = rangeStr.replace(/장/g, '편');
      }

      parsedTracks.push({
        type: tType,
        title: tType,
        range: rangeStr,
        book: tData.Book,
        startChapter: tData.startChapter,
        endChapter: tData.endChapter,
        startVerse: tData.startVerse,
        endVerse: tData.endVerse
      });
    }
  }

  return {
    dayIndex,
    date: dateStr,
    month,
    day,
    tracks: parsedTracks
  };
});

// 트랙별 메타데이터 (표시명, 대표 색상 등)
export const TRACK_INFO: Record<
  TrackType,
  {
    title: string;
    description: string;
    badgeBg: string;
    badgeText: string;
    accentColor: string;
  }
> = {
  "구약": {
    title: "구약 (역사/율법)",
    description: "창조부터 이어지는 구원의 역사",
    badgeBg: "bg-amber-100 dark:bg-amber-950/60",
    badgeText: "text-amber-800 dark:text-amber-300",
    accentColor: "#d97706",
  },
  "신약": {
    title: "신약 (복음서)",
    description: "예수 그리스도의 생애와 복음",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/60",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    accentColor: "#059669",
  },
  "시편": {
    title: "시편 (찬양과 기도)",
    description: "영혼의 호흡과 찬양",
    badgeBg: "bg-sky-100 dark:bg-sky-950/60",
    badgeText: "text-sky-800 dark:text-sky-300",
    accentColor: "#0284c7",
  },
  "잠언": {
    title: "잠언 (지혜)",
    description: "일상의 경건과 삶의 지혜",
    badgeBg: "bg-purple-100 dark:bg-purple-950/60",
    badgeText: "text-purple-800 dark:text-purple-300",
    accentColor: "#7c3aed",
  },
};

/**
 * 다양한 형식의 날짜 입력을 { month, day, formattedDate }로 정규화합니다.
 * @example
 * parseDateInput("2026-01-05") => { month: 1, day: 5, formattedDate: "2026-01-05" }
 * parseDateInput("1/5") => { month: 1, day: 5, formattedDate: "2026-01-05" }
 * parseDateInput({ month: 1, day: 5 }) => { month: 1, day: 5, formattedDate: "2026-01-05" }
 */
export function parseDateInput(
  input: string | { month: number; day: number } | Date
): { month: number; day: number; formattedDate: string } | null {
  if (!input) return null;

  let month: number;
  let day: number;

  if (input instanceof Date) {
    month = input.getMonth() + 1;
    day = input.getDate();
  } else if (typeof input === "object" && "month" in input && "day" in input) {
    month = Number(input.month);
    day = Number(input.day);
  } else if (typeof input === "string") {
    const trimmed = input.trim();
    // YYYY-MM-DD 또는 YYYY/MM/DD
    const ymdMatch = trimmed.match(/^\d{4}[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      month = parseInt(ymdMatch[1], 10);
      day = parseInt(ymdMatch[2], 10);
    } else {
      // MM-DD 또는 M/D 또는 M.D
      const mdMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})$/);
      if (mdMatch) {
        month = parseInt(mdMatch[1], 10);
        day = parseInt(mdMatch[2], 10);
      } else {
        return null;
      }
    }
  } else {
    return null;
  }

  if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const formattedDate = `2026-${mm}-${dd}`;

  return { month, day, formattedDate };
}

/**
 * 전체 맥체인 읽기표 스케줄 목록을 반환합니다.
 */
export function getAllSchedules(): DaySchedule[] {
  return mccheyneSchedules;
}

/**
 * 특정 월, 일에 해당하는 맥체인 4개 트랙 스케줄을 조회합니다.
 */
export function getScheduleForMonthDay(
  month: number,
  day: number
): DaySchedule | null {
  return (
    mccheyneSchedules.find((s) => s.month === month && s.day === day) || null
  );
}

/**
 * 날짜(문자열, 객체, Date)를 입력받아 오늘의 맥체인 4개 트랙 스케줄을 조회합니다.
 */
export function getScheduleByDate(
  dateInput: string | { month: number; day: number } | Date
): DaySchedule | null {
  const parsed = parseDateInput(dateInput);
  if (!parsed) return null;
  return getScheduleForMonthDay(parsed.month, parsed.day);
}

/**
 * 트랙의 장/절 범위 조건에 따라 특정 장의 구절들을 필터링합니다.
 */
export function filterVersesForTrack(
  chapterNumber: number,
  verses: Verse[],
  track: ReadingTrack
): Verse[] {
  const { startChapter, endChapter, startVerse, endVerse } = track;

  // 단일 장인 경우 (예: 잠언 1:1~7 또는 마태복음 1장)
  if (startChapter === endChapter && chapterNumber === startChapter) {
    return verses.filter((v) => {
      const gteStart = startVerse != null ? v.verse >= startVerse : true;
      const lteEnd = endVerse != null ? v.verse <= endVerse : true;
      return gteStart && lteEnd;
    });
  }

  // 여러 장에 걸친 경우 (예: 창세기 24:1~33 또는 창세기 1~2장)
  if (chapterNumber === startChapter) {
    return verses.filter((v) => (startVerse != null ? v.verse >= startVerse : true));
  } else if (chapterNumber === endChapter) {
    return verses.filter((v) => (endVerse != null ? v.verse <= endVerse : true));
  } else if (chapterNumber > startChapter && chapterNumber < endChapter) {
    return verses;
  }

  return [];
}

/**
 * 트랙 정보를 기반으로 성경 데이터에서 해당하는 장/절 본문들을 추출합니다.
 */
function getBibleChaptersForTrack(
  track: ReadingTrack,
  bibleTexts: ChunkedBibleText,
): ChapterData[] {
  const { book, startChapter, endChapter } = track;
  const result: ChapterData[] = [];

  for (let ch = startChapter; ch <= endChapter; ch++) {
    // 성경 데이터에서 해당 책과 장 찾기
    const bookData = bibleTexts[book];
    const chapterDataObj = bookData ? bookData[ch.toString()] : null;

    if (chapterDataObj) {
      // 딕셔너리를 Verse[] 배열로 변환 및 정렬
      const verses: Verse[] = Object.entries(chapterDataObj)
        .map(([v, rawText]) => ({
          verse: parseInt(v, 10),
          rawText,
          displayText: rawText.replace(/\s*\/\s*/g, ' ').trim(),
          chunks: rawText.split(/\s*\/\s*/).map(c => c.trim()).filter(Boolean),
        }))
        .sort((a, b) => a.verse - b.verse);

      const filteredVerses = filterVersesForTrack(ch, verses, track);
      
      result.push({
        name: book,
        chapter: ch,
        chapterUnit: book === "시편" ? "편" : "장",
        verses: filteredVerses,
      });
    } else {
      // 본문 데이터가 아직 없는 경우 장 정보 틀을 유지
      result.push({
        name: book,
        chapter: ch,
        chapterUnit: book === "시편" ? "편" : "장",
        verses: [],
      });
    }
  }

  return result;
}

/**
 * dayIndex(1~365)를 입력받아 오늘의 맥체인 4개 트랙 스케줄을 조회합니다.
 */
export function getScheduleByDayIndex(dayIndex: number): DaySchedule | null {
  return mccheyneSchedules.find((s) => s.dayIndex === dayIndex) || null;
}

/**
 * 날짜를 입력받아 오늘의 4개 트랙(구약, 신약, 시편, 잠언) 범위와 실제 본문 구절들을 매핑해 반환합니다.
 * @param dateInput "2026-01-01", "1/1", { month: 1, day: 1 }, 또는 new Date()
 */
export async function getDailyReading(
  dateInput: string | { month: number; day: number } | Date
): Promise<DailyReading | null> {
  const schedule = getScheduleByDate(dateInput);
  if (!schedule) return null;
  const bibleTexts = await loadChunkedBibleText();

  const tracksWithContent: TrackReading[] = schedule.tracks.map((track) => ({
    track,
    chapters: getBibleChaptersForTrack(track, bibleTexts),
  }));

  return {
    dayIndex: schedule.dayIndex,
    date: schedule.date,
    month: schedule.month,
    day: schedule.day,
    translation: "새번역",
    tracks: tracksWithContent,
  };
}

/**
 * dayIndex(1~365)를 입력받아 4개 트랙(구약, 신약, 시편, 잠언) 범위와 실제 본문 구절들을 매핑해 반환합니다.
 */
export async function getDailyReadingByIndex(
  dayIndex: number
): Promise<DailyReading | null> {
  const schedule = getScheduleByDayIndex(dayIndex);
  if (!schedule) return null;
  const bibleTexts = await loadChunkedBibleText();

  const tracksWithContent: TrackReading[] = schedule.tracks.map((track) => ({
    track,
    chapters: getBibleChaptersForTrack(track, bibleTexts),
  }));

  return {
    dayIndex: schedule.dayIndex,
    date: schedule.date,
    month: schedule.month,
    day: schedule.day,
    translation: "새번역",
    tracks: tracksWithContent,
  };
}
