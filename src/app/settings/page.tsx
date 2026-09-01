"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Moon, 
  Sun, 
  Monitor, 
  Minus, 
  Plus, 
  Footprints, 
  AlertCircle, 
  UserCircle2, 
  GripVertical, 
  Settings, 
  LogOut 
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { startNewReading } from "@/lib/storage";
import { signOut } from "@/lib/supabase";
import NicknameOnboardingModal from "@/components/NicknameOnboardingModal";
import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme, fontSize, setFontSize, autoPlayBgm, setAutoPlayBgm, shareOptions, setShareOptions } = useSettings();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const { authUser, isAuthLoading } = useAuth();
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  const executeReset = async () => {
    const dateObj = new Date();
    const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    await startNewReading(todayStr, authUser?.id);
    setIsResetModalOpen(false);
    window.location.href = "/";
  };

  const handleDecreaseFontSize = () => setFontSize(Math.max(fontSize - 2, 14));
  const handleIncreaseFontSize = () => setFontSize(Math.min(fontSize + 2, 28));

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (dragIndex === dropIndex) return;
    
    const newItems = [...shareOptions];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    setShareOptions(newItems);
  };

  if (!isClient || isAuthLoading) return null;

  return (
    <div className="w-full min-h-[100dvh] bg-stone-50 dark:bg-stone-950 flex flex-col">
      {/* 고정 헤더 */}
      <header className="sticky top-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md pt-[calc(1rem+env(safe-area-inset-top))] pb-4 px-4 sm:px-6 border-b border-stone-200/50 dark:border-stone-800/50 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="p-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full text-stone-600 dark:text-stone-300 transition-colors"
            aria-label="뒤로 가기"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Settings size={22} className="text-sky-600 dark:text-sky-400" />
            <h1 className="text-xl font-black text-stone-800 dark:text-stone-100">환경 설정</h1>
          </div>
        </div>
      </header>

      {/* 메인 스크롤 콘텐츠 */}
      <main className="flex-1 w-full overflow-y-auto pb-24 px-4 sm:px-6">
        <div className="max-w-xl mx-auto w-full flex flex-col gap-6 py-6 animate-in fade-in duration-200">
          
          {/* 테마 설정 카드 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-stone-200/80 dark:border-stone-800 flex flex-col gap-3">
            <label className="text-sm font-bold text-stone-600 dark:text-stone-300">화면 테마 모드</label>
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

          {/* 글씨 크기 설정 카드 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-stone-200/80 dark:border-stone-800 flex flex-col gap-4">
            <label className="text-sm font-bold text-stone-600 dark:text-stone-300">뷰어 글씨 크기</label>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleDecreaseFontSize}
                disabled={fontSize <= 14}
                className="w-12 h-12 flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="글자 크기 축소"
              >
                <Minus size={20} />
              </button>
              
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-stone-800 dark:text-stone-100 mb-0.5">{fontSize}</span>
                <span className="text-xs font-semibold text-stone-400">미리보기</span>
              </div>

              <button
                onClick={handleIncreaseFontSize}
                disabled={fontSize >= 28}
                className="w-12 h-12 flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="글자 크기 확대"
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-xl">
              <p className="text-stone-800 dark:text-stone-200 text-center font-medium" style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
                태초에 하나님이 천지를 창조하시니라
              </p>
            </div>
          </div>

          {/* 마음 새김 음악 자동 재생 설정 카드 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-stone-800 dark:text-stone-100">마음 새김 시 음악 자동 재생</span>
              <span className="text-xs text-stone-400">말씀 암송 훈련 시작 시 배경음악을 켭니다</span>
            </div>
            <button
              onClick={() => setAutoPlayBgm(!autoPlayBgm)}
              className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 shrink-0 ${
                autoPlayBgm ? "bg-sky-500" : "bg-stone-300 dark:bg-stone-700"
              }`}
              aria-label="음악 자동 재생 토글"
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${autoPlayBgm ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>

          {/* 발자국 나눔 기본 설정 카드 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-stone-200/80 dark:border-stone-800 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-stone-800 dark:text-stone-100">발자국 나눔 기본 설정</label>
              <p className="text-xs text-stone-400">나눔 시 포함할 항목과 표시 순서를 변경할 수 있습니다 (드래그하여 순서 변경)</p>
            </div>
            <div className="flex flex-col gap-2 mt-1">
              {shareOptions.map((item, index) => (
                <div 
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={(e) => handleDrop(e, index)}
                  className="flex items-center justify-between p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/60 dark:border-stone-700/60 cursor-grab active:cursor-grabbing hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      checked={item.checked} 
                      onChange={() => {
                        const newOptions = [...shareOptions];
                        newOptions[index].checked = !newOptions[index].checked;
                        setShareOptions(newOptions);
                      }} 
                      className="w-5 h-5 accent-sky-500 bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-600 rounded" 
                    />
                    <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{item.label}</span>
                  </label>
                  <div className="text-stone-400 cursor-grab active:cursor-grabbing px-2">
                    <GripVertical size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 프로필 설정 카드 */}
          {authUser && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-stone-200/80 dark:border-stone-800 flex flex-col gap-4">
              <label className="text-sm font-bold text-stone-800 dark:text-stone-100">프로필 및 계정</label>
              <button
                onClick={() => setShowNicknameModal(true)}
                className="flex items-center justify-between w-full px-4 py-3.5 bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 font-bold rounded-xl transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60"
              >
                <div className="flex items-center gap-2.5">
                  <UserCircle2 size={20} className="text-stone-500 dark:text-stone-400" />
                  <span>{authUser.nickname ? `닉네임: ${authUser.nickname}` : "닉네임 설정하기"}</span>
                </div>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-md">변경</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 font-bold rounded-xl transition-colors"
              >
                <LogOut size={18} />
                로그아웃
              </button>
            </div>
          )}

          {/* 설정 초기화 영역 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm border border-red-100 dark:border-red-950/30 flex flex-col gap-3">
            <label className="text-sm font-bold text-red-500 flex items-center gap-1.5">
              <AlertCircle size={16} /> Danger Zone
            </label>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center justify-center gap-2 w-full py-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors border border-red-200/60 dark:border-red-900/30 active:scale-[0.99]"
            >
              <Footprints size={18} />
              설정 초기화 및 통독 다시 시작하기
            </button>
            <p className="text-xs text-red-500/80 dark:text-red-400/80 text-center font-medium">
              모든 읽기 기록과 발자국, 마음 새김 기록이 삭제 됩니다
            </p>
          </div>
        </div>
      </main>

      {/* Reset Confirm Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsResetModalOpen(false)}>
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl p-6 shadow-xl text-center flex flex-col gap-4 animate-in zoom-in-95 border border-stone-200 dark:border-stone-800" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mx-auto flex items-center justify-center mb-1">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">정말 모든 기록을 삭제하고 처음부터 다시 시작하시겠습니까?</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm break-keep leading-relaxed">
              지금까지의 통독 발자국과 마음 새김 데이터가 모두 삭제되며, 처음부터 다시 시작하게 됩니다. 이 작업은 되돌릴 수 없습니다.
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
          onComplete={() => {
            setShowNicknameModal(false);
          }}
        />
      )}
    </div>
  );
}
