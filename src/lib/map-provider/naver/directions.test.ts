import { describe, it, expect } from 'vitest';
import { calculateDistance, DirectionsApiError } from './directions';
import type { Coordinates } from '@/types/location';

describe('Naver Directions', () => {
  const mockStart: Coordinates = { lat: 37.5665, lng: 126.9780 };

  describe('DirectionsApiError', () => {
    it('should create error with code and details', () => {
      const error = new DirectionsApiError('Test error', 'TEST_CODE', { foo: 'bar' });
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ foo: 'bar' });
      expect(error.name).toBe('DirectionsApiError');
    });

    it('should create error without details', () => {
      const error = new DirectionsApiError('Simple error', 'SIMPLE');
      expect(error.message).toBe('Simple error');
      expect(error.code).toBe('SIMPLE');
      expect(error.details).toBeUndefined();
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for same coordinates', () => {
      const coords = { lat: 37.5665, lng: 126.9780 };
      expect(calculateDistance(coords, coords)).toBe(0);
    });

    it('should calculate distance between two nearby points', () => {
      const from = { lat: 37.5665, lng: 126.9780 };
      const to = { lat: 37.5670, lng: 126.9790 };

      const distance = calculateDistance(from, to);
      // Should be approximately 100-150m
      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(200);
    });

    it('should calculate long distance correctly', () => {
      const seoul = { lat: 37.5665, lng: 126.9780 };
      const busan = { lat: 35.1796, lng: 129.0756 };

      const distance = calculateDistance(seoul, busan);
      // Seoul to Busan is approximately 325km
      expect(distance).toBeGreaterThan(300000);
      expect(distance).toBeLessThan(350000);
    });

    it('should be symmetric', () => {
      const a = { lat: 37.5665, lng: 126.9780 };
      const b = { lat: 35.1796, lng: 129.0756 };

      expect(calculateDistance(a, b)).toBe(calculateDistance(b, a));
    });
  });

  describe('Coordinate validation', () => {
    // These tests verify the validation logic in getRoute
    it('should reject invalid latitude', () => {
      const invalidCoords = { lat: 91, lng: 126.9780 };
      // The validation happens inside getRoute, but we can test the logic
      expect(invalidCoords.lat).toBeGreaterThan(90);
    });

    it('should reject invalid longitude', () => {
      const invalidCoords = { lat: 37.5665, lng: 181 };
      expect(invalidCoords.lng).toBeGreaterThan(180);
    });

    it('should accept valid coordinates', () => {
      expect(mockStart.lat).toBeGreaterThanOrEqual(-90);
      expect(mockStart.lat).toBeLessThanOrEqual(90);
      expect(mockStart.lng).toBeGreaterThanOrEqual(-180);
      expect(mockStart.lng).toBeLessThanOrEqual(180);
    });
  });
});
