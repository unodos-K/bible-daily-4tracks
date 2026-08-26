import React from "react";
import { Rocket, Volume2, Square, ChevronDown } from "lucide-react";
import { OneVerse } from "@/lib/storage";

interface MemoryTrainerIntroProps {
  oneVerse: OneVerse;
  displayString: string;
  ttsVoices: SpeechSynthesisVoice[];
  selectedVoiceIndex: number;
  setSelectedVoiceIndex: (idx: number) => void;
  isPlayingTTS: boolean;
  toggleTTS: () => void;
  intervalSeconds: number;
  setIntervalSeconds: (sec: number) => void;
  handleStartTraining: () => void;
}

export default function MemoryTrainerIntro({
  oneVerse,
  displayString,
  ttsVoices,
  selectedVoiceIndex,
  setSelectedVoiceIndex,
  isPlayingTTS,
  toggleTTS,
  intervalSeconds,
  setIntervalSeconds,
  handleStartTraining
}: MemoryTrainerIntroProps) {
  return (
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
  );
}
