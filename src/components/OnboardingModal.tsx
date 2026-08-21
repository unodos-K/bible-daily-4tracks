"use client";

import React, { useState, useEffect } from "react";
import { getReadRecords } from "@/lib/storage";

interface OnboardingModalProps {
  onStartFresh: () => void;
  onContinue: () => void;
}

export default function OnboardingModal({ onStartFresh, onContinue }: OnboardingModalProps) {
  const [hasExistingRecords, setHasExistingRecords] = useState(false);

  useEffect(() => {
    const records = getReadRecords();
    if (Object.keys(records).length > 0) {
      setHasExistingRecords(true);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-8 text-center flex flex-col items-center gap-6 animate-in zoom-in-95">
        <div className="w-20 h-20 bg-sky-100 dark:bg-sky-900/50 rounded-full flex items-center justify-center text-4xl mb-2">
          📖
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl sm:text-3xl font-black text-stone-800 dark:text-stone-100">말씀 통독에 오신 것을<br/>환영합니다 ✨</h2>
          <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-sm sm:text-base">
            원하시는 통독 방식을 선택해주세요.<br/>
            언제든 부담 없이 말씀과 동행하는 삶을 시작해보세요.
          </p>
        </div>
        
        <div className="flex flex-col gap-4 w-full mt-6">
          <button 
            onClick={onStartFresh}
            className="w-full p-5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl transition-transform hover:-translate-y-1 shadow-lg flex flex-col items-center justify-center gap-1"
          >
            <span className="text-lg">🚀 오늘부터 성경읽기 새로 시작하기</span>
            <span className="text-sky-200 text-xs font-medium">오늘을 Day 1 시작일로 설정하고 새로운 통독을 시작합니다.</span>
          </button>
          
          <div className="relative w-full text-center my-1">
            <span className="text-stone-300 dark:text-stone-600 font-medium text-sm px-2 bg-white dark:bg-stone-900 z-10 relative">또는</span>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-stone-200 dark:bg-stone-800 -translate-y-1/2"></div>
          </div>

          <button 
            onClick={hasExistingRecords ? onContinue : undefined}
            disabled={!hasExistingRecords}
            className={`w-full p-5 font-bold rounded-2xl transition-colors shadow-sm flex flex-col items-center justify-center gap-1 ${
              hasExistingRecords
                ? "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                : "bg-stone-50 dark:bg-stone-900/50 text-stone-400 border border-stone-200 dark:border-stone-800 cursor-not-allowed"
            }`}
          >
            <span className="text-lg">📖 기존 성경통독 이어가기</span>
            <span className={`text-xs font-medium ${hasExistingRecords ? 'text-stone-500' : 'text-stone-400'}`}>
              {hasExistingRecords ? "기존에 읽던 기록을 유지한 채 마이페이지로 이동합니다." : "저장된 기존 기록이 없습니다."}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
