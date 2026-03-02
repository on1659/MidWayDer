import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock은 호이스팅되므로 팩토리 내부에서 vi.fn() 인라인 정의
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    clickLog: {
      groupBy: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { calculatePersonalizationScores } from '@/lib/personalization/scorer';
import { prisma } from '@/lib/db/prisma';

const mockGroupBy = vi.mocked(prisma.clickLog.groupBy);

const PLACE_IDS = ['place-A', 'place-B', 'place-C'];

describe('calculatePersonalizationScores', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── 정상 케이스 ───────────────────────────────────────
  it('클릭 이력 없는 신규 사용자 → 기본 점수 0 반환', async () => {
    mockGroupBy.mockResolvedValue([]);

    const scores = await calculatePersonalizationScores('new-session', 'route-hash', PLACE_IDS);

    expect(scores).toHaveLength(PLACE_IDS.length);
    scores.forEach(s => {
      expect(s.personalScore).toBe(0);
      expect(s.popularityScore).toBe(0);
      expect(s.finalBoost).toBe(-5); // 0*0.7 + 0*0.3 = 0 → 0/10 - 5 = -5
    });
  });

  it('클릭 이력 있는 사용자 → 클릭된 place 점수 상승', async () => {
    mockGroupBy
      .mockResolvedValueOnce([{ placeId: 'place-A', _count: { placeId: 3 } }])
      .mockResolvedValueOnce([]);

    const scores = await calculatePersonalizationScores('user-session', 'route-hash', PLACE_IDS);
    const scoreA = scores.find(s => s.placeId === 'place-A')!;
    const scoreB = scores.find(s => s.placeId === 'place-B')!;

    expect(scoreA.personalScore).toBe(100); // 3/3 * 100
    expect(scoreB.personalScore).toBe(0);
    expect(scoreA.finalBoost).toBeGreaterThan(scoreB.finalBoost);
  });

  it('경로 인기도 있는 경우 popularityScore 반영', async () => {
    mockGroupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ placeId: 'place-B', _count: { placeId: 5 } }]);

    const scores = await calculatePersonalizationScores('session-x', 'popular-route', PLACE_IDS);
    const scoreB = scores.find(s => s.placeId === 'place-B')!;

    expect(scoreB.popularityScore).toBe(100); // 5/5 * 100
    expect(scoreB.personalScore).toBe(0);
    // finalBoost = (0*0.7 + 100*0.3) / 10 - 5 = 3 - 5 = -2
    expect(scoreB.finalBoost).toBeCloseTo(-2, 5);
  });

  it('반환된 배열은 입력 placeIds 순서/길이 동일', async () => {
    mockGroupBy.mockResolvedValue([]);

    const scores = await calculatePersonalizationScores('s', 'r', PLACE_IDS);
    expect(scores.map(s => s.placeId)).toEqual(PLACE_IDS);
  });

  // ─── finalBoost 범위 검증 ───────────────────────────────
  it('finalBoost 범위 -5 ~ +5 이내', async () => {
    mockGroupBy
      .mockResolvedValueOnce([{ placeId: 'place-A', _count: { placeId: 10 } }])
      .mockResolvedValueOnce([{ placeId: 'place-A', _count: { placeId: 10 } }]);

    const scores = await calculatePersonalizationScores('s', 'r', ['place-A']);
    const s = scores[0];

    expect(s.finalBoost).toBeGreaterThanOrEqual(-5);
    expect(s.finalBoost).toBeLessThanOrEqual(5);
  });

  // ─── 빈 배열 입력 ───────────────────────────────────────
  it('빈 placeIds 입력 → 빈 배열 반환 (Math.max 에러 없음)', async () => {
    mockGroupBy.mockResolvedValue([]);

    const scores = await calculatePersonalizationScores('s', 'r', []);
    expect(scores).toHaveLength(0);
    expect(Array.isArray(scores)).toBe(true);
  });

  // ─── DB 오류 graceful fallback ───────────────────────────
  it('DB 오류 시 모든 place 기본 점수 0으로 반환 (throw 없음)', async () => {
    mockGroupBy.mockRejectedValue(new Error('DB connection refused'));

    const scores = await calculatePersonalizationScores('s', 'r', PLACE_IDS);

    expect(scores).toHaveLength(PLACE_IDS.length);
    scores.forEach(s => {
      expect(s.personalScore).toBe(0);
      expect(s.popularityScore).toBe(0);
      expect(s.finalBoost).toBe(0); // error fallback은 단순 0
    });
  });

  it('DB 오류 시 반환 배열의 placeId 순서 보존', async () => {
    mockGroupBy.mockRejectedValue(new Error('timeout'));

    const scores = await calculatePersonalizationScores('s', 'r', PLACE_IDS);
    expect(scores.map(s => s.placeId)).toEqual(PLACE_IDS);
  });

  it('groupBy 호출 횟수 정확히 2번 (userClicks + routePopularity)', async () => {
    mockGroupBy.mockResolvedValue([]);

    await calculatePersonalizationScores('s', 'r', PLACE_IDS);
    expect(mockGroupBy).toHaveBeenCalledTimes(2);
  });
});
