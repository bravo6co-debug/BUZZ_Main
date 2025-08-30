/**
 * 욕설 및 부적절한 내용 필터링 서비스
 */

// 한국어 욕설 및 부적절한 단어 목록
const PROFANITY_WORDS = [
  // 일반적인 욕설
  '씨발', '시발', 'ㅅㅂ', 'ㅂㅅ', 'ㅄ', '병신', '개새끼', '새끼', '좆', 'ㅈ같은',
  '미친', '또라이', '바보', '멍청', '븅신', 'ㅂㅅ', '개소리', '헛소리',
  
  // 차별적 표현
  '장애인', '정신병', '미개', '토착민', 
  
  // 성적 표현
  '야동', '야설', '섹스', '자위', '딸딸이', 'ㅅㅅ',
  
  // 기타 부적절한 표현
  '죽어', '뒈져', '꺼져', '닥쳐', 'ㅈㄹ', '개판', '쓰레기', '거지',
  
  // 영어 욕설
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'stupid', 'idiot'
];

// 대체 문자 매핑
const SIMILAR_CHARS: { [key: string]: string[] } = {
  'ㅅ': ['시', 's', '5'],
  'ㅂ': ['바', 'b', '8'],
  'ㅈ': ['자', 'j'],
  'ㅄ': ['병신', 'bs'],
  'ㅗ': ['오', 'o', '0'],
  'ㅜ': ['우', 'u'],
  'ㅡ': ['으', '-', '_'],
  'ㅣ': ['이', 'i', '1', 'l'],
};

// 특수문자를 이용한 우회 패턴
const BYPASS_PATTERNS = [
  /[.*_-]+/g, // 특수문자로 단어 분리
  /(.)\1{2,}/g, // 같은 문자 3번 이상 반복
  /[0-9]+/g, // 숫자 삽입
];

/**
 * 텍스트에서 욕설 및 부적절한 내용 필터링
 */
export const filterProfanity = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) {
    return text;
  }

  let filteredText = text;

  // 1. 직접적인 욕설 필터링
  for (const badWord of PROFANITY_WORDS) {
    const regex = new RegExp(badWord, 'gi');
    const replacement = '*'.repeat(badWord.length);
    filteredText = filteredText.replace(regex, replacement);
  }

  // 2. 변형된 욕설 필터링 (자음/모음 조합)
  filteredText = filterVariantProfanity(filteredText);

  // 3. 특수문자를 이용한 우회 표현 필터링
  filteredText = filterBypassAttempts(filteredText);

  return filteredText;
};

/**
 * 변형된 욕설 필터링 (자음 조합 등)
 */
const filterVariantProfanity = (text: string): string => {
  let filteredText = text;

  // 자음 조합 패턴 (ㅅㅂ, ㅂㅅ 등)
  const consonantPatterns = [
    { pattern: /ㅅㅂ/g, replacement: '**' },
    { pattern: /ㅂㅅ/g, replacement: '**' },
    { pattern: /ㅄ/g, replacement: '**' },
    { pattern: /ㅈㄹ/g, replacement: '**' },
    { pattern: /ㅗㅜㅑ/g, replacement: '***' },
  ];

  consonantPatterns.forEach(({ pattern, replacement }) => {
    filteredText = filteredText.replace(pattern, replacement);
  });

  return filteredText;
};

/**
 * 특수문자를 이용한 우회 시도 필터링
 */
const filterBypassAttempts = (text: string): string => {
  let filteredText = text;

  // 특수문자 제거 후 욕설 검사
  const cleanText = text
    .replace(/[^가-힣a-zA-Z0-9\s]/g, '') // 특수문자 제거
    .replace(/\s+/g, ''); // 공백 제거

  // 정제된 텍스트에서 욕설 검사
  for (const badWord of PROFANITY_WORDS) {
    if (cleanText.toLowerCase().includes(badWord.toLowerCase())) {
      // 원본 텍스트에서 해당 부분을 찾아 마스킹
      const maskedText = maskSimilarText(filteredText, badWord);
      filteredText = maskedText;
    }
  }

  return filteredText;
};

/**
 * 유사한 텍스트 패턴을 찾아서 마스킹
 */
