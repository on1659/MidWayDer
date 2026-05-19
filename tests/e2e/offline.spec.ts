import { test, expect, type Page } from '@playwright/test';

const waitAppReady = async (page: Page) => {
  await page.goto('/');
  const splash = page.getByTestId('splash-screen');
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden({ timeout: 30000 });
};

const waitForServiceWorker = async (page: Page) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(async () => {
    return await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length;
    });
  }, { timeout: 15000 }).toBeGreaterThan(0);
};

test.describe('Offline Mode E2E', () => {
  test('오프라인 모드 - 초기 로드 정상', async ({ page }) => {
    await waitAppReady(page);

    await expect(page.getByTestId('splash-screen')).toBeHidden();
    await expect.poll(async () => {
      const mobile = await page.getByTestId('open-search-overlay-btn').isVisible().catch(() => false);
      const desktop = await page.getByTestId('origin-input').isVisible().catch(() => false);
      return mobile || desktop;
    }).toBe(true);
  });

  test('오프라인 모드 - Service Worker 등록 확인', async ({ page }) => {
    await waitAppReady(page);
    await waitForServiceWorker(page);
  });

  test('오프라인 모드 - 네트워크 차단 후 복구', async ({ page }) => {
    await waitAppReady(page);
    await waitForServiceWorker(page);

    await page.context().setOffline(true);
    await page.waitForTimeout(500);
    await expect.poll(async () => page.evaluate(() => navigator.onLine)).toBe(false);

    await page.context().setOffline(false);
    await page.reload();
    await expect(page.getByTestId('splash-screen')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 30000 });
  });

  test('오프라인 모드 - 캐시된 앱 셸 로드', async ({ page }) => {
    await waitAppReady(page);
    await waitForServiceWorker(page);

    await page.reload();
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 5000 });

    const cachedShell = await page.evaluate(async () => {
      const keys = await caches.keys();
      for (const key of keys) {
        const cache = await caches.open(key);
        if (await cache.match('/offline.html')) return true;
      }
      return false;
    });
    expect(cachedShell).toBe(true);
  });
});
