import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    bookmark: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    place: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock session
vi.mock('@/lib/auth/session', () => ({
  getSessionId: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { getSessionId } from '@/lib/auth/session';

const mockPrisma = vi.mocked(prisma);
const mockGetSessionId = vi.mocked(getSessionId);

describe('/api/bookmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return empty array when not authenticated', async () => {
      mockGetSessionId.mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/bookmarks');
      const response = await GET(request);
      const data = await response.json();

      expect(data.bookmarks).toEqual([]);
    });

    it('should return bookmarks for authenticated user', async () => {
      mockGetSessionId.mockReturnValue('test-session-id');
      mockPrisma.bookmark.findMany.mockResolvedValue([
        {
          id: 'bookmark-1',
          placeId: 'place-1',
          sessionId: 'test-session-id',
          memo: 'My favorite',
          createdAt: new Date(),
          place: {
            id: 'place-1',
            name: 'Test Place',
            category: 'cafe',
            address: '123 Test St',
            lat: 37.5,
            lng: 127.0,
          },
        },
      ]);

      const request = new NextRequest('http://localhost/api/bookmarks');
      const response = await GET(request);
      const data = await response.json();

      expect(data.bookmarks).toHaveLength(1);
      expect(data.bookmarks[0].place.name).toBe('Test Place');
    });
  });

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetSessionId.mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ placeId: 'place-1' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when placeId is missing', async () => {
      mockGetSessionId.mockReturnValue('test-session-id');

      const request = new NextRequest('http://localhost/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 404 when place not found', async () => {
      mockGetSessionId.mockReturnValue('test-session-id');
      mockPrisma.place.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ placeId: 'nonexistent' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
    });

    it('should create bookmark successfully', async () => {
      mockGetSessionId.mockReturnValue('test-session-id');
      mockPrisma.place.findUnique.mockResolvedValue({
        id: 'place-1',
        name: 'Test Place',
        category: 'cafe',
        address: '123 Test St',
        roadAddress: null,
        phone: null,
        lat: 37.5,
        lng: 127.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        kakaoPlaceId: null,
      });
      mockPrisma.bookmark.upsert.mockResolvedValue({
        id: 'bookmark-1',
        placeId: 'place-1',
        sessionId: 'test-session-id',
        memo: null,
        createdAt: new Date(),
        place: {
          id: 'place-1',
          name: 'Test Place',
          category: 'cafe',
          address: '123 Test St',
          lat: 37.5,
          lng: 127.0,
        },
      });

      const request = new NextRequest('http://localhost/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ placeId: 'place-1' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bookmark.placeId).toBe('place-1');
    });
  });
});
