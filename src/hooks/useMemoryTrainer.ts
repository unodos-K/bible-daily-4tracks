import { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { calculateSimilarity } from '@/lib/utils';
import { OneVerse } from '@/lib/storage';
import rawBibleData from "@/data/chunked_text.json";

export interface TrainerStep {
  phase: 1 | 2 | 3 | 4 | 5;
  phaseLabel: string;
  hiddenIndices: number[];
}

export function useMemoryTrainer({ oneVerse, onComplete }: { oneVerse: OneVerse, onComplete: () => void }) {
  const bibleTexts = rawBibleData as Record<string, Record<string, Record<string, string>>>;
  const freshRawText = bibleTexts[oneVerse.book]?.[oneVerse.chapter.toString()]?.[oneVerse.verse.toString()];
  
  const textToUse = freshRawText || oneVerse.rawText || oneVerse.displayText || "";
  const displayString = textToUse.replace(/\s*\/\s*/g, ' ').trim();

  const chunks = textToUse.includes('/')
    ? textToUse.split(/\s*\/\s*/).map(c => c.replace(/\//g, '').trim()).filter(Boolean)
    : (oneVerse.chunks && oneVerse.chunks.length > 0 ? oneVerse.chunks : textToUse.split(' ').filter(Boolean));

  const K = chunks.length;

  const [stepState, setStepState] = useState<'intro' | 'training'>('intro');
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(5);
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0); 
  const [hasCompleted, setHasCompleted] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [testResult, setTestResult] = useState<'none' | 'success' | 'fail'>('none');
  const [speechResult, setSpeechResult] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  
  interface SpeechRecognitionInstance {
    start: () => void;
    stop: () => void;
    onresult: ((event: { results: { transcript: string }[][] }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
  }
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const koVoices = allVoices.filter(v => v.lang.includes('ko'));
      setTtsVoices(koVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleTTS = () => {
    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
    } else {
      if (ttsVoices.length > 0) {
        const utterance = new SpeechSynthesisUtterance(displayString);
        utterance.voice = ttsVoices[selectedVoiceIndex];
        utterance.lang = 'ko-KR';
        utterance.onend = () => setIsPlayingTTS(false);
        utterance.onerror = () => setIsPlayingTTS(false);
        window.speechSynthesis.speak(utterance);
        setIsPlayingTTS(true);
      }
    }
  };

  const steps: TrainerStep[] = useMemo(() => {
    const seq: TrainerStep[] = [];
    if (K === 0) return [{ phase: 5, phaseLabel: "빈 구절입니다", hiddenIndices: [] }];
    
    for (let i = 0; i < K; i++) {
      seq.push({ phase: 1, phaseLabel: "한 마디씩 마음에 새기기", hiddenIndices: [i] });
    }
    
    if (K >= 2) {
      for (let i = 0; i < K - 1; i++) {
        seq.push({ phase: 2, phaseLabel: "두 마디 묶어 이어가기", hiddenIndices: [i, i + 1] });
      }
    } else {
      seq.push({ phase: 2, phaseLabel: "두 마디 묶어 이어가기", hiddenIndices: [0] });
    }
    
    const oddIndices = Array.from({ length: K }, (_, k) => k).filter(k => k % 2 === 1);
    const evenIndices = Array.from({ length: K }, (_, k) => k).filter(k => k % 2 === 0);
    
    seq.push({ phase: 3, phaseLabel: "징검다리로 흐름 기억하기", hiddenIndices: oddIndices });
    seq.push({ phase: 3, phaseLabel: "징검다리로 흐름 기억하기", hiddenIndices: evenIndices });
    seq.push({ phase: 3, phaseLabel: "징검다리로 흐름 기억하기", hiddenIndices: oddIndices });
    seq.push({ phase: 3, phaseLabel: "징검다리로 흐름 기억하기", hiddenIndices: evenIndices });
    
    const mid = Math.floor(K / 2);
    const firstHalf = Array.from({ length: mid }, (_, k) => k);
    const secondHalf = Array.from({ length: K - mid }, (_, k) => mid + k);
    
    seq.push({ phase: 4, phaseLabel: "절반 가리기 패턴 훈련", hiddenIndices: secondHalf }); 
    seq.push({ phase: 4, phaseLabel: "절반 가리기 패턴 훈련", hiddenIndices: firstHalf });  
    seq.push({ phase: 4, phaseLabel: "절반 가리기 패턴 훈련", hiddenIndices: secondHalf }); 
    seq.push({ phase: 4, phaseLabel: "절반 가리기 패턴 훈련", hiddenIndices: firstHalf });  
    
    const all = Array.from({ length: K }, (_, k) => k);
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기", hiddenIndices: [] }); 
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기", hiddenIndices: all }); 
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기", hiddenIndices: [] }); 
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기", hiddenIndices: all }); 
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기", hiddenIndices: [] }); 

    return seq;
  }, [K]);

  const currentStep = steps[stepIndex] || steps[steps.length - 1];
  const isLastStep = stepIndex >= steps.length - 1;
  const isTrainingFinished = isLastStep && elapsed >= intervalSeconds * 1000;
  
  const currentPhaseStepsCount = steps.filter(s => s.phase === currentStep.phase).length;
  const currentSegmentIndex = stepIndex - steps.findIndex(s => s.phase === currentStep.phase);
  
  const currentSegmentFraction = Math.min(1, (elapsed / (intervalSeconds * 1000)));
  const timeLeftDisplay = Math.ceil(Math.max(0, intervalSeconds - (elapsed / 1000))).toString();

  useEffect(() => {
    if (stepState !== 'training' || isTrainingFinished || !isPlaying) return;

    let lastTime = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      
      setElapsed((prev) => prev + delta);
    }, 20); 

    return () => clearInterval(timer);
  }, [stepState, isTrainingFinished, isPlaying]);

  useEffect(() => {
    if (elapsed >= intervalSeconds * 1000 && stepState === 'training') {
      if (!isLastStep) {
        setStepIndex((curr) => Math.min(curr + 1, steps.length - 1));
        setElapsed(0);
      }
    }
  }, [elapsed, intervalSeconds, stepState, isLastStep, steps.length]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;

      const rec = recognitionRef.current;
      rec.onresult = (event: { results: { transcript: string }[][] }) => {
        const transcript = event.results[0][0].transcript;
        setSpeechResult(transcript);
        
        const sim = calculateSimilarity(displayString, transcript);
        if (sim >= 0.8) {
          setTestResult('success');
        } else {
          setTestResult('fail');
        }
      };

      rec.onerror = (event: { error: string }) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setTestResult('none');
        alert("마이크를 사용할 수 없습니다. 권한을 확인해주세요.");
      };

      rec.onend = () => {
        setIsListening(false);
      };
    }
  }, [displayString]);

  const handleStartListening = () => {
    if (!recognitionRef.current) {
      alert("현재 브라우저에서는 음성 인식을 지원하지 않습니다. '직접 완료하기'를 이용해주세요.");
      return;
    }
    setTestResult('none');
    setSpeechResult('');
    setIsListening(true);
    recognitionRef.current.start();
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleStartTraining = () => {
    window.speechSynthesis.cancel();
    setIsPlayingTTS(false);
    setStepIndex(0);
    setElapsed(0);
    setStepState('training');
    setIsPlaying(true);
  };

  const handleDirectChallenge = () => {
    window.speechSynthesis.cancel();
    setIsPlayingTTS(false);
    setStepState('training');
    setStepIndex(steps.length - 1);
    setElapsed(intervalSeconds * 1000);
    setIsPlaying(false);
  };

  const handleRestart = () => {
    window.speechSynthesis.cancel();
    setIsPlayingTTS(false);
    setStepState('intro');
    setStepIndex(0);
    setElapsed(0);
    setIsPlaying(true);
    setHasCompleted(false);
    setTestResult('none');
    setSpeechResult('');
    setShowAnswer(false);
  };

  const jumpToPhase = (targetPhase: number) => {
    const index = steps.findIndex(s => s.phase === targetPhase);
    if (index !== -1) {
      setStepIndex(index);
      setElapsed(0);
      setIsPlaying(true);
    }
  };

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f59e0b', '#3b82f6', '#10b981'],
        zIndex: 9999
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f59e0b', '#3b82f6', '#10b981'],
        zIndex: 9999
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        onComplete();
      }
    };
    frame();
  };

  const handleComplete = () => {
    if (hasCompleted) return;
    setHasCompleted(true);
    triggerConfetti();
  };

  return {
    displayString,
    chunks,
    stepState,
    isPlaying,
    setIsPlaying,
    intervalSeconds,
    setIntervalSeconds,
    isListening,
    testResult,
    speechResult,
    showAnswer,
    setShowAnswer,
    ttsVoices,
    selectedVoiceIndex,
    setSelectedVoiceIndex,
    isPlayingTTS,
    toggleTTS,
    currentStep,
    isTrainingFinished,
    currentPhaseStepsCount,
    currentSegmentIndex,
    currentSegmentFraction,
    timeLeftDisplay,
    handleStartListening,
    handleStopListening,
    handleStartTraining,
    handleDirectChallenge,
    handleRestart,
    jumpToPhase,
    handleComplete
  };
}
