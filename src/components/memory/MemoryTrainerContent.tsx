import React from "react";
import { Mic, PenLine, Heart, RotateCcw } from "lucide-react";
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
  handleStartListening: () => void;
  challengeMethod: 'voice' | 'writing' | null;
  writingAnswer: string;
  setWritingAnswer: (answer: string) => void;
  writingError: string | null;
  handleStartWritingChallenge: () => void;
  handleCheckWritingAnswer: () => void;
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
  handleStartListening,
  challengeMethod,
  writingAnswer,
  setWritingAnswer,
  writingError,
  handleStartWritingChallenge,
  handleCheckWritingAnswer
}: MemoryTrainerContentProps) {
  return (
    <>
      {isTrainingFinished && testResult === 'none' && !isListening && (
        <div className="mb-5 flex flex-col gap-3 animate-in slide-in-from-top-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-center dark:border-amber-900/60 dark:bg-amber-950/20">
            <span className="flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <Heart size={16} className="fill-current text-amber-500" /> 오늘의 One Verse를 마음에 새겨보세요
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleStartListening}
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-2 py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-orange-600 sm:text-sm"
            >
              <Mic size={18} /> 음성 도전
            </button>
            <button
              type="button"
              onClick={handleStartWritingChallenge}
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-2 py-3 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 sm:text-sm"
            >
              <PenLine size={18} /> 쓰기 도전
            </button>
          </div>

          {challengeMethod === 'writing' && (
            <section className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900" aria-label="쓰기 도전">
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">말씀을 기억나는 대로 써보세요.</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-400 dark:text-stone-500">공백과 줄바꿈은 정리해서 비교하지만, 글자와 문장부호는 원문과 같아야 해요.</p>
              <textarea
                value={writingAnswer}
                onChange={(event) => setWritingAnswer(event.target.value)}
                placeholder="말씀을 직접 입력해 주세요"
                className="mt-3 min-h-32 w-full resize-y rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm leading-relaxed text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              {writingError && <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">{writingError}</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCheckWritingAnswer}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-2 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-700"
                >
                  <PenLine size={16} /> 채점하기
                </button>
                <button
                  type="button"
                  onClick={() => setWritingAnswer('')}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-2 py-2 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  <RotateCcw size={16} /> 다시 쓰기
                </button>
              </div>
            </section>
          )}
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

    </>
  );
}
