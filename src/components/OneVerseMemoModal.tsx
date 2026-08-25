import React, { useState, useEffect } from "react";
import { X, PencilLine, Share2, CheckSquare } from "lucide-react";
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

const appToString = (app?: { text: string; checked: boolean }[]) => {
  if (!app || app.length === 0) return "";
  return app.map(a => `- [${a.checked ? 'x' : ' '}] ${a.text}`).join('\n');
};

const stringToApp = (str: string) => {
  if (!str || !str.trim()) return [];
  return str.split('\n').filter(line => line.trim().length > 0).map(line => {
    const match = line.match(/^- \[( |v|x|V|X)\] (.*)/);
    if (match) {
      return { checked: match[1].toLowerCase() !== ' ', text: match[2] };
    }
    return { checked: false, text: line.replace(/^- /, '') };
  });
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
  const [appText, setAppText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const md = parseInitialMemo(initialMemo);
      setMemoData(md);
      setAppText(appToString(md.application));
      setMode(initialMode || (Object.keys(md).length > 0 ? 'view' : 'edit'));
    }
  }, [isOpen, initialMemo, initialMode]);

  if (!isOpen) return null;

  const formattedDate = memoUpdatedAt 
    ? new Date(memoUpdatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')
    : new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalMemoData = { ...memoData, application: stringToApp(appText) };
      await onSave(dayIndex, finalMemoData);
      setMemoData(finalMemoData);
      setMode('view');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleThanksFocus = () => {
    if (!memoData.thanks || memoData.thanks.trim() === '') {
      setMemoData({ ...memoData, thanks: '• ' });
    }
  };

  const handleAppFocus = () => {
    if (!appText || appText.trim() === '') {
      setAppText('- [ ] ');
    }
  };

  const toggleAppCheck = async (idx: number) => {
    if (!memoData.application) return;
    const newApp = [...memoData.application];
    newApp[idx].checked = !newApp[idx].checked;
    const newMemoData = { ...memoData, application: newApp };
    setMemoData(newMemoData);
    setAppText(appToString(newApp));
    await onSave(dayIndex, newMemoData);
  };

  const handleThanksKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.currentTarget.value;
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newVal = val.substring(0, start) + '\n• ' + val.substring(end);
      setMemoData({ ...memoData, thanks: newVal });
      setTimeout(() => {
        if (e.currentTarget) e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 3;
      }, 0);
    }
  };

  const handleAppKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.currentTarget.value;
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newVal = val.substring(0, start) + '\n- [ ] ' + val.substring(end);
      setAppText(newVal);
      setTimeout(() => {
        if (e.currentTarget) e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 7;
      }, 0);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-stone-900 border border-stone-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <>
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
                    <h4 className="text-stone-400 text-xs font-semibold">감사하기 (Enter시 불릿 추가)</h4>
                    <textarea
                      value={memoData.thanks || ""}
                      onChange={e => setMemoData({...memoData, thanks: e.target.value})}
                      onKeyDown={handleThanksKeyDown}
                      onFocus={handleThanksFocus}
                      placeholder="• 오늘 하루 감사한 일은 무엇인가요?"
                      className="w-full bg-transparent text-[15px] text-stone-200 placeholder-stone-600 focus:outline-none resize-none min-h-[100px] leading-relaxed"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="text-stone-400 text-xs font-semibold">삶에 적용하기 (Enter시 체크박스 추가)</h4>
                    <textarea
                      value={appText}
                      onChange={e => setAppText(e.target.value)}
                      onKeyDown={handleAppKeyDown}
                      onFocus={handleAppFocus}
                      placeholder="- [ ] 오늘 실천할 내용을 적어보세요."
                      className="w-full bg-transparent text-[15px] text-stone-200 placeholder-stone-600 focus:outline-none resize-none min-h-[100px] leading-relaxed"
                    />
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
          </>
      </div>
    </div>
  );
}
