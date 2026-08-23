import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { X, BrainCircuit, Sparkles, Timer, RotateCcw, Mic, CheckCircle2, XCircle, Rocket, Play, Pause, Volume2, Square, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { OneVerse } from '@/lib/storage';
import { calculateSimilarity } from '@/lib/utils';

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

interface TrainerStep {
  phase: 1 | 2 | 3 | 4 | 5;
  phaseLabel: string;
  hiddenIndices: number[];
}

import rawBibleData from "@/data/chunked_text.json";

export default function MemoryTrainerModal({ oneVerse, onClose, onComplete }: MemoryTrainerModalProps) {
  // 0. 로그 출력 (데이터 흐름 추적)
  console.log("MemoryTrainer Received OneVerse:", oneVerse);

  // 1. 최신 청킹 데이터 가져오기 (DB에 저장된 구형 데이터 덮어쓰기)
  const bibleTexts = rawBibleData as Record<string, Record<string, Record<string, string>>>;
  const freshRawText = bibleTexts[oneVerse.book]?.[oneVerse.chapter.toString()]?.[oneVerse.verse.toString()];
  
  const textToUse = freshRawText || oneVerse.rawText || oneVerse.displayText || "";
  const displayString = textToUse.replace(/\s*\/\s*/g, ' ').trim();

  // 최신 데이터에 슬래시가 있으면 그것으로 쪼개고, 없으면 기존 chunks나 띄어쓰기로 폴백
  const chunks = textToUse.includes('/')
    ? textToUse.split(/\s*\/\s*/).map(c => c.replace(/\//g, '').trim()).filter(Boolean)
    : (oneVerse.chunks && oneVerse.chunks.length > 0 ? oneVerse.chunks : textToUse.split(' ').filter(Boolean));

  console.log("MemoryTrainer Chunks:", chunks);

  const K = chunks.length;

  const [stepState, setStepState] = useState<'intro' | 'training'>('intro');
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(5);
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0); // 정밀한 시간 계산을 위해 경과 시간(ms) 상태 추가
  const [hasCompleted, setHasCompleted] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [testResult, setTestResult] = useState<'none' | 'success' | 'fail'>('none');
  const [speechResult, setSpeechResult] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  
  // TTS State
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // 1.5 TTS Voices Load Effect
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

  // 2. 스텝 시퀀스 생성
  const steps: TrainerStep[] = useMemo(() => {
    const seq: TrainerStep[] = [];
    if (K === 0) return [{ phase: 5, phaseLabel: "빈 구절입니다", hiddenIndices: [] }];
    
    // Step 1: 한 마디씩 가리기 (K번 반복)
    for (let i = 0; i < K; i++) {
      seq.push({ phase: 1, phaseLabel: "한 마디씩 마음에 새기기", hiddenIndices: [i] });
    }
    
    // Step 2: 두 마디 묶어 이어가기 (K-1번 반복)
    if (K >= 2) {
      for (let i = 0; i < K - 1; i++) {
        seq.push({ phase: 2, phaseLabel: "두 마디 묶어 이어가기", hiddenIndices: [i, i + 1] });
      }
    } else {
      seq.push({ phase: 2, phaseLabel: "두 마디 묶어 이어가기", hiddenIndices: [0] });
    }
    
    // Step 3: 징검다리 가리기 (4회 고정: 홀-짝-홀-짝)
    const oddIndices = Array.from({ length: K }, (_, k) => k).filter(k => k % 2 === 1);
    const evenIndices = Array.from({ length: K }, (_, k) => k).filter(k => k % 2 === 0);
    
    seq.push({ phase: 3, phaseLabel: "징검다리로 흐름 기억하기", hiddenIndices: oddIndices });
    seq.push({ phase: 3, phaseLabel: "징검다리로 흐름 기억하기", hiddenIndices: evenIndices });
    seq.push({ phase: 3, phaseLabel: "징검다리로 흐름 기억하기", hiddenIndices: oddIndices });
    seq.push({ phase: 3, phaseLabel: "징검다리로 흐름 기억하기", hiddenIndices: evenIndices });
    
    // Step 4: 절반 가리기 (총 2회 반복: 전-후-전-후)
    const mid = Math.floor(K / 2);
    const firstHalf = Array.from({ length: mid }, (_, k) => k);
    const secondHalf = Array.from({ length: K - mid }, (_, k) => mid + k);
    
    seq.push({ phase: 4, phaseLabel: "절반 가리기 패턴 훈련", hiddenIndices: secondHalf }); // 전반부 보여줌
    seq.push({ phase: 4, phaseLabel: "절반 가리기 패턴 훈련", hiddenIndices: firstHalf });  // 후반부 보여줌
    seq.push({ phase: 4, phaseLabel: "절반 가리기 패턴 훈련", hiddenIndices: secondHalf }); // 전반부 보여줌
    seq.push({ phase: 4, phaseLabel: "절반 가리기 패턴 훈련", hiddenIndices: firstHalf });  // 후반부 보여줌
    
    // Step 5: 전체 가리기 깜빡이 후 최종 블라인드 (실전 테스트)
    const all = Array.from({ length: K }, (_, k) => k);
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기", hiddenIndices: [] }); // 1) 모두 보여줌
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기", hiddenIndices: all }); // 2) 모두 가림
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기", hiddenIndices: [] }); // 3) 모두 보여줌
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기", hiddenIndices: all }); // 4) 모두 가림
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기", hiddenIndices: [] }); // 5) 모두 보여줌
    seq.push({ phase: 5, phaseLabel: "전체 말씀 온전히 고백하기 (실전 테스트)", hiddenIndices: all }); // 6) 모두 가림 (마무리)

    return seq;
  }, [K]);

  const currentStep = steps[stepIndex] || steps[steps.length - 1];
  const isLastStep = stepIndex >= steps.length - 1;
  const currentPhaseStepsCount = steps.filter(s => s.phase === currentStep.phase).length;
  const currentSegmentIndex = stepIndex - steps.findIndex(s => s.phase === currentStep.phase);
  
  const currentSegmentFraction = Math.min(1, (elapsed / (intervalSeconds * 1000)));
  const globalProgressValue = isLastStep 
    ? 100 
    : ((currentSegmentIndex + currentSegmentFraction) / currentPhaseStepsCount) * 100;
    
  const totalProgressDisplay = globalProgressValue.toFixed(1);
  const timeLeftDisplay = Math.ceil(Math.max(0, intervalSeconds - (elapsed / 1000))).toString();

  // 3. Effect Hooks
  useEffect(() => {
    if (stepState !== 'training' || isLastStep || !isPlaying) return;

    let lastTime = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      
      setElapsed((prev) => prev + delta);
    }, 20); // 20ms 간격으로 업데이트하여 끊김없는 완벽한 싱크 구현 (약 50fps)

    return () => clearInterval(timer);
  }, [stepState, isLastStep, isPlaying]);

  useEffect(() => {
    if (elapsed >= intervalSeconds * 1000 && stepState === 'training' && !isLastStep) {
      setStepIndex((curr) => Math.min(curr + 1, steps.length - 1));
      setElapsed(0);
    }
  }, [elapsed, intervalSeconds, stepState, isLastStep, steps.length]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'ko-KR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpeechResult(transcript);
        
        const sim = calculateSimilarity(displayString, transcript);
        if (sim >= 0.8) {
          setTestResult('success');
        } else {
          setTestResult('fail');
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setTestResult('none');
        alert("마이크를 사용할 수 없습니다. 권한을 확인해주세요.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [oneVerse.displayText]);

  // 4. 핸들러 함수들
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

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  // 5. 렌더링
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in md:p-4">
      <div className="bg-white dark:bg-stone-900 rounded-none md:rounded-3xl px-6 md:px-8 shadow-2xl w-full h-full md:h-auto md:max-h-[85vh] max-w-lg flex flex-col relative animate-in zoom-in-95 border-0 md:border border-stone-200 dark:border-stone-800 overflow-y-auto pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] md:py-8">
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
            <BrainCircuit size={24} />
            <h2>뇌새김 암송 트레이너</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {stepState === 'intro' ? (
          <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4">
            <div className="text-center">
              <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-1">
                오늘의 One Verse 암송하기
              </h3>
              <p className="text-sm font-semibold text-stone-400 dark:text-stone-500">
                {oneVerse.reference}
              </p>
            </div>

            <div className="min-h-[120px] flex items-center justify-center text-center p-6 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-inner">
              <p className="text-xl md:text-2xl font-semibold leading-loose break-keep text-stone-800 dark:text-stone-100">
                {displayString}
              </p>
            </div>

            {/* TTS Controls */}
            {ttsVoices.length > 0 && (
              <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-xl gap-2">
                <div className="flex-1 overflow-hidden bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 px-3 py-2 flex items-center relative">
                  <select
                    value={selectedVoiceIndex}
                    onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
                    className="bg-transparent text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300 outline-none w-full appearance-none pr-8"
                  >
                    {ttsVoices.map((voice, idx) => (
                      <option key={voice.name} value={idx}>
                        {voice.name.replace('Google 한국의', '구글 표준 음성')}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 text-stone-400 pointer-events-none" />
                </div>
                <button
                  onClick={toggleTTS}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-colors flex-shrink-0 shadow-sm ${
                    isPlayingTTS
                      ? "bg-stone-200 hover:bg-stone-300 text-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600 dark:text-stone-300"
                      : "bg-sky-500 hover:bg-sky-600 text-white"
                  }`}
                >
                  {isPlayingTTS ? (
                    <><Square size={16} fill="currentColor" /> 정지</>
                  ) : (
                    <><Volume2 size={16} /> 낭독 듣기</>
                  )}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <p className="text-sm font-bold text-stone-600 dark:text-stone-400 text-center">
                암송 훈련 속도를 선택하세요
              </p>
              <div className="grid grid-cols-3 gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                {[
                  { label: "⚡ 빠르게", value: 3 },
                  { label: "🚶 보통", value: 5 },
                  { label: "🐢 천천히", value: 10 }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setIntervalSeconds(opt.value)}
                    className={`py-2 px-1 flex flex-col items-center justify-center gap-0.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
                      intervalSeconds === opt.value
                        ? "bg-white dark:bg-stone-900 text-sky-600 dark:text-sky-400 shadow-sm border border-stone-200 dark:border-stone-700 scale-[1.02]"
                        : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 border border-transparent"
                    }`}
                  >
                    <span className="whitespace-nowrap">{opt.label}</span>
                    <span className="text-[10px] sm:text-xs font-medium opacity-70 whitespace-nowrap">({opt.value}초)</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartTraining}
              className="mt-2 w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-lg rounded-2xl shadow-lg transition-transform hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <Rocket size={24} />
              암송 훈련 시작하기
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-0 animate-in fade-in zoom-in-95">
            {isLastStep && testResult === 'none' && !isListening && (
              <div className="mb-6 p-4 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-center animate-in slide-in-from-top-2 shadow-sm">
                <span className="font-bold text-amber-700 dark:text-amber-400 text-lg flex items-center justify-center gap-2">
                  🎉 마지막 단계! 음성으로 암송해보세요
                </span>
              </div>
            )}

            <div className="flex flex-col gap-4 mb-6 bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-100 dark:border-stone-800">
              {/* Top: Step Navigation Tabs */}
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
              </div>

              {/* Step Info */}
              <div className="flex flex-col">
                <span className="text-sm font-bold text-stone-800 dark:text-stone-200">
                  {currentStep.phaseLabel}
                </span>
                <span className="text-xs font-semibold text-stone-400 mt-0.5">
                  해당 Step 진행률 {totalProgressDisplay}%
                </span>
              </div>

              {/* Middle: Timer & Timeline Segments */}
              <div className="flex items-center gap-3 w-full">
                <div className="flex-shrink-0 min-w-[70px]">
                  {isLastStep ? (
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
                  <div className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sky-400 dark:bg-sky-500 ease-linear"
                      style={{ 
                        width: `${globalProgressValue}%`, 
                        transitionProperty: 'width', 
                        transitionDuration: isPlaying ? '20ms' : '0ms' 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom: Pause/Play & Restart Controls */}
              {!isLastStep && (
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
                  const isHidden = !showAnswer && currentStep.hiddenIndices.includes(index);
                  
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

            {isLastStep && (
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
          </div>
        )}
      </div>

      {testResult === 'success' && (
        <div className="absolute inset-0 bg-black/50 z-50 rounded-3xl flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl transform animate-in zoom-in-90 border border-stone-200 dark:border-stone-800">
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
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl transform animate-in zoom-in-90 border border-stone-200 dark:border-stone-800">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-rose-500" />
            </div>
            <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
              💡 다시 한 번 암송해볼까요?
            </h3>
            <p className="text-stone-500 dark:text-stone-400 mb-8 text-sm">
              <span className="block">인식된 음성: </span>
              <span className="block text-stone-700 dark:text-stone-300 italic font-semibold">&quot;{speechResult}&quot;</span>
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
    </div>
  );
}
