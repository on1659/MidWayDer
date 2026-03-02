import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTimeBasedCategoryHints, getTimeGreeting } from '@/lib/smart-category';

// 현재 시각을 특정 시간으로 고정
function mockHour(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  vi.setSystemTime(date);
}

describe('getTimeBasedCategoryHints — 시간대별 분기', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('06시 → 스타벅스/카페 반환 (이른 아침)', () => {
    mockHour(6);
    const hints = getTimeBasedCategoryHints();
    expect(hints).toHaveLength(2);
    expect(hints.map(h => h.category)).toContain('스타벅스');
  });

  it('10시 → 다이소/올리브영 반환 (오전)', () => {
    mockHour(10);
    const hints = getTimeBasedCategoryHints();
    expect(hints.map(h => h.category)).toContain('다이소');
    expect(hints.map(h => h.category)).toContain('올리브영');
  });

  it('12시 → CU/카페 반환 (점심)', () => {
    mockHour(12);
    const hints = getTimeBasedCategoryHints();
    expect(hints.map(h => h.category)).toContain('CU');
    expect(hints.map(h => h.category)).toContain('카페');
  });

  it('17시 → 다이소/CU 반환 (퇴근)', () => {
    mockHour(17);
    const hints = getTimeBasedCategoryHints();
    expect(hints.map(h => h.category)).toContain('다이소');
  });

  it('20시 → CU/주유소 반환 (저녁)', () => {
    mockHour(20);
    const hints = getTimeBasedCategoryHints();
    expect(hints.map(h => h.category)).toContain('CU');
    expect(hints.map(h => h.category)).toContain('주유소');
  });

  it('모든 힌트는 category, emoji, label, reason 필드 보유', () => {
    mockHour(14);
    const hints = getTimeBasedCategoryHints();
    hints.forEach(hint => {
      expect(hint).toHaveProperty('category');
      expect(hint).toHaveProperty('emoji');
      expect(hint).toHaveProperty('label');
      expect(hint).toHaveProperty('reason');
      expect(hint.category.length).toBeGreaterThan(0);
    });
  });

  it('항상 정확히 2개 반환 (빈 배열 없음)', () => {
    [6, 10, 12, 14, 17, 20].forEach(hour => {
      mockHour(hour);
      expect(getTimeBasedCategoryHints()).toHaveLength(2);
    });
  });
});

describe('getTimeGreeting — 시간대별 인사말', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('06시 → 좋은 아침 포함', () => {
    mockHour(6);
    expect(getTimeGreeting()).toContain('아침');
  });

  it('12시 → 점심 포함', () => {
    mockHour(12);
    expect(getTimeGreeting()).toContain('점심');
  });

  it('22시 → 저녁 포함', () => {
    mockHour(22);
    expect(getTimeGreeting()).toContain('저녁');
  });
});
