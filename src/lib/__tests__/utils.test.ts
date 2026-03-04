import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  haversineDistanceKm,
  formatDistance,
  formatDuration,
  formatDetourInfo,
  parseCoordinates,
  isValidCoordinates,
  chunk,
  unique,
  getErrorMessage,
  safeJsonParse,
  formatRelativeTime,
  toKebabCase,
  toTitleCase,
  cn,
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

describe('haversineDistance — 엣지 케이스', () => {
  it('NaN 입력 시 0 반환', () => {
    expect(haversineDistance({ lat: NaN, lng: 127.0 }, { lat: 37.5, lng: 127.0 })).toBe(0);
  });

  it('Infinity 입력 시 0 반환', () => {
    expect(haversineDistance({ lat: Infinity, lng: 127.0 }, { lat: 37.5, lng: 127.0 })).toBe(0);
  });

  it('-Infinity 입력 시 0 반환', () => {
    expect(haversineDistance({ lat: -Infinity, lng: 127.0 }, { lat: 37.5, lng: 127.0 })).toBe(0);
  });

  it('NaN NaN 좌표 → NaN 전파 없음', () => {
    const d = haversineDistance({ lat: NaN, lng: NaN }, { lat: 37.5, lng: 127.0 });
    expect(Number.isNaN(d)).toBe(false);
    expect(d).toBe(0);
  });

  it('대척점(antipodal) — 지구 최대 거리 ≈ 20015km', () => {
    const d = haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(d).toBeGreaterThan(20000000);
    expect(d).toBeLessThan(20020000);
  });

  it('날짜변경선 경계 (lng 179 → -179)', () => {
    const d = haversineDistance({ lat: 0, lng: 179 }, { lat: 0, lng: -179 });
    expect(d).toBeLessThan(300000);
    expect(Number.isFinite(d)).toBe(true);
  });
});

describe('haversineDistanceKm', () => {
  it('서울시청→강남역 ≈ 8~12km 반환', () => {
    const km = haversineDistanceKm(37.5663, 126.9779, 37.4979, 127.0276);
    expect(km).toBeGreaterThan(8);
    expect(km).toBeLessThan(12);
  });

  it('같은 좌표 → 0km', () => {
    expect(haversineDistanceKm(37.5, 127.0, 37.5, 127.0)).toBe(0);
  });
});

describe('formatDetourInfo', () => {
  it('거리+시간 포맷 — "500m / 1분"', () => {
    const result = formatDetourInfo(500, 60);
    expect(result).toContain('500');
    expect(result).toContain('1분');
  });

  it('거리 1km 이상 — km 단위 포함', () => {
    const result = formatDetourInfo(2500, 300);
    expect(result).toContain('2.5km');
  });
});

describe('getErrorMessage', () => {
  it('Error 객체 → message 반환', () => {
    expect(getErrorMessage(new Error('테스트 에러'))).toBe('테스트 에러');
  });

  it('문자열 → 그대로 반환', () => {
    expect(getErrorMessage('직접 에러')).toBe('직접 에러');
  });

  it('null → 기본 메시지', () => {
    expect(getErrorMessage(null)).toBe('알 수 없는 오류가 발생했습니다.');
  });

  it('undefined → 기본 메시지', () => {
    expect(getErrorMessage(undefined)).toBe('알 수 없는 오류가 발생했습니다.');
  });
});

describe('safeJsonParse', () => {
  it('유효한 JSON 파싱 성공', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
  });

  it('invalid JSON → fallback 반환', () => {
    expect(safeJsonParse('not-json', { default: true })).toEqual({ default: true });
  });

  it('배열 파싱', () => {
    expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
  });
});

describe('toKebabCase', () => {
  it('camelCase → kebab-case', () => {
    expect(toKebabCase('getUserById')).toBe('get-user-by-id');
  });
  it('공백 처리', () => {
    expect(toKebabCase('Hello World')).toBe('hello-world');
  });
});

describe('toTitleCase', () => {
  it('소문자 → Title Case', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
  });
});

describe('cn', () => {
  it('truthy 값만 결합', () => {
    expect(cn('a', false, 'b', undefined, 'c')).toBe('a b c');
  });
  it('빈 입력 → 빈 문자열', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('formatRelativeTime', () => {
  it('30초 전', () => {
    const d = new Date(Date.now() - 30_000);
    expect(formatRelativeTime(d)).toBe('30초 전');
  });
  it('5분 전', () => {
    const d = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(d)).toBe('5분 전');
  });
  it('2시간 전', () => {
    const d = new Date(Date.now() - 2 * 3600_000);
    expect(formatRelativeTime(d)).toBe('2시간 전');
  });
  it('3일 전', () => {
    const d = new Date(Date.now() - 3 * 86400_000);
    expect(formatRelativeTime(d)).toBe('3일 전');
  });
});
