"use client";

import React, { useEffect, useState, useRef } from 'react';
import { X, Heart, Music } from 'lucide-react';
import { OneVerse } from '@/lib/storage';
import { useMemoryTrainer } from '@/hooks/useMemoryTrainer';
import MemoryTrainerIntro from '@/components/memory/MemoryTrainerIntro';
import MemoryTrainerProgress from '@/components/memory/MemoryTrainerProgress';
import MemoryTrainerContent from '@/components/memory/MemoryTrainerContent';
import MemoryTrainerResultModals from '@/components/memory/MemoryTrainerResultModals';
import { useSettings } from '@/contexts/SettingsContext';

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

  const { autoPlayBgm } = useSettings();
  const [isBgmEnabled, setIsBgmEnabled] = useState(autoPlayBgm);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/training-bgm.mp3');
    audio.loop = true;
    audio.volume = 0.2;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const shouldPlay = isBgmEnabled && trainerState.stepState !== 'intro' && !trainerState.isTrainingFinished;

    if (shouldPlay) {
      audio.play().catch(e => console.log('BGM play blocked:', e));
    } else {
      audio.pause();
    }
  }, [isBgmEnabled, trainerState.stepState, trainerState.isTrainingFinished]);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in md:p-4">
      <div className="bg-white dark:bg-stone-900 rounded-none md:rounded-3xl px-6 md:px-8 shadow-2xl w-full h-full md:h-auto md:max-h-[85vh] max-w-lg flex flex-col relative animate-in zoom-in-95 border-0 md:border border-stone-200 dark:border-stone-800 overflow-y-auto pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] md:py-8">
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
            <Heart size={24} />
            <h2>마음새김 트레이너</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsBgmEnabled(!isBgmEnabled)} 
              className={`w-6 h-6 p-1 rounded-full transition-all flex items-center justify-center ${isBgmEnabled ? 'text-stone-600 dark:text-stone-300 opacity-100 bg-stone-100 dark:bg-stone-800' : 'text-stone-400 opacity-50 hover:opacity-100'}`}
              title="BGM 토글"
            >
              <Music size={14} className={!isBgmEnabled ? "opacity-50" : ""} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
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
            isBibleTextLoading={trainerState.isBibleTextLoading}
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

        {trainerState.isBibleTextLoading && (
          <p className="mt-3 text-center text-xs font-medium text-stone-400" aria-live="polite">
            성경 본문을 불러오는 중입니다...
          </p>
        )}
        {trainerState.bibleTextLoadError && (
          <p className="mt-3 text-center text-xs font-medium text-amber-600 dark:text-amber-400" role="status">
            저장된 One Verse 본문으로 훈련을 계속합니다.
          </p>
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
