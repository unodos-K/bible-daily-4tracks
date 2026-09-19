"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clipboard, Search, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { isAdminUserId } from "@/lib/admin";
import AdminReadingRecords from './AdminReadingRecords';

type Summary = {
  todayKst: string;
  totalUsers: number;
  todayOneVerseUsers: number;
  todayMemorizedUsers: number;
  checks: Record<string, number>;
};
type UserRow = { id: string; nickname: string | null; name: string | null; joined_at: string };
type UserDetail = {
  profile: { id: string; nickname: string | null; name: string | null };
  joinedAt: string;
  settings: { startDate?: string; createdAt?: string; updatedAt?: string };
  recentRecordAt: string | null;
  records: Array<{
    dayIndex: number; readDate: string; completedAt: string | null; hasOneVerse: boolean;
    verseLocation: { book: string | null; chapter: string | null; verse: string | null } | null;
    isMemorized: boolean; memorizedAt: string | null; memorizedMethods: string[];
    hasFootprint: boolean; footprintRecordedAt: null;
  }>;
  friendships: Array<{ user_id: string; friend_id: string; status: string; created_at: string; direction: string; other_name: string }>;
  likes: Array<{ id: string; dayIndex: number; likerId: string; likerName: string; createdAt: string; isSelfAmen: boolean }>;
};
type NotificationRow = { id: string; type: string; recipient_id: string; actor_id: string | null; created_at: string; is_read: boolean; read_at: string | null; related_day_index: number | null; event_key: string; recipient_name: string; actor_name: string; metadata: Record<string, string> };
type CheckRow = { category: string; reason: string; user_id: string; day_index: number | null; related_id: string | null };
type NotificationFilters = { type?: string; isRead?: string; actorId?: string; from?: string; to?: string };

const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString("ko-KR", { timeZone: 'Asia/Seoul', dateStyle: "medium", timeStyle: "short" }) : "기록되지 않음";
const formatDay = (value: string | null | undefined) => value || "-";

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "관리자 데이터를 불러오지 못했습니다.");
  return body as T;
}

export default function AdminDashboard() {
  const { authUser, isAuthLoading } = useAuth();
  if (isAuthLoading) return <p role="status" className="p-6">관리자 권한 확인 중…</p>;
  if (!isAdminUserId(authUser?.id)) return <p role="alert" className="p-6">관리자 권한이 없습니다.</p>;
  return <AdminDashboardContent key={authUser!.id} />;
}

