"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type ThemeMode = "light" | "dark" | "system";

export interface ShareOptions {
  verse: boolean;
  meditation: boolean;
  prayer: boolean;
  thanksgiving: boolean;
  application: boolean;
}

interface SettingsContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  autoPlayBgm: boolean;
  setAutoPlayBgm: (auto: boolean) => void;
  shareOptions: ShareOptions;
  setShareOptions: (options: ShareOptions) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [fontSize, setFontSize] = useState<number>(18); // 기본값 18px
  const [autoPlayBgm, setAutoPlayBgm] = useState<boolean>(true);
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    verse: true,
    meditation: true,
    prayer: true,
    thanksgiving: true,
    application: true,
  });
  const [isMounted, setIsMounted] = useState(false);

  // 초기 렌더링 시 로컬 스토리지에서 값 불러오기
  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem("bible_app_theme") as ThemeMode;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setTheme(savedTheme);
    }
    
    const savedFontSize = localStorage.getItem("bible_viewer_font_size");
    if (savedFontSize) {
      const parsed = parseInt(savedFontSize, 10);
      if (!isNaN(parsed)) setFontSize(parsed);
    }

    const savedAutoPlayBgm = localStorage.getItem("bible_app_autoplay_bgm");
    if (savedAutoPlayBgm !== null) {
      setAutoPlayBgm(savedAutoPlayBgm === "true");
    }

    const savedShareOptions = localStorage.getItem("bible_app_share_options");
    if (savedShareOptions) {
      try {
        setShareOptions(JSON.parse(savedShareOptions));
      } catch (e) {
        console.error("Failed to parse share options", e);
      }
    }
  }, []);

  // 상태 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("bible_viewer_font_size", fontSize.toString());
      localStorage.setItem("bible_app_autoplay_bgm", autoPlayBgm.toString());
      localStorage.setItem("bible_app_share_options", JSON.stringify(shareOptions));
    }
  }, [fontSize, autoPlayBgm, shareOptions, isMounted]);

  // 테마 변경 로직
  useEffect(() => {
    if (!isMounted) return;
    
    localStorage.setItem("bible_app_theme", theme);

    const applyTheme = (mode: "light" | "dark") => {
      const root = document.documentElement;
      if (mode === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches ? "dark" : "light");

      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? "dark" : "light");
      };
      
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      applyTheme(theme);
    }
  }, [theme, isMounted]);

  return (
    <SettingsContext.Provider value={{ 
      theme, setTheme, 
      fontSize, setFontSize, 
      autoPlayBgm, setAutoPlayBgm, 
      shareOptions, setShareOptions 
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
