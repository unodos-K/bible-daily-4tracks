import { supabase } from "./supabase";
import type { Json } from "@/types/supabase";

export interface ReadingSettings {
  startDate: string; // YYYY-MM-DD
  currentDay: number; // 현재 진행 중인 Day (1 ~ 365)
  hasStarted: boolean; // 온보딩 완료 여부
}

export interface MemoData {
  meditation?: string;
  prayer?: string;
  thanks?: string;
  application?: { text: string; checked: boolean }[];
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
  memo?: string | MemoData;
  memoUpdatedAt?: string; // ISO String
}

export interface DayRecord {
  dayIndex: number;
  readDate: string; // YYYY-MM-DD
  completedAt: string; // ISO String
  oneVerse?: OneVerse;
}

export type ReadRecordsMap = Record<number, DayRecord>; // key: dayIndex (1~365)

type JsonObject = { [key: string]: Json | undefined };

function isJson(value: unknown): value is Json {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJson);
  if (typeof value !== 'object') return false;
  return Object.values(value).every(isJson);
}

function isJsonObject(value: Json | null): value is JsonObject {
  return value !== null && !Array.isArray(value) && typeof value === 'object';
}

function parseMemo(value: Json | undefined): string | MemoData | undefined {
  if (typeof value === 'string') return value;
  if (value === null || Array.isArray(value) || typeof value !== 'object') return undefined;

  const application = Array.isArray(value.application)
    ? value.application.flatMap(item => (
      item !== null
      && !Array.isArray(item)
      && typeof item === 'object'
      && typeof item.text === 'string'
      && typeof item.checked === 'boolean'
        ? [{ text: item.text, checked: item.checked }]
        : []
    ))
    : undefined;

  return {
    ...(typeof value.meditation === 'string' ? { meditation: value.meditation } : {}),
    ...(typeof value.prayer === 'string' ? { prayer: value.prayer } : {}),
    ...(typeof value.thanks === 'string' ? { thanks: value.thanks } : {}),
    ...(application ? { application } : {}),
  };
}

export function parseOneVerse(value: Json | null): OneVerse | undefined {
  if (
    !isJsonObject(value)
    || typeof value.trackType !== 'string'
    || typeof value.book !== 'string'
    || typeof value.chapter !== 'number'
    || typeof value.verse !== 'number'
    || typeof value.rawText !== 'string'
    || typeof value.displayText !== 'string'
    || !Array.isArray(value.chunks)
    || !value.chunks.every(chunk => typeof chunk === 'string')
    || typeof value.reference !== 'string'
  ) return undefined;
  const memo = parseMemo(value.memo);

  return {
    trackType: value.trackType,
    book: value.book,
    chapter: value.chapter,
    verse: value.verse,
    rawText: value.rawText,
    displayText: value.displayText,
    chunks: value.chunks,
    reference: value.reference,
    ...(typeof value.isMemorized === 'boolean' ? { isMemorized: value.isMemorized } : {}),
    ...(typeof value.memorizedAt === 'string' ? { memorizedAt: value.memorizedAt } : {}),
    ...(memo !== undefined ? { memo } : {}),
    ...(typeof value.memoUpdatedAt === 'string' ? { memoUpdatedAt: value.memoUpdatedAt } : {}),
  };
}

function serializeOneVerse(value: OneVerse): Json {
  const serialized: unknown = JSON.parse(JSON.stringify(value));
  if (!isJson(serialized)) {
    throw new Error('One Verse cannot be serialized as JSON');
  }
  return serialized;
}

// Fetch user ID securely from session
export async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function fetchReadingSettings(currentUserId?: string): Promise<ReadingSettings | null> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase.from('reading_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) {
    console.error("fetchReadingSettings error:", error);
    throw error;
  }
  if (!data) return null;
  return {
    startDate: data.start_date,
    currentDay: 1,
    hasStarted: true
  };
}

export async function saveReadingSettings(startDate: string, currentUserId?: string): Promise<void> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return;
  const { error } = await supabase.from('reading_settings').upsert({
    user_id: userId,
    start_date: startDate
  }, { onConflict: 'user_id' });
  if (error) console.error("saveReadingSettings error:", error);
}

export async function startNewReading(dateStr: string, currentUserId?: string): Promise<void> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return;
  const { error } = await supabase.from('reading_records').delete().eq('user_id', userId);
  if (error) console.error("startNewReading delete error:", error);
  await saveReadingSettings(dateStr, userId);
}

export async function resetUserData(currentUserId?: string): Promise<void> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return;
  const { error: err1 } = await supabase.from('reading_records').delete().eq('user_id', userId);
  if (err1) console.error("resetUserData records error:", err1);
  const { error: err2 } = await supabase.from('reading_settings').delete().eq('user_id', userId);
  if (err2) console.error("resetUserData settings error:", err2);
}

export async function fetchReadRecords(currentUserId?: string): Promise<ReadRecordsMap> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return {};
  const { data, error } = await supabase.from('reading_records').select('*').eq('user_id', userId);
  if (error) {
    console.error("fetchReadRecords error:", error);
    throw error;
  }
  if (!data) return {};
  
  const result: ReadRecordsMap = {};
  data.forEach(row => {
    if (!row.completed_at) return;
    result[row.day_index] = {
      dayIndex: row.day_index,
      readDate: row.read_date,
      completedAt: row.completed_at,
      oneVerse: parseOneVerse(row.one_verse),
    };
  });
  return result;
}

export async function saveDayRecord(record: DayRecord, currentUserId?: string): Promise<boolean> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return false;
  const { error } = await supabase.from('reading_records').upsert({
    user_id: userId,
    day_index: record.dayIndex,
    read_date: record.readDate,
    completed_at: record.completedAt,
    one_verse: record.oneVerse ? serializeOneVerse(record.oneVerse) : null,
  }, { onConflict: 'user_id, day_index' });
  if (error) {
    console.error("One Verse Save Error:", error);
    return false;
  }
  return true;
}

export async function updateReadRecordOneVerse(dayIndex: number, oneVerse: OneVerse | null, currentUserId?: string): Promise<boolean> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return false;
  
  // 만약 update 시 read_date가 필요하다면 기존 레코드가 있는지부터 확인해야 하지만
  // update 쿼리 자체는 기존 로우가 있을 때만 동작하므로 read_date 생략이 무방합니다.
  const { error } = await supabase.from('reading_records').update({
    one_verse: oneVerse ? serializeOneVerse(oneVerse) : null
  }).eq('user_id', userId).eq('day_index', dayIndex);
  if (error) {
    console.error("One Verse Update Error:", error);
    return false;
  }
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('records_updated'));
  }
  return true;
}

export async function updateMemorizeRecord(dayIndex: number, isMemorized: boolean, currentOneVerse: OneVerse, currentUserId?: string): Promise<void> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return;
  const updatedOneVerse = { ...currentOneVerse, isMemorized };
  if (isMemorized) {
    updatedOneVerse.memorizedAt = new Date().toISOString();
  } else {
    delete updatedOneVerse.memorizedAt;
  }
  await updateReadRecordOneVerse(dayIndex, updatedOneVerse, userId);
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
