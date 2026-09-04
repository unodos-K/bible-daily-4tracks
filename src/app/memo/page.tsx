"use client";

import React, { useEffect, useLayoutEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckSquare, ChevronLeft, Copy, Footprints, Plus } from "lucide-react";
import { MemoData, fetchOneVerseRecord, OneVerseRecord, updateReadRecordOneVerse } from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";

type MemoSection = "meditation" | "prayer" | "thanks" | "application";

const SECTION_INFO: Record<MemoSection, { title: string; placeholder: string }> = {
  meditation: { title: "묵상", placeholder: "이 말씀이 마음에 와닿은 이유는 무엇인가요?" },
  prayer: { title: "기도", placeholder: "말씀을 통해 깨달은 기도를 적어보세요." },
  thanks: { title: "감사하기", placeholder: "오늘 하루 감사한 일을 적어보세요." },
  application: { title: "삶에 적용하기", placeholder: "오늘 실천할 내용을 적어보세요." },
};

const parseInitialMemo = (memo: string | MemoData | undefined): MemoData => {
  if (!memo) return {};
  return typeof memo === "string" ? { meditation: memo } : memo;
};

const formatReference = (book: string, chapter: number, verse: number) => (
  book === "시편" ? `${book} ${chapter}편 ${verse}절` : `${book} ${chapter}장 ${verse}절`
);

const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) return;
  textarea.style.height = "0px";
  textarea.style.height = `${textarea.scrollHeight}px`;
};

const parseThanks = (thanks?: string) => (
  (thanks || "").split("\n").filter((item) => item.trim() !== "").map((item) => item.replace(/^•\s*/, ""))
);

function MemoEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authUser, isAuthLoading } = useAuth();
  const dayIndexParam = searchParams.get("day");

  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [record, setRecord] = useState<OneVerseRecord | null>(null);
  const [memoData, setMemoData] = useState<MemoData>({});
  const [thanksItems, setThanksItems] = useState<string[]>([""]);
  const [appItems, setAppItems] = useState<{ checked: boolean; text: string }[]>([{ checked: false, text: "" }]);
  const [activeSection, setActiveSection] = useState<MemoSection | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const thanksRefs = useRef<(HTMLInputElement | null)[]>([]);
  const appRefs = useRef<(HTMLInputElement | null)[]>([]);
  const copyMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    const loadRecord = async () => {
      if (!dayIndexParam) {
        router.back();
        return;
      }

      const day = Number(dayIndexParam);
      if (!Number.isInteger(day) || day < 1) {
        router.back();
        return;
      }

      try {
        const nextRecord = await fetchOneVerseRecord(day, authUser?.id);
        if (!nextRecord) {
          router.back();
          return;
        }

        const initialMemo = parseInitialMemo(nextRecord.oneVerse.memo);
        const initialThanks = parseThanks(initialMemo.thanks);
        setDayIndex(day);
        setRecord(nextRecord);
        setMemoData(initialMemo);
        setThanksItems(initialThanks.length > 0 ? initialThanks : [""]);
        setAppItems(initialMemo.application?.length ? initialMemo.application : [{ checked: false, text: "" }]);
      } catch (error) {
        console.error("Failed to load footprint:", error);
        setErrorMessage("발자국을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadRecord();
  }, [authUser, dayIndexParam, isAuthLoading, router]);

  useLayoutEffect(() => {
    if (activeSection === "meditation" || activeSection === "prayer") {
      resizeTextarea(textAreaRef.current);
    }
  }, [activeSection, memoData.meditation, memoData.prayer]);

  useEffect(() => () => {
    if (copyMessageTimeoutRef.current) clearTimeout(copyMessageTimeoutRef.current);
  }, []);

  if (isLoading || !record || dayIndex === null) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-stone-950 text-stone-500">
        <Footprints className="h-8 w-8 animate-pulse" />
        <span className="text-sm font-medium">발자국을 확인하는 중...</span>
      </div>
    );
  }

  const verse = record.oneVerse;
  const verseText = verse.displayText || verse.rawText;
  const verseRef = formatReference(verse.book, verse.chapter, verse.verse);
  const formattedDate = verse.memoUpdatedAt
    ? new Date(verse.memoUpdatedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "")
    : new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");

  const buildMemoData = (): MemoData => ({
    ...memoData,
    thanks: thanksItems.filter((item) => item.trim() !== "").map((item) => `• ${item}`).join("\n"),
    application: appItems.filter((item) => item.text.trim() !== ""),
  });

  const isSectionWritten = (section: MemoSection) => {
    if (section === "meditation" || section === "prayer") return Boolean(memoData[section]?.trim());
    if (section === "thanks") return thanksItems.some((item) => item.trim());
    return appItems.some((item) => item.text.trim());
  };

  const sectionPreview = (section: MemoSection) => {
    if (section === "meditation" || section === "prayer") return memoData[section]?.trim();
    if (section === "thanks") return thanksItems.find((item) => item.trim());
    return appItems.find((item) => item.text.trim())?.text;
  };

  const restoreSavedMemo = () => {
    const savedMemo = parseInitialMemo(record.oneVerse.memo);
    const savedThanks = parseThanks(savedMemo.thanks);
    setMemoData(savedMemo);
    setThanksItems(savedThanks.length > 0 ? savedThanks : [""]);
    setAppItems(savedMemo.application?.length ? savedMemo.application : [{ checked: false, text: "" }]);
  };

  const openSection = (section: MemoSection) => {
    setErrorMessage(null);
    setIsDirty(false);
    setActiveSection(section);
  };

  const returnToOverview = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    setActiveSection(null);
  };

  const closeEditor = () => {
    if (activeSection) {
      returnToOverview();
      return;
    }
    router.back();
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
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      showCopyMessage(copied ? "복사했어요." : "복사하지 못했어요.");
    }
  };

  const saveSection = async () => {
    const nextMemoData = buildMemoData();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updatedVerse = { ...verse, memo: nextMemoData, memoUpdatedAt: new Date().toISOString() };
      const success = await updateReadRecordOneVerse(dayIndex, updatedVerse, authUser?.id);
      if (!success) {
        setErrorMessage("저장하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
        return;
      }
      setRecord((current) => current ? { ...current, oneVerse: updatedVerse } : current);
      setMemoData(nextMemoData);
      setIsDirty(false);
      setActiveSection(null);
    } finally {
      setIsSaving(false);
    }
  };

  const updateThanks = (index: number, value: string) => {
    setThanksItems((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
    setIsDirty(true);
  };

  const updateApplication = (index: number, patch: Partial<{ checked: boolean; text: string }>) => {
    setAppItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    setIsDirty(true);
  };

  const handleThanksKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.nativeEvent.isComposing || event.key !== "Enter") return;
    event.preventDefault();
    setThanksItems((current) => [...current.slice(0, index + 1), "", ...current.slice(index + 1)]);
    setIsDirty(true);
    setTimeout(() => thanksRefs.current[index + 1]?.focus(), 0);
  };

  const handleApplicationKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.nativeEvent.isComposing || event.key !== "Enter") return;
    event.preventDefault();
    setAppItems((current) => [...current.slice(0, index + 1), { checked: false, text: "" }, ...current.slice(index + 1)]);
    setIsDirty(true);
    setTimeout(() => appRefs.current[index + 1]?.focus(), 0);
  };

  const renderSectionInput = () => {
    if (!activeSection) return null;
    if (activeSection === "meditation" || activeSection === "prayer") {
      return <textarea ref={textAreaRef} value={memoData[activeSection] || ""} onChange={(event) => { setMemoData((current) => ({ ...current, [activeSection]: event.target.value })); setIsDirty(true); }} onInput={(event) => resizeTextarea(event.currentTarget)} placeholder={SECTION_INFO[activeSection].placeholder} className="min-h-[11rem] w-full resize-none overflow-y-hidden rounded-xl border border-stone-700 bg-stone-800/60 px-4 py-3 text-[15px] leading-relaxed text-stone-100 placeholder-stone-500 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" />;
    }
    if (activeSection === "thanks") {
      return <div className="flex flex-col gap-3">
        {thanksItems.map((item, index) => <div key={index} className="flex items-start gap-2 rounded-xl border border-stone-700 bg-stone-800/60 px-3 py-2"><span className="mt-1.5 text-xs text-emerald-400">●</span><input ref={(element) => { thanksRefs.current[index] = element; }} value={item} onChange={(event) => updateThanks(index, event.target.value)} onKeyDown={(event) => handleThanksKeyDown(event, index)} placeholder={SECTION_INFO.thanks.placeholder} className="min-w-0 flex-1 bg-transparent py-1 text-[15px] leading-relaxed text-stone-100 placeholder-stone-500 outline-none" /></div>)}
        <button type="button" onClick={() => { setThanksItems((current) => [...current, ""]); setIsDirty(true); }} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-dashed border-stone-600 text-sm font-bold text-stone-300 transition-colors hover:border-sky-500 hover:text-sky-300"><Plus size={16} />감사 항목 추가</button>
      </div>;
    }
    return <div className="flex flex-col gap-3">
      {appItems.map((item, index) => <div key={index} className="flex items-start gap-2 rounded-xl border border-stone-700 bg-stone-800/60 px-3 py-2"><button type="button" aria-label="적용 완료 표시" onClick={() => updateApplication(index, { checked: !item.checked })} className="mt-1 rounded p-0.5 text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{item.checked ? <CheckSquare size={18} /> : <span className="block h-[18px] w-[18px] rounded border border-stone-500" />}</button><input ref={(element) => { appRefs.current[index] = element; }} value={item.text} onChange={(event) => updateApplication(index, { text: event.target.value })} onKeyDown={(event) => handleApplicationKeyDown(event, index)} placeholder={SECTION_INFO.application.placeholder} className={`min-w-0 flex-1 bg-transparent py-1 text-[15px] leading-relaxed placeholder-stone-500 outline-none ${item.checked ? "text-stone-500 line-through" : "text-stone-100"}`} /></div>)}
      <button type="button" onClick={() => { setAppItems((current) => [...current, { checked: false, text: "" }]); setIsDirty(true); }} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-dashed border-stone-600 text-sm font-bold text-stone-300 transition-colors hover:border-sky-500 hover:text-sky-300"><Plus size={16} />적용 항목 추가</button>
    </div>;
  };

  return <div data-v2-memo className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-stone-950 text-stone-100">
    <header data-v2-memo-header className="relative z-20 flex shrink-0 items-center justify-between border-b border-stone-800 bg-stone-900/95 px-4 py-4 backdrop-blur-md"><button type="button" onClick={closeEditor} className="flex min-h-11 items-center gap-1 rounded-lg px-1 text-stone-400 transition-colors hover:text-stone-100">{activeSection ? <ArrowLeft size={21} /> : <ChevronLeft size={24} />}<span className="text-sm font-medium">{activeSection ? "목록" : "닫기"}</span></button><h1 className="absolute left-1/2 -translate-x-1/2 text-base font-bold"><Footprints className="mr-1 inline h-4 w-4 text-emerald-500" />발자국 남기기</h1><span className="w-16 text-right text-xs font-medium text-stone-500">{activeSection ? SECTION_INFO[activeSection].title : ""}</span></header>

    {activeSection ? <>
      <section data-v2-memo-verse className="shrink-0 border-b border-stone-800 bg-stone-900 px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-emerald-400">오늘의 One Verse</p><p className="mt-0.5 text-sm font-bold text-stone-200">{verseRef}</p></div><button type="button" onClick={copyVerse} className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"><Copy size={15} />복사</button></div><blockquote className="mt-2 max-h-[30dvh] overflow-y-auto break-words pr-1 text-sm leading-relaxed text-stone-200">{verseText}</blockquote></section>
      <main data-v2-memo-editor className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))]"><h2 className="mb-4 text-lg font-bold text-stone-100">{SECTION_INFO[activeSection].title}</h2>{renderSectionInput()}{errorMessage && <p role="alert" className="mt-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{errorMessage}</p>}<button type="button" onClick={saveSection} disabled={isSaving} className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50">{isSaving ? "저장 중..." : `${SECTION_INFO[activeSection].title} 저장`}</button></main>
    </> : <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 pb-[calc(2rem+env(safe-area-inset-bottom))]"><section data-v2-memo-verse className="rounded-2xl border border-stone-800 bg-stone-900 p-4"><p className="text-xs font-bold text-emerald-400">오늘의 One Verse</p><h2 className="mt-1 text-base font-bold text-stone-100">{verseRef}</h2><p className="mt-2 line-clamp-3 break-words text-sm leading-relaxed text-stone-300">{verseText}</p></section><p className="mb-3 mt-5 text-sm text-stone-400">작성할 항목을 선택해 주세요. 각 항목은 따로 저장됩니다.</p><div className="flex flex-col gap-3">{(Object.keys(SECTION_INFO) as MemoSection[]).map((section) => { const written = isSectionWritten(section); const preview = sectionPreview(section); return <button data-v2-memo-entry type="button" key={section} onClick={() => openSection(section)} className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-stone-800 bg-stone-900 px-4 py-3 text-left transition-colors hover:border-sky-700 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"><span className="min-w-0"><span className="block font-bold text-stone-100">{SECTION_INFO[section].title}</span><span className="mt-1 block truncate text-sm text-stone-400">{written ? preview : SECTION_INFO[section].placeholder}</span></span><span data-v2-memo-status className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${written ? "bg-emerald-900/50 text-emerald-300" : "bg-stone-800 text-stone-400"}`}>{written ? "작성됨" : "작성하기"}</span></button>; })}</div><p className="mt-5 text-center text-xs text-stone-500">마지막 수정: {formattedDate}</p></main>}

    {showDiscardConfirm && <div data-v2-memo-dialog className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="작성 내용 취소 확인"><div className="w-full max-w-sm rounded-2xl bg-stone-900 p-6 shadow-2xl"><h2 className="text-lg font-bold text-stone-100">작성 중인 내용을 버릴까요?</h2><p className="mt-3 text-sm leading-relaxed text-stone-400">저장하지 않은 변경사항은 사라집니다.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setShowDiscardConfirm(false)} className="min-h-11 flex-1 rounded-xl bg-stone-800 font-bold text-stone-200">계속 작성</button><button type="button" onClick={() => { restoreSavedMemo(); setShowDiscardConfirm(false); setIsDirty(false); setActiveSection(null); }} className="min-h-11 flex-1 rounded-xl bg-amber-600 font-bold text-white">버리기</button></div></div></div>}
    {copyMessage && <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-stone-100 px-4 py-2 text-sm font-bold text-stone-900 shadow-lg">{copyMessage}</div>}
  </div>;
}

export default function MemoPage() {
  return <Suspense fallback={<div className="flex min-h-[100dvh] items-center justify-center bg-stone-950 text-stone-500">발자국을 확인하는 중...</div>}><MemoEditorContent /></Suspense>;
}
