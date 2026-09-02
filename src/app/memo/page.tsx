"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, CheckSquare, ChevronLeft, Copy, Footprints, X } from "lucide-react";
import { MemoData, fetchReadRecords, updateReadRecordOneVerse, DayRecord } from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";

const parseInitialMemo = (m: string | MemoData | undefined): MemoData => {
  if (!m) return {};
  if (typeof m === 'string') return { meditation: m };
  return m;
};

const formatReference = (book: string, chapter: number, verse: number) => {
  return book === "시편" ? `${book} ${chapter}편 ${verse}절` : `${book} ${chapter}장 ${verse}절`;
};

const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) return;
  textarea.style.height = "0px";
  textarea.style.height = `${textarea.scrollHeight}px`;
};

function MemoEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authUser, isAuthLoading } = useAuth();
  const dayIndexParam = searchParams.get("day");
  const modeParam = searchParams.get("mode");
  
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [record, setRecord] = useState<DayRecord | null>(null);
  
  const [mode, setMode] = useState<'view' | 'edit'>('edit');
  const [memoData, setMemoData] = useState<MemoData>({});
  
  const [thanksItems, setThanksItems] = useState<string[]>([]);
  const [appItems, setAppItems] = useState<{checked: boolean, text: string}[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for focusing inputs
  const thanksRefs = useRef<(HTMLInputElement | null)[]>([]);
  const appRefs = useRef<(HTMLInputElement | null)[]>([]);
  const meditationTextareaRef = useRef<HTMLTextAreaElement>(null);
  const prayerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isVerseDialogOpen, setIsVerseDialogOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const copyMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (mode !== 'edit') return;
    resizeTextarea(meditationTextareaRef.current);
    resizeTextarea(prayerTextareaRef.current);
  }, [memoData.meditation, memoData.prayer, mode]);

  useEffect(() => {
    const loadRecord = async () => {
      if (!dayIndexParam) {
        router.back();
        return;
      }
      
      const day = parseInt(dayIndexParam, 10);
      setDayIndex(day);
      
      if (isAuthLoading) return;
      const records = await fetchReadRecords(authUser?.id);
      const rec = records[day];
      
      if (!rec || !rec.oneVerse) {
        // If there's no record or one verse, we can't write a memo
        router.back();
        return;
      }
      
      setRecord(rec);
      
      const initialMemo = rec.oneVerse.memo;
      const md = parseInitialMemo(initialMemo);
      setMemoData(md);
      
      if (modeParam === 'view') {
        setMode('view');
      } else {
        setMode(Object.keys(md).length > 0 ? 'view' : 'edit');
      }
      
      const parsedThanks = (md.thanks || "").split('\n').filter(l => l.trim() !== '').map(l => l.replace(/^•\s*/, ''));
      setThanksItems(parsedThanks.length > 0 ? parsedThanks : [""]);
      
      if (md.application && md.application.length > 0) {
        setAppItems(md.application);
      } else {
        setAppItems([{ checked: false, text: "" }]);
      }
      
      setIsLoading(false);
    };
    
    loadRecord();
  }, [authUser, dayIndexParam, isAuthLoading, modeParam, router]);

  useEffect(() => () => {
    if (copyMessageTimeoutRef.current) clearTimeout(copyMessageTimeoutRef.current);
  }, []);

  if (isLoading || !record || dayIndex === null) {
    return (
      <div className="min-h-[100dvh] bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-3 text-stone-500">
        <Footprints className="animate-pulse w-8 h-8" />
        <span className="text-sm font-medium">발자국을 확인하는 중...</span>
      </div>
    );
  }

  const memoUpdatedAt = record.oneVerse?.memoUpdatedAt;
  const formattedDate = memoUpdatedAt 
    ? new Date(memoUpdatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')
    : new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalThanks = thanksItems.filter(t => t.trim() !== '').map(t => `• ${t}`).join('\n');
      const finalApp = appItems.filter(a => a.text.trim() !== '');
      
      const finalMemoData = { 
        ...memoData, 
        thanks: finalThanks,
        application: finalApp 
      };
      
      const updatedVerse = { ...record.oneVerse!, memo: finalMemoData, memoUpdatedAt: new Date().toISOString() };
      await updateReadRecordOneVerse(dayIndex, updatedVerse, authUser?.id);
      
      // Update global event for records so other pages reflect the change
      window.dispatchEvent(new Event('records_updated'));
      
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAppCheck = async (idx: number) => {
    if (mode === 'edit') {
      const newItems = [...appItems];
      newItems[idx].checked = !newItems[idx].checked;
      setAppItems(newItems);
    } else {
      if (!memoData.application) return;
      const newApp = [...memoData.application];
      newApp[idx].checked = !newApp[idx].checked;
      const newMemoData = { ...memoData, application: newApp };
      setMemoData(newMemoData);
      setAppItems(newApp);
      
      const updatedVerse = { ...record.oneVerse!, memo: newMemoData, memoUpdatedAt: new Date().toISOString() };
      await updateReadRecordOneVerse(dayIndex, updatedVerse, authUser?.id);
      window.dispatchEvent(new Event('records_updated'));
    }
  };

  // Thanks Handlers
  const handleThanksKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const newItems = [...thanksItems];
      newItems.splice(idx + 1, 0, "");
      setThanksItems(newItems);
      setTimeout(() => thanksRefs.current[idx + 1]?.focus(), 0);
    } else if (e.key === 'Backspace' && thanksItems[idx] === '') {
      e.preventDefault();
      if (thanksItems.length > 1) {
        const newItems = [...thanksItems];
        newItems.splice(idx, 1);
        setThanksItems(newItems);
        setTimeout(() => thanksRefs.current[idx - 1]?.focus(), 0);
      }
    }
  };

  const updateThanksItem = (idx: number, val: string) => {
    const newItems = [...thanksItems];
    newItems[idx] = val;
    setThanksItems(newItems);
  };

  // Application Handlers
  const handleAppKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const newItems = [...appItems];
      newItems.splice(idx + 1, 0, { checked: false, text: "" });
      setAppItems(newItems);
      setTimeout(() => appRefs.current[idx + 1]?.focus(), 0);
    } else if (e.key === 'Backspace' && appItems[idx].text === '') {
      e.preventDefault();
      if (appItems.length > 1) {
        const newItems = [...appItems];
        newItems.splice(idx, 1);
        setAppItems(newItems);
        setTimeout(() => appRefs.current[idx - 1]?.focus(), 0);
      }
    }
  };

  const updateAppItem = (idx: number, val: string) => {
    const newItems = [...appItems];
    newItems[idx].text = val;
    setAppItems(newItems);
  };

  const verseText = record.oneVerse!.displayText || record.oneVerse!.rawText;
  const verseRef = formatReference(record.oneVerse!.book, record.oneVerse!.chapter, record.oneVerse!.verse);
  const closeVerseDialog = () => {
    setIsVerseDialogOpen(false);
    requestAnimationFrame(() => lastFocusedElementRef.current?.focus());
  };

  const openVerseDialog = () => {
    lastFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsVerseDialogOpen(true);
  };

  const showCopyMessage = (message: string) => {
    if (copyMessageTimeoutRef.current) clearTimeout(copyMessageTimeoutRef.current);
    setCopyMessage(message);
    copyMessageTimeoutRef.current = setTimeout(() => setCopyMessage(null), 2500);
  };

  const copyVerse = async () => {
    const text = `${verseRef}\n${verseText}`;
    try {
      await navigator.clipboard.writeText(text);
      showCopyMessage("복사했어요.");
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        showCopyMessage(copied ? "복사했어요." : "복사하지 못했어요.");
      } catch {
        showCopyMessage("복사하지 못했어요.");
      }
    }
  };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-stone-900 flex flex-col relative w-full">
      {/* Sticky Header */}
      <div className="shrink-0 z-50 flex items-center justify-between p-4 border-b border-stone-800 bg-stone-900/90 backdrop-blur-md">
        <button 
          onClick={() => router.back()}
          className="text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={24} />
          <span className="text-sm font-medium">취소</span>
        </button>
        <h2 className="text-lg font-bold text-stone-100 absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <Footprints size={18} className="text-emerald-500" />
          {mode === 'view' ? '발자국 보기' : '발자국 남기기'}
        </h2>
        <div>
          {mode === 'view' ? (
            <button
              onClick={() => setMode('edit')}
              className="text-sky-400 hover:text-sky-300 transition-colors font-medium text-sm"
            >
              수정
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-sky-500 hover:text-sky-400 font-bold transition-colors disabled:opacity-50 text-sm"
            >
              {isSaving ? "저장 중" : "저장"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {verseText && verseRef && (
          <div className="mb-6 bg-stone-100 dark:bg-white/5 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
            <blockquote className="break-words text-[15px] leading-relaxed italic text-stone-800 dark:text-stone-200 sm:text-base mb-3">
              {verseText}
            </blockquote>
            <div className="text-right text-stone-500 dark:text-stone-400 font-bold text-xs">
              - {verseRef} -
            </div>
          </div>
        )}
        <div className="text-stone-400 text-xs mb-4 font-medium tracking-wide">
          작성일: {formattedDate}
        </div>

        {mode === 'view' ? (
          <div className="flex flex-col gap-6">
            {memoData.meditation && (
              <div className="flex flex-col gap-2">
                <h4 className="text-stone-400 text-xs font-semibold">묵상</h4>
                <p className="text-stone-200 text-[15px] leading-relaxed whitespace-pre-wrap">{memoData.meditation}</p>
              </div>
            )}
            {memoData.prayer && (
              <div className="flex flex-col gap-2">
                <h4 className="text-stone-400 text-xs font-semibold">기도</h4>
                <p className="text-stone-200 text-[15px] leading-relaxed whitespace-pre-wrap">{memoData.prayer}</p>
              </div>
            )}
            {memoData.thanks && (
              <div className="flex flex-col gap-2">
                <h4 className="text-stone-400 text-xs font-semibold">감사하기</h4>
                <p className="text-stone-200 text-[15px] leading-relaxed whitespace-pre-wrap pl-2">{memoData.thanks}</p>
              </div>
            )}
            {memoData.application && memoData.application.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-stone-400 text-xs font-semibold">삶에 적용하기</h4>
                <div className="flex flex-col gap-2 mt-1">
                  {memoData.application.map((item, idx) => (
                    <label key={idx} className="flex items-start gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={item.checked}
                        onChange={() => toggleAppCheck(idx)}
                        className="mt-1 w-4 h-4 accent-sky-500 bg-stone-800 border-stone-600 rounded cursor-pointer"
                      />
                      <span className={`text-[15px] leading-relaxed transition-colors ${item.checked ? 'text-stone-500 line-through' : 'text-stone-200'}`}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-10">
            <div className="flex flex-col gap-2">
              <h4 className="text-stone-400 text-xs font-semibold">묵상</h4>
              <textarea
                ref={meditationTextareaRef}
                value={memoData.meditation || ""}
                onChange={e => setMemoData({...memoData, meditation: e.target.value})}
                onInput={e => resizeTextarea(e.currentTarget)}
                placeholder="이 말씀이 마음에 와닿은 이유는 무엇인가요?"
                className="w-full bg-transparent text-[15px] text-stone-200 placeholder-stone-600 focus:outline-none resize-none overflow-y-hidden min-h-[100px] leading-relaxed"
              />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-stone-400 text-xs font-semibold">기도</h4>
              <textarea
                ref={prayerTextareaRef}
                value={memoData.prayer || ""}
                onChange={e => setMemoData({...memoData, prayer: e.target.value})}
                onInput={e => resizeTextarea(e.currentTarget)}
                placeholder="말씀을 통해 깨달은 기도를 적어보세요."
                className="w-full bg-transparent text-[15px] text-stone-200 placeholder-stone-600 focus:outline-none resize-none overflow-y-hidden min-h-[100px] leading-relaxed"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <h4 className="text-stone-400 text-xs font-semibold">감사하기</h4>
              <div className="flex flex-col gap-1">
                {thanksItems.map((val, idx) => (
                  <div key={idx} className="flex items-start gap-2 group">
                    <span className="text-stone-500 mt-1 select-none flex-shrink-0 text-[10px] sm:text-xs">●</span>
                    <input
                      ref={el => { thanksRefs.current[idx] = el; }}
                      value={val}
                      onChange={e => updateThanksItem(idx, e.target.value)}
                      onKeyDown={e => handleThanksKeyDown(e, idx)}
                      placeholder="오늘 하루 감사한 일은 무엇인가요?"
                      className="w-full bg-transparent text-[15px] text-stone-200 placeholder-stone-600 focus:outline-none leading-relaxed py-0.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-stone-400 text-xs font-semibold">삶에 적용하기</h4>
              <div className="flex flex-col gap-1">
                {appItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 group">
                    <div className="mt-1 flex-shrink-0 cursor-pointer" onClick={() => toggleAppCheck(idx)}>
                      {item.checked ? (
                        <div className="w-4 h-4 bg-sky-500 rounded border border-sky-500 flex items-center justify-center">
                          <CheckSquare size={12} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 bg-stone-800 rounded border border-stone-600"></div>
                      )}
                    </div>
                    <input
                      ref={el => { appRefs.current[idx] = el; }}
                      value={item.text}
                      onChange={e => updateAppItem(idx, e.target.value)}
                      onKeyDown={e => handleAppKeyDown(e, idx)}
                      placeholder="오늘 실천할 내용을 적어보세요."
                      className={`w-full bg-transparent text-[15px] placeholder-stone-600 focus:outline-none leading-relaxed py-0.5 transition-colors ${item.checked ? 'text-stone-500 line-through' : 'text-stone-200'}`}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      <button
        type="button"
        onClick={openVerseDialog}
        aria-label="One Verse 보기"
        title="One Verse 보기"
        className="fixed right-1 top-[calc(env(safe-area-inset-top)+4.25rem)] z-40 flex h-11 w-11 items-center justify-center rounded-full p-1.5 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950"
      >
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-colors hover:bg-emerald-700">
          <BookOpen size={16} />
        </span>
      </button>

      {isVerseDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="One Verse 보기">
          <div className="flex w-full max-w-lg flex-col rounded-2xl bg-stone-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4">
              <div>
                <p className="text-xs font-bold text-emerald-400">오늘의 One Verse</p>
                <h3 className="mt-0.5 text-base font-bold text-stone-100">{verseRef}</h3>
              </div>
              <button type="button" onClick={closeVerseDialog} aria-label="말씀 팝업 닫기" className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"><X size={20} /></button>
            </div>
            <div className="max-h-[60dvh] overflow-y-auto px-5 py-5">
              <blockquote className="break-words text-base leading-relaxed text-stone-100 sm:text-lg">{verseText}</blockquote>
            </div>
            <div className="border-t border-stone-800 p-4">
              <button type="button" onClick={copyVerse} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-800 py-3 text-sm font-bold text-stone-100 transition-colors hover:bg-stone-700"><Copy size={16} />말씀 복사하기</button>
            </div>
          </div>
        </div>
      )}

      {copyMessage && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-stone-100 px-4 py-2 text-sm font-bold text-stone-900 shadow-lg dark:bg-stone-800 dark:text-stone-100">{copyMessage}</div>
      )}
    </div>
  );
}

export default function MemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-3 text-stone-500">
        <Footprints className="animate-pulse w-8 h-8" />
        <span className="text-sm font-medium">발자국을 확인하는 중...</span>
      </div>
    }>
      <MemoEditorContent />
    </Suspense>
  );
}
