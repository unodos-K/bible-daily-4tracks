"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, User } from "lucide-react";

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex">
        <Link 
          href="/"
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 font-semibold transition-colors ${
            pathname === "/" 
              ? "text-sky-700 dark:text-sky-400" 
              : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          }`}
        >
          <Home size={20} />
          <span className="text-[10px]">홈</span>
        </Link>
        <Link 
          href="/read"
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 font-semibold transition-colors ${
            pathname === "/read" 
              ? "text-sky-700 dark:text-sky-400" 
              : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          }`}
        >
          <BookOpen size={20} />
          <span className="text-[10px]">말씀 뷰어</span>
        </Link>
        <Link 
          href="/mypage"
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 font-semibold transition-colors ${
            pathname === "/mypage" 
              ? "text-sky-700 dark:text-sky-400" 
              : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          }`}
        >
          <User size={20} />
          <span className="text-[10px]">마이페이지</span>
        </Link>
      </div>
    </nav>
  );
}
