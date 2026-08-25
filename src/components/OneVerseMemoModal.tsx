import React, { useState, useEffect, useRef } from "react";
import { X, PencilLine, Share2, CheckSquare, Circle } from "lucide-react";
import { MemoData } from "@/lib/storage";

interface OneVerseMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayIndex: number;
  initialMemo: string | MemoData | undefined;
  memoUpdatedAt?: string;
  onSave: (dayIndex: number, newMemo: MemoData) => Promise<void>;
  onShare?: () => void;
  initialMode?: 'view' | 'edit';
}

const parseInitialMemo = (m: string | MemoData | undefined): MemoData => {
  if (!m) return {};
  if (typeof m === 'string') return { meditation: m };
  return m;
};

export default function OneVerseMemoModal({ 
  isOpen, 
  onClose, 
  dayIndex, 
  initialMemo, 
  memoUpdatedAt, 
  onSave,
  onShare,
  initialMode
}: OneVerseMemoModalProps) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode || (initialMemo ? 'view' : 'edit'));
  const [memoData, setMemoData] = useState<MemoData>(parseInitialMemo(initialMemo));
  
  const [thanksItems, setThanksItems] = useState<string[]>([]);
  const [appItems, setAppItems] = useState<{checked: boolean, text: string}[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);

  // Refs for focusing inputs
  const thanksRefs = useRef<(HTMLInputElement | null)[]>([]);
  const appRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      const md = parseInitialMemo(initialMemo);
      setMemoData(md);
      setMode(initialMode || (Object.keys(md).length > 0 ? 'view' : 'edit'));
      
      const parsedThanks = (md.thanks || "").split('\n').filter(l => l.trim() !== '').map(l => l.replace(/^•\s*/, ''));
      setThanksItems(parsedThanks.length > 0 ? parsedThanks : [""]);
      
      if (md.application && md.application.length > 0) {
        setAppItems(md.application);
      } else {
        setAppItems([{ checked: false, text: "" }]);
      }
    }
  }, [isOpen, initialMemo, initialMode]);

  if (!isOpen) return null;

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
      
      await onSave(dayIndex, finalMemoData);
      setMemoData(finalMemoData);
      setThanksItems(finalThanks ? finalThanks.split('\n').map(l => l.replace(/^•\s*/, '')) : [""]);
      setAppItems(finalApp.length > 0 ? finalApp : [{ checked: false, text: "" }]);
      setMode('view');
      onClose();
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
      await onSave(dayIndex, newMemoData);
    }
  };

  // Thanks Handlers
  const handleThanksKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-stone-900 border border-stone-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-900/50 flex-shrink-0">
          <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
            {mode === 'view' ? '묵상 노트' : '노트 작성'}
          </h2>
          <div className="flex items-center gap-2">
            {mode === 'view' && onShare && (
              <button 
                onClick={() => onShare()}
                className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
                title="공유하기"
              >
                <Share2 size={20} />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col overflow-y-auto flex-1">
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

        {/* Footer Actions */}
        <div className="p-4 bg-stone-950/30 border-t border-stone-800 flex gap-3 flex-shrink-0">
          {mode === 'view' ? (
            <button
              onClick={() => setMode('edit')}
              className="w-full py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <PencilLine size={18} />
              수정하기
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