const maskSimilarText = (text: string, targetWord: string): string => {
  // 단순화된 마스킹 - 실제로는 더 정교한 알고리즘이 필요
  const words = text.split(/\s+/);
  const maskedWords = words.map(word => {
    const cleanWord = word.replace(/[^가-힣a-zA-Z]/g, '').toLowerCase();
    const cleanTarget = targetWord.toLowerCase();
    
    if (cleanWord.includes(cleanTarget) || calculateSimilarity(cleanWord, cleanTarget) > 0.7) {
      return '*'.repeat(word.length);
    }
    return word;
  });

  return maskedWords.join(' ');
};

/**
 * 두 문자열의 유사도 계산 (레벤슈타인 거리 기반)
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // 행렬 초기화
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  // 레벤슈타인 거리 계산
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
};

/**
 * 텍스트가 부적절한 내용을 포함하는지 검사
 */
export const containsProfanity = async (text: string): Promise<boolean> => {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // 직접적인 욕설 검사
  for (const badWord of PROFANITY_WORDS) {
    if (text.toLowerCase().includes(badWord.toLowerCase())) {
      return true;
    }
  }

  // 자음 조합 검사
  const consonantPatterns = [/ㅅㅂ/g, /ㅂㅅ/g, /ㅄ/g, /ㅈㄹ/g];
  for (const pattern of consonantPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // 특수문자 우회 시도 검사
  const cleanText = text
    .replace(/[^가-힣a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '');

  for (const badWord of PROFANITY_WORDS) {
    if (cleanText.toLowerCase().includes(badWord.toLowerCase())) {
      return true;
    }
  }

  return false;
};

/**
 * 욕설 심각도 평가 (1-5단계)
 */
export const evaluateProfanityLevel = async (text: string): Promise<number> => {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  let level = 0;
  const lowerText = text.toLowerCase();

  // 심각한 욕설 (레벨 5)
  const severeProfanity = ['씨발', '시발', '개새끼', '좆', '뒈져'];
  for (const word of severeProfanity) {
    if (lowerText.includes(word)) {
      level = Math.max(level, 5);
    }
  }

  // 중간 정도 욕설 (레벨 3)
  const moderateProfanity = ['바보', '멍청', '미친', 'ㅅㅂ', 'ㅂㅅ'];
  for (const word of moderateProfanity) {
    if (lowerText.includes(word)) {
      level = Math.max(level, 3);
    }
  }

  // 경미한 부적절한 표현 (레벨 1)
  const mildProfanity = ['짜증', '답답', '화나'];
  for (const word of mildProfanity) {
    if (lowerText.includes(word)) {
      level = Math.max(level, 1);
    }
  }

  return level;
};

/**
 * 욕설 단어 목록에 새로운 단어 추가 (관리자용)
 */
export const addProfanityWord = (word: string): void => {
  if (word && word.trim().length > 0 && !PROFANITY_WORDS.includes(word.trim())) {
    PROFANITY_WORDS.push(word.trim());
  }
};

/**
 * 현재 욕설 단어 목록 조회 (관리자용)
 */
export const getProfanityWords = (): string[] => {
  return [...PROFANITY_WORDS]; // 복사본 반환
};

/**
 * 욕설 필터링 통계 정보
 */
export interface ProfanityFilterStats {
  originalLength: number;
  filteredLength: number;
  badWordsCount: number;
  profanityLevel: number;
  containsProfanity: boolean;
}

/**
 * 텍스트 필터링과 함께 통계 정보 제공
 */
export const filterWithStats = async (text: string): Promise<{
  filteredText: string;
  stats: ProfanityFilterStats;
}> => {
  const originalLength = text ? text.length : 0;
  const filteredText = await filterProfanity(text);
  const filteredLength = filteredText.length;
  
  let badWordsCount = 0;
  for (const badWord of PROFANITY_WORDS) {
    const regex = new RegExp(badWord, 'gi');
    const matches = text.match(regex);
    if (matches) {
      badWordsCount += matches.length;
    }
  }

  const profanityLevel = await evaluateProfanityLevel(text);
  const hasProfanity = await containsProfanity(text);

  return {
    filteredText,
    stats: {
      originalLength,
      filteredLength,
      badWordsCount,
      profanityLevel,
      containsProfanity: hasProfanity
    }
  };
};