import { test, expect, type Page } from '@playwright/test';

const MOCK_RESULT_FASTEST = {
  place: {
    id: 'mock-multi-1',
    name: '다이소 최단시간점',
    category: '다이소',
    address: '서울 강남구 최단시간로 1',
    coordinates: { lat: 37.49, lng: 127.025 },
  },
  detourCost: { distance: 600, duration: 120, costScore: 12 },
  routes: {
    original: { distance: 8000, duration: 480, path: [] },
    toWaypoint: { distance: 4100, duration: 240, path: [] },
    fromWaypoint: { distance: 4500, duration: 270, path: [] },
  },
  proximityScore: 90,
  finalScore: 88,
  routeType: 'fastest' as const,
};

const MOCK_RESULT_SHORTEST = {
  place: {
    id: 'mock-multi-2',
    name: '다이소 최단거리점',
    category: '다이소',
    address: '서울 강남구 최단거리로 2',
    coordinates: { lat: 37.51, lng: 127.03 },
  },
  detourCost: { distance: 400, duration: 180, costScore: 8 },
  routes: {
    original: { distance: 8000, duration: 600, path: [] },
    toWaypoint: { distance: 4000, duration: 280, path: [] },
    fromWaypoint: { distance: 4400, duration: 320, path: [] },
  },
  proximityScore: 92,
  finalScore: 90,
  routeType: 'shortest' as const,
};

const mockSearchMultiRoute = async (page: Page) => {
  await page.route('**/api/search**', async (route) => {
    const url = route.request().url();
    const isShortest = url.includes('shortest') || url.includes('routeType=shortest');
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          results: [isShortest ? MOCK_RESULT_SHORTEST : MOCK_RESULT_FASTEST],
          totalCandidates: 10,
          apiCallsUsed: 4,
        },
      }),
    });
  });
};

const waitAppReady = async (page: Page, params?: Record<string, string | number>) => {
  const searchParams = params
    ? new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  
  await page.goto(`/${searchParams ? '?' + searchParams : ''}`);
  const splash = page.getByTestId('splash-screen');
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden({ timeout: 5000 });
};

test.describe('Multi-Route E2E', () => {
  test('다중 경로 - 최단거리/최단시간 탭 존재 확인', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    
    await mockSearchMultiRoute(page);
    await waitAppReady(page, {
      start: '서울역',
      slat: 37.5547,
      slng: 126.9707,
      end: '강남역',
      elat: 37.4979,
      elng: 127.0276,
    });
    
    // 결과 대기
    await expect(page.getByText('다이소 최단시간점').first()).toBeVisible({ timeout: 15000 });
    
    // 경로 탭 확인
    const routeTabs = page.getByText(/최단/);
    await expect(routeTabs.first()).toBeVisible({ timeout: 5000 });
  });

  test('다중 경로 - 기본 최단시간 결과 표시', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    
    await mockSearchMultiRoute(page);
    await waitAppReady(page, {
      start: '서울역',
      slat: 37.5547,
      slng: 126.9707,
      end: '강남역',
      elat: 37.4979,
      elng: 127.0276,
    });
    
    // 기본적으로 최단시간 결과 표시
    await expect(page.getByText('다이소 최단시간점').first()).toBeVisible({ timeout: 15000 });
  });
});
