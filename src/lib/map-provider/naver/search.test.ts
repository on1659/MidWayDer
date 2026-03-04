import { describe, it, expect } from 'vitest';
import { deduplicatePlaces, sortPlacesByDistance, SearchApiError } from './search';
import type { Place, Coordinates } from '@/types/location';

describe('Naver Search', () => {
  const mockCenter: Coordinates = { lat: 37.5665, lng: 126.9780 };

  describe('SearchApiError', () => {
    it('should create error with code and details', () => {
      const error = new SearchApiError('Test error', 'TEST_CODE', { foo: 'bar' });
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ foo: 'bar' });
      expect(error.name).toBe('SearchApiError');
    });

    it('should create error without details', () => {
      const error = new SearchApiError('Simple error', 'SIMPLE');
      expect(error.message).toBe('Simple error');
      expect(error.code).toBe('SIMPLE');
      expect(error.details).toBeUndefined();
    });
  });

  describe('deduplicatePlaces', () => {
    it('should remove duplicate places by name and address', () => {
      const places: Place[] = [
        {
          id: '1',
          name: '다이소 강남점',
          category: '다이소',
          address: '서울 강남구 역삼동 123',
          coordinates: { lat: 37.5, lng: 127.0 },
        },
        {
          id: '2',
          name: '다이소 강남점',
          category: '다이소',
          address: '서울 강남구 역삼동 123',
          coordinates: { lat: 37.5001, lng: 127.0001 },
        },
        {
          id: '3',
          name: '다이소 역삼점',
          category: '다이소',
          address: '서울 강남구 역삼동 456',
          coordinates: { lat: 37.51, lng: 127.01 },
        },
      ];

      const result = deduplicatePlaces(places);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('다이소 강남점');
      expect(result[1].name).toBe('다이소 역삼점');
    });

    it('should return empty array for empty input', () => {
      expect(deduplicatePlaces([])).toEqual([]);
    });

    it('should preserve order of first occurrences', () => {
      const places: Place[] = [
        { id: '1', name: 'A', category: 'X', address: 'Addr1', coordinates: mockCenter },
        { id: '2', name: 'B', category: 'X', address: 'Addr2', coordinates: mockCenter },
        { id: '3', name: 'A', category: 'X', address: 'Addr1', coordinates: mockCenter }, // duplicate
        { id: '4', name: 'C', category: 'X', address: 'Addr3', coordinates: mockCenter },
      ];

      const result = deduplicatePlaces(places);

      expect(result.map(p => p.name)).toEqual(['A', 'B', 'C']);
    });

    it('should treat different addresses as different places', () => {
      const places: Place[] = [
        { id: '1', name: '다이소', category: '다이소', address: '서울 강남구', coordinates: mockCenter },
        { id: '2', name: '다이소', category: '다이소', address: '서울 역삼동', coordinates: mockCenter },
      ];

      const result = deduplicatePlaces(places);
      expect(result).toHaveLength(2);
    });
  });

  describe('sortPlacesByDistance', () => {
    const center: Coordinates = { lat: 0, lng: 0 };

    it('should sort places by distance from reference point', () => {
      const places: Place[] = [
        { id: '1', name: 'Far', category: 'X', address: '', coordinates: { lat: 10, lng: 10 } },
        { id: '2', name: 'Near', category: 'X', address: '', coordinates: { lat: 1, lng: 1 } },
        { id: '3', name: 'Medium', category: 'X', address: '', coordinates: { lat: 5, lng: 5 } },
      ];

      const sorted = sortPlacesByDistance(places, center);

      expect(sorted[0].name).toBe('Near');
      expect(sorted[1].name).toBe('Medium');
      expect(sorted[2].name).toBe('Far');
    });

    it('should return empty array for empty input', () => {
      expect(sortPlacesByDistance([], center)).toEqual([]);
    });

    it('should not modify original array', () => {
      const places: Place[] = [
        { id: '1', name: 'A', category: 'X', address: '', coordinates: { lat: 10, lng: 10 } },
        { id: '2', name: 'B', category: 'X', address: '', coordinates: { lat: 1, lng: 1 } },
      ];

      const sorted = sortPlacesByDistance(places, center);

      expect(places[0].name).toBe('A'); // Original unchanged
      expect(sorted[0].name).toBe('B'); // Sorted has different order
    });

    it('should handle single element', () => {
      const places: Place[] = [
        { id: '1', name: 'Only', category: 'X', address: '', coordinates: mockCenter },
      ];

      const sorted = sortPlacesByDistance(places, mockCenter);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].name).toBe('Only');
    });
  });

  describe('Place type compatibility', () => {
    it('should match expected Place type structure', () => {
      const place: Place = {
        id: 'kakao-123456',
        name: '다이소 강남점',
        category: '다이소',
        address: '서울 강남구 역삼동 123',
        roadAddress: '서울 강남구 테헤란로 123',
        coordinates: { lat: 37.5, lng: 127.0 },
        phone: '02-1234-5678',
      };

      // Verify all expected fields exist
      expect(place).toHaveProperty('id');
      expect(place).toHaveProperty('name');
      expect(place).toHaveProperty('category');
      expect(place).toHaveProperty('address');
      expect(place).toHaveProperty('coordinates');
      expect(typeof place.coordinates.lat).toBe('number');
      expect(typeof place.coordinates.lng).toBe('number');
    });

    it('should allow optional fields', () => {
      const minimalPlace: Place = {
        id: '1',
        name: 'Test',
        category: 'Test',
        address: 'Test',
        coordinates: mockCenter,
      };

      expect(minimalPlace.roadAddress).toBeUndefined();
      expect(minimalPlace.phone).toBeUndefined();
    });
  });

  describe('Query validation', () => {
    it('should identify empty queries', () => {
      const emptyQueries = ['', '   ', '\t', '\n'];
      emptyQueries.forEach(q => {
        expect(q.trim().length).toBe(0);
      });
    });

    it('should identify valid search queries', () => {
      const validQueries = ['다이소', '스타벅스 강남', '올리브영 역삼점'];
      validQueries.forEach(q => {
        expect(q.trim().length).toBeGreaterThan(0);
      });
    });
  });
});
