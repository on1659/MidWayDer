/**
 * 푸시 알림 구독 API 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, DELETE } from '../route';

// Mock push-notifications
vi.mock('@/lib/push-notifications', () => ({
  saveSubscription: vi.fn().mockResolvedValue({ id: 'test-id', endpoint: 'https://test.com' }),
  deleteSubscription: vi.fn().mockResolvedValue({ id: 'test-id' }),
}));

function createRequest(url: string, options: RequestInit): NextRequest {
  return new NextRequest(new Request(url, options));
}

describe('/api/notifications/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should save subscription with valid data', async () => {
      const request = createRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'TestAgent/1.0',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/test',
            keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
          },
          sessionId: 'session-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject invalid subscription data', async () => {
      const request = createRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://test.com',
            // missing keys
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid subscription data');
    });

    it('should reject missing endpoint', async () => {
      const request = createRequest('http://localhost/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            keys: { p256dh: 'test', auth: 'test' },
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid subscription data');
    });
  });

  describe('DELETE', () => {
    it('should delete subscription with valid endpoint', async () => {
      const request = createRequest('http://localhost/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'https://fcm.googleapis.com/test',
        }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject missing endpoint', async () => {
      const request = createRequest('http://localhost/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Endpoint is required');
    });
  });
});
