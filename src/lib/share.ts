import { DayRecord, OneVerse } from "./storage";

export const shareOneVerse = async (record: DayRecord, nickname: string) => {
  if (typeof window === "undefined") return;

  const displayTxt = record.oneVerse?.displayText || record.oneVerse?.rawText || '';
  const formattedRef = `${record.oneVerse?.book} ${record.oneVerse?.chapter}장 ${record.oneVerse?.verse}절`;
  const memoTxt = record.oneVerse?.memo ? `\n\n[묵상 노트]\n${record.oneVerse.memo}` : '';
  
  const textToShare = `[One Verse]\n${nickname}님이 오늘의 One Verse를 보냈어요!\n\n"${displayTxt}"\n\n${formattedRef}${memoTxt}`;
  
  const shareData = {
    title: 'One Verse',
    text: textToShare,
    url: window.location.origin,
  };

  // Prioritize Kakao Share
  if ((window as any).Kakao && (window as any).Kakao.isInitialized()) {
    (window as any).Kakao.Share.sendDefault({
      objectType: 'text',
      text: textToShare,
      link: {
        mobileWebUrl: window.location.origin,
        webUrl: window.location.origin,
      },
    });
    return;
  }

  // Fallback to Native Share (AirDrop, Messages, etc)
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      console.error("공유 실패:", err);
    }
  }

  // Clipboard copy fallback
  try {
    await navigator.clipboard.writeText(`${textToShare}\n${window.location.origin}`);
    alert("공유 링크가 클립보드에 복사되었습니다!");
  } catch (e) {
    alert("공유 기능을 지원하지 않는 브라우저입니다.");
  }
};
