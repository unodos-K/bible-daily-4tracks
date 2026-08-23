const places = [
  "광야에서", "골방에서", "성전에서", "시온산에서", "푸른 초장에서",
  "에덴에서", "겟세마네에서", "갈릴리에서", "예루살렘에서", "베들레헴에서",
  "나사렛에서", "요단강에서", "시내산에서", "호렙산에서", "가나안에서",
  "다메섹에서", "여리고에서", "안디옥에서", "바벨론에서", "갈멜산에서"
];

const actions = [
  "노래하는", "기도하는", "묵상하는", "순종하는", "감사하는",
  "예배하는", "말씀읽는", "기뻐하는", "전도하는", "찬양하는",
  "눈물짓는", "사랑하는", "위로하는", "섬기는", "기다리는",
  "헌신하는", "선포하는", "경외하는", "부르짖는", "순례하는"
];

const characters = [
  "다윗", "모세", "바울", "에스더", "룻",
  "요한", "베드로", "마리아", "다니엘", "요셉",
  "아브라함", "이삭", "야곱", "사무엘", "솔로몬",
  "여호수아", "엘리야", "이사야", "예레미야", "에스겔",
  "마태", "마가", "누가", "디모데", "실라"
];

export function generateNickname(): string {
  const randomPlace = places[Math.floor(Math.random() * places.length)];
  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
  
  // 0000 ~ 9999
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");

  return `${randomPlace} ${randomAction} ${randomCharacter}#${randomNum}`;
}
