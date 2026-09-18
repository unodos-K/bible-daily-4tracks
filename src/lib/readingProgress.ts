export interface ReadingProgress {
  user_id: string;
  day_index: number;
  track: string;
  book: string;
  chapter: number;
  verse: number;
  scroll_offset: number;
  verse_offset?: number;
  updated_at: string;
}

const PREFIX = "reading-progress";

export const getReadingProgressKey = (userId: string, dayIndex: number, track: string) =>
  `${PREFIX}:${userId}:${dayIndex}:${track}`;

export function saveReadingProgress(progress: ReadingProgress) {
  try {
    window.localStorage.setItem(
      getReadingProgressKey(progress.user_id, progress.day_index, progress.track),
      JSON.stringify(progress),
    );
    window.localStorage.setItem(`${PREFIX}:${progress.user_id}:last-day`, String(progress.day_index));
  } catch {
    // Storage can be unavailable in private browsing or a restricted webview.
  }
}

export function getLatestReadingProgress(userId: string, dayIndex: number, tracks: string[]) {
  try {
    const entries = tracks.flatMap((track) => {
      const value = window.localStorage.getItem(getReadingProgressKey(userId, dayIndex, track));
      if (!value) return [];
      try {
        const progress = JSON.parse(value) as ReadingProgress;
        return progress && progress.user_id === userId && progress.day_index === dayIndex && progress.track === track
          && Number.isFinite(progress.scroll_offset) && progress.scroll_offset >= 0
          && Number.isFinite(Date.parse(progress.updated_at))
          ? [progress]
          : [];
      } catch {
        return [];
      }
    });
    return entries.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0] ?? null;
  } catch {
    return null;
  }
}

export function getLastReadingDay(userId: string): number | null {
  try {
    const day = Number(window.localStorage.getItem(`${PREFIX}:${userId}:last-day`));
    return Number.isInteger(day) && day >= 1 && day <= 365 ? day : null;
  } catch {
    return null;
  }
}
