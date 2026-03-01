import { describe, it, expect } from 'vitest';
import { getRecommendationBadges } from '../recommendation-badges';
import { makeDetourResult } from './test-factories';

describe('getRecommendationBadges', () => {
  it('personalizationBoost > 0 → "맞춤 추천" 뱃지 반환', () => {
    const result = makeDetourResult({
      personalizationBoost: 0.8,
      detourCost: { distance: 2000, duration: 300, costScore: 50 },
    });
    const badges = getRecommendationBadges(result, 3);
    expect(badges.some((b) => b.label === '맞춤 추천')).toBe(true);
  });

  it('personalizationBoost 없음 → "맞춤 추천" 뱃지 없음', () => {
    const result = makeDetourResult({
      personalizationBoost: undefined,
      detourCost: { distance: 2000, duration: 300, costScore: 50 },
    });
    const badges = getRecommendationBadges(result, 2);
    expect(badges.some((b) => b.label === '맞춤 추천')).toBe(false);
  });

  it('최소 이탈 (거리 500m 이하) → "최소 이탈" 뱃지', () => {
    const result = makeDetourResult({
      detourCost: { distance: 300, duration: 200, costScore: 10 },
    });
    const badges = getRecommendationBadges(result, 2);
    expect(badges.some((b) => b.label === '최소 이탈')).toBe(true);
  });

  it('반환 수는 최대 2개', () => {
    const result = makeDetourResult({
      detourCost: { distance: 200, duration: 40, costScore: 5 },
      proximityScore: 92,
      personalizationBoost: 0.5,
    });
    const badges = getRecommendationBadges(result, 1);
    expect(badges.length).toBeLessThanOrEqual(2);
  });

  it('우선순위 오름차순 정렬', () => {
    const result = makeDetourResult({
      detourCost: { distance: 200, duration: 50, costScore: 5 },
      proximityScore: 92,
      personalizationBoost: 0.5,
    });
    const badges = getRecommendationBadges(result, 1);
    const priorities = badges.map((b) => b.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });

  it('결과 1등 + 특별 뱃지 없음 → "최적 경유지" 뱃지', () => {
    const result = makeDetourResult({
      detourCost: { distance: 2000, duration: 300, costScore: 50 },
      proximityScore: 50,
    });
    const badges = getRecommendationBadges(result, 1);
    expect(badges.some((b) => b.label === '최적 경유지')).toBe(true);
  });
});
