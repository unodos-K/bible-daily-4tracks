import { getAuthUser } from "./auth";

export interface ReadingSettings {
  startDate: string; // YYYY-MM-DD
  currentDay: number; // 현재 진행 중인 Day (1 ~ 365)
  hasStarted: boolean; // 온보딩 완료 여부
}

export interface OneVerse {
  trackType: string;
  book: string;
  chapter: number;
  verse: number;
  rawText: string;
  displayText: string;
  chunks: string[];
  reference: string;
  isMemorized?: boolean;
  memorizedAt?: string; // ISO String
}

export interface DayRecord {
  dayIndex: number;
  readDate: string; // YYYY-MM-DD
  completedAt: string; // ISO String
  oneVerse?: OneVerse;
}

export type ReadRecordsMap = Record<number, DayRecord>; // key: dayIndex (1~365)

const isBrowser = typeof window !== "undefined";

function getUserId(): string {
  const user = getAuthUser();
  return user ? user.id : "guest";
}

function getSettingsKey() { return `bible_settings_${getUserId()}`; }
function getRecordsKey() { return `bible_records_${getUserId()}`; }
function getViewerDayKey() { return `bible_viewer_day_index_${getUserId()}`; }

export function getReadingSettings(): ReadingSettings {
  if (!isBrowser) return { startDate: "", currentDay: 1, hasStarted: false };
  try {
    const data = localStorage.getItem(getSettingsKey());
    if (data) {
      return JSON.parse(data);
    }
  } catch {}
  return { startDate: "", currentDay: 1, hasStarted: false };
}

export function setReadingSettings(settings: ReadingSettings): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(getSettingsKey(), JSON.stringify(settings));
  } catch {}
}

export function startNewReading(dateStr: string): void {
  resetUserData(); // 현재 로그인된 유저 데이터만 초기화
  setReadingSettings({
    startDate: dateStr,
    currentDay: 1,
    hasStarted: true,
  });
}

export function resetUserData(): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(getSettingsKey());
    localStorage.removeItem(getRecordsKey());
    localStorage.removeItem(getViewerDayKey());
  } catch {}
}

export function getReadRecords(): ReadRecordsMap {
  if (!isBrowser) return {};
  try {
    const data = localStorage.getItem(getRecordsKey());
    if (!data) return {};
    
    const parsed = JSON.parse(data);
    const result: ReadRecordsMap = {};
    let needsMigration = false;
    
    for (const key in parsed) {
      const val = parsed[key];
      // 하위 호환성: 과거 YYYY-MM-DD 문자열 키로 저장된 경우
      if (typeof key === 'string' && key.includes('-') && isNaN(parseInt(key, 10))) {
        result[val.dayIndex] = {
          dayIndex: val.dayIndex,
          readDate: key,
          completedAt: val.completedAt,
          oneVerse: val.oneVerse
        };
        needsMigration = true;
      } else {
        // 정상적인 DayRecord 구조
        const day = parseInt(key, 10);
        if (!isNaN(day)) {
          result[day] = val as DayRecord;
        }
      }
    }
    
    if (needsMigration) {
      localStorage.setItem(getRecordsKey(), JSON.stringify(result));
    }
    
    return result;
  } catch {
    return {};
  }
}

export function getNextUnreadDay(): number {
  const records = getReadRecords();
  let maxDay = 0;
  for (const key in records) {
    if (records[key].dayIndex > maxDay) {
      maxDay = records[key].dayIndex;
    }
  }
  return Math.min(maxDay + 1, 365);
}

export function getReadRecordByDayIndex(dayIndex: number): DayRecord | null {
  const records = getReadRecords();
  return records[dayIndex] || null;
}

export function getRecordsByDate(dateStr: string): DayRecord[] {
  const records = getReadRecords();
  return Object.values(records).filter(r => r.readDate === dateStr).sort((a, b) => a.dayIndex - b.dayIndex);
}

export function getTodayReadCount(dateStr: string): number {
  return getRecordsByDate(dateStr).length;
}

export function updateReadRecordOneVerse(dayIndex: number, oneVerse: OneVerse): void {
  if (!isBrowser) return;
  const records = getReadRecords();
  if (records[dayIndex]) {
    records[dayIndex].oneVerse = oneVerse;
    try {
      localStorage.setItem(getRecordsKey(), JSON.stringify(records));
    } catch {}
  }
}

export function updateMemorizeRecord(dayIndex: number, isMemorized: boolean): void {
  if (!isBrowser) return;
  const records = getReadRecords();
  if (records[dayIndex] && records[dayIndex].oneVerse) {
    records[dayIndex].oneVerse!.isMemorized = isMemorized;
    if (isMemorized) {
      records[dayIndex].oneVerse!.memorizedAt = new Date().toISOString();
    } else {
      delete records[dayIndex].oneVerse!.memorizedAt;
    }
    try {
      localStorage.setItem(getRecordsKey(), JSON.stringify(records));
    } catch {}
  }
}

export function saveDayRecord(record: DayRecord): void {
  if (!isBrowser) return;
  const records = getReadRecords();
  records[record.dayIndex] = record;
  try {
    localStorage.setItem(getRecordsKey(), JSON.stringify(records));
  } catch {}
}

export function isReadCompleted(dayIndex: number): boolean {
  const records = getReadRecords();
  return !!records[dayIndex];
}

export function saveViewerDay(day: number): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(getViewerDayKey(), day.toString());
  } catch {}
}

export function getSavedViewerDay(): number | null {
  if (!isBrowser) return null;
  try {
    const val = localStorage.getItem(getViewerDayKey());
    if (val) return parseInt(val, 10);
  } catch {}
  return null;
}