function AdminDashboardContent() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [summaryData, checksData] = await Promise.all([
        readJson<Summary>("/api/admin/summary"),
        readJson<{ items: CheckRow[] }>("/api/admin/checks"),
      ]);
      setSummary(summaryData); setChecks(checksData.items || []);
    } catch (e) { setError(e instanceof Error ? e.message : "관리자 데이터를 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, []);

  const loadUsers = useCallback(async (nextPage: number, search = "") => {
    try {
      const data = await readJson<{ items: UserRow[]; total: number }>(`/api/admin/users?q=${encodeURIComponent(search)}&page=${nextPage}&pageSize=20`);
      setUsers(data.items || []); setTotalUsers(data.total || 0); setPage(nextPage);
    } catch (e) { setError(e instanceof Error ? e.message : "사용자 검색에 실패했습니다."); }
  }, []);

  useEffect(() => { void loadOverview(); void loadUsers(1); }, [loadOverview, loadUsers]);

  const loadDetail = async (userId: string, day?: number | null) => {
    try {
      setError(null);
      const data = await readJson<UserDetail>(`/api/admin/users/${userId}`);
      setDetail(data); setSelectedDay(day ?? null);
      await loadNotifications(userId, day ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : "사용자 상세를 불러오지 못했습니다."); }
  };

  const loadNotifications = async (userId: string, day: number | null, filters: NotificationFilters = {}) => {
    const params = new URLSearchParams({ recipientId: userId, pageSize: "50" });
    if (day) params.set("day", String(day));
    if (filters.type) params.set("type", filters.type);
    if (filters.isRead) params.set("isRead", filters.isRead);
    if (filters.actorId) params.set("actorId", filters.actorId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const notificationData = await readJson<{ items: NotificationRow[] }>(`/api/admin/notifications?${params.toString()}`);
    setNotifications(notificationData.items || []);
  };

  const handleRecordSaved = (result: { userId: string; dayIndex: number; values: { read_date: string; completed_at: string | null } }) => {
    setDetail(current => current && current.profile.id === result.userId ? { ...current, records: current.records.map(record => record.dayIndex === result.dayIndex
      ? { ...record, readDate: result.values.read_date, completedAt: result.values.completed_at } : record) } : current);
    void loadOverview();
    void readJson<UserDetail>(`/api/admin/users/${result.userId}`).then(updated => {
      setDetail(current => current?.profile.id === result.userId ? updated : current);
    }).catch(() => setError('저장은 완료됐지만 상세 재조회에 실패했습니다. 사용자를 다시 선택해 주세요.'));
  };

  const copyId = async (id: string) => { await navigator.clipboard?.writeText(id); };
  const checksCount = summary ? Object.values(summary.checks).reduce((sum, value) => sum + value, 0) : 0;

  return (
    <div data-admin-dashboard className="[overflow-wrap:anywhere] min-w-0 bg-stone-50 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] text-stone-900 dark:bg-stone-950 dark:text-stone-100 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><button onClick={() => router.push("/home")} className="rounded-full border border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-900" aria-label="홈으로"><ArrowLeft size={20} /></button><div><p className="text-xs font-bold text-amber-600">운영 도구</p><h1 className="text-2xl font-black">관리자 점검</h1></div></div>
          <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"><ShieldCheck size={16} /> 관리자 기록 보정</div>
        </header>

        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><span>{error}</span><button onClick={() => { setError(null); void loadOverview(); }} className="font-bold underline">다시 시도</button></div>}

        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="전체 사용자" value={summary?.totalUsers} note="profiles 기준" loading={loading} />
          <Metric label="오늘 One Verse" value={summary?.todayOneVerseUsers} note={`한국 시간 ${summary?.todayKst || "-"}`} loading={loading} />
          <Metric label="오늘 마음새김" value={summary?.todayMemorizedUsers} note="memorizedAt 기준" loading={loading} />
        </section>



        <section className="flex min-w-0 flex-col gap-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="mb-3 font-black">사용자 검색</h2>
            <form onSubmit={(event) => { event.preventDefault(); void loadUsers(1, query); }} className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="닉네임 또는 정확한 UUID" maxLength={100} className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-sky-500 dark:border-stone-700 dark:bg-stone-950" /><button className="rounded-xl bg-stone-800 px-3 text-white dark:bg-stone-200 dark:text-stone-900" aria-label="검색"><Search size={18} /></button></form>
            <div className="mt-3 flex flex-col gap-1">{users.map((user) => <button key={user.id} onClick={() => void loadDetail(user.id)} className="rounded-xl p-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800"><div className="flex items-center justify-between gap-2"><span className="font-bold">{user.nickname || user.name || "이름 없음"}</span><span className="text-xs text-stone-500">{formatDate(user.joined_at)}</span></div><span className="block truncate font-mono text-[11px] text-stone-400">{user.id}</span></button>)}{!loading && users.length === 0 && <p className="p-4 text-center text-sm text-stone-500">검색 결과가 없어요.</p>}</div>
            <div className="mt-3 flex items-center justify-between text-xs text-stone-500"><span>{totalUsers}명</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => void loadUsers(page - 1, query)} className="rounded-lg border px-2 py-1 disabled:opacity-40">이전</button><button disabled={page * 20 >= totalUsers} onClick={() => void loadUsers(page + 1, query)} className="rounded-lg border px-2 py-1 disabled:opacity-40">다음</button></div></div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            {!detail ? <div className="flex min-h-72 items-center justify-center text-sm text-stone-500">사용자를 선택하면 상세 점검 내용이 표시됩니다.</div> : <UserDetailPanel key={detail.profile.id} onSaved={handleRecordSaved} detail={detail} selectedDay={selectedDay} setSelectedDay={setSelectedDay} notifications={notifications} onLoadNotifications={(day, filters) => void loadNotifications(detail.profile.id, day, filters)} onCopy={copyId} />}
          </div>
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-black">데이터 점검</h2><span className="text-xs text-stone-500">총 {checksCount}건</span></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{summary && Object.entries(summary.checks).map(([key, value]) => <div key={key} className="rounded-xl bg-stone-50 p-3 dark:bg-stone-950"><p className="text-xs text-stone-500">{checkLabel(key)}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}</div>
          {checks.length > 0 && <div className="mt-4 flex flex-col gap-2">{checks.slice(0, 20).map((item, index) => <button key={`${item.category}-${item.user_id}-${item.day_index}-${index}`} onClick={() => void loadDetail(item.user_id, item.day_index)} className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-100 px-3 py-2 text-left text-xs hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800"><span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{item.category}</span><span className="text-stone-600 dark:text-stone-300">{item.reason}</span><span className="ml-auto font-mono text-stone-400">Day {item.day_index ?? "-"}</span></button>)}</div>}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, note, loading }: { label: string; value?: number; note: string; loading: boolean }) {
  return <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="text-sm font-bold text-stone-500">{label}</p><p className="mt-2 text-3xl font-black">{loading ? "…" : value ?? "-"}</p><p className="mt-1 text-xs text-stone-400">{note}</p></div>;
}

function checkLabel(key: string) {
  return ({ oneVerseWithoutCompletion: "One Verse·미완료", completedWithoutOneVerse: "완료·One Verse 없음", malformedOneVerse: "One Verse 형식", orphanLikes: "대상 없는 아멘", asymmetricFriendships: "친구 관계 불일치" } as Record<string, string>)[key] || key;
}

function UserDetailPanel({ detail, selectedDay, setSelectedDay, notifications, onLoadNotifications, onCopy, onSaved }: { onSaved: (result: { userId: string; dayIndex: number; values: { read_date: string; completed_at: string | null } }) => void; detail: UserDetail; selectedDay: number | null; setSelectedDay: (day: number | null) => void; notifications: NotificationRow[]; onLoadNotifications: (day: number | null, filters?: NotificationFilters) => void; onCopy: (id: string) => void }) {
  const [notificationType, setNotificationType] = useState("");
  const [notificationRead, setNotificationRead] = useState("");
  const [notificationActor, setNotificationActor] = useState("");
  const [notificationFrom, setNotificationFrom] = useState("");
  const [notificationTo, setNotificationTo] = useState("");
  const selectedRecord = detail.records.find((record) => record.dayIndex === selectedDay);
  return <div className="flex flex-col gap-5">
    <div><div className="flex items-center justify-between gap-2"><h2 className="text-lg font-black">{detail.profile.nickname || detail.profile.name || "이름 없음"}</h2><button onClick={() => onCopy(detail.profile.id)} className="rounded-lg border p-2 text-stone-500" aria-label="UUID 복사"><Clipboard size={16} /></button></div><p className="mt-1 break-all font-mono text-xs text-stone-500">{detail.profile.id}</p><div className="mt-3 grid gap-2 text-xs text-stone-500 sm:grid-cols-2"><span>가입: {formatDate(detail.joinedAt)}</span><span>통독 시작: {formatDay(detail.settings.startDate)}</span><span>최근 기록 시각: {formatDate(detail.recentRecordAt)}</span></div></div>
    <AdminReadingRecords userId={detail.profile.id} startDate={detail.settings.startDate} records={detail.records} selectedDay={selectedDay} onSelect={day => { setSelectedDay(day); onLoadNotifications(day); }} onSaved={onSaved} />
    {selectedRecord && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/20"><p className="font-bold">Day {selectedRecord.dayIndex} 점검</p><p className="mt-1 text-stone-600 dark:text-stone-300">발자국 시각은 현재 스키마에 저장되지 않아 기록되지 않음으로 표시합니다.</p><button onClick={() => onLoadNotifications(selectedRecord.dayIndex)} className="mt-2 rounded-lg bg-stone-800 px-3 py-1.5 font-bold text-white dark:bg-stone-200 dark:text-stone-900">관련 알림 새로 조회</button></div>}
    <div><h3 className="mb-2 font-bold">친구 관계 ({detail.friendships.length})</h3><div className="rounded-xl border border-stone-200 dark:border-stone-800">{detail.friendships.map((friend, index) => <div key={`${friend.user_id}-${friend.friend_id}-${index}`} className="flex justify-between gap-2 border-b border-stone-100 p-2 text-xs last:border-0 dark:border-stone-800"><span>{friend.other_name} · {friend.direction === "sent" ? "보냄" : friend.direction === "received" ? "받음" : "수락"} · {friend.status}</span><span className="text-stone-500">{formatDate(friend.created_at)}</span></div>)}</div></div>
    <div><h3 className="mb-2 font-bold">받은 아멘 ({detail.likes.length})</h3><div className="rounded-xl border border-stone-200 dark:border-stone-800">{detail.likes.filter((like) => selectedDay === null || like.dayIndex === selectedDay).map((like) => <div key={like.id} className="flex justify-between gap-2 border-b border-stone-100 p-2 text-xs last:border-0 dark:border-stone-800"><span>{like.likerName}{like.isSelfAmen ? " (자기 아멘)" : ""} · Day {like.dayIndex}</span><span className="text-stone-500">{formatDate(like.createdAt)}</span></div>)}</div></div>
    <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">관련 알림 ({notifications.length})</h3><span className="text-[11px] text-stone-400">수신자는 선택 사용자</span></div><form onSubmit={(event) => { event.preventDefault(); onLoadNotifications(selectedDay, { type: notificationType, isRead: notificationRead, actorId: notificationActor.trim(), from: notificationFrom, to: notificationTo }); }} className="mb-2 grid gap-2 sm:grid-cols-2"><select value={notificationType} onChange={(event) => setNotificationType(event.target.value)} className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs dark:border-stone-700 dark:bg-stone-950"><option value="">모든 알림 유형</option><option value="one_verse_liked">one_verse_liked</option><option value="one_verse_completed">one_verse_completed</option><option value="memorization_completed">memorization_completed</option><option value="friend_request">friend_request</option><option value="friend_request_accepted">friend_request_accepted</option><option value="reading_streak_achieved">reading_streak_achieved</option></select><select value={notificationRead} onChange={(event) => setNotificationRead(event.target.value)} className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs dark:border-stone-700 dark:bg-stone-950"><option value="">읽음 상태 전체</option><option value="false">미읽음</option><option value="true">읽음</option></select><input value={notificationActor} onChange={(event) => setNotificationActor(event.target.value)} placeholder="행동자 UUID" className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs dark:border-stone-700 dark:bg-stone-950" /><div className="flex gap-2"><input type="date" value={notificationFrom} onChange={(event) => setNotificationFrom(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs dark:border-stone-700 dark:bg-stone-950" /><input type="date" value={notificationTo} onChange={(event) => setNotificationTo(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs dark:border-stone-700 dark:bg-stone-950" /></div><button className="rounded-lg bg-stone-800 px-3 py-2 text-xs font-bold text-white dark:bg-stone-200 dark:text-stone-900 sm:col-span-2">알림 조회</button></form><div className="rounded-xl border border-stone-200 dark:border-stone-800">{notifications.map((notification) => <div key={notification.id} className="border-b border-stone-100 p-2 text-xs last:border-0 dark:border-stone-800"><div className="flex flex-wrap justify-between gap-2"><span className="font-bold">{notification.type} · Day {notification.related_day_index ?? "-"}</span><span className={notification.is_read ? "text-stone-400" : "text-amber-600"}>{notification.is_read ? `읽음 ${formatDate(notification.read_at)}` : "미읽음"}</span></div><p className="mt-1 text-stone-500">행동자: {notification.actor_name} · 생성 {formatDate(notification.created_at)}</p><p className="break-all font-mono text-[10px] text-stone-400">ID {notification.id} · {notification.actor_id || "행동자 없음"} · 수신자 {notification.recipient_id}</p><p className="break-all font-mono text-[10px] text-stone-400">{notification.event_key}</p></div>)}</div></div>
  </div>;
}
