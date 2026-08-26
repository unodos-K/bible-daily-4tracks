import React from "react";
import { Timer, Pause, Play, RotateCcw } from "lucide-react";
import { TrainerStep } from "@/hooks/useMemoryTrainer";

interface MemoryTrainerProgressProps {
  currentStep: TrainerStep;
  jumpToPhase: (phase: number) => void;
  isTrainingFinished: boolean;
  timeLeftDisplay: string;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentPhaseStepsCount: number;
  currentSegmentIndex: number;
  currentSegmentFraction: number;
  handleRestart: () => void;
}

export default function MemoryTrainerProgress({
  currentStep,
  jumpToPhase,
  isTrainingFinished,
  timeLeftDisplay,
  isPlaying,
  setIsPlaying,
  currentPhaseStepsCount,
  currentSegmentIndex,
  currentSegmentFraction,
  handleRestart
}: MemoryTrainerProgressProps) {
  return (
    <div className="flex flex-col gap-4 mb-6 bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-100 dark:border-stone-800">
      <div className="flex flex-wrap justify-center gap-1.5 pb-1 w-full">
        {[1, 2, 3, 4, 5].map((phaseNum) => (
          <button
            key={phaseNum}
            onClick={() => jumpToPhase(phaseNum)}
            className={`flex-1 min-w-[3rem] px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-xs md:text-sm font-bold whitespace-nowrap transition-colors ${
              currentStep.phase === phaseNum
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600"
            }`}
          >
            Step {phaseNum}
          </button>
        ))}
        <button
          onClick={() => jumpToPhase(5)}
          className="flex-1 min-w-[3rem] px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-xs md:text-sm font-bold whitespace-nowrap transition-colors bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
        >
          도전
        </button>
      </div>

      <div className="flex justify-center items-center mb-4 mt-2">
        <span className="text-2xl md:text-3xl font-bold text-stone-800 dark:text-stone-200 animate-pulse text-center">
          {currentStep.phaseLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 w-full">
        <div className="flex-shrink-0 min-w-[70px]">
          {isTrainingFinished ? (
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 font-bold text-sm shadow-sm animate-in zoom-in">
              🎯 도전!
            </div>
          ) : (
            <div 
              key={isPlaying ? timeLeftDisplay : 'paused'}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm shadow-sm w-full ${
                isPlaying 
                  ? "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-400 animate-pulse" 
                  : "bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400"
              }`}
            >
              {isPlaying ? (
                <React.Fragment><Timer size={14} /> {timeLeftDisplay}초</React.Fragment>
              ) : (
                <React.Fragment><Pause size={14} /> 멈춤</React.Fragment>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 gap-0.5 h-1.5">
          {Array.from({ length: currentPhaseStepsCount }).map((_, idx) => {
            let width = "0%";
            let fillClass = "bg-sky-400 dark:bg-sky-500";
            
            if (idx < currentSegmentIndex) {
              width = "100%";
            } else if (idx === currentSegmentIndex) {
              width = `${currentSegmentFraction * 100}%`;
            } else {
              fillClass = "bg-transparent";
            }

            return (
              <div key={idx} className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ease-linear ${fillClass}`}
                  style={{ 
                    width, 
                    transitionProperty: 'width', 
                    transitionDuration: isPlaying && idx === currentSegmentIndex ? '20ms' : '0ms' 
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {!isTrainingFinished && (
        <div className="flex items-center justify-end gap-2 w-full mt-1 border-t border-stone-200/50 dark:border-stone-700/50 pt-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 font-bold text-xs sm:text-sm transition-colors"
          >
            {isPlaying ? (
              <React.Fragment><Pause size={14} /> 일시정지</React.Fragment>
            ) : (
              <React.Fragment><Play size={14} /> 이어하기</React.Fragment>
            )}
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 font-bold text-xs sm:text-sm transition-colors"
          >
            <RotateCcw size={14} /> 처음부터
          </button>
        </div>
      )}
    </div>
  );
}
