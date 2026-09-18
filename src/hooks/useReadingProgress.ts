import { useLayoutEffect, useRef } from "react";
import { getLatestReadingProgress, getReadingProgressKey, saveReadingProgress, type ReadingProgress } from "@/lib/readingProgress";

type ReadingProgressOptions = {
  userId?: string;
  dayIndex: number;
  tracks: string[];
  isReady: boolean;
  isActive?: boolean;
};

// Opt in locally with localStorage.setItem('reading-progress:debug', '1').
// Production logging is disabled. Never log auth tokens or Bible text.
function debug(event: string, values: object) {
  if (process.env.NODE_ENV !== "development") return;
  try {
    if (localStorage.getItem("reading-progress:debug") === "1") {
      const stored = event === "save" && "key" in values && typeof values.key === "string"
        ? localStorage.getItem(values.key) : undefined;
      console.debug(`[reader:${event}]`, { ...values, ...(stored !== undefined ? { stored } : {}) });
    }
  } catch { /* Storage may be unavailable. */ }
}

export function useReadingProgress({ userId, dayIndex, tracks, isReady, isActive = true }: ReadingProgressOptions) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const trackSignature = tracks.join("|");

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !userId || !isReady || !isActive) return;
    const trackNames = trackSignature.split("|");
    let snapshot = getLatestReadingProgress(userId, dayIndex, trackNames);
    let initialized = false;
    let suspended = document.visibilityState === "hidden";
    let disposed = false;
    let frame = 0;
    let saveTimer = 0;
    let lastSavedAt = 0;
    let dirty = false;
    let generation = 0;
    const metrics = () => ({ pathname: location.pathname, dayIndex, isActive, connected: container.isConnected,
      scrollTop: container.scrollTop, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight,
      overflowY: getComputedStyle(container).overflowY });
    debug("navigation", { action: "mount/activate", ...metrics(), progress: snapshot });

    const measure = (): ReadingProgress | null => {
      // Detached/hidden DOM reports zero geometry; it is not a reading position.
      if (!container.isConnected || container.clientHeight === 0) return null;
      const top = container.getBoundingClientRect().top;
      const verses = Array.from(container.querySelectorAll<HTMLElement>("[data-reader-verse='true']"));
      const verse = verses.find((el) => el.getBoundingClientRect().bottom > top + 8) ?? verses[verses.length - 1];
      if (!verse?.dataset.track || !verse.dataset.book) return null;
      return { user_id: userId, day_index: dayIndex, track: verse.dataset.track, book: verse.dataset.book,
        chapter: Number(verse.dataset.chapter), verse: Number(verse.dataset.verse), scroll_offset: container.scrollTop,
        verse_offset: verse.getBoundingClientRect().top - top, updated_at: new Date().toISOString() };
    };
    const flush = (reason: string) => {
      window.clearTimeout(saveTimer);
      saveTimer = 0;
      if (!snapshot || !dirty) return;
      saveReadingProgress(snapshot);
      lastSavedAt = Date.now();
      dirty = false;
      debug("save", { reason, key: getReadingProgressKey(userId, dayIndex, snapshot.track), progress: snapshot, ...metrics() });
    };
    const capture = () => {
      if (!initialized || suspended || document.visibilityState === "hidden") return;
      const value = measure();
      if (value) { snapshot = value; dirty = true; }
    };
    const onScroll = (event: Event) => {
      debug(container.scrollTop === 0 ? "reset" : "scroll", { ...metrics(), target: (event.target as HTMLElement)?.id,
        initialized, suspended, reason: "scroll event (not necessarily a JavaScript write)" });
      // Capture synchronously: navigation can remove the DOM before rAF.
      capture();
      if (!dirty || suspended) return;
      const remaining = Math.max(0, 1000 - (Date.now() - lastSavedAt));
      if (remaining === 0) flush("scroll");
      else if (!saveTimer) saveTimer = window.setTimeout(() => flush("scroll-trailing"), remaining);
    };
    const restore = (reason: string) => {
      const token = ++generation;
      window.cancelAnimationFrame(frame);
      initialized = false;
      const progress = snapshot;
      let previousSize = "";
      let stableFrames = 0;
      const attempt = () => {
        if (disposed || suspended || token !== generation) return;
        const size = `${container.scrollHeight}:${container.clientHeight}`;
        stableFrames = size === previousSize ? stableFrames + 1 : 0;
        previousSize = size;
        if (!container.isConnected || !container.clientHeight || stableFrames < 2) {
          frame = window.requestAnimationFrame(attempt);
          return;
        }
        const target = progress && Array.from(container.querySelectorAll<HTMLElement>("[data-reader-verse='true']")).find(el =>
          el.dataset.track === progress.track && el.dataset.book === progress.book
          && Number(el.dataset.chapter) === progress.chapter && Number(el.dataset.verse) === progress.verse);
        const before = container.scrollTop;
        if (progress) {
          const top = target ? container.scrollTop + target.getBoundingClientRect().top
            - container.getBoundingClientRect().top - (Number.isFinite(progress.verse_offset) ? progress.verse_offset! : 12) : progress.scroll_offset;
          container.scrollTo({ top: Math.max(0, top), behavior: "instant" as ScrollBehavior });
        }
        initialized = true;
        debug("restore", { reason, progress, key: progress && getReadingProgressKey(userId, dayIndex, progress.track), targetExists: Boolean(target), before, ...metrics() });
      };
      // BibleContent mounts after chapter loading. Also wait for fonts and a
      // stable, non-zero layout before restoring once per entry/resume.
      void document.fonts.ready.then(() => {
        if (!disposed && token === generation) frame = window.requestAnimationFrame(attempt);
      });
    };
    const suspend = (reason: string) => {
      if (suspended) return;
      // Preserve the last visible scroll event; the viewport may already have
      // collapsed by the time a mobile browser delivers the hidden event.
      flush(reason);
      suspended = true;
      ++generation;
      window.cancelAnimationFrame(frame);
    };
    const resume = (reason: string) => {
      if (!suspended) return;
      suspended = false;
      restore(reason);
    };
    const visibility = () => document.visibilityState === "hidden" ? suspend("hidden") : resume("visible");
    const pagehide = () => suspend("pagehide");
    const pageshow = () => { if (document.visibilityState !== "hidden") resume("pageshow"); };
    const userNavigation = () => {
      if (suspended || initialized) return;
      // A deliberate touch/One/Quick Navigation action wins over pending restore.
      ++generation;
      window.cancelAnimationFrame(frame);
      initialized = true;
    };
    const beforeNavigation = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a[href]");
      if (link && new URL((link as HTMLAnchorElement).href, location.href).pathname !== location.pathname) {
        capture(); flush("before-navigation");
      }
    };
    const actualScroll = (event: Event) => {
      if (event.target !== container) debug("scroll", { target: (event.target as HTMLElement)?.id || (event.target as HTMLElement)?.tagName, ...metrics() });
    };
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("touchstart", userNavigation, { passive: true });
    container.addEventListener("wheel", userNavigation, { passive: true });
    container.addEventListener("reader:navigate", userNavigation);
    document.addEventListener("click", beforeNavigation, true);
    document.addEventListener("visibilitychange", visibility);
    if (process.env.NODE_ENV === "development") document.addEventListener("scroll", actualScroll, true);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    if (!suspended) restore("mount/activate");
    return () => {
      // Layout cleanup precedes removal; cached data also survives hidden DOM.
      capture();
      flush("unmount/deactivate");
      debug("navigation", { action: "unmount/deactivate", ...metrics(), progress: snapshot });
      disposed = true;
      ++generation;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(saveTimer);
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("touchstart", userNavigation);
      container.removeEventListener("wheel", userNavigation);
      container.removeEventListener("reader:navigate", userNavigation);
      document.removeEventListener("click", beforeNavigation, true);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("scroll", actualScroll, true);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
      history.scrollRestoration = previousRestoration;
    };
  }, [userId, dayIndex, isReady, isActive, trackSignature]);
  return scrollContainerRef;
}
