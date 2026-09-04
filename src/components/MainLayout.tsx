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
  const showBottomNav = !hideBottomNav && pathname !== "/" && pathname !== "/login";
  const hasPageScrollContainer = isReadPage || isMemoPage || isFriendsPage || isFriendDetailPage || isMyPage;

  return (
    <>
      <div className="relative mx-auto flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden border-x border-stone-200 bg-stone-50 pt-[env(safe-area-inset-top)] shadow-xl dark:border-stone-800 dark:bg-stone-950">
        <main className={`app-main flex-1 min-h-0 w-full ${showBottomNav ? 'pb-16' : ''} ${hasPageScrollContainer ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-y-contain'} bg-stone-50 dark:bg-stone-950`}>
          {children}
        </main>
      </div>
      {showBottomNav && <BottomNavigation />}
    </>
  );
}
