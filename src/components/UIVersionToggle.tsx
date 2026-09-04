"use client";

import { useUIVersion, type UIVersion } from "@/contexts/UIVersionContext";

export default function UIVersionToggle() {
  const { version, setVersion } = useUIVersion();
  return <aside className="ui-version-toggle" aria-label="UI 디자인 버전">
    {(["classic", "new"] as UIVersion[]).map((option) => <button key={option} type="button" onClick={() => setVersion(option)} aria-pressed={version === option}>{option === "classic" ? "Classic" : "New"}</button>)}
  </aside>;
}
