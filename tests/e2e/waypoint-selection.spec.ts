import { test, expect, type Page } from '@playwright/test';

const MOCK_RESULT = {
  place: {
    id: 'mock-waypoint-1',
    name: '다이소 경유지테스트점',
    category: '다이소',
    address: '서울 서초구 경유지로 456',
    roadAddress: '서울 서초구 경유지로 456',
    coordinates: { lat: 37.48, lng: 127.02 },
    phone: '02-9876-5432',
  },
  detourCost: {
    distance: 1200,
    duration: 240,
    costScore: 24,
  },
  routes: {
    original: {
      start: { lat: 37.5547, lng: 126.9707 },
      end: { lat: 37.4979, lng: 127.0276 },
      distance: 8000,
      duration: 480,
      path: [],
    },
    toWaypoint: {
      start: { lat: 37.5547, lng: 126.9707 },
      end: { lat: 37.48, lng: 127.02 },
      distance: 4400,
      duration: 260,
      path: [],
    },
    fromWaypoint: {
      start: { lat: 37.48, lng: 127.02 },
      end: { lat: 37.4979, lng: 127.0276 },
      distance: 4800,
      duration: 300,
      path: [],
    },
  },
  proximityScore: 85,
  finalScore: 80,
  routeType: 'fastest' as const,
};

const mockSearchSuccess = async (page: Page) => {
  await page.route('**/api/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          results: [MOCK_RESULT],
          totalCandidates: 6,
          apiCallsUsed: 2,
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

test.describe('Waypoint Selection E2E', () => {
  test('경유지 선택 - 결과 클릭 후 상세 정보 확인', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    
    await mockSearchSuccess(page);
    await waitAppReady(page, {
      start: '서울역',
      slat: 37.5547,
      slng: 126.9707,
      end: '강남역',
      elat: 37.4979,
      elng: 127.0276,
    });
    
    // 결과 대기
    await expect(page.getByText('다이소 경유지테스트점').first()).toBeVisible({ timeout: 15000 });
    
    // 결과 클릭
    await page.click('text=다이소 경유지테스트점');
    
    // 상세 정보 확인 (주소 표시)
    await expect(page.getByText(/서초구/).first()).toBeVisible({ timeout: 5000 });
  });

  test('경유지 선택 - 이탈 정보 표시', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    
    await mockSearchSuccess(page);
    await waitAppReady(page, {
      start: '서울역',
      slat: 37.5547,
      slng: 126.9707,
      end: '강남역',
      elat: 37.4979,
      elng: 127.0276,
    });
    
    // 결과 대기 및 이탈 정보 확인
    await expect(page.getByText('다이소 경유지테스트점').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/\+.*m/).first()).toBeVisible();
    await expect(page.getByText(/\+.*분/).first()).toBeVisible();
  });
});
