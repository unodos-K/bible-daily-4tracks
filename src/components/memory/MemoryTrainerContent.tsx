import React from "react";
import { Mic, EyeOff, Eye, RotateCcw, Sparkles } from "lucide-react";
import { TrainerStep } from "@/hooks/useMemoryTrainer";
import { OneVerse } from "@/lib/storage";

interface MemoryTrainerContentProps {
  oneVerse: OneVerse;
  chunks: string[];
  isListening: boolean;
  handleStopListening: () => void;
  showAnswer: boolean;
  isTrainingFinished: boolean;
  currentStep: TrainerStep;
  testResult: 'none' | 'success' | 'fail';
  setShowAnswer: (show: boolean) => void;
  handleRestart: () => void;
  handleStartListening: () => void;
  handleComplete: () => void;
}

export default function MemoryTrainerContent({
  oneVerse,
  chunks,
  isListening,
  handleStopListening,
  showAnswer,
  isTrainingFinished,
  currentStep,
  testResult,
  setShowAnswer,
  handleRestart,
  handleStartListening,
  handleComplete
}: MemoryTrainerContentProps) {
  return (
    <>
      {isTrainingFinished && testResult === 'none' && !isListening && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-center animate-in slide-in-from-top-2 shadow-sm">
          <span className="font-bold text-amber-700 dark:text-amber-400 text-lg flex items-center justify-center gap-2">
            🎤 오늘의 OneVerse를 암송해보세요
          </span>
        </div>
      )}

      <div className="min-h-[160px] flex flex-col items-center justify-center text-center p-6 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800 mb-8 shadow-inner relative overflow-hidden">
        {isListening && (
          <div className="absolute inset-0 bg-sky-50/90 dark:bg-sky-900/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in">
            <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center mb-4 animate-pulse shadow-lg shadow-sky-500/50">
              <Mic size={32} className="text-white" />
            </div>
            <p className="font-bold text-sky-800 dark:text-sky-200 text-lg">
              말씀을 소리 내어 읽어주세요... 🎙️
            </p>
            <button 
              onClick={handleStopListening}
              className="mt-4 px-4 py-2 bg-stone-200 dark:bg-stone-700 rounded-full text-stone-600 dark:text-stone-300 text-sm font-semibold"
            >
              녹음 중지
            </button>
          </div>
        )}

        <p className="text-xl md:text-2xl font-semibold leading-loose break-keep flex flex-wrap justify-center gap-x-2 gap-y-1">
          {chunks.map((chunk, index) => {
            const isHidden = !showAnswer && (isTrainingFinished || currentStep.hiddenIndices.includes(index));
            
            return (
              <span 
                key={index} 
                className={`
                  transition-all duration-300 ease-in-out px-1.5 py-0.5 mx-0.5 rounded-md
                  ${isHidden 
                    ? "select-none cursor-help text-transparent bg-stone-300 dark:bg-stone-700 hover:text-stone-400 dark:hover:text-stone-400" 
                    : "text-stone-800 dark:text-stone-100 bg-stone-100 dark:bg-stone-800"
                  }
                `}
                title={isHidden ? "터치하여 살짝 보기" : ""}
              >
                {chunk}
              </span>
            );
          })}
        </p>
        <div className="mt-6 text-sm font-bold text-stone-400 dark:text-stone-500">
          {oneVerse.reference}
        </div>
      </div>

      {isTrainingFinished && (
        <div className="flex flex-col gap-3 w-full justify-center mt-2 animate-in slide-in-from-bottom-4">
          <div className="flex flex-row gap-3">
            <button 
              onClick={() => setShowAnswer(!showAnswer)}
              className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl border border-stone-200 dark:border-stone-700 transition-colors flex items-center justify-center gap-2"
            >
              {showAnswer ? <EyeOff size={20} /> : <Eye size={20} />}
              <span className="text-sm sm:text-base">{showAnswer ? '정답 가리기' : '정답 확인하기'}</span>
            </button>
          </div>
          <div className="flex flex-row gap-3">
            <button 
              onClick={handleRestart}
              className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold rounded-xl border border-stone-200 dark:border-stone-700 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} />
              <span className="text-sm sm:text-base">처음부터</span>
            </button>
            <button 
              onClick={handleStartListening}
              className="flex-[2] py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
            >
              <Mic size={20} />
              <span className="text-sm sm:text-base">음성으로 암송하기</span>
            </button>
          </div>
          
          <button 
            onClick={handleComplete}
            className="text-sm font-medium text-stone-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors mx-auto mt-2 flex items-center gap-1"
          >
            <Sparkles size={14} />
            마이크 없이 직접 완료하기
          </button>
        </div>
      )}
    </>
  );
}
