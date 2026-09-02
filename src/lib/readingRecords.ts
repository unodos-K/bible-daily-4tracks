import type { DayRecord, ReadRecordsMap } from "./storage";

export function getRecordValues(records: ReadRecordsMap): DayRecord[] {
  return Object.values(records);
}

// `ReadRecordsMap` only contains persisted completion records.
export function getNextUnreadDay(records: ReadRecordsMap): number {
  const maxDay = getRecordValues(records).reduce((max, record) => Math.max(max, record.dayIndex), 0);
  return Math.min(maxDay + 1, 365);
}

export function getRecordsWithOneVerse(records: ReadRecordsMap): DayRecord[] {
  return getRecordValues(records).filter((record) => Boolean(record.oneVerse));
}

export function getLastOneVerseDay(records: ReadRecordsMap): number {
  return getRecordsWithOneVerse(records).reduce((max, record) => Math.max(max, record.dayIndex), 1);
}

export function getLastRecordDay(records: ReadRecordsMap): number {
  return getRecordValues(records).reduce((max, record) => Math.max(max, record.dayIndex), 1);
}

export function sortRecordsByDay(records: DayRecord[], direction: "asc" | "desc" = "asc"): DayRecord[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...records].sort((a, b) => multiplier * (a.dayIndex - b.dayIndex));
}

export function getRecordsForReadDate(records: ReadRecordsMap, readDate: string): DayRecord[] {
  return sortRecordsByDay(getRecordValues(records).filter((record) => record.readDate === readDate));
}

export function getReadingProgress(records: ReadRecordsMap) {
  const completedRecords = getRecordValues(records);
  const totalReadDays = completedRecords.length;
  return {
    totalReadDays,
    achievementRate: Math.round((totalReadDays / 365) * 100),
    memorizedCount: completedRecords.filter((record) => record.oneVerse?.isMemorized).length,
  };
}
