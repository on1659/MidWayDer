import { test, expect, type Page } from '@playwright/test';

// Mock 결과 데이터
const MOCK_RESULT = {
  place: {
    id: 'mock-place-search-1',
    name: '다이소 검색테스트점',
    category: '다이소',
    address: '서울 강남구 검색로 123',
    roadAddress: '서울 강남구 검색로 123',
    coordinates: { lat: 37.5, lng: 127.0 },
    phone: '02-1234-5678',
  },
  detourCost: {
    distance: 800,
    duration: 180,
    costScore: 16,
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
      end: { lat: 37.5, lng: 127.0 },
      distance: 4200,
      duration: 250,
      path: [],
    },
    fromWaypoint: {
      start: { lat: 37.5, lng: 127.0 },
      end: { lat: 37.4979, lng: 127.0276 },
      distance: 4600,
      duration: 280,
      path: [],
    },
  },
  proximityScore: 88,
  finalScore: 82,
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
          totalCandidates: 8,
          apiCallsUsed: 3,
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
  
  // 스플래시 화면 대기
  const splash = page.getByTestId('splash-screen');
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden({ timeout: 5000 });
};

test.describe('Search Flow E2E', () => {
  test.describe('desktop', () => {
    test('검색 플로우 - URL 파라미터로 자동 검색 후 결과 확인', async ({ page, isMobile }) => {
      test.skip(isMobile, 'desktop only');
      
      await mockSearchSuccess(page);
      
      // URL 파라미터로 출발지/도착지 설정
      await waitAppReady(page, {
        start: '서울역',
        slat: 37.5547,
        slng: 126.9707,
        end: '강남역',
        elat: 37.4979,
        elng: 127.0276,
      });
      
      // 자동 검색 완료 대기
      await expect(page.getByText('다이소 검색테스트점').first()).toBeVisible({ timeout: 15000 });
      
      // 이탈 거리/시간 표시 확인
      await expect(page.getByText(/\+.*m/).first()).toBeVisible();
    });

    test('검색 플로우 - 입력 필드 및 검색 버튼 확인', async ({ page, isMobile }) => {
      test.skip(isMobile, 'desktop only');
      
      await waitAppReady(page);
      
      // 핵심 UI 요소 확인
      await expect(page.getByTestId('origin-input')).toBeVisible();
      await expect(page.getByTestId('destination-input')).toBeVisible();
      await expect(page.getByTestId('search-route-btn')).toBeVisible();
    });

    test('검색 플로우 - 검색 버튼 비활성화 상태', async ({ page, isMobile }) => {
      test.skip(isMobile, 'desktop only');
      
      await waitAppReady(page);
      
      // 입력 없이는 검색 버튼 비활성화
      const searchBtn = page.getByTestId('search-route-btn');
      await expect(searchBtn).toBeDisabled();
    });
  });

  test.describe('mobile', () => {
    test('모바일 - 오버레이에서 검색 가능', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'mobile only');
      
      await waitAppReady(page);
      
      // 오버레이 열기
      const overlayBtn = page.getByTestId('open-search-overlay-btn');
      await expect(overlayBtn).toBeVisible();
      await overlayBtn.click();
      
      // 모바일 경로/카테고리 검색 UI 확인
      await expect(page.getByTestId('mobile-route-input-card')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('mobile-origin-input')).toBeVisible();
      await expect(page.getByTestId('mobile-destination-input')).toBeVisible();
      await expect(page.getByTestId('mobile-category-input-card')).toBeVisible({ timeout: 5000 });
    });
  });
});
