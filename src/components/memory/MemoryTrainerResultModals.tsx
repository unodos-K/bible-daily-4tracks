import React from "react";
import { CheckCircle2, XCircle, Mic } from "lucide-react";

interface MemoryTrainerResultModalsProps {
  testResult: 'none' | 'success' | 'fail';
  speechResult: string;
  handleComplete: () => void;
  handleStartListening: () => void;
  handleRestart: () => void;
}

export default function MemoryTrainerResultModals({
  testResult,
  speechResult,
  handleComplete,
  handleStartListening,
  handleRestart
}: MemoryTrainerResultModalsProps) {
  if (testResult === 'none') return null;

  return (
    <>
      {testResult === 'success' && (
        <div className="absolute inset-0 bg-black/50 z-50 rounded-3xl flex items-center justify-center p-6 animate-in fade-in">
          <div data-v2-memory-result className="bg-white dark:bg-stone-900 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl transform animate-in zoom-in-90 border border-stone-200 dark:border-stone-800">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
              🎉 오늘의 말씀 암송 성공!
            </h3>
            <p className="text-stone-500 dark:text-stone-400 mb-8">
              정확하게 말씀을 외우셨어요! 정말 훌륭합니다.
            </p>
            <button 
              onClick={handleComplete}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-[1.02]"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {testResult === 'fail' && (
        <div className="absolute inset-0 bg-black/50 z-50 rounded-3xl flex items-center justify-center p-6 animate-in fade-in">
          <div data-v2-memory-result className="bg-white dark:bg-stone-900 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl transform animate-in zoom-in-90 border border-stone-200 dark:border-stone-800">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-rose-500" />
            </div>
            <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
              💡 다시 한 번 암송해볼까요?
            </h3>
            <p className="text-stone-500 dark:text-stone-400 mb-8 text-sm">
              <span className="block">인식된 음성: </span>
              <span className="block text-stone-700 dark:text-stone-300 italic font-semibold">{speechResult}</span>
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleStartListening}
                className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Mic size={18} />
                🔥 한 번 더 도전하기
              </button>
              <button 
                onClick={handleRestart}
                className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 font-bold rounded-xl transition-colors"
              >
                설정 화면으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
