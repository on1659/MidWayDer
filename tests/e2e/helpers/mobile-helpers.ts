import { type Page, expect } from '@playwright/test';

// Standard mock result (multiple)
export const MOCK_RESULTS = [
  {
    place: { id: 'mock-1', name: '다이소 강남점', category: '다이소', address: '서울 강남구 테헤란로 1', roadAddress: '서울 강남구 테헤란로 1', coordinates: { lat: 37.4971, lng: 127.0281 }, phone: '02-000-0000' },
    detourCost: { distance: 1200, duration: 420, costScore: 24 },
    routes: { original: { start: { lat: 37.4979, lng: 127.0276 }, end: { lat: 37.5013, lng: 127.0398 }, distance: 10000, duration: 600, path: [] }, toWaypoint: { start: { lat: 37.4979, lng: 127.0276 }, end: { lat: 37.4971, lng: 127.0281 }, distance: 5200, duration: 310, path: [] }, fromWaypoint: { start: { lat: 37.4971, lng: 127.0281 }, end: { lat: 37.5013, lng: 127.0398 }, distance: 6000, duration: 365, path: [] } },
    proximityScore: 82, finalScore: 78, routeType: 'fastest' as const,
  },
  {
    place: { id: 'mock-2', name: '스타벅스 역삼점', category: '스타벅스', address: '서울 강남구 역삼동 123', roadAddress: '서울 강남구 테헤란로 100', coordinates: { lat: 37.5005, lng: 127.0365 }, phone: '02-111-1111' },
    detourCost: { distance: 2400, duration: 720, costScore: 45 },
    routes: { original: { start: { lat: 37.4979, lng: 127.0276 }, end: { lat: 37.5013, lng: 127.0398 }, distance: 10000, duration: 600, path: [] }, toWaypoint: { start: { lat: 37.4979, lng: 127.0276 }, end: { lat: 37.5005, lng: 127.0365 }, distance: 6200, duration: 410, path: [] }, fromWaypoint: { start: { lat: 37.5005, lng: 127.0365 }, end: { lat: 37.5013, lng: 127.0398 }, distance: 6200, duration: 375, path: [] } },
    proximityScore: 70, finalScore: 65, routeType: 'fastest' as const,
  },
  {
    place: { id: 'mock-3', name: '올리브영 선릉점', category: '올리브영', address: '서울 강남구 선릉로 45', roadAddress: '서울 강남구 선릉로 45', coordinates: { lat: 37.5045, lng: 127.0490 }, phone: '02-222-2222', businessHours: '10:00~22:00' },
    detourCost: { distance: 3600, duration: 960, costScore: 60 },
    routes: { original: { start: { lat: 37.4979, lng: 127.0276 }, end: { lat: 37.5013, lng: 127.0398 }, distance: 10000, duration: 600, path: [] }, toWaypoint: { start: { lat: 37.4979, lng: 127.0276 }, end: { lat: 37.5045, lng: 127.0490 }, distance: 7200, duration: 480, path: [] }, fromWaypoint: { start: { lat: 37.5045, lng: 127.0490 }, end: { lat: 37.5013, lng: 127.0398 }, distance: 6400, duration: 420, path: [] } },
    proximityScore: 55, finalScore: 50, routeType: 'shortest' as const,
  },
];

/** Mock all APIs to prevent real network calls */
export async function mockAllAPIs(page: Page, results = MOCK_RESULTS) {
  await page.route('**/api/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { results, totalCandidates: results.length * 4, apiCallsUsed: 2 } }),
    });
  });

  await page.route('**/api/popularity**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  });

  await page.route('**/api/stats**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { categoryBreakdown: [] } }) });
  });

  await page.route('**/api/autocomplete**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });

  await page.route('**/api/feedback', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.route('**/api/log-click', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}

/** Wait for app to be ready (splash screen gone) */
export async function waitAppReady(
  page: Page,
  opts?: { start?: string; slat?: number; slng?: number; end?: string; elat?: number; elng?: number }
) {
  const params = opts
    ? new URLSearchParams({
        start: opts.start ?? '', slat: String(opts.slat ?? ''), slng: String(opts.slng ?? ''),
        end: opts.end ?? '', elat: String(opts.elat ?? ''), elng: String(opts.elng ?? ''),
      }).toString()
    : '';
  await page.goto(`/${params ? '?' + params : ''}`);
  const splash = page.getByTestId('splash-screen');
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden({ timeout: 4000 });
}

/** Navigate with search params to trigger auto-search */
export const DEFAULT_SEARCH_PARAMS = {
  start: '강남역', slat: 37.4979, slng: 127.0276,
  end: '잠실역', elat: 37.5133, elng: 127.0998,
};
