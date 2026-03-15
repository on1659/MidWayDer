import { describe, it, expect } from 'vitest';
import { detectRoutine } from '../detector';

/**
 * 특정 시간과 요일로 Date 객체 생성 (시간대 독립적)
 * @param hour - 시간 (0-23)
 * @param day - 요일 (0=일, 1=월, ..., 6=토)
 */
function mockDate(hour: number, day: number): Date {
  // 2026-03-02는 월요일 (day=1)
  // 각 요일별로 기준 날짜 계산
  const baseMonday = new Date('2026-03-02T00:00:00');
  const targetDate = new Date(baseMonday);
  targetDate.setDate(baseMonday.getDate() + (day - 1)); // day=1이면 월요일, day=6이면 토요일
  targetDate.setHours(hour, 0, 0, 0);
  return targetDate;
}

describe('detectRoutine', () => {
  it('평일 오전 8시 → "morning-commute" 감지', () => {
    expect(detectRoutine(mockDate(8, 1))).toBe('morning-commute'); // 월요일 8시
  });

  it('평일 오후 6시 → "evening-commute" 감지', () => {
    expect(detectRoutine(mockDate(18, 1))).toBe('evening-commute'); // 월요일 18시
  });

  it('주말 낮 → "weekend-trip" 감지', () => {
    expect(detectRoutine(mockDate(14, 6))).toBe('weekend-trip'); // 토요일 14시
  });

  it('새벽 2시 → null (루틴 없음)', () => {
    expect(detectRoutine(mockDate(2, 1))).toBeNull(); // 월요일 2시
  });

  it('주말 오전 8시 → "morning-commute" 아님', () => {
    expect(detectRoutine(mockDate(8, 6))).not.toBe('morning-commute'); // 토요일 8시
  });

  it('반환값은 RoutineType 또는 null', () => {
    const VALID = ['morning-commute', 'evening-commute', 'weekend-trip', null];
    expect(VALID).toContain(detectRoutine(mockDate(9, 1))); // 월요일 9시
  });
});
