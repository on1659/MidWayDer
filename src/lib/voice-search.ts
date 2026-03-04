/**
 * Voice Search — Web Speech API Wrapper
 * 
 * 음성으로 출발지, 도착지, 카테고리를 한 번에 입력
 * 예: "강남역에서 판교역으로 스타벅스"
 */

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export interface VoiceSearchResult {
  start?: string;
  end?: string;
  category?: string;
  raw: string;
}

/**
 * 음성 인식 시작
 * @returns Promise<VoiceSearchResult>
 * @throws Error if browser doesn't support Web Speech API
 */
// 오류 메시지 공통 헬퍼
function mapSpeechError(error: string): string {
  switch (error) {
    case 'no-speech':    return '음성이 감지되지 않았어요. 다시 시도해주세요 🎤';
    case 'audio-capture': return '마이크를 찾을 수 없어요. 마이크 연결을 확인해주세요 🎙️';
    case 'not-allowed':  return '마이크 권한이 거부되었어요. 브라우저 설정에서 허용해주세요 🔒';
    case 'network':      return '네트워크 오류가 발생했어요. 인터넷 연결을 확인해주세요 🌐';
    case 'aborted':      return '음성 인식이 취소되었어요';
    default:             return `음성 인식 오류: ${error}`;
  }
}

export interface VoiceSearchFeedbackOptions {
  onInterimText: (text: string) => void;
  setIsListening: (listening: boolean) => void;
  setError: (error: string) => void;
}

export const startVoiceSearch = (): Promise<VoiceSearchResult> => {
  return new Promise((resolve, reject) => {
    // 브라우저 지원 체크
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      reject(new Error('이 브라우저는 음성 인식을 지원하지 않아요 😢'));
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();

    // 설정
    recognition.lang = 'ko-KR';
    recognition.continuous = false; // 한 문장만 인식
    recognition.interimResults = false; // 최종 결과만 받기
    recognition.maxAlternatives = 1; // 가장 확실한 결과 1개만

    // 음성 인식 성공
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      const parsed = parseVoiceInput(transcript);
      resolve(parsed);
    };

    // 음성 인식 실패
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      reject(new Error(mapSpeechError(event.error)));
    };

    // 음성 인식이 아무 결과 없이 끝났을 때
    recognition.onend = () => {
      // 이미 resolve나 reject가 호출되지 않았다면 에러 처리
      reject(new Error('음성이 감지되지 않았어요. 다시 시도해주세요 🎤'));
    };

    // 시작!
    recognition.start();
  });
};

export const startVoiceSearchWithFeedback = (
  options: VoiceSearchFeedbackOptions
): Promise<VoiceSearchResult> => {
  return new Promise((resolve, reject) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      reject(new Error('이 브라우저는 음성 인식을 지원하지 않아요 😢'));
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let settled = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) options.onInterimText(interim);
      if (final && !settled) {
        settled = true;
        options.onInterimText('');
        resolve(parseVoiceInput(final));
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (settled) return;
      settled = true;
      options.setError(mapSpeechError(event.error));
      reject(new Error(mapSpeechError(event.error)));
    };

    recognition.onend = () => {
      options.setIsListening(false);
      if (!settled) {
        settled = true;
        reject(new Error('음성이 감지되지 않았어요. 다시 시도해주세요 🎤'));
      }
    };

    recognition.start();
  });
};

/**
 * 음성 입력 파싱
 * 
 * 패턴:
 * - "A에서 B로 C" → { start: A, end: B, category: C }
 * - "A에서 B까지 C" → { start: A, end: B, category: C }
 * - "A에서 B" → { start: A, end: B }
 * - "A에서 B로" → { start: A, end: B }
 * - 그 외 → { raw: 입력 전체 }
 */
const parseVoiceInput = (text: string): VoiceSearchResult => {
  // 공백 정리
  const cleanText = text.trim().replace(/\s+/g, ' ');

  // 패턴 1: "A에서 B로/까지 C"
  const pattern1 = /(.+?)에서\s+(.+?)(?:로|까지)\s+(.+)/;
  const match1 = cleanText.match(pattern1);
  if (match1) {
    return {
      start: match1[1].trim(),
      end: match1[2].trim(),
      category: match1[3].trim(),
      raw: cleanText,
    };
  }

  // 패턴 2: "A에서 B"
  const pattern2 = /(.+?)에서\s+(.+)/;
  const match2 = cleanText.match(pattern2);
  if (match2) {
    return {
      start: match2[1].trim(),
      end: match2[2].trim(),
      raw: cleanText,
    };
  }

  // 패턴 3: "A까지" (도착지만)
  const pattern3 = /(.+?)까지/;
  const match3 = cleanText.match(pattern3);
  if (match3) {
    return {
      end: match3[1].trim(),
      raw: cleanText,
    };
  }

  // 파싱 실패 → 원본 텍스트 반환
  return {
    raw: cleanText,
  };
};

/**
 * 음성 입력 예시 텍스트
 */
export const VOICE_SEARCH_EXAMPLES = [
  '강남역에서 판교역으로 스타벅스',
  '서울역에서 부산역까지 편의점',
  '홍대입구역에서 잠실역으로 카페',
  '인천공항에서 강남역까지',
];
