import { test, expect } from '@playwright/test';

test.describe('Release readiness gates', () => {
  test('admin pages and telemetry APIs are not publicly readable', async ({ request, page }) => {
    const adminPage = await page.goto('/admin/feedback', { waitUntil: 'domcontentloaded' });
    expect(adminPage?.status()).toBe(401);

    const statsPage = await page.goto('/stats', { waitUntil: 'domcontentloaded' });
    expect(statsPage?.status()).toBe(401);

    const feedback = await request.get('/api/feedback');
    expect(feedback.status()).toBe(401);

    const stats = await request.get('/api/stats');
    expect(stats.status()).toBe(401);
  });

  test('manifest has installable release metadata and real assets', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.json');
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();

    expect(manifest.id).toBe('/?source=pwa');
    expect(manifest.lang).toBe('ko');
    expect(manifest.name).toContain('MidWayDer');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some((icon: { src: string; purpose?: string }) => icon.src === '/icons/maskable-512.png' && icon.purpose === 'maskable')).toBe(true);
    expect(manifest.screenshots.length).toBeGreaterThanOrEqual(2);

    for (const asset of [
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/apple-touch-icon.png',
      '/icons/maskable-192.png',
      '/icons/maskable-512.png',
      '/screenshots/mobile.png',
      '/screenshots/desktop.png',
      '/og-image.png',
    ]) {
      const response = await request.get(asset);
      expect(response.status(), asset).toBe(200);
      expect(response.headers()['content-type'], asset).toMatch(/image/);
    }
  });

  test('privacy and support pages contain store-review-required disclosures', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: '개인정보 처리방침' })).toBeVisible();
    await expect(page.getByText('사용자가 허용한 경우 현재 위치 또는 지도 중심 좌표')).toBeVisible();
    await expect(page.getByText('알림을 허용한 경우 푸시 구독 엔드포인트와 알림 수신 설정')).toBeVisible();
    await expect(page.getByText('세션 쿠키, 접속 로그, 기기/브라우저 정보, 오류 로그, 성능 지표, Vercel Analytics 이벤트')).toBeVisible();
    await expect(page.getByText(/최대 30일/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'support@midwayder.com' })).toBeVisible();

    await page.goto('/support');
    await expect(page.getByRole('heading', { name: '지원' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'support@midwayder.com' })).toBeVisible();
    await expect(page.getByText('영업일 기준 3일')).toBeVisible();
    await expect(page.getByText('개인정보 삭제')).toBeVisible();
  });

  test('robots excludes admin and API crawl paths', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const robots = await response.text();
    expect(robots).toContain('Disallow: /admin/');
    expect(robots).toContain('Disallow: /api/');
  });
});
