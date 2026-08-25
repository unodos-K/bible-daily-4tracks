"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, PencilLine, Share2, CheckSquare, ChevronLeft } from "lucide-react";
import { MemoData, fetchReadRecords, updateReadRecordOneVerse, DayRecord } from "@/lib/storage";

const parseInitialMemo = (m: string | MemoData | undefined): MemoData => {
  if (!m) return {};
  if (typeof m === 'string') return { meditation: m };
  return m;
};

const formatReference = (book: string, chapter: number, verse: number) => {
  return book === "시편" ? `${book} ${chapter}편 ${verse}절` : `${book} ${chapter}장 ${verse}절`;
};

function MemoEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const loadRecord = async () => {
      if (!dayIndexParam) {
        router.back();
        return;
      }
      
      const day = parseInt(dayIndexParam, 10);
      setDayIndex(day);
      
      const records = await fetchReadRecords();
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
  }, [dayIndexParam, modeParam, router]);

  if (isLoading || !record || dayIndex === null) {
    return <div className="min-h-[100dvh] bg-stone-50 dark:bg-stone-950 flex justify-center items-center">Loading...</div>;
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
      await updateReadRecordOneVerse(dayIndex, updatedVerse);
      
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
      await updateReadRecordOneVerse(dayIndex, updatedVerse);
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

  return (
    <div className="min-h-[100dvh] bg-stone-900 flex flex-col relative w-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 border-b border-stone-800 bg-stone-900/90 backdrop-blur-md">
        <button 
          onClick={() => router.back()}
          className="text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={24} />
          <span className="text-sm font-medium">취소</span>
        </button>
        <h2 className="text-lg font-bold text-stone-100 absolute left-1/2 -translate-x-1/2">
          {mode === 'view' ? '묵상 노트' : '노트 작성'}
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
      <div className="p-5 flex flex-col flex-1 pb-24">
        {verseText && verseRef && (
          <div className="mb-6 bg-stone-100 dark:bg-white/5 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
            <blockquote className="text-[15px] sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed italic break-keep mb-3">
              "{verseText}"
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
                value={memoData.meditation || ""}
                onChange={e => setMemoData({...memoData, meditation: e.target.value})}
                placeholder="이 말씀이 마음에 와닿은 이유는 무엇인가요?"
                className="w-full bg-transparent text-[15px] text-stone-200 placeholder-stone-600 focus:outline-none resize-none min-h-[100px] leading-relaxed"
              />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-stone-400 text-xs font-semibold">기도</h4>
              <textarea
                value={memoData.prayer || ""}
                onChange={e => setMemoData({...memoData, prayer: e.target.value})}
                placeholder="말씀을 통해 깨달은 기도를 적어보세요."
                className="w-full bg-transparent text-[15px] text-stone-200 placeholder-stone-600 focus:outline-none resize-none min-h-[100px] leading-relaxed"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <h4 className="text-stone-400 text-xs font-semibold">감사하기</h4>
              <div className="flex flex-col gap-1">
                {thanksItems.map((val, idx) => (
                  <div key={idx} className="flex items-start gap-2 group">
                    <span className="text-stone-500 mt-1 select-none flex-shrink-0 text-[10px] sm:text-xs">●</span>
                    <input
                      ref={el => thanksRefs.current[idx] = el}
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
                      ref={el => appRefs.current[idx] = el}
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
    <Suspense fallback={<div className="min-h-[100dvh] bg-stone-50 dark:bg-stone-950 flex justify-center items-center">Loading...</div>}>
      <MemoEditorContent />
    </Suspense>
  );
}
