"use client";

import React, { useEffect } from "react";
import { Moon, Sun, Monitor, Minus, Plus, X } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme, fontSize, setFontSize } = useSettings();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDecreaseFontSize = () => setFontSize(Math.max(fontSize - 2, 14));
  const handleIncreaseFontSize = () => setFontSize(Math.min(fontSize + 2, 28));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xl w-full max-w-md flex flex-col gap-8 animate-in zoom-in-95 border border-stone-200 dark:border-stone-800 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
        >
          <X size={24} />
        </button>

        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">환경 설정</h3>

        {/* 테마 설정 */}
        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold text-stone-500 dark:text-stone-400">화면 테마 모드</label>
          <div className="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                theme === "light"
                  ? "bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              }`}
            >
              <Sun size={18} /> 라이트
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                theme === "dark"
                  ? "bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              }`}
            >
              <Moon size={18} /> 다크
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                theme === "system"
                  ? "bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              }`}
            >
              <Monitor size={18} /> 시스템
            </button>
          </div>
        </div>

        <div className="w-full h-px bg-stone-100 dark:bg-stone-800"></div>

        {/* 글씨 크기 설정 */}
        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold text-stone-500 dark:text-stone-400">뷰어 글씨 크기</label>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleDecreaseFontSize}
              disabled={fontSize <= 14}
              className="w-12 h-12 flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Minus size={20} />
            </button>
            
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-1">{fontSize}</span>
              <span className="text-xs font-semibold text-stone-400">미리보기</span>
            </div>

            <button
              onClick={handleIncreaseFontSize}
              disabled={fontSize >= 28}
              className="w-12 h-12 flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-xl">
            <p className="text-stone-800 dark:text-stone-200 text-center" style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
              태초에 하나님이 천지를 창조하시니라
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
