import { test, expect, type Page } from '@playwright/test';

// ──────────────────────────────────────────────────────────────
// Shared mock data & helpers (mirrors smoke.spec.ts pattern)
// ──────────────────────────────────────────────────────────────

function makeMockResult(id: string, name: string, overrides: Record<string, unknown> = {}) {
  return {
    place: {
      id,
      name,
      category: '다이소',
      address: `서울 강남구 테헤란로 ${id}`,
      roadAddress: `서울 강남구 테헤란로 ${id}`,
      coordinates: { lat: 37.4971 + Number(id.replace(/\D/g, '')) * 0.001, lng: 127.0281 },
      phone: '02-000-0000',
    },
    detourCost: {
      distance: 1200 + Number(id.replace(/\D/g, '')) * 100,
      duration: 420 + Number(id.replace(/\D/g, '')) * 30,
      costScore: 24 + Number(id.replace(/\D/g, '')),
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
    ...overrides,
  };
}

const MOCK_RESULTS_5 = [
  makeMockResult('mock-1', '다이소 강남점'),
  makeMockResult('mock-2', '다이소 역삼점'),
  makeMockResult('mock-3', '다이소 선릉점'),
  makeMockResult('mock-4', '다이소 삼성점'),
  makeMockResult('mock-5', '다이소 코엑스점'),
];

/** Mock ALL API endpoints to prevent real network calls */
async function mockAllAPIs(page: Page, results = MOCK_RESULTS_5) {
  await page.route('**/api/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          results,
          totalCandidates: results.length + 5,
          apiCallsUsed: 2,
        },
      }),
    });
  });

  await page.route('**/api/popularity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  await page.route('**/api/stats*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { topCategories: [], totalSearches: 0 } }),
    });
  });

  await page.route('**/api/autocomplete*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: [] }),
    });
  });

  await page.route('**/api/log-click', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
  });

  await page.route('**/api/feedback', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
  });

  await page.route('**/api/bookmarks*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route('**/api/routes*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

/** Navigate to the app and wait for splash screen to finish */
async function waitAppReady(
  page: Page,
  opts?: {
    start?: string; slat?: number; slng?: number;
    end?: string;   elat?: number; elng?: number;
  },
) {
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
}

/** Navigate with search params so the app auto-triggers search after splash */
async function gotoWithSearch(page: Page) {
  await waitAppReady(page, {
    start: '강남역', slat: 37.4979, slng: 127.0276,
    end: '잠실역',  elat: 37.5133, elng: 127.0998,
  });
}

// ──────────────────────────────────────────────────────────────
// Test suite
// ──────────────────────────────────────────────────────────────

test.describe('Mobile UI', () => {

  // ────────────────────────────────────────────────────────────
  // 1. BottomSheet 콘텐츠 스크롤 가능 여부
  // ────────────────────────────────────────────────────────────
  test('BottomSheet 콘텐츠 영역이 스크롤 가능해야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    await gotoWithSearch(page);

    // 검색 결과가 렌더링될 때까지 대기
    await expect(page.getByText('다이소 강남점').first()).toBeVisible({ timeout: 15000 });

    // BottomSheet 드래그 핸들 존재 확인
    const dragHandle = page.locator('[aria-label="드래그하여 패널 조절"]');
    await expect(dragHandle).toBeVisible();

    // BottomSheet 콘텐츠 영역 찾기 (드래그 핸들의 형제 div with overflow-y-auto)
    const contentArea = page.locator('.overflow-y-auto.scrollbar-hide').first();
    await expect(contentArea).toBeVisible();

    // touchAction: none이 콘텐츠 영역이 아닌 드래그 핸들에만 적용되었는지 확인
    const handleTouchAction = await dragHandle.evaluate(
      (el) => window.getComputedStyle(el).touchAction,
    );
    expect(handleTouchAction).toBe('none');

    const contentTouchAction = await contentArea.evaluate(
      (el) => window.getComputedStyle(el).touchAction,
    );
    // 콘텐츠 영역은 touchAction이 'none'이 아니어야 스크롤 가능
    expect(contentTouchAction).not.toBe('none');

    // overflow-y가 auto 또는 scroll 인지 확인
    const overflowY = await contentArea.evaluate(
      (el) => window.getComputedStyle(el).overflowY,
    );
    expect(['auto', 'scroll']).toContain(overflowY);
  });

  // ────────────────────────────────────────────────────────────
  // 2. GPS/설정 버튼이 BottomSheet 위에 보이는지 확인
  // ────────────────────────────────────────────────────────────
  test('GPS/설정 버튼이 BottomSheet 위에 표시되어야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    await gotoWithSearch(page);

    // 결과 표시 대기
    await expect(page.getByText('다이소 강남점').first()).toBeVisible({ timeout: 15000 });

    // GPS 버튼
    const gpsButton = page.locator('[aria-label="현재 위치로 이동"]');
    await expect(gpsButton).toBeVisible();

    // 설정 버튼
    const settingsLink = page.locator('[aria-label="설정"]');
    await expect(settingsLink).toBeVisible();

    // z-index 확인: GPS/Settings z-50 > BottomSheet z-40
    const gpsZIndex = await gpsButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return parseInt(computed.zIndex, 10) || 0;
    });
    const settingsZIndex = await settingsLink.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return parseInt(computed.zIndex, 10) || 0;
    });

    const bottomSheet = page.locator('.fixed.inset-x-0.bottom-0.z-40').first();
    const sheetZIndex = await bottomSheet.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return parseInt(computed.zIndex, 10) || 0;
    });

    expect(gpsZIndex).toBeGreaterThan(sheetZIndex);
    expect(settingsZIndex).toBeGreaterThan(sheetZIndex);

    // boundingBox 확인: 버튼들이 BottomSheet 상단 위에 위치
    const gpsBox = await gpsButton.boundingBox();
    const settingsBox = await settingsLink.boundingBox();
    const sheetBox = await bottomSheet.boundingBox();

    expect(gpsBox).toBeTruthy();
    expect(settingsBox).toBeTruthy();
    expect(sheetBox).toBeTruthy();

    // GPS 버튼의 하단이 뷰포트 안에 있어야 함 (가려지지 않음)
    const viewportSize = page.viewportSize();
    expect(viewportSize).toBeTruthy();
    expect(gpsBox!.y + gpsBox!.height).toBeLessThanOrEqual(viewportSize!.height);
    expect(settingsBox!.y + settingsBox!.height).toBeLessThanOrEqual(viewportSize!.height);

    // GPS 버튼 클릭 가능 여부 (isEnabled)
    await expect(gpsButton).toBeEnabled();
  });

  // ────────────────────────────────────────────────────────────
  // 3. BottomQuickBar / BottomSheet 상호 배제 동작
  // ────────────────────────────────────────────────────────────
  test('BottomQuickBar와 BottomSheet가 동시에 표시되지 않아야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    // localStorage를 비워서 즐겨찾기/최근검색 없는 상태 보장
    await mockAllAPIs(page, []);
    await page.goto('/');

    // localStorage 초기화 (즐겨찾기, 최근 검색 제거)
    await page.evaluate(() => {
      localStorage.removeItem('favorites');
      localStorage.removeItem('recent-searches');
      localStorage.removeItem('midwayder-favorites');
      localStorage.removeItem('midwayder-recent-searches');
    });

    // 리로드해서 깨끗한 상태로 시작
    await page.goto('/');
    const splash = page.getByTestId('splash-screen');
    await expect(splash).toBeVisible();
    await expect(splash).toBeHidden({ timeout: 4000 });

    // Case A: 즐겨찾기/최근검색 없고 결과 없음 → BottomQuickBar 표시
    const quickBarText = page.getByText('가는 길에 어디 들를까요?');
    await expect(quickBarText).toBeVisible({ timeout: 5000 });

    // BottomSheet의 드래그 핸들이 보이지 않아야 함 (BottomSheet가 visible=false)
    const dragHandle = page.locator('[aria-label="드래그하여 패널 조절"]');
    await expect(dragHandle).not.toBeVisible();

    // Case B: 검색 결과가 있으면 → BottomSheet 표시, BottomQuickBar 숨김
    await mockAllAPIs(page, MOCK_RESULTS_5);
    await gotoWithSearch(page);

    await expect(page.getByText('다이소 강남점').first()).toBeVisible({ timeout: 15000 });

    // BottomSheet 드래그 핸들이 보여야 함
    await expect(page.locator('[aria-label="드래그하여 패널 조절"]').first()).toBeVisible();

    // BottomQuickBar 텍스트는 보이지 않아야 함
    await expect(page.getByText('가는 길에 어디 들를까요?')).not.toBeVisible();
  });

  // ────────────────────────────────────────────────────────────
  // 4. 다크 모드에서 하드코딩된 흰색 배경 없음 확인
  // ────────────────────────────────────────────────────────────
  test('다크 모드에서 하드코딩된 흰색 배경이 없어야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    await gotoWithSearch(page);

    // 결과 렌더링 대기
    await expect(page.getByText('다이소 강남점').first()).toBeVisible({ timeout: 15000 });

    // 다크 모드 활성화: 테마 토글 버튼 클릭
    const themeToggle = page.locator('[aria-label="테마 변경"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();

    // theme-dark 클래스가 html에 적용될 때까지 대기
    await expect(page.locator('html.theme-dark')).toBeVisible({ timeout: 3000 });

    // BottomSheet 배경이 var(--bg-surface)를 사용하는지 확인
    const bottomSheet = page.locator('.fixed.inset-x-0.bottom-0.z-40').first();
    if (await bottomSheet.isVisible()) {
      const bgStyle = await bottomSheet.evaluate((el) => el.style.background);
      // 인라인 스타일이 'white' 또는 'rgb(255, 255, 255)'가 아닌지 확인
      expect(bgStyle).not.toMatch(/white/i);
      expect(bgStyle).not.toMatch(/rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/);
      // CSS 변수를 사용해야 함
      expect(bgStyle).toContain('var(--bg-surface)');
    }

    // 주요 컨테이너들에 하드코딩된 흰색 배경이 없는지 확인
    // inline style background:'white' 또는 background:'#fff'/'#ffffff' 검색
    const hardcodedWhiteCount = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      let count = 0;
      for (const el of allElements) {
        const inlineBg = (el as HTMLElement).style.background || (el as HTMLElement).style.backgroundColor;
        if (inlineBg && (
          /^white$/i.test(inlineBg.trim()) ||
          /^#fff(fff)?$/i.test(inlineBg.trim()) ||
          /^rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)$/i.test(inlineBg.trim())
        )) {
          count++;
        }
      }
      return count;
    });

    // 다크 모드에서 하드코딩된 흰색 배경 요소가 없어야 함
    expect(hardcodedWhiteCount).toBe(0);

    // 다크모드에서 BottomSheet 실제 computed 배경색이 밝지 않은지 확인
    if (await bottomSheet.isVisible()) {
      const computedBg = await bottomSheet.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      // rgb(255, 255, 255) 가 아니어야 함
      expect(computedBg).not.toBe('rgb(255, 255, 255)');
    }
  });

  // ────────────────────────────────────────────────────────────
  // 5. 터치 타겟 크기 검증 (강제 48px 제거 후)
  // ────────────────────────────────────────────────────────────
  test('터치 타겟 크기가 적절해야 한다 (과도한 강제 크기 제거 확인)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    await gotoWithSearch(page);

    await expect(page.getByText('다이소 강남점').first()).toBeVisible({ timeout: 15000 });

    // GPS 버튼: 충분한 터치 타겟 (>= 44px)
    const gpsButton = page.locator('[aria-label="현재 위치로 이동"]');
    const gpsBox = await gpsButton.boundingBox();
    expect(gpsBox).toBeTruthy();
    expect(gpsBox!.width).toBeGreaterThanOrEqual(44);
    expect(gpsBox!.height).toBeGreaterThanOrEqual(44);

    // 설정 버튼: 충분한 터치 타겟 (>= 44px)
    const settingsLink = page.locator('[aria-label="설정"]');
    const settingsBox = await settingsLink.boundingBox();
    expect(settingsBox).toBeTruthy();
    expect(settingsBox!.width).toBeGreaterThanOrEqual(44);
    expect(settingsBox!.height).toBeGreaterThanOrEqual(44);

    // 카테고리 태그 버튼: 강제 48px가 아닌 자연스러운 크기여야 함
    const categoryChip = page.locator('button', { hasText: '카페' }).first();
    if (await categoryChip.isVisible()) {
      const chipBox = await categoryChip.boundingBox();
      expect(chipBox).toBeTruthy();
      // 강제 48px 높이가 적용되지 않았는지 확인 (자연스러운 높이는 보통 32-44px)
      // 48px 초과는 과도한 강제 적용을 의미
      expect(chipBox!.height).toBeLessThan(49);
    }

    // input 요소 font-size 확인 (iOS 줌 방지를 위해 16px 이상)
    const searchOverlayBtn = page.getByTestId('open-search-overlay-btn');
    await searchOverlayBtn.click();

    const originInput = page.getByTestId('mobile-origin-input');
    await expect(originInput).toBeVisible({ timeout: 5000 });

    const fontSize = await originInput.evaluate((el) => {
      // AddressInput 내부의 실제 input 요소를 찾기
      const input = el.tagName === 'INPUT' ? el : el.querySelector('input');
      if (!input) return '16px';
      return window.getComputedStyle(input).fontSize;
    });
    const fontSizeNum = parseFloat(fontSize);
    // iOS 줌 방지: 16px 이상이어야 함
    expect(fontSizeNum).toBeGreaterThanOrEqual(16);
  });

  // ────────────────────────────────────────────────────────────
  // 6. 검색 오버레이 모바일 플로우
  // ────────────────────────────────────────────────────────────
  test('검색 오버레이가 올바르게 열리고 닫혀야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    await waitAppReady(page);

    // 검색 오버레이 버튼 클릭
    const overlayBtn = page.getByTestId('open-search-overlay-btn');
    await expect(overlayBtn).toBeVisible();
    await overlayBtn.click();

    // 오버레이가 전체 화면을 덮는지 확인
    const overlay = page.locator('[role="search"][aria-label="경유지 검색"]');
    await expect(overlay).toBeVisible({ timeout: 5000 });

    // fixed inset-0 z-50 → 전체 뷰포트 커버
    const overlayBox = await overlay.boundingBox();
    const viewportSize = page.viewportSize();
    expect(overlayBox).toBeTruthy();
    expect(viewportSize).toBeTruthy();

    // 오버레이가 뷰포트 전체를 대략 커버 (오차 허용)
    expect(overlayBox!.x).toBeLessThanOrEqual(1);
    expect(overlayBox!.y).toBeLessThanOrEqual(1);
    expect(overlayBox!.width).toBeGreaterThanOrEqual(viewportSize!.width - 2);
    expect(overlayBox!.height).toBeGreaterThanOrEqual(viewportSize!.height - 2);

    // 오버레이 z-index가 50인지 확인
    const overlayZIndex = await overlay.evaluate((el) => {
      return parseInt(window.getComputedStyle(el).zIndex, 10) || 0;
    });
    expect(overlayZIndex).toBe(50);

    // 입력 필드 접근 가능 확인
    await expect(page.getByTestId('mobile-origin-input')).toBeVisible();
    await expect(page.getByTestId('mobile-destination-input')).toBeVisible();

    // 뒤로가기 버튼으로 닫기
    const backButton = overlay.locator('[aria-label="뒤로 가기"]');
    await expect(backButton).toBeVisible();
    await backButton.click();

    // 오버레이가 닫혔는지 확인
    await expect(overlay).not.toBeVisible({ timeout: 3000 });

    // 지도 영역(메인 콘텐츠)이 다시 보이는지 확인
    await expect(page.locator('main[role="main"]')).toBeVisible();

    // 다시 열고 Escape로 닫기
    await overlayBtn.click();
    await expect(overlay).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');
    await expect(overlay).not.toBeVisible({ timeout: 3000 });
  });
});
