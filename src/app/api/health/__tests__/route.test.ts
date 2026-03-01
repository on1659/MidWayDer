import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPrisma = {
  $queryRaw: vi.fn(),
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

describe('GET /api/health', () => {
  const ORIGINAL_KEY = process.env.KAKAO_REST_API_KEY;
  const ORIGINAL_DB_URL = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KAKAO_REST_API_KEY = 'test-kakao-key';
    process.env.DATABASE_URL = 'postgresql://test';
  });

  afterEach(() => {
    process.env.KAKAO_REST_API_KEY = ORIGINAL_KEY;
    process.env.DATABASE_URL = ORIGINAL_DB_URL;
    vi.restoreAllMocks();
  });

  it('TC-1: DB 정상 + Kakao API 200 → 200, status: healthy', async () => {
    const { GET } = await import('../route');

    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ documents: [] }), { status: 200 })
    );

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('healthy');
    expect(json.checks.database).toBe('ok');
  });

  it('TC-2: DB 오류 → 500, status: unhealthy, checks.database: error', async () => {
    const { GET } = await import('../route');

    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB connection failed'));

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.status).toBe('unhealthy');
    expect(json.checks.database).toBe('error');
  });

  it('TC-3: DB 정상 + Kakao API 401 → 500, checks.kakaoApi: invalid_key', async () => {
    const { GET } = await import('../route');

    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ msg: 'Unauthorized' }), { status: 401 })
    );

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.checks.kakaoApi).toBe('invalid_key');
  });
});
