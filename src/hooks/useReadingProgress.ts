import { useEffect, useMemo, useRef } from "react";
import { getLatestReadingProgress, saveReadingProgress } from "@/lib/readingProgress";

type ReadingProgressOptions = {
  userId?: string;
  dayIndex: number;
  tracks: string[];
  isReady: boolean;
};

const SAVE_INTERVAL_MS = 1_000;

export function useReadingProgress({ userId, dayIndex, tracks, isReady }: ReadingProgressOptions) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const restoredKeyRef = useRef<string | null>(null);
  const trackSignature = tracks.join("|");
  const stableTracks = useMemo(() => trackSignature ? trackSignature.split("|") : [], [trackSignature]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !userId || !isReady || stableTracks.length === 0) return;

    const identity = `${userId}:${dayIndex}:${trackSignature}`;
    let frameId: number | null = null;
    let lastSavedAt = 0;
    let disposed = false;
    let isInitialized = false;
    const restoreTimers: number[] = [];

    const getVisibleVerse = () => {
      const containerTop = container.getBoundingClientRect().top;
      const verses = Array.from(container.querySelectorAll<HTMLElement>("[data-reader-verse='true']"));
      return verses.find((verse) => verse.getBoundingClientRect().bottom > containerTop + 8) ?? verses[0];
    };

    const save = (force = false) => {
      if (!isInitialized) return;
      const now = Date.now();
      if (!force && now - lastSavedAt < SAVE_INTERVAL_MS) return;
      const verse = getVisibleVerse();
      if (!verse) return;
      const track = verse.dataset.track;
      const book = verse.dataset.book;
      const chapter = Number(verse.dataset.chapter);
      const verseNumber = Number(verse.dataset.verse);
      if (!track || !book || !Number.isFinite(chapter) || !Number.isFinite(verseNumber)) return;
      saveReadingProgress({
        user_id: userId,
        day_index: dayIndex,
        track,
        book,
        chapter,
        verse: verseNumber,
        scroll_offset: container.scrollTop,
        updated_at: new Date(now).toISOString(),
      });
      lastSavedAt = now;
    };

    const onScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        save();
      });
    };
    const restore = () => {
      const progress = getLatestReadingProgress(userId, dayIndex, stableTracks);
      if (!progress) return;
      // A tab/PWA can keep this component mounted while its nested scroll
      // viewport is recreated. Re-apply after visibility/layout restoration.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        if (disposed) return;
        const target = Array.from(container.querySelectorAll<HTMLElement>("[data-reader-verse='true']")).find((element) =>
          element.dataset.track === progress.track
          && element.dataset.book === progress.book
          && Number(element.dataset.chapter) === progress.chapter
          && Number(element.dataset.verse) === progress.verse,
        );
        if (target) {
          const containerRect = container.getBoundingClientRect();
          const targetTop = container.scrollTop + target.getBoundingClientRect().top - containerRect.top - 12;
          container.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
        } else {
          container.scrollTo({ top: progress.scroll_offset, behavior: "auto" });
        }
        restoredKeyRef.current = identity;
        isInitialized = true;
      }));
    };
    const restoreIfReset = () => {
      if (!disposed && isInitialized && container.scrollTop === 0) restore();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") save(true);
      else restore();
    };
    const onPageHide = () => save(true);
    const onPageShow = () => restore();

    // The reader owns a nested scroll container, so prevent browser history from
    // attempting an unrelated document-level restoration while it is mounted.
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    container.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    if (restoredKeyRef.current !== identity) {
      const progress = getLatestReadingProgress(userId, dayIndex, stableTracks);
      if (progress) {
        restore();
        // Client-side route transitions and late layout effects can reset a
        // nested scroller after the first restoration. Only retry when it is
        // still at the initial position, so One/Quick Navigation is untouched.
        restoreTimers.push(window.setTimeout(restoreIfReset, 250));
        restoreTimers.push(window.setTimeout(restoreIfReset, 800));
      } else {
        restoredKeyRef.current = identity;
        isInitialized = true;
      }
    } else {
      isInitialized = true;
    }

    return () => {
      disposed = true;
      save(true);
      container.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      restoreTimers.forEach((timer) => window.clearTimeout(timer));
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [userId, dayIndex, isReady, stableTracks, trackSignature]);

  return scrollContainerRef;
}
