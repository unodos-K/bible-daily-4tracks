/**
 * 문자열에서 한글, 영문, 숫자만 추출합니다 (공백, 기호, 특수문자 제거).
 * STT 유사도 비교 시 노이즈를 제거하기 위해 사용합니다.
 */
export function extractCleanText(text: string): string {
  if (!text) return "";
  return text.replace(/[^\uAC00-\uD7A30-9a-zA-Z]/g, '');
}

/**
 * 쓰기 도전의 답안을 비교할 때 모바일 입력 차이만 완화합니다.
 * 글자와 문장부호는 유지하고, Unicode 조합 및 연속 공백/줄바꿈만 정리합니다.
 */
export function normalizeMemoryAnswer(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * 레벤슈타인 거리(Levenshtein Distance) 알고리즘을 사용하여 두 문자열 간의 거리를 계산합니다.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * 두 텍스트의 유사도를 백분율(0~1)로 반환합니다.
 */
export function calculateSimilarity(original: string, spoken: string): number {
  const cleanOriginal = extractCleanText(original);
  const cleanSpoken = extractCleanText(spoken);

  if (cleanOriginal.length === 0 && cleanSpoken.length === 0) return 1.0;
  if (cleanOriginal.length === 0 || cleanSpoken.length === 0) return 0.0;

  const distance = getLevenshteinDistance(cleanOriginal, cleanSpoken);
  const maxLength = Math.max(cleanOriginal.length, cleanSpoken.length);
  
  return (maxLength - distance) / maxLength;
}
