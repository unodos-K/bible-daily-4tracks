"use client";

import { signInWithKakao } from "@/lib/supabase";
import { BookOpen } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="w-full min-h-[100dvh] flex flex-col relative items-center justify-center bg-stone-50 dark:bg-stone-950 overflow-hidden">
      {/* 백그라운드 효과 (블러 원) */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-sky-200 dark:bg-sky-900/40 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70"></div>
      <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-amber-200 dark:bg-amber-900/40 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-72 h-72 bg-emerald-200 dark:bg-emerald-900/30 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70"></div>
      
      {/* 메인 컨텐츠 */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 w-full max-w-md h-full gap-10">
        
        {/* 로고 & 타이틀 영역 */}
        <div className="flex flex-col items-center text-center gap-4 mt-20">
          <div className="w-20 h-20 bg-gradient-to-tr from-sky-500 to-amber-400 rounded-3xl shadow-xl flex items-center justify-center mb-2 transform -rotate-6">
            <BookOpen className="text-white w-10 h-10 transform rotate-6" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-stone-800 dark:text-stone-100 tracking-tight leading-tight">
            매일 만나는<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-amber-500">생명의 말씀</span>
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-lg mt-2 font-medium">
            4Tracks 통독과 암송으로 시작하는 하루
          </p>
        </div>

        {/* 카카오 로그인 버튼 하단 고정 */}
        <div className="w-full mt-auto mb-16 flex flex-col gap-4">
          <button
            onClick={signInWithKakao}
            className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-transform hover:-translate-y-1 active:translate-y-0 shadow-lg shadow-[#FEE500]/30"
          >
            <svg viewBox="0 0 32 32" className="w-6 h-6" fill="currentColor">
              <path d="M16 4.64c-6.96 0-12.64 4.48-12.64 10.08 0 3.52 2.32 6.64 5.76 8.48l-1.44 5.44c-0.08 0.4 0.32 0.72 0.72 0.48l6.4-4.4c0.4 0 0.72 0.08 1.2 0.08 6.96 0 12.64-4.48 12.64-10.08S22.96 4.64 16 4.64z"/>
            </svg>
            <span className="text-[17px]">카카오 로그인하고 시작하기</span>
          </button>
          <p className="text-xs text-center text-stone-400 dark:text-stone-500">
            버튼을 누름으로써 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
