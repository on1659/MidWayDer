import { describe, it, expect } from 'vitest';
import { samplePolyline, getOptimalSampleInterval } from '@/lib/detour/polyline-sampler';
import type { RoutePoint } from '@/types/location';

describe('samplePolyline', () => {
  it('빈 배열은 빈 배열 반환', () => {
    expect(samplePolyline([], 500)).toEqual([]);
  });

  it('단일 포인트는 그대로 반환', () => {
    const p: RoutePoint = { lat: 37.5, lng: 127.0 };
    expect(samplePolyline([p], 500)).toEqual([p]);
  });

  it('간격보다 짧은 경로는 시작+끝만 반환', () => {
    // 약 100m 떨어진 두 점
    const path: RoutePoint[] = [
      { lat: 37.5000, lng: 127.0000 },
      { lat: 37.5009, lng: 127.0000 }, // ~100m
    ];
    const result = samplePolyline(path, 500);
    expect(result.length).toBe(2); // 시작 + 끝
  });

  it('1km 경로를 200m 간격으로 샘플링 → 약 5-6개', () => {
    // 약 1km 직선 경로 (위도 0.009 ≈ 1km)
    const path: RoutePoint[] = [];
    for (let i = 0; i <= 100; i++) {
      path.push({ lat: 37.5 + (i * 0.009) / 100, lng: 127.0 });
    }
    const result = samplePolyline(path, 200);
    expect(result.length).toBeGreaterThanOrEqual(5);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('첫 포인트와 마지막 포인트가 항상 포함', () => {
    const path: RoutePoint[] = [
      { lat: 37.5, lng: 127.0 },
      { lat: 37.505, lng: 127.0 },
      { lat: 37.51, lng: 127.0 },
    ];
    const result = samplePolyline(path, 200);
    expect(result[0]).toEqual(path[0]);
    expect(result[result.length - 1]).toEqual(path[path.length - 1]);
  });
});

describe('getOptimalSampleInterval', () => {
  it('5km → 500m', () => expect(getOptimalSampleInterval(5000)).toBe(500));
  it('10km → 500m', () => expect(getOptimalSampleInterval(10000)).toBe(500));
  it('30km → 1000m', () => expect(getOptimalSampleInterval(30000)).toBe(1000));
  it('80km → 2000m', () => expect(getOptimalSampleInterval(80000)).toBe(2000));
});

describe('samplePolyline — MAX_SAMPLES 안전 가드', () => {
  it('intervalMeters=1 의 극단 입력에서 10000개 초과하지 않음', () => {
    // 약 10km 경로, 1m 간격 → 정상이면 10,000개 샘플 생성 시도
    const path: RoutePoint[] = [
      { lat: 37.0, lng: 127.0 },
      { lat: 37.09, lng: 127.0 }, // ~10km
    ];
    const result = samplePolyline(path, 1);
    // MAX_SAMPLES(10000) + 마지막 포인트 강제 추가 1개 = 최대 10001
    expect(result.length).toBeLessThanOrEqual(10001);
    // 마지막 포인트는 항상 포함
    expect(result[result.length - 1]).toEqual(path[path.length - 1]);
  });

  it('NaN segmentDistance 입력 시 무한 루프 없이 반환', () => {
    // NaN 좌표 → haversineDistance가 NaN 반환 → accumulatedDistance NaN
    // while(NaN >= 500) === false → 루프 실행 안 됨
    const nanPath: RoutePoint[] = [
      { lat: NaN, lng: NaN },
      { lat: 37.5, lng: 127.0 },
    ];
    // 타임아웃 없이 즉시 반환됨을 검증
    expect(() => samplePolyline(nanPath, 500)).not.toThrow();
  });
});

describe('samplePolyline — 연속 동일 좌표 (segmentDistance === 0 가드)', () => {
  it('연속 동일 좌표가 있어도 NaN 없이 샘플링', () => {
    const path: RoutePoint[] = [
      { lat: 37.5000, lng: 127.0000 },
      { lat: 37.5000, lng: 127.0000 }, // 동일 좌표 (segmentDistance === 0)
      { lat: 37.5000, lng: 127.0000 }, // 연속 동일
      { lat: 37.5090, lng: 127.0000 }, // ~1km 이동
    ];
    const result = samplePolyline(path, 500);

    // NaN 포함 여부 검사
    for (const p of result) {
      expect(Number.isFinite(p.lat)).toBe(true);
      expect(Number.isFinite(p.lng)).toBe(true);
    }
    // 시작/끝 포함
    expect(result[0]).toEqual(path[0]);
    expect(result[result.length - 1]).toEqual(path[path.length - 1]);
  });

  it('연속 동일 좌표 포함 경로 — 시작/끝 포함 검증', () => {
    const path: RoutePoint[] = [
      { lat: 37.5000, lng: 127.0000 },
      { lat: 37.5000, lng: 127.0000 },
      { lat: 37.5045, lng: 127.0000 }, // ~500m
      { lat: 37.5090, lng: 127.0000 }, // ~1km
    ];
    const result = samplePolyline(path, 500);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]).toEqual(path[0]);
    expect(result[result.length - 1]).toEqual(path[path.length - 1]);
  });

  it('전체 경로가 동일 좌표 → 빈 배열 또는 단일 포인트 반환 (NaN 없음)', () => {
    const path: RoutePoint[] = [
      { lat: 37.5000, lng: 127.0000 },
      { lat: 37.5000, lng: 127.0000 },
      { lat: 37.5000, lng: 127.0000 },
    ];
    const result = samplePolyline(path, 500);
    // NaN 없음 보장
    for (const p of result) {
      expect(Number.isFinite(p.lat)).toBe(true);
      expect(Number.isFinite(p.lng)).toBe(true);
    }
    // 최소 시작 포인트는 포함
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('동일 좌표 혼합 경로 → 정상 샘플링 (유효 구간 샘플 포함)', () => {
    const path: RoutePoint[] = [
      { lat: 37.5000, lng: 127.0000 },
      { lat: 37.5000, lng: 127.0000 }, // 중복
      { lat: 37.5045, lng: 127.0000 }, // ~500m
      { lat: 37.5045, lng: 127.0000 }, // 중복
      { lat: 37.5090, lng: 127.0000 }, // ~500m
    ];
    const result = samplePolyline(path, 500);
    // 시작/끝 포함, NaN 없음
    for (const p of result) {
      expect(Number.isFinite(p.lat)).toBe(true);
      expect(Number.isFinite(p.lng)).toBe(true);
    }
    expect(result[0]).toEqual(path[0]);
    expect(result[result.length - 1]).toEqual(path[path.length - 1]);
  });
});

// ========== 버그 수정 검증 테스트 (v0.7.2) ==========

describe('samplePolyline — 종료점 중복 방지 (v0.7.2)', () => {
  it('T4: 마지막 샘플이 종료점과 같은 좌표면 중복 추가하지 않음', () => {
    // 정확히 500m인 경로 (시작→끝이 간격과 맞아 떨어짐)
    const path: RoutePoint[] = [
      { lat: 37.5000, lng: 127.0000 },
      { lat: 37.5045, lng: 127.0000 }, // ~500m
    ];
    const result = samplePolyline(path, 500);
    // 연속된 같은 좌표 없어야 함
    for (let i = 1; i < result.length; i++) {
      const isSame = result[i].lat === result[i - 1].lat && result[i].lng === result[i - 1].lng;
      expect(isSame).toBe(false);
    }
  });

  it('T5: 마지막 포인트가 결과 배열에 정확히 1번만 포함됨', () => {
    const path: RoutePoint[] = [
      { lat: 37.5, lng: 127.0 },
      { lat: 37.505, lng: 127.0 },
      { lat: 37.51, lng: 127.0 },
    ];
    const result = samplePolyline(path, 200);
    const lastPoint = path[path.length - 1];
    const count = result.filter(p => p.lat === lastPoint.lat && p.lng === lastPoint.lng).length;
    expect(count).toBe(1);
  });
});

describe('samplePolyline — ratio 클램핑', () => {
  it('연속 중복 좌표 입력 시 NaN/Infinity 없이 정상 반환', () => {
    const duplicatePath: RoutePoint[] = [
      { lat: 37.5, lng: 127.0, distance: 0 },
      { lat: 37.5, lng: 127.0, distance: 0 },  // 중복!
      { lat: 37.51, lng: 127.01, distance: 1000 },
    ];
    const sampled = samplePolyline(duplicatePath, 500);
    sampled.forEach((pt) => {
      expect(isFinite(pt.lat)).toBe(true);
      expect(isFinite(pt.lng)).toBe(true);
    });
  });

  it('보간된 포인트가 세그먼트 양 끝점 범위 내에 있음', () => {
    const path: RoutePoint[] = [
      { lat: 37.0, lng: 127.0, distance: 0 },
      { lat: 37.1, lng: 127.1, distance: 15000 },
    ];
    const sampled = samplePolyline(path, 500);
    sampled.forEach((pt) => {
      expect(pt.lat).toBeGreaterThanOrEqual(37.0);
      expect(pt.lat).toBeLessThanOrEqual(37.1);
      expect(pt.lng).toBeGreaterThanOrEqual(127.0);
      expect(pt.lng).toBeLessThanOrEqual(127.1);
    });
  });
});
