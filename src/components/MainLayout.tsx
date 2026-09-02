"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { BottomNavigation } from "./BottomNavigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMemoPage = pathname?.startsWith("/memo");

  const isVersePage = pathname?.startsWith("/verse");
  const isSettingsPage = pathname?.startsWith("/settings");
  const isReadPage = pathname === "/read" || pathname?.startsWith("/read");
  const isFriendsPage = pathname === "/friends" || pathname?.startsWith("/friends/");
  const isFriendDetailPage = pathname?.startsWith("/friend/");
  const isMyPage = pathname === "/mypage";
  const hideBottomNav = isMemoPage || isVersePage || isSettingsPage;
  const hasPageScrollContainer = isReadPage || isMemoPage || isFriendsPage || isFriendDetailPage || isMyPage;

  return (
    <div className="w-full max-w-2xl h-[100dvh] bg-stone-50 dark:bg-stone-950 shadow-xl flex flex-col relative border-x border-stone-200 dark:border-stone-800 overflow-hidden pt-[env(safe-area-inset-top)]">
      <main className={`app-main flex-1 min-h-0 w-full ${hasPageScrollContainer ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-y-contain'} ${hideBottomNav ? '' : 'pb-[calc(4rem+env(safe-area-inset-bottom))]'} bg-stone-50 dark:bg-stone-950`}>
        {children}
      </main>
      {!hideBottomNav && <BottomNavigation />}
    </div>
  );
}
