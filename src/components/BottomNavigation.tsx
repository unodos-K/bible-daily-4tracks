"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, User, Users } from "lucide-react";
import { getPendingRequests } from "@/lib/social";

export function BottomNavigation() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchRequests = async () => {
      try {
        const requests = await getPendingRequests();
        if (isMounted) setPendingCount(requests.length);
      } catch (e) {
        console.error("Failed to fetch pending requests", e);
      }
    };

    fetchRequests();

    const handleUpdate = () => {
      fetchRequests();
    };

    window.addEventListener('friend_requests_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('friend_requests_updated', handleUpdate);
    };
  }, [pathname]);

  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 pb-[min(env(safe-area-inset-bottom),16px)] box-border">
      <div className="max-w-md h-12 mx-auto flex">
        <Link 
          href="/home"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 font-semibold transition-colors ${
            pathname === "/home" 
              ? "text-sky-700 dark:text-sky-400" 
              : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          }`}
        >
          <Home size={20} />
          <span className="text-[10px]">홈</span>
        </Link>
        <Link 
          href="/read"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 font-semibold transition-colors ${
            pathname === "/read" 
              ? "text-sky-700 dark:text-sky-400" 
              : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          }`}
        >
          <BookOpen size={20} />
          <span className="text-[10px]">말씀 뷰어</span>
        </Link>
        <Link 
          href="/friends"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 font-semibold transition-colors ${
            pathname.startsWith("/friends") || pathname.startsWith("/friend/")
              ? "text-sky-700 dark:text-sky-400" 
              : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          }`}
        >
          <div className="relative">
            <Users size={20} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-stone-900"></span>
            )}
          </div>
          <span className="text-[10px]">친구</span>
        </Link>
        <Link 
          href="/mypage"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 font-semibold transition-colors ${
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
