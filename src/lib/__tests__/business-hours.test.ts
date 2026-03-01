import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getBusinessStatus,
  getMinutesUntilClose,
  getMinutesUntilOpen,
  getBusinessHoursRange,
  formatBusinessHours,
} from '../business-hours';

// 시각 모킹 헬퍼
function mockTime(hour: number, minute = 0) {
  const now = new Date();
  now.setHours(hour, minute, 0, 0);
  vi.setSystemTime(now);
}

describe('getBusinessStatus', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('영업 중 (09~22, 현재 12시)', () => {
    mockTime(12);
    const result = getBusinessStatus('09:00~22:00');
    expect(result.isOpen).toBe(true);
  });

  it('영업 종료 (09~22, 현재 23시)', () => {
    mockTime(23);
    const result = getBusinessStatus('09:00~22:00');
    expect(result.isOpen).toBe(false);
  });

  it('24시간 영업', () => {
    mockTime(3); // 새벽 3시
    const result = getBusinessStatus('24시간');
    expect(result.isOpen).toBe(true);
  });

  it('"영업종료" 문자열', () => {
    const result = getBusinessStatus('영업종료');
    expect(result.isOpen).toBe(false);
  });

  it('null 입력 시 에러 없음', () => {
    expect(() => getBusinessStatus(null as unknown as string)).not.toThrow();
    expect(getBusinessStatus(null as unknown as string).isOpen).toBe(false);
  });

  it('자정 넘는 영업 (22:00~02:00), 01:00 기준 영업중', () => {
    mockTime(1);
    const result = getBusinessStatus('22:00~02:00');
    expect(result.isOpen).toBe(true);
  });

  it('자정 넘는 영업 (22:00~02:00), 03:00 기준 영업종료', () => {
    mockTime(3);
    const result = getBusinessStatus('22:00~02:00');
    expect(result.isOpen).toBe(false);
  });
});

describe('getMinutesUntilClose', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('마감 15분 전', () => {
    mockTime(21, 45);
    const mins = getMinutesUntilClose('09:00~22:00');
    expect(mins).toBe(15);
  });

  it('24시간 영업 → null', () => {
    mockTime(12);
    expect(getMinutesUntilClose('24시간')).toBeNull();
  });

  it('영업 종료 후 → null 또는 음수 반환 안함', () => {
    mockTime(23);
    const mins = getMinutesUntilClose('09:00~22:00');
    expect(mins === null || (mins !== null && mins <= 0)).toBe(true);
  });
});

describe('getMinutesUntilOpen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('오픈 1시간 전', () => {
    mockTime(8, 0);
    const mins = getMinutesUntilOpen('09:00~22:00');
    expect(mins).toBe(60);
  });

  it('영업 중에는 null', () => {
    mockTime(12);
    expect(getMinutesUntilOpen('09:00~22:00')).toBeNull();
  });
});

describe('getBusinessHoursRange', () => {
  it('09:00~22:00 → startMin=540, endMin=1320', () => {
    const range = getBusinessHoursRange('09:00~22:00');
    expect(range).not.toBeNull();
    expect(range!.startMin).toBe(540);  // 9*60
    expect(range!.endMin).toBe(1320);   // 22*60
    expect(range!.is24h).toBe(false);
  });

  it('24시간 → is24h=true', () => {
    const range = getBusinessHoursRange('24시간');
    expect(range).not.toBeNull();
    expect(range!.is24h).toBe(true);
  });
});

describe('formatBusinessHours', () => {
  it('"영업시간 09:00 ~ 22:00" → "09:00 ~ 22:00" (접두사 제거, 기호 정규화)', () => {
    const result = formatBusinessHours('영업시간 09:00 ~ 22:00');
    expect(result).toBe('09:00 ~ 22:00');
  });
});
