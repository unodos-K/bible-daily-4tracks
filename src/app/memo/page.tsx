"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckSquare, ChevronLeft, Footprints } from "lucide-react";
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
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const oneVerseRef = useRef<HTMLDivElement>(null);
  const memoHeaderRef = useRef<HTMLDivElement>(null);
  const writingFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isWritingFocused, setIsWritingFocused] = useState(false);
  const [isOriginalOneVerseVisible, setIsOriginalOneVerseVisible] = useState(true);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [memoHeaderHeight, setMemoHeaderHeight] = useState(0);
  const [visualViewportTop, setVisualViewportTop] = useState(0);

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

  useEffect(() => {
    const scrollContainer = editorScrollRef.current;
    const oneVerseElement = oneVerseRef.current;
    if (!scrollContainer || !oneVerseElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsOriginalOneVerseVisible(entry.isIntersecting),
      { root: scrollContainer, threshold: 0 },
    );
    observer.observe(oneVerseElement);

    return () => observer.disconnect();
  }, [record?.oneVerse?.reference, record?.oneVerse?.displayText, record?.oneVerse?.rawText]);

  useEffect(() => () => {
    if (writingFocusTimeoutRef.current) clearTimeout(writingFocusTimeoutRef.current);
  }, []);

  useEffect(() => {
    const header = memoHeaderRef.current;
    if (!header) return;

    const updateHeight = () => setMemoHeaderHeight(header.getBoundingClientRect().height);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isLoading, mode]);

  useEffect(() => {
    if (!isWritingFocused) {
      setVisualViewportTop(0);
      setIsPreviewExpanded(false);
      return;
    }

    const viewport = window.visualViewport;
    const updateViewportTop = () => setVisualViewportTop(viewport?.offsetTop ?? 0);
    updateViewportTop();

    viewport?.addEventListener("resize", updateViewportTop);
    viewport?.addEventListener("scroll", updateViewportTop);
    window.addEventListener("resize", updateViewportTop);
    return () => {
      viewport?.removeEventListener("resize", updateViewportTop);
      viewport?.removeEventListener("scroll", updateViewportTop);
      window.removeEventListener("resize", updateViewportTop);
    };
  }, [isWritingFocused]);

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
  const shouldShowOneVersePreview = isWritingFocused || !isOriginalOneVerseVisible;
  const canExpandPreview = verseText.length > 120;

  const isWritingInput = (target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement =>
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  const handleEditorFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!isWritingInput(event.target)) return;
    if (writingFocusTimeoutRef.current) clearTimeout(writingFocusTimeoutRef.current);
    setIsWritingFocused(true);
  };

  const handleEditorBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!isWritingInput(event.target)) return;
    if (writingFocusTimeoutRef.current) clearTimeout(writingFocusTimeoutRef.current);

    const nextTarget = event.relatedTarget;
    if (isWritingInput(nextTarget) && editorScrollRef.current?.contains(nextTarget)) return;

    writingFocusTimeoutRef.current = setTimeout(() => {
      const activeElement = document.activeElement;
      setIsWritingFocused(Boolean(isWritingInput(activeElement) && editorScrollRef.current?.contains(activeElement)));
    }, 0);
  };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-stone-900 flex flex-col relative w-full">
      {/* Sticky Header */}
      <div ref={memoHeaderRef} className="shrink-0 z-50 flex items-center justify-between p-4 border-b border-stone-800 bg-stone-900/90 backdrop-blur-md">
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

      {shouldShowOneVersePreview && verseText && (
        <div
          role="region"
          aria-label="현재 묵상 중인 One Verse"
          style={isWritingFocused ? { top: `${visualViewportTop + memoHeaderHeight}px` } : undefined}
          className={isWritingFocused
            ? "fixed left-1/2 z-40 w-full max-w-2xl -translate-x-1/2 border-b border-stone-800 bg-stone-900/90 px-5 py-2.5 shadow-lg backdrop-blur-md"
            : "shrink-0 z-40 border-b border-stone-800 bg-stone-900/85 px-5 py-2.5 backdrop-blur-md"}
        >
          <p className="mb-1 text-xs font-bold text-emerald-400">{verseRef}</p>
          <p className={`break-words text-[13px] font-medium leading-5 text-stone-200 ${isWritingFocused && !isPreviewExpanded ? "line-clamp-3" : ""}`}>{verseText}</p>
          {isWritingFocused && canExpandPreview && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsPreviewExpanded((expanded) => !expanded)}
              className="mt-1.5 text-xs font-bold text-emerald-400 underline underline-offset-2"
            >
              {isPreviewExpanded ? "접기" : "말씀 전체 보기"}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div
        ref={editorScrollRef}
        onFocusCapture={handleEditorFocusCapture}
        onBlurCapture={handleEditorBlurCapture}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-5 pb-[calc(6rem+env(safe-area-inset-bottom))]"
      >
        {verseText && verseRef && (
          <div ref={oneVerseRef} className="mb-6 bg-stone-100 dark:bg-white/5 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
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
