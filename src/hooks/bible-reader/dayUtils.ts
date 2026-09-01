import { getNextUnreadDay, type ReadRecordsMap, type ReadingSettings } from "@/lib/storage";

export const MIN_READING_DAY = 1;
export const MAX_READING_DAY = 365;

export function calculateDaysSince(startDateStr: string): number {
  if (!startDateStr) return MIN_READING_DAY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = startDateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  start.setHours(0, 0, 0, 0);
  return Math.max(MIN_READING_DAY, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function getMaxAllowedDay(settings: ReadingSettings | null, records: ReadRecordsMap): number {
  return Math.min(MAX_READING_DAY, settings ? calculateDaysSince(settings.startDate) : getNextUnreadDay(records));
}

export function clampReadingDay(day: number): number {
  return Math.max(MIN_READING_DAY, Math.min(MAX_READING_DAY, day));
}
