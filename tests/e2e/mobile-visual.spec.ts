import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_RESULT_1 = {
  place: {
    id: 'mock-place-1',
    name: '다이소 강남점',
    category: '다이소',
    address: '서울 강남구 테헤란로 1',
    roadAddress: '서울 강남구 테헤란로 1',
    coordinates: { lat: 37.4971, lng: 127.0281 },
    phone: '02-000-0000',
  },
  detourCost: { distance: 1200, duration: 420, costScore: 24 },
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

const MOCK_RESULT_2 = {
  place: {
    id: 'mock-place-2',
    name: '다이소 역삼점',
    category: '다이소',
    address: '서울 강남구 역삼로 45',
    roadAddress: '서울 강남구 역삼로 45',
    coordinates: { lat: 37.5003, lng: 127.0365 },
    phone: '02-111-1111',
  },
  detourCost: { distance: 2400, duration: 720, costScore: 48 },
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
      end: { lat: 37.5003, lng: 127.0365 },
      distance: 6400,
      duration: 420,
      path: [],
    },
    fromWaypoint: {
      start: { lat: 37.5003, lng: 127.0365 },
      end: { lat: 37.5013, lng: 127.0398 },
      distance: 6000,
      duration: 360,
      path: [],
    },
  },
  proximityScore: 65,
  finalScore: 58,
  routeType: 'fastest' as const,
};

const MOCK_RESULT_3 = {
  place: {
    id: 'mock-place-3',
    name: '다이소 삼성점',
    category: '다이소',
    address: '서울 강남구 삼성로 78',
    roadAddress: '서울 강남구 삼성로 78',
    coordinates: { lat: 37.5088, lng: 127.0632 },
    phone: '02-222-2222',
  },
  detourCost: { distance: 3600, duration: 960, costScore: 62 },
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
      end: { lat: 37.5088, lng: 127.0632 },
      distance: 7800,
      duration: 540,
      path: [],
    },
    fromWaypoint: {
      start: { lat: 37.5088, lng: 127.0632 },
      end: { lat: 37.5013, lng: 127.0398 },
      distance: 5800,
      duration: 420,
      path: [],
    },
  },
  proximityScore: 45,
  finalScore: 42,
  routeType: 'fastest' as const,
};

const MOCK_RESULTS = [MOCK_RESULT_1, MOCK_RESULT_2, MOCK_RESULT_3];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Intercept all /api/** routes with safe empty responses. */
const mockAllAPIs = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/api/search')) {
      // Default: empty results (individual tests override this)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { results: [], totalCandidates: 0, apiCallsUsed: 0 },
        }),
      });
    } else if (url.includes('/api/popularity')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    } else if (url.includes('/api/stats')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { topCategories: [], totalSearches: 0 } }),
      });
    } else if (url.includes('/api/autocomplete')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { predictions: [] } }),
      });
    } else if (url.includes('/api/directions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { distance: 10000, duration: 600, path: [] } }),
      });
    } else {
      // Catch-all for any other API routes
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      });
    }
  });
};

/** Mock the search API to return 3 results. */
const mockSearchWithResults = async (page: Page) => {
  await page.route('**/api/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          results: MOCK_RESULTS,
          totalCandidates: 15,
          apiCallsUsed: 5,
        },
      }),
    });
  });
};

/** Mock the search API with a delay to capture loading state. */
const mockSearchWithDelay = async (page: Page, delayMs: number) => {
  await page.route('**/api/search', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          results: MOCK_RESULTS,
          totalCandidates: 15,
          apiCallsUsed: 5,
        },
      }),
    });
  });
};

/** Navigate to app with optional search params, wait for splash to dismiss. */
const waitAppReady = async (
  page: Page,
  opts?: {
    start?: string; slat?: number; slng?: number;
    end?: string; elat?: number; elng?: number;
  },
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

  // Wait for splash screen to appear then disappear
  const splash = page.getByTestId('splash-screen');
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden({ timeout: 5000 });
};

