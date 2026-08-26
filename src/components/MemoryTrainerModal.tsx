"use client";

import React, { useEffect } from 'react';
import { X, Heart } from 'lucide-react';
import { OneVerse } from '@/lib/storage';
import { useMemoryTrainer } from '@/hooks/useMemoryTrainer';
import MemoryTrainerIntro from '@/components/memory/MemoryTrainerIntro';
import MemoryTrainerProgress from '@/components/memory/MemoryTrainerProgress';
import MemoryTrainerContent from '@/components/memory/MemoryTrainerContent';
import MemoryTrainerResultModals from '@/components/memory/MemoryTrainerResultModals';

// Web Speech API 타입 정의
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

interface MemoryTrainerModalProps {
  oneVerse: OneVerse;
  onClose: () => void;
  onComplete: () => void;
}

export default function MemoryTrainerModal({ oneVerse, onClose, onComplete }: MemoryTrainerModalProps) {
  const trainerState = useMemoryTrainer({ oneVerse, onComplete });

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in md:p-4">
      <div className="bg-white dark:bg-stone-900 rounded-none md:rounded-3xl px-6 md:px-8 shadow-2xl w-full h-full md:h-auto md:max-h-[85vh] max-w-lg flex flex-col relative animate-in zoom-in-95 border-0 md:border border-stone-200 dark:border-stone-800 overflow-y-auto pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] md:py-8">
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
            <Heart size={24} />
            <h2>마음새김 트레이너</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {trainerState.stepState === 'intro' ? (
          <MemoryTrainerIntro 
            oneVerse={oneVerse}
            displayString={trainerState.displayString}
            ttsVoices={trainerState.ttsVoices}
            selectedVoiceIndex={trainerState.selectedVoiceIndex}
            setSelectedVoiceIndex={trainerState.setSelectedVoiceIndex}
            isPlayingTTS={trainerState.isPlayingTTS}
            toggleTTS={trainerState.toggleTTS}
            intervalSeconds={trainerState.intervalSeconds}
            setIntervalSeconds={trainerState.setIntervalSeconds}
            handleStartTraining={trainerState.handleStartTraining}
            handleDirectChallenge={trainerState.handleDirectChallenge}
          />
        ) : (
          <div className="flex flex-col gap-0 animate-in fade-in zoom-in-95">
            <MemoryTrainerProgress
              currentStep={trainerState.currentStep}
              jumpToPhase={trainerState.jumpToPhase}
              isTrainingFinished={trainerState.isTrainingFinished}
              timeLeftDisplay={trainerState.timeLeftDisplay}
              isPlaying={trainerState.isPlaying}
              setIsPlaying={trainerState.setIsPlaying}
              currentPhaseStepsCount={trainerState.currentPhaseStepsCount}
              currentSegmentIndex={trainerState.currentSegmentIndex}
              currentSegmentFraction={trainerState.currentSegmentFraction}
              handleRestart={trainerState.handleRestart}
              handleDirectChallenge={trainerState.handleDirectChallenge}
            />

            <MemoryTrainerContent
              oneVerse={oneVerse}
              chunks={trainerState.chunks}
              isListening={trainerState.isListening}
              handleStopListening={trainerState.handleStopListening}
              showAnswer={trainerState.showAnswer}
              isTrainingFinished={trainerState.isTrainingFinished}
              currentStep={trainerState.currentStep}
              testResult={trainerState.testResult}
              setShowAnswer={trainerState.setShowAnswer}
              handleRestart={trainerState.handleRestart}
              handleStartListening={trainerState.handleStartListening}
              handleComplete={trainerState.handleComplete}
            />
          </div>
        )}
      </div>

      <MemoryTrainerResultModals
        testResult={trainerState.testResult}
        speechResult={trainerState.speechResult}
        handleComplete={trainerState.handleComplete}
        handleStartListening={trainerState.handleStartListening}
        handleRestart={trainerState.handleRestart}
      />
    </div>
  );
}
