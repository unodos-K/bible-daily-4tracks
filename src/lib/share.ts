import { DayRecord, MemoData } from "./storage";

export const shareOneVerse = async (
  record: DayRecord, 
  nickname: string, 
  orderedItems: string[] = ['verse', 'meditation', 'prayer', 'thanksgiving', 'application']
) => {
  if (typeof window === "undefined") return;

  const verseObj = record.oneVerse;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const displayTxt = verseObj?.displayText || verseObj?.rawText || (verseObj as any)?.text || '';
  const formattedRef = verseObj?.reference || (verseObj?.book ? (verseObj.book === "시편" ? `${verseObj.book} ${verseObj.chapter}편 ${verseObj.verse}절` : `${verseObj.book} ${verseObj.chapter}장 ${verseObj.verse}절`) : '');
  
  const memo = typeof verseObj?.memo === 'object' ? (verseObj.memo as MemoData) : undefined;
  
  let textToShare = `[One Verse]\n${nickname}님이 오늘의 One Verse를 보냈어요!\n\n`;

  for (let i = 0; i < orderedItems.length; i++) {
    const item = orderedItems[i];
    
    if (item === 'verse' || item === 'word') {
      if (displayTxt) {
        textToShare += `📖 말씀\n"${displayTxt}"\n- ${formattedRef}\n\n`;
      }
    } 
    else if (item === 'meditation' && memo?.meditation) {
      textToShare += `💭 묵상\n${memo.meditation}\n\n`;
    }
    else if (item === 'prayer' && memo?.prayer) {
      textToShare += `🙏 기도\n${memo.prayer}\n\n`;
    }
    else if ((item === 'thanksgiving' || item === 'thanks') && memo?.thanks) {
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
  if (window.Kakao && window.Kakao.isInitialized()) {
    window.Kakao.Share.sendDefault({
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
      console.error("나눔 실패:", err);
    }
  }

  // Clipboard copy fallback
  try {
    await navigator.clipboard.writeText(`${textToShare}\n\n${window.location.origin}`);
    alert("나눔 링크가 클립보드에 복사되었습니다!");
  } catch {
    alert("나눔 기능을 지원하지 않는 브라우저입니다.");
  }
};
