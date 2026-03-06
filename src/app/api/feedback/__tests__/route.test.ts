import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

// Create mock prisma at module level
const mockPrisma = {
  feedback: {
    create: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
  },
};

// Mock prisma at module level (hoisted)
vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

describe('Feedback API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/feedback', () => {
    it('should create new feedback', async () => {
      mockPrisma.feedback.create.mockResolvedValueOnce({
        id: 'fb-1',
        rating: 5,
        category: 'praise',
        comment: 'Great app!',
        createdAt: new Date(),
      });

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
      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rating: 5,
          category: 'praise',
          comment: 'Great app!',
        }),
      });
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

      mockPrisma.feedback.findMany.mockResolvedValueOnce(mockFeedbacks);
      mockPrisma.feedback.aggregate.mockResolvedValueOnce({
        _avg: { rating: 4.5 },
        _count: { _all: 2 },
      });

      const { GET } = await import('../route');

      const res = await GET(new NextRequest('http://localhost/api/feedback'));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.feedbacks).toHaveLength(2);
      expect(json.stats.averageRating).toBe(4.5);
      expect(json.stats.totalCount).toBe(2);
    });

    it('should filter by category', async () => {
      mockPrisma.feedback.findMany.mockResolvedValueOnce([]);
      mockPrisma.feedback.aggregate.mockResolvedValueOnce({
        _avg: { rating: null },
        _count: { _all: 0 },
      });

      const { GET } = await import('../route');

      const req = new NextRequest('http://localhost/api/feedback?category=bug');
      const res = await GET(req);
      const _json = await res.json();

      expect(res.status).toBe(200);
      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'bug' },
        })
      );
    });
  });
});
