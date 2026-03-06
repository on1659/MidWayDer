import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

describe('Feedback API - New Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/feedback', () => {
    it('should create new feedback', async () => {
      // Mock Prisma
      const mockPrisma = {
        feedback: {
          create: vi.fn().mockResolvedValue({ id: 'fb-1', rating: 5, category: 'praise' }),
        },
      };

      vi.mock('@/lib/db/prisma', () => ({
        prisma: mockPrisma,
      }));

      const { POST } = await import('../route');

      const req = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          rating: 5,
          category: 'praise',
          comment: 'Great app!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.id).toBe('fb-1');
    });

    it('should reject invalid rating', async () => {
      const { POST } = await import('../route');

      const req = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          rating: 6, // Invalid
          category: 'praise',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it('should reject invalid category', async () => {
      const { POST } = await import('../route');

      const req = new NextRequest('http://localhost/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          rating: 5,
          category: 'invalid', // Invalid
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/feedback', () => {
    it('should return feedback list and stats', async () => {
      const mockFeedbacks = [
        { id: 'fb-1', rating: 5, category: 'praise', comment: 'Great!', createdAt: new Date() },
        { id: 'fb-2', rating: 4, category: 'suggestion', comment: 'Good', createdAt: new Date() },
      ];

      const mockPrisma = {
        feedback: {
          findMany: vi.fn().mockResolvedValue(mockFeedbacks),
          aggregate: vi.fn().mockResolvedValue({
            _avg: { rating: 4.5 },
            _count: { _all: 2 },
          }),
        },
      };

      vi.mock('@/lib/db/prisma', () => ({
        prisma: mockPrisma,
      }));

      const { GET } = await import('../route');

      const res = await GET(new NextRequest('http://localhost/api/feedback'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.feedbacks).toHaveLength(2);
      expect(json.stats.averageRating).toBe(4.5);
      expect(json.stats.totalCount).toBe(2);
    });

    it('should filter by category', async () => {
      const mockPrisma = {
        feedback: {
          findMany: vi.fn().mockResolvedValue([]),
          aggregate: vi.fn().mockResolvedValue({
            _avg: { rating: null },
            _count: { _all: 0 },
          }),
        },
      };

      vi.mock('@/lib/db/prisma', () => ({
        prisma: mockPrisma,
      }));

      const { GET } = await import('../route');

      const req = new NextRequest('http://localhost/api/feedback?category=bug');
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });
});
