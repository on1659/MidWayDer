import { describe, it, expect } from 'vitest';
import { getSmartOneLiner } from '../smart-summary';
import type { DetourResult } from '@/types/detour';

// ⚠️ 실제 DetourResult 타입 구조 (중첩) 기준으로 작성
// place 중첩, detourCost 중첩 — flat 구조(detourDistance, costScore) 아님
function makeResult(
  detourOverrides: Partial<{ distance: number; duration: number; costScore: number }> = {},
  resultOverrides: Partial<Pick<DetourResult, 'proximityScore' | 'finalScore'>> = {},
): DetourResult {
  const MOCK_ROUTE = {
    distance: 10500, duration: 1200,
    path: [], start: { lat: 37.5663, lng: 126.9779 }, end: { lat: 37.4979, lng: 127.0276 },
  };
  return {
    place: {
      id: 'test-1',
      name: '테스트 매장',
      category: '편의점',
      address: '서울시',
      coordinates: { lat: 37.5, lng: 127.0 },
      businessHours: '09:00~22:00',
    },
    detourCost: {
      distance: detourOverrides.distance ?? 200,  // 왕복 이탈 거리 (미터)
      duration: detourOverrides.duration ?? 30,   // 이탈 시간 (초)
      costScore: detourOverrides.costScore ?? 5,
    },
    routes: { original: MOCK_ROUTE, toWaypoint: MOCK_ROUTE, fromWaypoint: MOCK_ROUTE },
    proximityScore: resultOverrides.proximityScore ?? 90,
    finalScore: resultOverrides.finalScore ?? 85,
  };
}

describe('getSmartOneLiner', () => {
  it('방문 2회 이상 → 방문 횟수 문구 우선', () => {
    const result = makeResult();
    const text = getSmartOneLiner(result, 3, 3); // rank=3, visitCount=3
    expect(text).toContain('3번');
  });

  it('이탈 100m 이하 & 30초 이하 → 거리 기반 문구', () => {
    const result = makeResult({ distance: 80, duration: 20 }); // detourCost.distance
    const text = getSmartOneLiner(result, 2, 0);
    expect(text).toContain('80m');
  });

  it('이탈 50초 미만 → "1분도 안" 문구', () => {
    const result = makeResult({ duration: 45, distance: 300 }); // detourCost.duration (100m 초과)
    const text = getSmartOneLiner(result, 2, 0);
    expect(text).toContain('1분도 안');
  });

  it('1등 & 5분 이내 → "최고의 선택"', () => {
    const result = makeResult({ duration: 250, distance: 1200 });
    const text = getSmartOneLiner(result, 1, 0); // rank=1
    expect(text).toContain('최고의 선택');
  });

  it('조건 미충족 → null 반환', () => {
    const result = makeResult({ duration: 900, distance: 5000 }, { proximityScore: 20 });
    const text = getSmartOneLiner(result, 8, 0);
    expect(text).toBeNull();
  });
});
