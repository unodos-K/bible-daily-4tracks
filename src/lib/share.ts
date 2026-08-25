import { DayRecord, OneVerse } from "./storage";

export const shareOneVerse = async (
  record: DayRecord, 
  nickname: string, 
  shareOptions: { meditation: boolean, prayer: boolean, thanks: boolean, application: boolean } = { meditation: true, prayer: true, thanks: true, application: true }
) => {
  if (typeof window === "undefined") return;

  const displayTxt = record.oneVerse?.displayText || record.oneVerse?.rawText || '';
  const formattedRef = `${record.oneVerse?.book} ${record.oneVerse?.chapter}장 ${record.oneVerse?.verse}절`;
  
  let memoTxt = '';
  const memo = record.oneVerse?.memo;
  
  if (memo) {
    if (typeof memo === 'string') {
      if (shareOptions.meditation) memoTxt += `\n\n[묵상]\n${memo}`;
    } else {
      if (shareOptions.meditation && memo.meditation) memoTxt += `\n\n[묵상]\n${memo.meditation}`;
      if (shareOptions.prayer && memo.prayer) memoTxt += `\n\n[기도]\n${memo.prayer}`;
      if (shareOptions.thanks && memo.thanks) memoTxt += `\n\n[감사하기]\n${memo.thanks}`;
      if (shareOptions.application && memo.application && memo.application.length > 0) {
        memoTxt += `\n\n[삶에 적용하기]\n` + memo.application.map(a => `[${a.checked ? 'v' : ' '}] ${a.text}`).join('\n');
      }
    }
  }
  
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
