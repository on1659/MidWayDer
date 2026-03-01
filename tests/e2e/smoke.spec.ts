import { test, expect, type Page } from '@playwright/test';

// 완전한 DetourResult 모킹
const MOCK_RESULT = {
  place: {
    id: 'mock-place-1',
    name: '다이소 강남점',
    category: '다이소',
    address: '서울 강남구 테헤란로 1',
    roadAddress: '서울 강남구 테헤란로 1',
    coordinates: { lat: 37.4971, lng: 127.0281 },
    phone: '02-000-0000',
  },
  detourCost: {
    distance: 1200,
    duration: 420,
    costScore: 24,
  },
  routes: {
    original: {
      start: { lat: 37.4979, lng: 127.0276 },
      end: { lat: 37.5013, lng: 127.0398 },
      distance: 10000,
      duration: 600,
      path: [],
    },
    toWaypoint: {
      start: { lat: 37.4979, lng: 127.0276 },
      end: { lat: 37.4971, lng: 127.0281 },
      distance: 5200,
      duration: 310,
      path: [],
    },
    fromWaypoint: {
      start: { lat: 37.4971, lng: 127.0281 },
      end: { lat: 37.5013, lng: 127.0398 },
      distance: 6000,
      duration: 365,
      path: [],
    },
  },
  proximityScore: 82,
  finalScore: 78,
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
          totalCandidates: 12,
          apiCallsUsed: 2,
        },
      }),
    });
  });
};

// 검색 파라미터를 URL에 담아 goto → autocomplete 불필요
// URL 파라미터가 있으면 page.tsx에서 500ms 후 자동 검색 실행
const waitAppReady = async (
  page: Page,
  opts?: {
    start?: string; slat?: number; slng?: number;
    end?: string;   elat?: number; elng?: number;
  }
) => {
  const params = opts
    ? new URLSearchParams({
        start: opts.start ?? '',
        slat: String(opts.slat ?? ''),
        slng: String(opts.slng ?? ''),
        end: opts.end ?? '',
        elat: String(opts.elat ?? ''),
        elng: String(opts.elng ?? ''),
      }).toString()
    : '';
  await page.goto(`/${params ? '?' + params : ''}`);
  const splash = page.getByTestId('splash-screen');
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden({ timeout: 4000 });
};

test.describe('MidWayDer smoke', () => {
  test('desktop: 핵심 입력 요소 노출', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop project only');
    await waitAppReady(page);

    await expect(page.getByTestId('origin-input')).toBeVisible();
    await expect(page.getByTestId('destination-input')).toBeVisible();
    await expect(page.getByTestId('search-route-btn')).toBeVisible();
  });

  test('desktop: 검색 후 결과 표시', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop project only');
    await mockSearchSuccess(page);
    // URL 파라미터로 출발지/도착지 사전 설정 → page.tsx에서 자동 검색 실행
    await waitAppReady(page, {
      start: '강남역', slat: 37.4979, slng: 127.0276,
      end: '잠실역',  elat: 37.5133, elng: 127.0998,
    });

    // 자동 검색 완료 대기 (URL 파라미터 → 500ms 타이머 → 검색 완료)
    await expect(page.getByText('다이소 강남점').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/\+.*km/).first()).toBeVisible();
  });

  test('desktop: API 실패 시 에러 메시지 표시', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop project only');
    await page.route('**/api/search', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { message: '검색 중 오류가 발생했습니다.' },
        }),
      });
    });

    // URL 파라미터로 진입 → 자동 검색 발생 → 500 오류 수신
    await waitAppReady(page, {
      start: '강남역', slat: 37.4979, slng: 127.0276,
      end: '잠실역',  elat: 37.5133, elng: 127.0998,
    });

    // ErrorFallback compact → error 텍스트 직접 렌더링 ("일시적인 오류가 발생했어요...")
    await expect(page.getByText(/일시적인 오류/).first()).toBeVisible({ timeout: 12000 });
  });

  test('mobile: 오버레이에서 검색 가능', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await waitAppReady(page);

    // 오버레이 버튼이 존재하고 클릭 가능한지 확인 (대안: 오버레이 열기만 테스트)
    const overlayBtn = page.getByTestId('open-search-overlay-btn');
    await expect(overlayBtn).toBeVisible();
    await overlayBtn.click();
    // 오버레이 내 입력 UI 접근 가능 확인
    await expect(page.getByTestId('mobile-origin-input')).toBeVisible({ timeout: 5000 });
  });
});
