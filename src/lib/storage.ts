import { supabase } from "./supabase";

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

// Fetch user ID securely from session
async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function fetchReadingSettings(): Promise<ReadingSettings | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase.from('reading_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return {
    startDate: data.start_date,
    currentDay: 1,
    hasStarted: true
  };
}

export async function saveReadingSettings(startDate: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('reading_settings').upsert({
    user_id: userId,
    start_date: startDate
  }, { onConflict: 'user_id' });
}

export async function startNewReading(dateStr: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  // 기존 기록 삭제
  await supabase.from('reading_records').delete().eq('user_id', userId);
  await saveReadingSettings(dateStr);
}

export async function resetUserData(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('reading_records').delete().eq('user_id', userId);
  await supabase.from('reading_settings').delete().eq('user_id', userId);
}

export async function fetchReadRecords(): Promise<ReadRecordsMap> {
  const userId = await getUserId();
  if (!userId) return {};
  const { data, error } = await supabase.from('reading_records').select('*').eq('user_id', userId);
  if (error || !data) return {};
  
  const result: ReadRecordsMap = {};
  data.forEach((row: any) => {
    result[row.day_index] = {
      dayIndex: row.day_index,
      readDate: row.read_date,
      completedAt: row.completed_at,
      oneVerse: row.one_verse,
    };
  });
  return result;
}

export async function saveDayRecord(record: DayRecord): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('reading_records').upsert({
    user_id: userId,
    day_index: record.dayIndex,
    read_date: record.readDate,
    completed_at: record.completedAt,
    one_verse: record.oneVerse || null,
  }, { onConflict: 'user_id, day_index' });
}

export async function updateReadRecordOneVerse(dayIndex: number, oneVerse: OneVerse): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('reading_records').update({
    one_verse: oneVerse
  }).eq('user_id', userId).eq('day_index', dayIndex);
}

export async function updateMemorizeRecord(dayIndex: number, isMemorized: boolean, currentOneVerse: OneVerse): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const updatedOneVerse = { ...currentOneVerse, isMemorized };
  if (isMemorized) {
    updatedOneVerse.memorizedAt = new Date().toISOString();
  } else {
    delete updatedOneVerse.memorizedAt;
  }
  await updateReadRecordOneVerse(dayIndex, updatedOneVerse);
}

// 순수 계산 함수들
export function getNextUnreadDay(records: ReadRecordsMap): number {
  let maxDay = 0;
  for (const key in records) {
    if (records[key].dayIndex > maxDay) {
      maxDay = records[key].dayIndex;
    }
  }
  return Math.min(maxDay + 1, 365);
}

export function getTodayReadCount(dateStr: string, records: ReadRecordsMap): number {
  return Object.values(records).filter(r => r.readDate === dateStr).length;
}

// 뷰어 위치는 기기/브라우저 종속적인 상태이므로 그대로 localStorage 사용
export function saveViewerDay(day: number): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem("bible_viewer_day_index", day.toString());
  } catch {}
}

export function getSavedViewerDay(): number | null {
  if (!isBrowser) return null;
  try {
    const val = localStorage.getItem("bible_viewer_day_index");
    if (val) return parseInt(val, 10);
  } catch {}
  return null;
}
