"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, User } from "lucide-react";

export function GlobalNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-sm">
      <div className="max-w-2xl mx-auto flex">
        <Link 
          href="/"
          className={`flex-1 py-3.5 flex items-center justify-center gap-2 font-semibold transition-colors ${
            pathname === "/" 
              ? "text-sky-700 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400" 
              : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          }`}
        >
          <BookOpen size={18} />
          오늘의 말씀 뷰어
        </Link>
        <Link 
          href="/mypage"
          className={`flex-1 py-3.5 flex items-center justify-center gap-2 font-semibold transition-colors ${
            pathname === "/mypage" 
              ? "text-sky-700 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400" 
              : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          }`}
        >
          <User size={18} />
          마이페이지
        </Link>
      </div>
    </nav>
  );
}
