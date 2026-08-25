import { DayRecord, MemoData } from "./storage";

export const shareOneVerse = async (
  record: DayRecord, 
  nickname: string, 
  orderedItems: string[] = ['word', 'meditation', 'prayer', 'thanks', 'application']
) => {
  if (typeof window === "undefined") return;

  const displayTxt = record.oneVerse?.displayText || record.oneVerse?.rawText || '';
  const formattedRef = `${record.oneVerse?.book} ${record.oneVerse?.chapter}장 ${record.oneVerse?.verse}절`;
  
  const memo = record.oneVerse?.memo as MemoData | undefined;
  
  let textToShare = `[One Verse]\n${nickname}님이 오늘의 One Verse를 보냈어요!\n\n`;

  for (let i = 0; i < orderedItems.length; i++) {
    const item = orderedItems[i];
    
    if (item === 'word') {
      textToShare += `📖 말씀\n"${displayTxt}"\n- ${formattedRef}\n\n`;
    } 
    else if (item === 'meditation' && memo?.meditation) {
      textToShare += `💭 묵상\n${memo.meditation}\n\n`;
    }
    else if (item === 'prayer' && memo?.prayer) {
      textToShare += `🙏 기도\n${memo.prayer}\n\n`;
    }
    else if (item === 'thanks' && memo?.thanks) {
      // It might already be formatted with bullets, but just in case we print it
      textToShare += `💛 감사\n${memo.thanks}\n\n`;
    }
    else if (item === 'application' && memo?.application && memo.application.length > 0) {
      textToShare += `✍️ 삶에 적용하기\n` + memo.application.map(a => `${a.checked ? '✅' : '⬜'} ${a.text}`).join('\n') + `\n\n`;
    }
  }

  // Remove trailing newlines
  textToShare = textToShare.trimEnd();
  
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
    await navigator.clipboard.writeText(`${textToShare}\n\n${window.location.origin}`);
    alert("공유 링크가 클립보드에 복사되었습니다!");
  } catch (e) {
    alert("공유 기능을 지원하지 않는 브라우저입니다.");
  }
};
