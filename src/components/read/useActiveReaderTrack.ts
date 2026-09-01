import { useEffect, useRef, useState } from "react";
import type { TrackData } from "./types";

export function useActiveReaderTrack(tracks: TrackData[]) {
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
    const scrollContainer = document.getElementById("bible-content-scroll");
    if (!scrollContainer) return;
    let frameId: number | null = null;
    const updateActiveTrack = () => {
      frameId = null;
      const containerTop = scrollContainer.getBoundingClientRect().top;
      let nextTrackType = initialTrackType;
      for (const track of tracks) {
        const trackEl = trackRefs.current.get(track.track.type);
        if (trackEl) {
          const top = trackEl.getBoundingClientRect().top - containerTop;
          if (top <= 40) {
            nextTrackType = track.track.type;
          } else {
            break;
          }
        }
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
  }, [initialTrackType, trackSignature, tracks]);

  return { activeTrackType, stickyHeaderHeight, stickyHeaderRef, trackRefs };
}
