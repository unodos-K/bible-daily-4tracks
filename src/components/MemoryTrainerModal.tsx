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
      <div className="bg-white dark:bg-stone-900 rounded-none md:rounded-3xl shadow-2xl w-full h-[100dvh] md:h-auto md:max-h-[85vh] max-w-lg flex flex-col relative animate-in zoom-in-95 border-0 md:border border-stone-200 dark:border-stone-800 overflow-hidden">
        <header className="shrink-0 flex justify-between items-center gap-3 border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-md md:px-6 md:pt-5">
          <div className="flex min-w-0 items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
            <Heart size={20} className="shrink-0" />
            <h2 className="truncate text-base">마음새김 트레이너</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setIsBgmEnabled(!isBgmEnabled)} 
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${isBgmEnabled ? 'bg-stone-100 text-stone-600 opacity-100 dark:bg-stone-800 dark:text-stone-300' : 'text-stone-400 opacity-50 hover:opacity-100'}`}
              aria-label="배경 음악 켜기 또는 끄기"
              title="BGM 토글"
            >
              <Music size={16} className={!isBgmEnabled ? "opacity-50" : ""} />
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:text-stone-800 dark:bg-stone-800 dark:hover:text-stone-200"
              aria-label="마음새김 트레이너 닫기"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-5 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-6 md:py-6">
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
                showAnswer={trainerState.showAnswer}
                setShowAnswer={trainerState.setShowAnswer}
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
                handleStartListening={trainerState.handleStartListening}
                challengeMethod={trainerState.challengeMethod}
                writingAnswer={trainerState.writingAnswer}
                setWritingAnswer={trainerState.setWritingAnswer}
                writingError={trainerState.writingError}
                handleStartWritingChallenge={trainerState.handleStartWritingChallenge}
                handleCheckWritingAnswer={trainerState.handleCheckWritingAnswer}
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
        </main>
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
