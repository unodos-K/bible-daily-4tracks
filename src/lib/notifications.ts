import { supabase } from './supabase';
import type { Database } from '@/types/supabase';

export type NotificationType = 'friend_request' | 'friend_request_accepted' | 'one_verse_liked'
  | 'reading_streak_achieved' | 'memorization_completed' | 'one_verse_completed';
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationItem = NotificationRow & {
  actor: { id: string; name: string | null; nickname: string | null; avatar_url: string | null } | null;
};
export const NOTIFICATION_PAGE_SIZE = 20;

export async function fetchUnreadNotificationCount(userId: string) {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId).eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchNotifications(userId: string, offset = 0): Promise<NotificationItem[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('recipient_id', userId)
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(offset, offset + NOTIFICATION_PAGE_SIZE - 1);
  if (error) throw error;
  const ids = Array.from(new Set(data.flatMap(row => row.actor_id ? [row.actor_id] : [])));
  const profiles = ids.length ? await supabase.from('profiles').select('id,name,nickname,avatar_url').in('id', ids) : null;
  if (profiles?.error) throw profiles.error;
  return data.map(row => ({ ...row, actor: profiles?.data?.find(p => p.id === row.actor_id) ?? null }));
}

export async function markNotificationsRead(id?: string) {
  const { error } = await supabase.rpc('mark_notifications_read', { p_id: id, p_before: new Date().toISOString() });
  if (error) throw error;
}

export function notificationMessage(item: NotificationItem) {
  const name = (item.actor?.nickname || item.actor?.name || '친구').split('#')[0];
  const meta = item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) ? item.metadata : {};
  switch (item.type as NotificationType) {
    case 'friend_request': return `${name}님이 친구 요청을 보냈어요.`;
    case 'friend_request_accepted': return `${name}님이 친구 요청을 수락했어요.`;
    case 'one_verse_liked': return `${name}님이 내 One Verse에 아멘을 눌렀어요.`;
    case 'reading_streak_achieved': return `${name}님이 ${typeof meta.days === 'number' ? meta.days : ''}일 연속 읽기를 성공했어요.`;
    case 'memorization_completed': return `${name}님이 ${meta.method === 'voice' ? '음성 도전으로 ' : meta.method === 'writing' ? '쓰기 도전으로 ' : ''}마음새김을 성공했어요.`;
    case 'one_verse_completed': return `${name}님이 오늘의 One Verse를 완성했어요.`;
    default: return '새로운 활동이 있어요.';
  }
}

export function notificationHref(item: NotificationItem): string {
  if (item.type === 'friend_request') return '/friends?tab=requests';
  if (item.type === 'friend_request_accepted') return '/friends';
  if (item.type === 'one_verse_liked') {
    const metadata = item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) ? item.metadata : {};
    const readDate = typeof metadata.read_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(metadata.read_date)
      ? metadata.read_date
      : null;
    return readDate ? `/mypage?date=${encodeURIComponent(readDate)}` : '/mypage';
  }
  return item.actor_id ? `/friend/${encodeURIComponent(item.actor_id)}` : '/friends';
}
