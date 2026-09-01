const fs = require('fs');

const replacements = [
  {
    file: 'src/lib/share.ts',
    replaces: [
      { from: /공유 실패/g, to: '나눔 실패' },
      { from: /공유 링크가/g, to: '나눔 링크가' },
      { from: /공유 기능을/g, to: '나눔 기능을' }
    ]
  },
  {
    file: 'src/components/ShareModal.tsx',
    replaces: [
      { from: /공유 항목 선택/g, to: '나눔 항목 선택' },
      { from: /공유할 항목을/g, to: '나눌 항목을' },
      { from: /카카오톡으로 공유하기/g, to: '카카오톡으로 나누기' }
    ]
  },
  {
    file: 'src/components/mypage/MyPageStatsBoard.tsx',
    replaces: [
      { from: /공유하기/g, to: '나눔' },
      { from: /<Share2 /g, to: '<HeartHandshake ' },
      { from: /Share2,/g, to: 'HeartHandshake,' }
    ]
  },
  {
    file: 'src/components/read/BibleContent.tsx',
    replaces: [
      { from: /공유하기/g, to: '나눔' },
      { from: /<Share2 /g, to: '<HeartHandshake ' },
      { from: /Share2,/g, to: 'HeartHandshake,' }
    ]
  },
  {
    file: 'src/hooks/useFriends.ts',
    replaces: [
      { from: /공유 실패/g, to: '나눔 실패' },
      { from: /공유 기능을/g, to: '나눔 기능을' },
      { from: /좋아요 처리 실패/g, to: '아멘 처리 실패' }
    ]
  },
  {
    file: 'src/app/home/page.tsx',
    replaces: [
      { from: /공유할 수도/g, to: '나눌 수도' },
      { from: /공유 아이콘/g, to: '나눔 아이콘' }
    ]
  },
  {
    file: 'src/app/settings/page.tsx',
    replaces: [
      { from: /공유 기본 설정/g, to: '나눔 기본 설정' },
      { from: /공유 시 포함할/g, to: '나눔 시 포함할' }
    ]
  },
  {
    file: 'src/app/verse/[date]/page.tsx',
    replaces: [
      { from: /공유하기/g, to: '나눔' },
      { from: /<Share2 /g, to: '<HeartHandshake ' },
      { from: /Share2,/g, to: 'HeartHandshake,' },
      { from: /공유 모달/g, to: '나눔 모달' }
    ]
  },
  {
    file: 'src/app/friends/page.tsx',
    replaces: [
      { from: /<Share2 /g, to: '<HeartHandshake ' },
      { from: /Share2,/g, to: 'HeartHandshake,' }
    ]
  },
  {
    file: 'src/lib/social.ts',
    replaces: [
      { from: /좋아요 상태 포함/g, to: '아멘 상태 포함' },
      { from: /좋아요 데이터 가져오기/g, to: '아멘 데이터 가져오기' },
      { from: /좋아요 토글/g, to: '아멘 토글' }
    ]
  },
  {
    file: 'src/components/friends/FriendListWidget.tsx',
    replaces: [
      { from: /좋아요 버튼 연동/g, to: '아멘 버튼 연동' }
    ]
  },
  {
    file: 'src/components/friends/LikeButton.tsx',
    replaces: [
      { from: /좋아요 누른 사람/g, to: '아멘 한 사람' },
      { from: /첫 좋아요를 눌러주세요/g, to: '첫 아멘을 보내주세요' },
      { from: /<Heart /g, to: '<HandHeart ' },
      { from: /import { Heart }/g, to: 'import { HandHeart }' }
    ]
  },
  {
    file: 'src/app/friend/[id]/page.tsx',
    replaces: [
      { from: /좋아요 처리 실패/g, to: '아멘 처리 실패' }
    ]
  }
];

for (const rep of replacements) {
  if (fs.existsSync(rep.file)) {
    let content = fs.readFileSync(rep.file, 'utf8');
    for (const r of rep.replaces) {
      content = content.replace(r.from, r.to);
    }
    fs.writeFileSync(rep.file, content);
    console.log(`Updated ${rep.file}`);
  } else {
    console.log(`File not found: ${rep.file}`);
  }
}
