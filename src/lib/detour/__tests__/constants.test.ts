import { describe, it, expect } from 'vitest';
import {
  URBAN_SPEED_MS,
  COST_DISTANCE_WEIGHT,
  COST_DURATION_WEIGHT,
  COST_DURATION_NORM_SEC,
  DEFAULT_MAX_DETOUR_DISTANCE,
  MAX_PROXIMITY_DISTANCE,
  ROUTE_CUTOFF_RATIO,
} from '../constants';

describe('constants.ts 스모크 테스트', () => {
  it('가중치 합이 100임', () => {
    expect(COST_DISTANCE_WEIGHT + COST_DURATION_WEIGHT).toBe(100);
  });

  it('URBAN_SPEED_MS ≈ 20km/h (5.4~5.8 범위)', () => {
    expect(URBAN_SPEED_MS).toBeGreaterThanOrEqual(5.4);
    expect(URBAN_SPEED_MS).toBeLessThanOrEqual(5.8);
  });

  it('ROUTE_CUTOFF_RATIO는 0-1 범위', () => {
    expect(ROUTE_CUTOFF_RATIO).toBeGreaterThan(0);
    expect(ROUTE_CUTOFF_RATIO).toBeLessThanOrEqual(1);
  });

  it('DEFAULT_MAX_DETOUR_DISTANCE는 양수', () => {
    expect(DEFAULT_MAX_DETOUR_DISTANCE).toBeGreaterThan(0);
  });

  it('COST_DURATION_NORM_SEC는 양수', () => {
    expect(COST_DURATION_NORM_SEC).toBeGreaterThan(0);
  });

  it('MAX_PROXIMITY_DISTANCE는 양수', () => {
    expect(MAX_PROXIMITY_DISTANCE).toBeGreaterThan(0);
  });
});
