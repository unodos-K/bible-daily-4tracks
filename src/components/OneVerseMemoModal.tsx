import React, { useState, useEffect } from "react";
import { X, PencilLine, Share2 } from "lucide-react";

interface OneVerseMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayIndex: number;
  initialMemo: string;
  memoUpdatedAt?: string;
  onSave: (dayIndex: number, newMemo: string) => Promise<void>;
  onShare?: () => void;
  initialMode?: 'view' | 'edit';
}

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
  const [memo, setMemo] = useState(initialMemo || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMemo(initialMemo || "");
      setMode(initialMode || (initialMemo ? 'view' : 'edit'));
    }
  }, [isOpen, initialMemo, initialMode]);

  if (!isOpen) return null;

  const formattedDate = memoUpdatedAt 
    ? new Date(memoUpdatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')
    : new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(dayIndex, memo);
      setMode('view');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-stone-900 border border-stone-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-900/50">
          <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
            {mode === 'view' ? '묵상 노트' : '노트 작성'}
          </h2>
          <div className="flex items-center gap-2">
            {mode === 'view' && onShare && (
              <button 
                onClick={onShare}
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
        <div className="p-5 flex flex-col">
          {mode === 'view' ? (
            <div className="flex flex-col">
              <div className="text-stone-400 text-xs mb-4 font-medium tracking-wide">
                작성일: {formattedDate}
              </div>
              <p className="text-stone-200 text-[15px] leading-relaxed whitespace-pre-wrap min-h-[100px]">
                {memo}
              </p>
            </div>
          ) : (
            <div className="flex flex-col relative w-full">
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="이 말씀이 마음에 와닿은 이유는 무엇인가요?"
                className="w-full bg-transparent text-[15px] text-stone-200 placeholder-stone-500 focus:outline-none resize-none min-h-[150px] py-1 leading-relaxed"
                rows={5}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-950/30 border-t border-stone-800 flex gap-3">
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
