import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectRoutine } from '../detector';

function mockTime(isoDate: string) {
  vi.setSystemTime(new Date(isoDate));
}

describe('detectRoutine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('평일 오전 8시 → "morning-commute" 감지', () => {
    mockTime('2026-03-02T08:00:00+09:00'); // 월요일
    expect(detectRoutine()).toBe('morning-commute');
  });

  it('평일 오후 6시 → "evening-commute" 감지', () => {
    mockTime('2026-03-02T18:00:00+09:00'); // 월요일
    expect(detectRoutine()).toBe('evening-commute');
  });

  it('주말 낮 → "weekend-trip" 감지', () => {
    mockTime('2026-02-28T14:00:00+09:00'); // 토요일
    expect(detectRoutine()).toBe('weekend-trip');
  });

  it('새벽 2시 → null (루틴 없음)', () => {
    mockTime('2026-03-02T02:00:00+09:00'); // 평일 새벽
    expect(detectRoutine()).toBeNull();
  });

  it('주말 오전 8시 → "morning-commute" 아님', () => {
    mockTime('2026-02-28T08:00:00+09:00'); // 토요일
    expect(detectRoutine()).not.toBe('morning-commute');
  });

  it('반환값은 RoutineType 또는 null', () => {
    const VALID = ['morning-commute', 'evening-commute', 'weekend-trip', null];
    mockTime('2026-03-02T09:00:00+09:00');
    expect(VALID).toContain(detectRoutine());
  });
});
