"use client";

import { useEffect, useRef, useState } from 'react';
import { kstInput } from '@/lib/admin-record-dates';

export type EditableRecord = {
  dayIndex: number; readDate: string; completedAt: string | null; hasOneVerse: boolean;
  verseLocation: { book: string | null; chapter: string | null; verse: string | null } | null;
  isMemorized: boolean; memorizedAt: string | null; memorizedMethods: string[];
  hasFootprint: boolean;
};
type SavedRecord = { success: boolean; userId: string; dayIndex: number; values: { read_date: string; completed_at: string | null } };
const stamp = (value: string | null) => !value ? '기록되지 않음' : Number.isFinite(Date.parse(value)) ? `${kstInput(value).replace('T', ' ')} KST` : '유효하지 않은 저장 시각';

export default function AdminReadingRecords({ userId, startDate, records, selectedDay, onSelect, onSaved }: {
  userId: string; startDate?: string; records: EditableRecord[]; selectedDay: number | null;
  onSelect: (day: number) => void; onSaved: (result: SavedRecord) => void;
}) {
  const [edit, setEdit] = useState<{ record: EditableRecord; action: 'complete' | 'dates' } | null>(null);
  const [notice, setNotice] = useState('');
  return <section className="min-w-0 space-y-3" aria-label="읽기 기록 및 One Verse">
    <h3 className="font-bold">읽기 기록 및 One Verse</h3>
    <p className="text-sm text-stone-500">전체 {records.length}개 기록 · 읽기 완료 {records.filter(record => !!record.completedAt).length}일</p>
    {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
    {records.length === 0 && <p className="text-sm text-stone-500">기록이 없습니다.</p>}
    {records.map(record => <article key={record.dayIndex} className={`min-w-0 rounded-xl border p-4 ${selectedDay === record.dayIndex ? 'border-sky-300 bg-sky-50 dark:bg-sky-950/20' : 'border-stone-200 dark:border-stone-700'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-bold">Day {record.dayIndex} · {record.completedAt ? '읽기 완료' : '미완료'}</h4>
        <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={() => onSelect(record.dayIndex)} className="rounded-lg border px-3 py-2">아멘·알림 조회</button>
          <button type="button" onClick={() => setEdit({ record, action: 'dates' })} className="rounded-lg border px-3 py-2">날짜 수정</button>
          {record.hasOneVerse && !record.completedAt && <button type="button" onClick={() => setEdit({ record, action: 'complete' })} className="rounded-lg bg-amber-100 px-3 py-2 font-bold text-amber-900">읽기 완료 처리</button>}
        </div>
      </div>
      <p className="mt-3 break-words text-sm">{record.hasOneVerse ? `${record.verseLocation?.book ?? ''} ${record.verseLocation?.chapter ?? ''}:${record.verseLocation?.verse ?? ''}` : 'One Verse 없음'}</p>
      <dl className="mt-3 grid min-w-0 gap-2 text-xs text-stone-600 dark:text-stone-300 sm:grid-cols-2">
        <div><dt>읽은 날짜 (read_date)</dt><dd>{record.readDate}</dd></div>
        <div><dt>읽기 완료 시각 (completed_at)</dt><dd>{stamp(record.completedAt)}</dd></div>
        <div><dt>DB 기록 생성 시각</dt><dd>기록되지 않음 (현재 스키마에 필드 없음)</dd></div>
        <div><dt>마음새김 시각 (memorizedAt)</dt><dd>{stamp(record.memorizedAt)}</dd></div>
        <div><dt>마음새김</dt><dd>{record.isMemorized ? record.memorizedMethods.join(', ') || '완료' : '미완료'}</dd></div>
        <div><dt>발자국</dt><dd>{record.hasFootprint ? '작성됨' : '없음'} · 작성 시각 기록되지 않음</dd></div>
      </dl>
    </article>)}
    {edit && <RecordDateDialog key={`${userId}-${edit.record.dayIndex}-${edit.action}`} userId={userId} startDate={startDate} record={edit.record} action={edit.action}
      onClose={() => setEdit(null)} onSaved={result => { setEdit(null); setNotice(`Day ${result.dayIndex} 기록을 저장했습니다.`); onSaved(result); }} />}
  </section>;
}

function RecordDateDialog({ userId, startDate, record, action, onClose, onSaved }: {
  userId: string; startDate?: string; record: EditableRecord; action: 'complete' | 'dates';
  onClose: () => void; onSaved: (result: SavedRecord) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  const initial = action === 'complete' ? kstInput() : record.completedAt ? kstInput(record.completedAt) : '';
  const [readDate, setReadDate] = useState(record.readDate);
  const [date, setDate] = useState(initial.slice(0, 10));
  const [time, setTime] = useState(initial.slice(11));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = previous; previousFocus?.focus({ preventScroll: true }); };
  }, []);
  const submit = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    const payload = { userId, dayIndex: record.dayIndex, action, readDate, completedDate: date, completedTime: time,
      expectedReadDate: record.readDate, expectedCompletedAt: record.completedAt };
    const serialized = JSON.stringify(payload);
    if (attempt.current?.payload !== serialized) attempt.current = { payload: serialized, id: crypto.randomUUID() };
    try {
      const response = await fetch('/api/admin/records', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId: attempt.current!.id }), cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || '저장하지 못했습니다. 다시 시도해 주세요.');
      onSaved(result);
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했습니다.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <dialog ref={dialog} aria-labelledby="record-date-title" onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }}
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-stone-900 shadow-xl backdrop:bg-black/40 dark:bg-stone-900 dark:text-stone-100">
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-4">
      <h2 id="record-date-title" className="text-lg font-bold">Day {record.dayIndex} {action === 'complete' ? '읽기 완료 처리' : '날짜 수정'}</h2>
      <p className="text-sm text-stone-500">모든 날짜·시간은 한국 시간(Asia/Seoul)입니다. 이 기록의 날짜만 수정하며 변경 이력을 저장합니다.</p>
      <p className="break-all text-xs text-stone-500">대상 사용자: {userId}</p>
      <fieldset disabled={saving} className="space-y-3">
        <label className="block text-sm">읽은 날짜<input type="date" required value={readDate} disabled={action === 'complete'} min={startDate} max={kstInput().slice(0, 10)} onChange={e => setReadDate(e.target.value)} className="mt-1 block w-full min-w-0 rounded-lg border bg-transparent p-2 disabled:opacity-60" /></label>
        <label className="block text-sm">완료 날짜<input type="date" value={date} min={startDate} max={kstInput().slice(0, 10)} required={!!record.completedAt || !!time} onChange={e => setDate(e.target.value)} className="mt-1 block w-full min-w-0 rounded-lg border bg-transparent p-2" /></label>
        <label className="block text-sm">완료 시간<input type="time" step="1" value={time} required={!!date} onChange={e => setTime(e.target.value)} className="mt-1 block w-full min-w-0 rounded-lg border bg-transparent p-2" /></label>
      </fieldset>
      {action === 'complete' && <p className="text-xs text-stone-500">완료 날짜와 시간을 모두 비우면 서버의 현재 시각으로 처리합니다.</p>}
      <p className="text-xs text-stone-500">보정 완료는 사용자의 오늘 활동으로 새로 집계하지 않습니다. 알림은 발송하지 않습니다.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border px-4 py-2">취소</button><button type="submit" disabled={saving} className="rounded-lg bg-stone-800 px-4 py-2 text-white disabled:opacity-50">{saving ? '저장 중…' : '확인 후 저장'}</button></div>
    </form>
  </dialog>;
}
