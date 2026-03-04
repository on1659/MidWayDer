import { describe, it, expect } from 'vitest';
import { hashRoute, unhashRoute } from './route-hash';
import type { Coordinates } from '@/types/location';

describe('Route Hash', () => {
  const mockStart: Coordinates = { lat: 37.5665, lng: 126.9780 };
  const mockEnd: Coordinates = { lat: 37.5670, lng: 126.9790 };

  describe('hashRoute', () => {
    it('should create hash from start and end coordinates', () => {
      const hash = hashRoute(mockStart, mockEnd);
      expect(hash).toBe('37.5665,126.9780_37.5670,126.9790');
    });

    it('should use 4 decimal places (~10m precision)', () => {
      const start: Coordinates = { lat: 37.56651234, lng: 126.97805678 };
      const end: Coordinates = { lat: 37.56709876, lng: 126.97901234 };
      const hash = hashRoute(start, end);

      // Should only have 4 decimal places
      expect(hash).toMatch(/^\d+\.\d{4},\d+\.\d{4}_\d+\.\d{4},\d+\.\d{4}$/);
    });

    it('should produce consistent hashes for same input', () => {
      const hash1 = hashRoute(mockStart, mockEnd);
      const hash2 = hashRoute(mockStart, mockEnd);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashRoute(mockStart, mockEnd);
      const hash2 = hashRoute(mockEnd, mockStart); // Swapped
      expect(hash1).not.toBe(hash2);
    });

    it('should handle negative coordinates', () => {
      const start: Coordinates = { lat: -33.8688, lng: 151.2093 }; // Sydney
      const end: Coordinates = { lat: 51.5074, lng: -0.1278 }; // London
      const hash = hashRoute(start, end);

      expect(hash).toContain('-33.8688');
      expect(hash).toContain('-0.1278');
    });
  });

  describe('unhashRoute', () => {
    it('should parse valid hash correctly', () => {
      const hash = '37.5665,126.9780_37.5670,126.9790';
      const result = unhashRoute(hash);

      expect(result).not.toBeNull();
      expect(result!.start.lat).toBe(37.5665);
      expect(result!.start.lng).toBe(126.9780);
      expect(result!.end.lat).toBe(37.5670);
      expect(result!.end.lng).toBe(126.9790);
    });

    it('should return null for invalid format', () => {
      expect(unhashRoute('invalid')).toBeNull();
      expect(unhashRoute('37.5665,126.9780')).toBeNull(); // Missing end
      expect(unhashRoute('')).toBeNull();
    });

    it('should return null for non-numeric values', () => {
      expect(unhashRoute('abc,def_ghi,jkl')).toBeNull();
      expect(unhashRoute('37.5665,abc_37.5670,126.9790')).toBeNull();
    });

    it('should round-trip correctly', () => {
      const original = {
        start: { lat: 37.56651234, lng: 126.97805678 },
        end: { lat: 37.56709876, lng: 126.97901234 },
      };

      const hash = hashRoute(original.start, original.end);
      const parsed = unhashRoute(hash);

      expect(parsed).not.toBeNull();
      // Due to 4 decimal place rounding
      expect(parsed!.start.lat).toBeCloseTo(original.start.lat, 4);
      expect(parsed!.start.lng).toBeCloseTo(original.start.lng, 4);
      expect(parsed!.end.lat).toBeCloseTo(original.end.lat, 4);
      expect(parsed!.end.lng).toBeCloseTo(original.end.lng, 4);
    });
  });

  describe('Hash collision resistance', () => {
    it('should produce unique hashes for nearby but distinct routes', () => {
      const start: Coordinates = { lat: 37.5665, lng: 126.9780 };
      const end1: Coordinates = { lat: 37.5670, lng: 126.9790 };
      const end2: Coordinates = { lat: 37.5671, lng: 126.9790 }; // 1m different

      const hash1 = hashRoute(start, end1);
      const hash2 = hashRoute(start, end2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
