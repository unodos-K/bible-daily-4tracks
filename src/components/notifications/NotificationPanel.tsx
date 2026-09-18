"use client";
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, BookOpen, Flame, Heart, Sparkles, UserPlus, Users, X } from 'lucide-react';
import AvatarImage from '@/components/AvatarImage';
import { notificationHref, notificationMessage, type NotificationItem } from '@/lib/notifications';

interface Props {
  open: boolean; onClose: () => void; items: NotificationItem[]; count: number;
  loading: boolean; busy: boolean; error: string; hasMore: boolean;
  onMore: () => void; onRetry: () => void; onRead: (id?: string) => Promise<boolean>; anchorRect: DOMRect | null;
}
const icons = { friend_request: UserPlus, friend_request_accepted: Users, one_verse_liked: Heart,
  reading_streak_achieved: Flame, memorization_completed: Sparkles, one_verse_completed: BookOpen, friend_completed_reading: BookOpen };

export default function NotificationPanel(props: Props) {
  const router = useRouter();
  if (typeof document === 'undefined' || !props.open || !props.anchorRect) return null;
  const style: CSSProperties = {
    top: props.anchorRect.bottom + 8,
    right: Math.max(12, window.innerWidth - props.anchorRect.right),
    minHeight: 'min(360px, calc(100vh - 96px))',
    maxHeight: 'min(72vh, 560px)',
  };
  return createPortal(<div data-notification-panel="true" role="dialog" aria-labelledby="notification-title"
    onKeyDown={(event) => { if (event.key === 'Escape') props.onClose(); }}
    style={style} className="fixed z-[100] w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 text-stone-800 shadow-2xl ring-1 ring-black/5 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100">
    <div className="flex min-h-0 max-h-[inherit] flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-2.5 dark:border-stone-800">
        <h2 id="notification-title" className="flex items-center gap-2 text-base font-bold"><Bell size={17} />알림</h2>
        <button autoFocus type="button" onClick={props.onClose} aria-label="알림 닫기" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-stone-200 dark:hover:bg-stone-800"><X size={18} /></button>
      </header>
      <div className="flex shrink-0 justify-end px-4 py-1.5"><button disabled={props.busy || props.count === 0} onClick={() => void props.onRead()} className="min-h-10 text-xs font-medium text-amber-800 disabled:opacity-40 dark:text-amber-300">모두 읽음 처리</button></div>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-2.5 pb-3" aria-busy={props.loading}>
        {props.error && <div role="alert" className="p-4 text-sm text-rose-700 dark:text-rose-300">{props.error}<button onClick={props.onRetry} className="ml-2 min-h-11 underline">다시 시도</button></div>}
        {!props.error && !props.loading && props.items.length === 0 && <p className="py-16 text-center text-sm text-stone-500">아직 새로운 알림이 없어요.</p>}
        <ul className="space-y-1">{props.items.map(item => {
          const Icon = icons[item.type as keyof typeof icons] ?? Bell;
          const name = item.actor?.nickname || item.actor?.name || '친구';
          return <li key={item.id}><button disabled={props.busy} onClick={async () => {
            if (!item.is_read && !await props.onRead(item.id)) return;
            props.onClose(); router.push(notificationHref(item));
          }} className={`flex min-h-14 w-full items-start gap-2 rounded-lg p-2.5 text-left transition-colors hover:bg-stone-200/60 dark:hover:bg-stone-800 ${item.is_read ? '' : 'bg-amber-100/40 dark:bg-amber-950/20'}`}>
            <span className="relative shrink-0">{item.actor?.avatar_url ? <AvatarImage src={item.actor.avatar_url} alt={name} size={32} className="h-8 w-8 rounded-full bg-stone-200" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">{name.slice(0,1)}</span>}<Icon size={12} className="absolute -bottom-1 -right-1 rounded-full bg-stone-50 text-amber-800 dark:bg-stone-900 dark:text-amber-300" /></span>
            <span className="min-w-0 flex-1"><span className={`block break-words text-[13px] leading-5 ${item.is_read ? 'text-stone-500' : 'font-semibold'}`}>{notificationMessage(item)}</span>
              <time dateTime={item.created_at} className="mt-0.5 block text-[11px] text-stone-500">{new Date(item.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
              <span className="sr-only">{item.is_read ? '읽음' : '읽지 않음'} · 관련 화면으로 이동</span></span>
            {!item.is_read && <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700" />}
          </button></li>;
        })}</ul>
        {props.loading && <p role="status" className="p-4 text-center text-sm text-stone-500">알림을 불러오는 중…</p>}
        {props.hasMore && <button disabled={props.loading} onClick={props.onMore} className="mt-2 min-h-10 w-full rounded-lg border border-stone-200 text-xs dark:border-stone-800">이전 알림 더 보기</button>}
      </div>
    </div>
  </div>, document.body);
}
