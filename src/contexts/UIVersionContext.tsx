"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UIVersion = "classic" | "new";

const UIVersionContext = createContext<{ version: UIVersion; setVersion: (version: UIVersion) => void } | null>(null);

export function UIVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState<UIVersion>("classic");

  useEffect(() => {
    const saved = window.localStorage.getItem("one-verse-ui-version");
    if (saved === "new" || saved === "classic") setVersion(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.uiVersion = version;
    window.localStorage.setItem("one-verse-ui-version", version);
  }, [version]);

  return <UIVersionContext.Provider value={{ version, setVersion }}>{children}</UIVersionContext.Provider>;
}

export function useUIVersion() {
  const context = useContext(UIVersionContext);
  if (!context) throw new Error("useUIVersion must be used within UIVersionProvider");
  return context;
}
