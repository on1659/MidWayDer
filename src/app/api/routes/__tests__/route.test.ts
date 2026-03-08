import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    savedRoute: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock getSessionId
vi.mock('@/lib/auth/session', () => ({
  getSessionId: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { getSessionId } from '@/lib/auth/session';

describe('/api/routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return saved routes for authenticated user', async () => {
      const mockRoutes = [
        {
          id: 'route-1',
          sessionId: 'session-123',
          name: '출근길 다이소',
          startAddress: '서울역',
          endAddress: '강남역',
          startCoords: { lat: 37.55, lng: 126.97 },
          endCoords: { lat: 37.50, lng: 127.03 },
          category: '다이소',
          routeHash: '37.550000,126.970000-37.500000,127.030000',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsedAt: new Date(),
        },
      ];

      vi.mocked(getSessionId).mockReturnValue('session-123');
      vi.mocked(prisma.savedRoute.findMany).mockResolvedValue(mockRoutes);

      const request = new NextRequest('http://localhost/api/routes', {
        headers: { cookie: 'sessionId=session-123' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routes).toHaveLength(1);
      expect(data.routes[0].name).toBe('출근길 다이소');
    });

    it('should return 401 if no session', async () => {
      vi.mocked(getSessionId).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/routes');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST', () => {
    it('should create a new saved route', async () => {
      const newRoute = {
        name: '퇴근길 스타벅스',
        startAddress: '강남역',
        endAddress: '서울역',
        startCoords: { lat: 37.50, lng: 127.03 },
        endCoords: { lat: 37.55, lng: 126.97 },
        category: '스타벅스',
      };

      const createdRoute = {
        id: 'route-2',
        sessionId: 'session-123',
        ...newRoute,
        routeHash: '37.500000,127.030000-37.550000,126.970000',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      };

      vi.mocked(getSessionId).mockReturnValue('session-123');
      vi.mocked(prisma.savedRoute.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.savedRoute.create).mockResolvedValue(createdRoute);

      const request = new NextRequest('http://localhost/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'sessionId=session-123',
        },
        body: JSON.stringify(newRoute),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.route.name).toBe('퇴근길 스타벅스');
    });

    it('should return 409 if route already exists', async () => {
      const existingRoute = {
        id: 'route-1',
        sessionId: 'session-123',
        name: '출근길 다이소',
        startAddress: '서울역',
        endAddress: '강남역',
        startCoords: { lat: 37.55, lng: 126.97 },
        endCoords: { lat: 37.50, lng: 127.03 },
        category: '다이소',
        routeHash: '37.550000,126.970000-37.500000,127.030000',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      };

      vi.mocked(getSessionId).mockReturnValue('session-123');
      vi.mocked(prisma.savedRoute.findUnique).mockResolvedValue(existingRoute);

      const request = new NextRequest('http://localhost/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'sessionId=session-123',
        },
        body: JSON.stringify({
          name: '출근길 다이소',
          startAddress: '서울역',
          endAddress: '강남역',
          startCoords: { lat: 37.55, lng: 126.97 },
          endCoords: { lat: 37.50, lng: 127.03 },
          category: '다이소',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(409);
    });
  });
});
