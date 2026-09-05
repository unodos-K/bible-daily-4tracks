import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1500); // 1.5초 유지
    
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2000); // 페이드아웃 후 종료

    return () => {
      clearTimeout(timer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div data-v2-splash className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-700">
        <div className="p-4 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
          <BookOpen size={48} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-stone-800 dark:text-stone-100 tracking-tight">One Verse</h1>
        <p className="text-stone-500 dark:text-stone-400 font-medium">마음에 새기는 단 하나의 구절</p>
      </div>
    </div>
  );
}
