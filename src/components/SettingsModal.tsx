"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Minus, Plus, X, Footprints, AlertCircle, UserCircle2 } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { startNewReading } from "@/lib/storage";
import { getAuthUser, AuthUser } from "@/lib/auth";
import NicknameOnboardingModal from "./NicknameOnboardingModal";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void | Promise<void>;
}

export default function SettingsModal({ isOpen, onClose, onLogout }: SettingsModalProps) {
  const { theme, setTheme, fontSize, setFontSize, autoPlayBgm, setAutoPlayBgm, shareOptions, setShareOptions } = useSettings();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  const executeReset = async () => {
    const dateObj = new Date();
    const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    await startNewReading(todayStr);
    setIsResetModalOpen(false);
    window.location.href = "/";
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      getAuthUser().then(setAuthUser);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDecreaseFontSize = () => setFontSize(Math.max(fontSize - 2, 14));
  const handleIncreaseFontSize = () => setFontSize(Math.min(fontSize + 2, 28));

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-white dark:bg-stone-900 md:bg-black/60 md:backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 md:rounded-3xl p-6 pt-12 pb-20 md:p-6 md:shadow-xl w-full min-h-full md:min-h-0 md:h-auto max-w-md flex flex-col gap-8 md:animate-in md:zoom-in-95 border-0 md:border border-stone-200 dark:border-stone-800 relative">
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

        <div className="w-full h-px bg-stone-100 dark:bg-stone-800"></div>

        {/* 마음 새김 음악 자동 재생 설정 */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-stone-500 dark:text-stone-400">마음 새김 시 음악 자동 재생</label>
          <button
            onClick={() => setAutoPlayBgm(!autoPlayBgm)}
            className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 ${
              autoPlayBgm ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${autoPlayBgm ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>

        <div className="w-full h-px bg-stone-100 dark:bg-stone-800"></div>

        {/* 발자국 공유 기본 설정 */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-stone-500 dark:text-stone-400">발자국 공유 기본 설정</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'verse', label: '말씀' },
              { id: 'meditation', label: '묵상' },
              { id: 'prayer', label: '기도' },
              { id: 'thanksgiving', label: '감사' },
              { id: 'application', label: '적용' },
            ].map(item => (
              <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={shareOptions[item.id as keyof typeof shareOptions]} 
                  onChange={() => setShareOptions({ ...shareOptions, [item.id]: !shareOptions[item.id as keyof typeof shareOptions] })} 
                  className="w-4 h-4 accent-sky-500 bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-600 rounded" 
                />
                <span className="text-sm text-stone-700 dark:text-stone-300">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-stone-100 dark:bg-stone-800"></div>

        {/* Profile / Nickname Zone */}
        {authUser && (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold text-stone-500 dark:text-stone-400">프로필 설정</label>
            <button
              onClick={() => setShowNicknameModal(true)}
              className="flex items-center justify-between w-full px-4 py-3.5 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors hover:bg-stone-100 dark:hover:bg-stone-700/50 border border-stone-100 dark:border-stone-700"
            >
              <div className="flex items-center gap-2">
                <UserCircle2 size={18} />
                {authUser.nickname ? `닉네임: ${authUser.nickname}` : "닉네임 설정하기"}
              </div>
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center justify-center w-full px-4 py-3.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-bold rounded-xl transition-colors hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700"
              >
                로그아웃
              </button>
            )}
          </div>
        )}

        {/* 설정 초기화 영역 */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors border border-red-100 dark:border-red-900/30"
          >
            <Footprints size={18} />
            설정 초기화 및 통독 다시 시작하기
          </button>
          <p className="text-xs text-red-500 dark:text-red-400 text-center font-medium">
            모든 읽기 기록과 발자국, 마음 새김 기록이 삭제 됩니다
          </p>
        </div>
      </div>

      {/* Reset Confirm Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsResetModalOpen(false)}>
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl p-6 shadow-xl text-center flex flex-col gap-4 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mx-auto flex items-center justify-center mb-2">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">정말 모든 기록을 삭제하고 처음부터 다시 시작하시겠습니까?</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm break-keep">
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                onClick={executeReset}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {showNicknameModal && (
        <NicknameOnboardingModal 
          isOpen={showNicknameModal} 
          cancellable={true} 
          onCancel={() => setShowNicknameModal(false)}
          onComplete={(nickname) => {
            if (authUser) {
              setAuthUser({ ...authUser, nickname });
            }
            setShowNicknameModal(false);
          }}
        />
      )}
    </div>
    </>
  );
}
