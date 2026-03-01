/**
 * visit-tracking.test.ts
 * localStorage 기반 방문 기록 시스템 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordVisit,
  getVisitHistory,
  getVisitCount,
  getTotalVisitCount,
  hasVisited,
  clearVisitHistory,
  getCategoryVisitCount,
  getRecentVisits,
} from '../visit-tracking';

// Node 환경에서 window/localStorage 사용 가능하도록 stub
const store: Record<string, string> = {};
vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
});

const STORAGE_KEY = 'midwayder_visit_history';

describe('visit-tracking', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('recordVisit → getVisitHistory에 포함', () => {
    recordVisit('p1', '다이소 강남점', '다이소', 'route-abc');
    const history = getVisitHistory();
    expect(history).toHaveLength(1);
    expect(history[0].placeId).toBe('p1');
    expect(history[0].routeHash).toBe('route-abc');
  });

  it('같은 placeId + routeHash + 1시간 이내 중복 방문 무시', () => {
    recordVisit('p1', '다이소 강남점', '다이소', 'route-abc');
    recordVisit('p1', '다이소 강남점', '다이소', 'route-abc'); // 즉시 재방문
    expect(getVisitHistory()).toHaveLength(1);
  });

  it('다른 routeHash이면 같은 placeId도 별도 기록', () => {
    recordVisit('p1', '다이소 강남점', '다이소', 'route-abc');
    recordVisit('p1', '다이소 강남점', '다이소', 'route-xyz'); // 다른 경로
    expect(getVisitHistory()).toHaveLength(2);
  });

  it('getVisitCount — 경로별 방문 횟수', () => {
    recordVisit('p1', '다이소 강남점', '다이소', 'route-abc');
    expect(getVisitCount('p1', 'route-abc')).toBe(1);
    expect(getVisitCount('p1', 'route-xyz')).toBe(0);
  });

  it('getTotalVisitCount — 전체 경로 합산', () => {
    recordVisit('p1', '다이소 강남점', '다이소', 'route-abc');
    recordVisit('p1', '다이소 강남점', '다이소', 'route-xyz');
    expect(getTotalVisitCount('p1')).toBe(2);
  });

  it('hasVisited — 방문 여부 판별', () => {
    recordVisit('p1', '다이소 강남점', '다이소', 'route-abc');
    expect(hasVisited('p1', 'route-abc')).toBe(true);
    expect(hasVisited('p1', 'route-other')).toBe(false);
    expect(hasVisited('p999', 'route-abc')).toBe(false);
  });

  it('clearVisitHistory 후 기록 없음', () => {
    recordVisit('p1', '다이소 강남점', '다이소', 'route-abc');
    clearVisitHistory();
    expect(getVisitHistory()).toHaveLength(0);
  });

  it('getCategoryVisitCount — 카테고리별 카운트', () => {
    recordVisit('p1', '다이소 강남점', '다이소', 'route-a');
    recordVisit('p2', '스타벅스 역삼점', '카페', 'route-b');
    recordVisit('p3', '이마트24', '편의점', 'route-c');
    expect(getCategoryVisitCount('다이소')).toBe(1);
    expect(getCategoryVisitCount('카페')).toBe(1);
    expect(getCategoryVisitCount('편의점')).toBe(1);
    expect(getCategoryVisitCount('약국')).toBe(0);
  });

  it('getRecentVisits limit 적용', () => {
    // 15개 방문 기록 직접 삽입
    const many = Array.from({ length: 15 }, (_, i) => ({
      placeId: `p${i}`,
      placeName: `장소 ${i}`,
      category: '카페',
      routeHash: `r${i}`,
      visitedAt: Date.now() - i * 1000,
    }));
    store[STORAGE_KEY] = JSON.stringify(many);

    expect(getRecentVisits(5)).toHaveLength(5);
    expect(getRecentVisits()).toHaveLength(10); // 기본 limit=10
    expect(getRecentVisits(20)).toHaveLength(15); // 전체 반환
  });

  it('방문 기록 없을 때 빈 배열 반환', () => {
    expect(getVisitHistory()).toEqual([]);
    expect(getRecentVisits()).toEqual([]);
    expect(getTotalVisitCount('p1')).toBe(0);
  });
});
