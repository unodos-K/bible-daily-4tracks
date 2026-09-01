import { useEffect, useRef, useState } from "react";
import type { TrackData } from "./types";

export function useActiveReaderTrack(tracks: TrackData[], headerHeight: number) {
  const trackRefs = useRef(new Map<string, HTMLDivElement>());
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(0);
  const initialTrackType = tracks[0]?.track.type;
  const [activeTrackType, setActiveTrackType] = useState(initialTrackType);
  const trackSignature = tracks.map((track) => `${track.track.type}:${track.track.range}`).join("|");

  useEffect(() => setActiveTrackType(initialTrackType), [initialTrackType, trackSignature]);

  useEffect(() => {
    const stickyHeader = stickyHeaderRef.current;
    if (!stickyHeader) return;
    const updateHeight = () => setStickyHeaderHeight(stickyHeader.getBoundingClientRect().height);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(stickyHeader);
    return () => observer.disconnect();
  }, [activeTrackType]);

  useEffect(() => {
    const scrollContainer = document.querySelector("main");
    if (!scrollContainer) return;
    let frameId: number | null = null;
    const updateActiveTrack = () => {
      frameId = null;
      const stickyBottom = scrollContainer.getBoundingClientRect().top + headerHeight + stickyHeaderHeight;
      let nextTrackType = initialTrackType;
      for (const track of tracks) {
        const top = trackRefs.current.get(track.track.type)?.getBoundingClientRect().top;
        if (top !== undefined && top <= stickyBottom) nextTrackType = track.track.type;
        else break;
      }
      setActiveTrackType((current) => current === nextTrackType ? current : nextTrackType);
    };
    const onScroll = () => { if (frameId === null) frameId = window.requestAnimationFrame(updateActiveTrack); };
    updateActiveTrack();
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [headerHeight, initialTrackType, stickyHeaderHeight, trackSignature, tracks]);

  return { activeTrackType, stickyHeaderHeight, stickyHeaderRef, trackRefs };
}
