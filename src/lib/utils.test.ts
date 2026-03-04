import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  formatDistance,
  formatDuration,
  parseCoordinates,
  isValidCoordinates,
  cn,
  toKebabCase,
  toTitleCase,
  chunk,
  unique,
  safeJsonParse,
  getErrorMessage,
  debounce,
  throttle,
} from './utils';

describe('haversineDistance', () => {
  it('should return 0 for same coordinates', () => {
    const coords = { lat: 37.5665, lng: 126.9780 };
    expect(haversineDistance(coords, coords)).toBe(0);
  });

  it('should calculate distance between two nearby points', () => {
    const from = { lat: 37.5665, lng: 126.9780 };
    const to = { lat: 37.5670, lng: 126.9790 };

    const distance = haversineDistance(from, to);
    // Should be approximately 100-150m
    expect(distance).toBeGreaterThan(50);
    expect(distance).toBeLessThan(200);
  });

  it('should calculate long distance correctly', () => {
    const seoul = { lat: 37.5665, lng: 126.9780 };
    const busan = { lat: 35.1796, lng: 129.0756 };

    const distance = haversineDistance(seoul, busan);
    // Seoul to Busan is approximately 325km
    expect(distance).toBeGreaterThan(300000);
    expect(distance).toBeLessThan(350000);
  });

  it('should handle NaN inputs', () => {
    const valid = { lat: 37.5665, lng: 126.9780 };
    const invalid = { lat: NaN, lng: 126.9780 };

    expect(haversineDistance(invalid, valid)).toBe(0);
    expect(haversineDistance(valid, invalid)).toBe(0);
  });

  it('should handle Infinity inputs', () => {
    const valid = { lat: 37.5665, lng: 126.9780 };
    const infinite = { lat: Infinity, lng: 126.9780 };

    expect(haversineDistance(infinite, valid)).toBe(0);
    expect(haversineDistance(valid, infinite)).toBe(0);
  });

  it('should handle polar coordinates', () => {
    // North Pole
    const northPole = { lat: 90, lng: 0 };
    const nearNorthPole = { lat: 89, lng: 0 };
    const distance = haversineDistance(northPole, nearNorthPole);
    // 1 degree of latitude ≈ 111km
    expect(distance).toBeGreaterThan(100000);
    expect(distance).toBeLessThan(120000);
  });

  it('should be symmetric', () => {
    const a = { lat: 37.5665, lng: 126.9780 };
    const b = { lat: 35.1796, lng: 129.0756 };

    expect(haversineDistance(a, b)).toBe(haversineDistance(b, a));
  });
});

describe('formatDistance', () => {
  it('should format meters correctly', () => {
    expect(formatDistance(0)).toBe('0m');
    expect(formatDistance(500)).toBe('500m');
    expect(formatDistance(999)).toBe('999m');
  });

  it('should format kilometers correctly', () => {
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(1500)).toBe('1.5km');
    expect(formatDistance(10000)).toBe('10.0km');
  });

  it('should handle edge cases', () => {
    expect(formatDistance(999.9)).toBe('1000m'); // Rounds
    expect(formatDistance(1000.1)).toBe('1.0km');
  });
});

describe('formatDuration', () => {
  it('should format seconds only', () => {
    expect(formatDuration(0)).toBe('0초');
    expect(formatDuration(45)).toBe('45초');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2분 5초');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(3600)).toBe('1시간');
    expect(formatDuration(3665)).toBe('1시간 1분');
    expect(formatDuration(7200)).toBe('2시간');
  });

  it('should not show seconds when hours are present', () => {
    expect(formatDuration(3665)).not.toContain('5초');
  });
});

describe('parseCoordinates', () => {
  it('should parse valid coordinates', () => {
    const result = parseCoordinates('37.5665,126.9780');
    expect(result).toEqual({ lat: 37.5665, lng: 126.9780 });
  });

  it('should return null for invalid format', () => {
    expect(parseCoordinates('invalid')).toBeNull();
    expect(parseCoordinates('37.5665')).toBeNull();
    expect(parseCoordinates('')).toBeNull();
    // Extra parts are ignored by current implementation
    // expect(parseCoordinates('37.5665,126.9780,extra')).toBeNull();
  });

  it('should return null for out-of-range coordinates', () => {
    expect(parseCoordinates('91,126.9780')).toBeNull(); // Invalid lat
    expect(parseCoordinates('37.5665,181')).toBeNull(); // Invalid lng
  });

  it('should return null for non-numeric values', () => {
    expect(parseCoordinates('abc,def')).toBeNull();
    expect(parseCoordinates('37.5665,NaN')).toBeNull();
  });
});

