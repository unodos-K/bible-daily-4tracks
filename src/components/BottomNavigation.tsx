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

    window.addEventListener("friend_requests_updated", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("friend_requests_updated", handleUpdate);
    };
  }, [pathname]);

  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  const tabItems = [
    {
      href: "/home",
      label: "홈",
      icon: Home,
      isActive: pathname === "/home",
    },
    {
      href: "/read",
      label: "말씀 뷰어",
      icon: BookOpen,
      isActive: pathname === "/read" || pathname.startsWith("/read/"),
    },
    {
      href: "/friends",
      label: "친구",
      icon: Users,
      isActive: pathname.startsWith("/friends") || pathname.startsWith("/friend/"),
      badge: pendingCount > 0,
    },
    {
      href: "/mypage",
      label: "마이페이지",
      icon: User,
      isActive: pathname === "/mypage",
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 box-border bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-4">
        {tabItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-full w-full flex-col items-center justify-center gap-1 select-none font-semibold transition-colors ${
                item.isActive
                  ? "text-sky-700 dark:text-sky-400"
                  : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              }`}
            >
              <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                <Icon size={22} strokeWidth={2.25} className="h-[22px] w-[22px] shrink-0" />
                {item.badge && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-stone-900" />
                )}
              </div>
              <span className="text-[11px] font-semibold leading-none tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
