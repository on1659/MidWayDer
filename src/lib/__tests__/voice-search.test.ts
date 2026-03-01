import { describe, it, expect } from 'vitest';
import { VOICE_SEARCH_EXAMPLES, startVoiceSearch } from '../voice-search';

describe('VOICE_SEARCH_EXAMPLES', () => {
  it('예시 배열이 존재하고 비어있지 않다', () => {
    expect(Array.isArray(VOICE_SEARCH_EXAMPLES)).toBe(true);
    expect(VOICE_SEARCH_EXAMPLES.length).toBeGreaterThan(0);
  });

  it('각 예시는 문자열이다', () => {
    for (const ex of VOICE_SEARCH_EXAMPLES) {
      expect(typeof ex).toBe('string');
    }
  });
});

describe('startVoiceSearch — 브라우저 미지원', () => {
  it('SpeechRecognition 미지원 시 reject', async () => {
    // window에 SpeechRecognition이 없는 환경에서 호출
    await expect(startVoiceSearch()).rejects.toThrow();
  });
});
