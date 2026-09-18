"use client";
import { Bell } from 'lucide-react';
import { useNotifications } from './NotificationProvider';

export default function NotificationBell() {
  const notifications = useNotifications();
  if (!notifications) return null;
  return <button type="button" data-notification-bell="true" onClick={(event) => notifications.openPanel(event.currentTarget)} aria-haspopup="dialog"
    aria-label={`알림${notifications.count ? `, 읽지 않은 알림 ${notifications.count}개` : ''}`}
    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 dark:text-stone-300 dark:hover:bg-stone-800">
    <Bell size={21} strokeWidth={1.8} />
    {notifications.count > 0 && <span aria-hidden="true" className="absolute right-0 top-0 min-w-4 rounded-full bg-rose-700 px-1 text-center text-[10px] font-bold leading-4 text-white">{notifications.count > 99 ? '99+' : notifications.count}</span>}
  </button>;
}
