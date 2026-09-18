"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { fetchNotifications, fetchUnreadNotificationCount, markNotificationsRead, NOTIFICATION_PAGE_SIZE, type NotificationItem } from '@/lib/notifications';
import NotificationPanel from './NotificationPanel';

interface NotificationContextValue {
  count: number;
  openPanel: () => void;
}
const NotificationContext = createContext<NotificationContextValue | null>(null);
export const useNotifications = () => useContext(NotificationContext);

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { authUser } = useAuth();
  // Re-key the entire state owner on account changes: old requests and lists can
  // never appear under a different signed-in account, even for one render.
  return authUser ? <UserNotifications key={authUser.id} userId={authUser.id}>{children}</UserNotifications> : <>{children}</>;
}

function UserNotifications({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const countRequest = useRef(0);
  const listRequest = useRef(0);
  const openRef = useRef(false);
  const offsetRef = useRef(0);

  const refreshCount = useCallback(async () => {
    const request = ++countRequest.current;
    try {
      const value = await fetchUnreadNotificationCount(userId);
      if (alive.current && request === countRequest.current) setCount(value);
    } catch { /* Opening the panel exposes a retryable error if unavailable. */ }
  }, [userId]);
  const load = useCallback(async (more = false) => {
    const request = ++listRequest.current;
    const offset = more ? offsetRef.current : 0;
    setLoading(true); setError('');
    try {
      const rows = await fetchNotifications(userId, offset);
      if (!alive.current || request !== listRequest.current) return;
      offsetRef.current = offset + rows.length;
      setItems(current => more ? Array.from(new Map([...current, ...rows].map(row => [row.id, row])).values()) : rows);
      setHasMore(rows.length === NOTIFICATION_PAGE_SIZE);
    } catch {
      if (alive.current && request === listRequest.current) setError('알림을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (alive.current && request === listRequest.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    alive.current = true;
    let subscribed = true;
    const countSequence = countRequest;
    const listSequence = listRequest;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (!subscribed) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!subscribed) return;
        void refreshCount();
        if (openRef.current) void load();
      }, 250);
    };
    void refreshCount();
    const channel = supabase.channel(`notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, refresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      subscribed = false;
      alive.current = false; ++countSequence.current; ++listSequence.current;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [userId, refreshCount, load]);

  const markRead = async (id?: string) => {
    setBusy(true); setError('');
    try {
      await markNotificationsRead(id);
      if (!alive.current) return false;
      if (id) setItems(current => current.map(row => row.id === id ? { ...row, is_read: true, read_at: new Date().toISOString() } : row));
      else await load();
      await refreshCount();
      return true;
    } catch {
      if (alive.current) setError('읽음 처리에 실패했어요. 다시 시도해 주세요.');
      return false;
    } finally { if (alive.current) setBusy(false); }
  };
  const close = () => { openRef.current = false; setOpen(false); };
  return <NotificationContext.Provider value={{ count, openPanel: () => {
    openRef.current = true; setOpen(true); void load(); void refreshCount();
  } }}>
    {children}
    <NotificationPanel open={open} onClose={close} items={items} loading={loading} busy={busy} error={error}
      hasMore={hasMore} onMore={() => void load(true)} onRetry={() => void load()} onRead={markRead} count={count} />
  </NotificationContext.Provider>;
}