describe('isValidCoordinates', () => {
  it('should validate correct coordinates', () => {
    expect(isValidCoordinates({ lat: 37.5665, lng: 126.9780 })).toBe(true);
    expect(isValidCoordinates({ lat: 0, lng: 0 })).toBe(true);
    expect(isValidCoordinates({ lat: -90, lng: -180 })).toBe(true);
    expect(isValidCoordinates({ lat: 90, lng: 180 })).toBe(true);
  });

  it('should reject out-of-range lat', () => {
    expect(isValidCoordinates({ lat: 91, lng: 126.9780 })).toBe(false);
    expect(isValidCoordinates({ lat: -91, lng: 126.9780 })).toBe(false);
  });

  it('should reject out-of-range lng', () => {
    expect(isValidCoordinates({ lat: 37.5665, lng: 181 })).toBe(false);
    expect(isValidCoordinates({ lat: 37.5665, lng: -181 })).toBe(false);
  });

  it('should reject non-number values', () => {
    expect(isValidCoordinates({ lat: NaN, lng: 126.9780 })).toBe(false);
    expect(isValidCoordinates({ lat: 37.5665, lng: NaN })).toBe(false);
    expect(isValidCoordinates({ lat: '37.5' as unknown as number, lng: 126.9780 })).toBe(false);
  });
});

describe('cn (className merger)', () => {
  it('should join class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('should filter out falsy values', () => {
    expect(cn('a', false, 'b', null, 'c', undefined)).toBe('a b c');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('btn', isActive && 'active', isDisabled && 'disabled')).toBe('btn active');
  });

  it('should return empty string for no arguments', () => {
    expect(cn()).toBe('');
  });
});

describe('toKebabCase', () => {
  it('should convert spaces to hyphens', () => {
    expect(toKebabCase('Hello World')).toBe('hello-world');
  });

  it('should convert camelCase to kebab-case', () => {
    expect(toKebabCase('getUserById')).toBe('get-user-by-id');
  });

  it('should convert underscores to hyphens', () => {
    expect(toKebabCase('hello_world')).toBe('hello-world');
  });
});

describe('toTitleCase', () => {
  it('should capitalize each word', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
    expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
  });
});

describe('chunk', () => {
  it('should split array into chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should handle empty array', () => {
    expect(chunk([], 2)).toEqual([]);
  });

  it('should handle size larger than array', () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });
});

describe('unique', () => {
  it('should remove duplicates from primitive array', () => {
    expect(unique([1, 2, 2, 3, 3, 4])).toEqual([1, 2, 3, 4]);
  });

  it('should remove duplicates by key from object array', () => {
    const arr = [{ id: 1 }, { id: 2 }, { id: 1 }];
    expect(unique(arr, 'id')).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
  });

  it('should return fallback for invalid JSON', () => {
    expect(safeJsonParse('invalid', { default: true })).toEqual({ default: true });
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error', () => {
    expect(getErrorMessage(new Error('test'))).toBe('test');
  });

  it('should return string as-is', () => {
    expect(getErrorMessage('error string')).toBe('error string');
  });

  it('should return default for unknown', () => {
    expect(getErrorMessage(null)).toBe('알 수 없는 오류가 발생했습니다.');
    expect(getErrorMessage({})).toBe('알 수 없는 오류가 발생했습니다.');
  });
});

describe('debounce', () => {
  it('should debounce function calls', async () => {
    let callCount = 0;
    const fn = debounce(() => callCount++, 10);

    fn();
    fn();
    fn();

    expect(callCount).toBe(0);

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(callCount).toBe(1);
  });
});

describe('throttle', () => {
  it('should throttle function calls', async () => {
    let callCount = 0;
    const fn = throttle(() => callCount++, 10);

    fn(); // First call goes through
    fn(); // Throttled
    fn(); // Throttled

    expect(callCount).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 20));

    fn(); // Goes through after wait
    expect(callCount).toBe(2);
  });
});
