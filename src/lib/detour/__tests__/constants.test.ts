import { describe, it, expect } from 'vitest';
import {
  URBAN_SPEED_MS,
  COST_DISTANCE_WEIGHT,
  COST_DURATION_WEIGHT,
  COST_DURATION_NORM_SEC,
  DEFAULT_MAX_DETOUR_DISTANCE,
  MAX_PROXIMITY_DISTANCE,
  ROUTE_CUTOFF_RATIO,
  MIN_DB_RESULTS,
  MAX_SPATIAL_RESULTS,
  DEDUP_DISTANCE_M,
  MIN_POLYLINE_CHECK_POINTS,
  POSITION_WEIGHT_MID_BONUS,
  POSITION_WEIGHT_LATE_PENALTY,
  POSITION_MID_START,
  POSITION_MID_END,
  POSITION_LATE_START,
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

describe('신규 spatial-filter 상수', () => {
  it('신규 상수 9개가 모두 존재하고 양수', () => {
    expect(MIN_DB_RESULTS).toBeGreaterThan(0);
    expect(MAX_SPATIAL_RESULTS).toBeGreaterThan(0);
    expect(DEDUP_DISTANCE_M).toBeGreaterThan(0);
    expect(MIN_POLYLINE_CHECK_POINTS).toBeGreaterThan(0);
  });
});

describe('POSITION_WEIGHT 상수 합리성', () => {
  it('위치 가중치 상수가 0 < x < 2 범위', () => {
    expect(POSITION_WEIGHT_MID_BONUS).toBeGreaterThan(0);
    expect(POSITION_WEIGHT_MID_BONUS).toBeLessThan(2);
    expect(POSITION_WEIGHT_LATE_PENALTY).toBeGreaterThan(0);
    expect(POSITION_WEIGHT_LATE_PENALTY).toBeLessThan(2);
  });

  it('경로 진행률 상수가 순서를 지킴 (MID_START < MID_END < LATE_START < CUTOFF)', () => {
    expect(POSITION_MID_START).toBeLessThan(POSITION_MID_END);
    expect(POSITION_MID_END).toBeLessThan(POSITION_LATE_START);
    expect(POSITION_LATE_START).toBeLessThan(ROUTE_CUTOFF_RATIO);
  });
});
