import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  formatDistance,
  formatDuration,
  parseCoordinates,
  isValidCoordinates,
  chunk,
  unique,
} from '@/lib/utils';

describe('haversineDistance', () => {
  it('서울시청 → 강남역 ≈ 10.5km', () => {
    const d = haversineDistance(
      { lat: 37.5663, lng: 126.9779 }, // 서울시청
      { lat: 37.4979, lng: 127.0276 }, // 강남역
    );
    expect(d).toBeGreaterThan(8000);
    expect(d).toBeLessThan(12000);
  });

  it('같은 좌표면 0', () => {
    const d = haversineDistance({ lat: 37.5, lng: 127.0 }, { lat: 37.5, lng: 127.0 });
    expect(d).toBe(0);
  });

  it('거리는 항상 양수', () => {
    const d = haversineDistance({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });
    expect(d).toBeGreaterThan(0);
  });
});

describe('formatDistance', () => {
  it('1000m 미만은 m 표시', () => {
    expect(formatDistance(450)).toBe('450m');
  });
  it('1000m 이상은 km 표시', () => {
    expect(formatDistance(1234)).toBe('1.2km');
  });
});

describe('formatDuration', () => {
  it('초만', () => expect(formatDuration(45)).toBe('45초'));
  it('분+초', () => expect(formatDuration(125)).toBe('2분 5초'));
  it('시간+분', () => expect(formatDuration(3665)).toBe('1시간 1분'));
  it('0초', () => expect(formatDuration(0)).toBe('0초'));
});

describe('parseCoordinates', () => {
  it('정상 파싱', () => {
    expect(parseCoordinates('37.5663,126.9779')).toEqual({ lat: 37.5663, lng: 126.9779 });
  });
  it('범위 초과 시 null', () => {
    expect(parseCoordinates('91,0')).toBeNull();
  });
  it('잘못된 입력 시 null', () => {
    expect(parseCoordinates('abc')).toBeNull();
  });
});

describe('isValidCoordinates', () => {
  it('유효한 좌표', () => {
    expect(isValidCoordinates({ lat: 37.5, lng: 127.0 })).toBe(true);
  });
  it('위도 범위 초과', () => {
    expect(isValidCoordinates({ lat: 91, lng: 127.0 })).toBe(false);
  });
});

describe('chunk', () => {
  it('배열 분할', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('빈 배열', () => {
    expect(chunk([], 3)).toEqual([]);
  });
});

describe('unique', () => {
  it('기본 중복제거', () => {
    expect(unique([1, 2, 2, 3])).toEqual([1, 2, 3]);
  });
  it('키 기반 중복제거', () => {
    const arr = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 1, name: 'c' }];
    expect(unique(arr, 'id')).toHaveLength(2);
  });
});
