export const BIBLE_ABBREVIATIONS: Record<string, string> = {
  "창세기": "창", "출애굽기": "출", "레위기": "레", "민수기": "민", "신명기": "신",
  "여호수아": "수", "사사기": "삿", "룻기": "룻", "사무엘상": "삼상", "사무엘하": "삼하",
  "열왕기상": "왕상", "열왕기하": "왕하", "역대상": "대상", "역대하": "대하",
  "에스라": "스", "느헤미야": "느", "에스더": "에", "욥기": "욥", "시편": "시",
  "잠언": "잠", "전도서": "전", "아가": "아", "이사야": "사", "예레미야": "렘",
  "예레미야 애가": "애", "에스겔": "겔", "다니엘": "단", "호세아": "호", "요엘": "욜",
  "아모스": "암", "오바댜": "옵", "요나": "욘", "미가": "미", "나훔": "나",
  "하박국": "합", "스바냐": "습", "학개": "학", "스가랴": "슥", "말라기": "말",
  "마태복음": "마", "마가복음": "막", "누가복음": "눅", "요한복음": "요", "사도행전": "행",
  "로마서": "롬", "고린도전서": "고전", "고린도후서": "고후", "갈라디아서": "갈",
  "에베소서": "엡", "빌립보서": "빌", "골로새서": "골", "데살로니가전서": "살전",
  "데살로니가후서": "살후", "디모데전서": "딤전", "디모데후서": "딤후", "디도서": "딛",
  "빌레몬서": "몬", "히브리서": "히", "야고보서": "약", "베드로전서": "벧전",
  "베드로후서": "벧후", "요한일서": "요일", "요한이서": "요이", "요한삼서": "요삼",
  "유다서": "유", "요한계시록": "계"
};

export const getCategoryColor = (category: string) => {
  switch(category) {
    case '구약': return 'text-sky-600 dark:text-sky-300';
    case '신약': return 'text-rose-600 dark:text-rose-300';
    case '시편': return 'text-purple-600 dark:text-purple-300';
    case '잠언': return 'text-amber-600 dark:text-amber-300';
    default: return 'text-stone-600 dark:text-stone-300';
  }
};

interface TrackData {
  Book: string;
  startChapter: number;
  startVerse: number | null;
  endChapter: number;
  endVerse: number | null;
}

interface DayData {
  tracks: Record<string, TrackData>;
}

export function formatSchedule(dayData: DayData) {
  if (!dayData) return [];
  const tracks = dayData.tracks;
  const parts: { category: string; text: string }[] = [];
  const getAbbr = (bookName: string) => BIBLE_ABBREVIATIONS[bookName] || bookName.substring(0, 1);
  
  const formatTrack = (category: string, tData: TrackData | undefined) => {
    if (!tData) return;
    const abbr = getAbbr(tData.Book);
    let rangeStr = "";
    if (tData.startChapter === tData.endChapter) {
      if (tData.startVerse === null || tData.endVerse === null) {
        rangeStr = `${tData.startChapter}`;
      } else {
        rangeStr = `${tData.startChapter}:${tData.startVerse}-${tData.endVerse}`;
      }
    } else {
      if (tData.startVerse === null || tData.endVerse === null) {
        rangeStr = `${tData.startChapter}-${tData.endChapter}`;
      } else {
        rangeStr = `${tData.startChapter}:${tData.startVerse}-${tData.endChapter}:${tData.endVerse}`;
      }
    }
    parts.push({ category, text: `${abbr} ${rangeStr}` });
  };

  formatTrack("구약", tracks["구약"]);
  formatTrack("신약", tracks["신약"]);
  formatTrack("시편", tracks["시편"]);
  formatTrack("잠언", tracks["잠언"]);
  
  return parts;
}
