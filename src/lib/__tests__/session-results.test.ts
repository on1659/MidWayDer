/**
 * session-results.test.ts
 * sessionStorage 기반 검색 결과 캐시 TTL 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSessionResults, loadSessionResults, clearSessionResults } from '../cache/session-results';
import type { SessionResultsCache } from '../cache/session-results';

// sessionStorage stub
const store: Record<string, string> = {};
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
});

const SESSION_KEY = 'midwayder_last_search';

const makePayload = (overrides: Partial<SessionResultsCache> = {}): SessionResultsCache => ({
  results: [],
  startAddress: '서울시청',
  startCoords: { lat: 37.5663, lng: 126.9779 },
  endAddress: '강남역',
  endCoords: { lat: 37.4979, lng: 127.0276 },
  category: '다이소',
  totalCandidates: 10,
  apiCallsUsed: 3,
  savedAt: Date.now(),
  ...overrides,
});

describe('session-results', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('저장 후 loadSessionResults로 동일 데이터 복원', () => {
    const payload = makePayload();
    saveSessionResults(payload);
    const loaded = loadSessionResults();
    expect(loaded).not.toBeNull();
    expect(loaded!.category).toBe('다이소');
    expect(loaded!.startAddress).toBe('서울시청');
    expect(loaded!.endAddress).toBe('강남역');
  });

  it('30분 TTL 초과 시 null 반환', () => {
    const payload = makePayload({ savedAt: Date.now() - 31 * 60 * 1000 });
    saveSessionResults(payload);
    // savedAt을 TTL 초과로 직접 조작
    const raw = JSON.parse(store[SESSION_KEY] || '{}');
    raw.savedAt = Date.now() - 31 * 60 * 1000;
    store[SESSION_KEY] = JSON.stringify(raw);
    expect(loadSessionResults()).toBeNull();
  });

  it('저장 데이터 없으면 null 반환', () => {
    expect(loadSessionResults()).toBeNull();
  });

  it('corrupt JSON도 null 반환 (방어적 처리)', () => {
    store[SESSION_KEY] = 'NOT_VALID_JSON{{{';
    expect(loadSessionResults()).toBeNull();
  });

  it('clearSessionResults 후 로드 시 null 반환', () => {
    saveSessionResults(makePayload());
    clearSessionResults();
    expect(loadSessionResults()).toBeNull();
  });

  it('TTL 이내에는 정상 복원', () => {
    const payload = makePayload({ savedAt: Date.now() - 10 * 60 * 1000 }); // 10분 전
    saveSessionResults(payload);
    // savedAt을 10분 전으로 조작
    const raw = JSON.parse(store[SESSION_KEY] || '{}');
    raw.savedAt = Date.now() - 10 * 60 * 1000;
    store[SESSION_KEY] = JSON.stringify(raw);
    expect(loadSessionResults()).not.toBeNull();
  });
});