const SEARCH_PARAMS = {
  start: '강남역',
  slat: 37.4979,
  slng: 127.0276,
  end: '잠실역',
  elat: 37.5133,
  elng: 127.0998,
};

/** Common screenshot options: mask the map area and allow small pixel diffs. */
const defaultMask = (page: Page) => ({
  maxDiffPixelRatio: 0.05,
  mask: [page.locator('#kakao-map')],
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Mobile Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Block all APIs by default so no real network calls are made
    await mockAllAPIs(page);
  });

  // -------------------------------------------------------------------------
  // 1. Empty State (Home)
  // -------------------------------------------------------------------------
  test('home empty state', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await waitAppReady(page);

    // Wait for animations to settle
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('mobile-home-empty.png', defaultMask(page));
  });

  // -------------------------------------------------------------------------
  // 2. Search Overlay Open
  // -------------------------------------------------------------------------
  test('search overlay open', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await waitAppReady(page);

    // Open the search overlay
    const overlayBtn = page.getByTestId('open-search-overlay-btn');
    await expect(overlayBtn).toBeVisible();
    await overlayBtn.click();

    // Wait for overlay animation to complete
    await expect(page.getByTestId('mobile-place-search-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('mobile-place-search-input')).toBeVisible();
    await expect(page.getByTestId('mobile-search-sticky-footer')).toBeVisible();
    await expect(page.getByTestId('mobile-category-input-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('mobile-transport-tabs')).not.toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('mobile-search-overlay.png', defaultMask(page));
  });

  // -------------------------------------------------------------------------
  // 3. Loading State
  // -------------------------------------------------------------------------
  test('loading state', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    // Override search mock with a 3-second delay
    await mockSearchWithDelay(page, 3000);

    await waitAppReady(page, SEARCH_PARAMS);

    // The auto-search fires after ~500ms from URL params.
    // Wait a bit for the loading indicator to appear but capture before it completes.
    await page.waitForTimeout(1200);

    // Mask loading animation spinners along with the map
    await expect(page).toHaveScreenshot('mobile-loading-state.png', {
      maxDiffPixelRatio: 0.05,
      mask: [
        page.locator('#kakao-map'),
        // Mask any animated spinners/pulsing elements to avoid flaky diffs
        page.locator('[class*="animate-"]'),
      ],
    });
  });

  // -------------------------------------------------------------------------
  // 4. Results State
  // -------------------------------------------------------------------------
  test('results state', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockSearchWithResults(page);

    await waitAppReady(page, SEARCH_PARAMS);

    // Wait for results to appear
    await expect(page.getByTestId('mobile-result-sheet').getByText('다이소 강남점')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('mobile-results.png', {
      maxDiffPixelRatio: 0.05,
      mask: [
        page.locator('#kakao-map'),
        // Mask any timestamps or relative time displays
        page.locator('[class*="animate-"]'),
      ],
    });
  });

  // -------------------------------------------------------------------------
  // 5. Dark Mode - Home
  // -------------------------------------------------------------------------
  test('dark mode home', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await waitAppReady(page);

    await page.getByTestId('open-search-overlay-btn').click();
    const themeBtn = page.locator('button[aria-label="다크 모드로 전환"]');
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    await page.locator('[aria-label="뒤로 가기"]').click();

    // Wait for theme transition to settle
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('mobile-dark-home.png', defaultMask(page));
  });

  // -------------------------------------------------------------------------
  // 6. Dark Mode - Results
  // -------------------------------------------------------------------------
  test('dark mode results', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockSearchWithResults(page);

    await waitAppReady(page, SEARCH_PARAMS);

    // Wait for results to load
    await expect(page.getByTestId('mobile-result-sheet').getByText('다이소 강남점')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('open-search-overlay-btn').click();
    const themeBtn = page.locator('button[aria-label="다크 모드로 전환"]');
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    await page.locator('[aria-label="뒤로 가기"]').click();

    // Wait for theme transition to settle
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('mobile-dark-results.png', {
      maxDiffPixelRatio: 0.05,
      mask: [
        page.locator('#kakao-map'),
        page.locator('[class*="animate-"]'),
      ],
    });
  });
});
