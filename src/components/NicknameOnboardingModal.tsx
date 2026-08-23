"use client";

import React, { useState, useEffect } from "react";
import { Dices, Sparkles, UserCircle2 } from "lucide-react";
import { generateNickname } from "@/utils/nicknameGenerator";
import { updateUserNickname } from "@/lib/auth";

interface NicknameOnboardingModalProps {
  onComplete: (nickname: string) => void;
  isOpen: boolean;
  cancellable?: boolean;
  onCancel?: () => void;
}

export default function NicknameOnboardingModal({
  onComplete,
  isOpen,
  cancellable = false,
  onCancel
}: NicknameOnboardingModalProps) {
  const [nickname, setNickname] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && !nickname) {
      setNickname(generateNickname());
    }
  }, [isOpen, nickname]);

  if (!isOpen) return null;

  const handleShuffle = () => {
    setNickname(generateNickname());
  };

  const handleSave = async () => {
    const confirmMessage = "한 번 정한 닉네임은 변경할 수 없습니다.\n이 이름으로 시작하시겠습니까?";
    if (!window.confirm(confirmMessage)) return;

    setIsSaving(true);
    const success = await updateUserNickname(nickname);
    if (success) {
      onComplete(nickname);
    } else {
      alert("닉네임 저장에 실패했습니다. 다시 시도해주세요.");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        {/* 장식용 배경 요소 */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-200/20 dark:bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-sky-200/20 dark:bg-sky-500/10 rounded-full blur-3xl"></div>

        <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 mb-4 z-10">
          <UserCircle2 size={36} />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2 z-10">
          나만의 순례자 이름 짓기
        </h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-8 z-10 break-keep">
          앱에서 활동할 때 사용될 닉네임을 설정해주세요. <br />
          주사위를 굴려 다른 이름으로 바꿀 수 있습니다. <br />
          한 번 확정된 닉네임은 변경할 수 없으니 신중하게 선택해 주세요!
        </p>

        <div className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 mb-6 z-10 flex flex-col items-center justify-center min-h-[100px]">
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-500 tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" />
            {nickname}
          </div>
        </div>

        <div className="flex flex-col w-full gap-3 z-10">
          <button
            onClick={handleShuffle}
            disabled={isSaving}
            className="w-full py-3.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Dices size={20} />
            🎲 닉네임 주사위 굴리기
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3.5 bg-stone-800 hover:bg-stone-900 dark:bg-stone-200 dark:hover:bg-stone-300 text-white dark:text-stone-900 font-bold rounded-xl transition-colors disabled:opacity-50 shadow-md"
          >
            {isSaving ? "저장 중..." : "이 이름으로 시작하기"}
          </button>

          {cancellable && (
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="mt-2 text-sm font-semibold text-stone-400 hover:text-stone-500 transition-colors underline underline-offset-4"
            >
              다음에 할게요
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
