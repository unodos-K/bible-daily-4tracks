import { supabase } from "./supabase";
import type { Json } from "@/types/supabase";
export { getNextUnreadDay } from "./readingRecords";

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

export type OneVerseCandidate = OneVerse;

export type ReadRecordsMap = Record<number, DayRecord>; // key: dayIndex (1~365)

type JsonObject = { [key: string]: Json | undefined };

type CandidateRow = {
  user_id: string;
  day_index: number;
  track_type: string;
  book: string;
  chapter: number;
  verse: number;
  raw_text: string;
  display_text: string;
  chunks: Json;
  reference: string;
  created_at: string;
};

type CandidateQueryError = { message: string } | null;
type CandidateTable = {
  select: (columns: string) => {
    eq: (column: string, value: string | number) => {
      order: (column: string, options: { ascending: boolean }) => PromiseLike<{ data: CandidateRow[] | null; error: CandidateQueryError }>;
    };
  };
  upsert: (row: Omit<CandidateRow, "created_at">, options: { onConflict: string; ignoreDuplicates: boolean }) => PromiseLike<{ error: CandidateQueryError }>;
  delete: () => {
    eq: (column: string, value: string | number) => {
      eq: (column: string, value: string | number) => {
        eq: (column: string, value: string | number) => {
          eq: (column: string, value: string | number) => {
            eq: (column: string, value: string | number) => PromiseLike<{ error: CandidateQueryError }>;
          };
        };
      };
    };
  };
};

// This table is introduced by the pending candidate migration. Keep its
// provisional shape local until generated types can be refreshed after apply.
const candidateTable = () => supabase.from("one_verse_candidates" as never) as unknown as CandidateTable;

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

function parseCandidateRow(row: CandidateRow): OneVerseCandidate | undefined {
  return parseOneVerse({
    trackType: row.track_type,
    book: row.book,
    chapter: row.chapter,
    verse: row.verse,
    rawText: row.raw_text,
    displayText: row.display_text,
    chunks: row.chunks,
    reference: row.reference,
  });
}

export async function fetchOneVerseCandidates(dayIndex: number, currentUserId?: string): Promise<OneVerseCandidate[]> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return [];

  const { data, error } = await candidateTable()
    .select("user_id, day_index, track_type, book, chapter, verse, raw_text, display_text, chunks, reference, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("One Verse candidate fetch error:", error);
    throw error;
  }

  return (data ?? [])
    .filter((row) => row.day_index === dayIndex)
    .flatMap((row) => {
      const candidate = parseCandidateRow(row);
      return candidate ? [candidate] : [];
    });
}

export async function saveOneVerseCandidate(dayIndex: number, candidate: OneVerseCandidate, currentUserId?: string): Promise<boolean> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return false;

  const { error } = await candidateTable().upsert({
    user_id: userId,
    day_index: dayIndex,
    track_type: candidate.trackType,
    book: candidate.book,
    chapter: candidate.chapter,
    verse: candidate.verse,
    raw_text: candidate.rawText,
    display_text: candidate.displayText,
    chunks: candidate.chunks,
    reference: candidate.reference,
  }, {
    onConflict: "user_id,day_index,book,chapter,verse",
    ignoreDuplicates: true,
  });

  if (error) {
    console.error("One Verse candidate save error:", error);
    return false;
  }
  return true;
}

export async function removeOneVerseCandidate(dayIndex: number, candidate: OneVerseCandidate, currentUserId?: string): Promise<boolean> {
  const userId = currentUserId ?? await getUserId();
  if (!userId) return false;

  const { error } = await candidateTable()
    .delete()
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .eq("book", candidate.book)
    .eq("chapter", candidate.chapter)
    .eq("verse", candidate.verse);

  if (error) {
    console.error("One Verse candidate delete error:", error);
    return false;
  }
  return true;
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
