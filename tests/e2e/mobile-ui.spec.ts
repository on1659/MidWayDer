import { test, expect, type Page } from '@playwright/test';

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

async function mockAllAPIs(page: Page, results = MOCK_RESULTS_5, searchDelayMs = 0) {
  await page.route('**/api/search', async (route) => {
    if (searchDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, searchDelayMs));
    }
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":{}}' });
  });
  await page.route('**/api/stats*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":{"topCategories":[],"totalSearches":0}}' });
  });
  await page.route('**/api/autocomplete*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"results":[]}' });
  });
  await page.route('**/api/log-click', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
  });
  await page.route('**/api/feedback', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
  });
  await page.route('**/api/bookmarks*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":[]}' });
  });
  await page.route('**/api/routes*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"routes":[]}' });
  });
}

async function waitAppReady(
  page: Page,
  opts?: {
    start?: string; slat?: number; slng?: number;
    end?: string; elat?: number; elng?: number;
    cat?: string;
  },
) {
  const params = opts
    ? new URLSearchParams({
        ...(opts.start ? { start: opts.start } : {}),
        ...(opts.slat ? { slat: String(opts.slat) } : {}),
        ...(opts.slng ? { slng: String(opts.slng) } : {}),
        ...(opts.end ? { end: opts.end } : {}),
        ...(opts.elat ? { elat: String(opts.elat) } : {}),
        ...(opts.elng ? { elng: String(opts.elng) } : {}),
        ...(opts.cat ? { cat: opts.cat } : {}),
      }).toString()
    : '';
  await page.goto(`/${params ? '?' + params : ''}`);
  const splash = page.getByTestId('splash-screen').first();
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden({ timeout: 4000 });
}

async function gotoWithSearch(page: Page) {
  await waitAppReady(page, {
    start: '강남역',
    slat: 37.4979,
    slng: 127.0276,
    end: '잠실역',
    elat: 37.5133,
    elng: 127.0998,
  });
  const sheet = page.getByTestId('mobile-result-sheet');
  await expect(sheet.getByText('다이소 강남점')).toBeVisible({ timeout: 15000 });
  return sheet;
}

test.describe('Mobile UI', () => {
  test('결과 패널 콘텐츠 영역이 스크롤 가능해야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    const sheet = await gotoWithSearch(page);
    const contentArea = page.getByTestId('mobile-result-list');

    await expect(sheet).toBeVisible();
    await expect(contentArea).toBeVisible();
    await expect(contentArea.getByText('다이소 강남점')).toBeVisible();
    await contentArea.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect(contentArea.getByText('다이소 코엑스점')).toBeVisible();

    const overflowY = await contentArea.evaluate((el) => window.getComputedStyle(el).overflowY);
    expect(['auto', 'scroll']).toContain(overflowY);

    const touchAction = await contentArea.evaluate((el) => window.getComputedStyle(el).touchAction);
    expect(touchAction).not.toBe('none');
  });

  test('결과 패널은 하단 바텀시트로 붙고 모바일 상단 검색 진입점과 겹치지 않아야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    const sheet = await gotoWithSearch(page);
    const searchButton = page.getByTestId('open-search-overlay-btn');

    await expect(searchButton).toBeVisible();
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId('desktop-floating-actions')).not.toBeVisible();

    const viewportSize = page.viewportSize();
    const searchBox = await searchButton.boundingBox();
    const sheetBox = await sheet.boundingBox();
    expect(viewportSize).toBeTruthy();
    expect(searchBox).toBeTruthy();
    expect(sheetBox).toBeTruthy();
    expect(searchBox!.y + searchBox!.height).toBeLessThan(sheetBox!.y);
    expect(Math.round(sheetBox!.y + sheetBox!.height)).toBeGreaterThanOrEqual(viewportSize!.height - 1);
    expect(sheetBox!.height).toBeGreaterThanOrEqual(viewportSize!.height * 0.46);
    expect(sheetBox!.height).toBeLessThanOrEqual(viewportSize!.height * 0.6);
    expect(sheetBox!.y).toBeGreaterThanOrEqual(viewportSize!.height * 0.38);
  });

  test('결과 패널은 접고 펼쳐서 지도 가시영역을 조절할 수 있어야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    const sheet = await gotoWithSearch(page);
    const handle = page.getByTestId('mobile-result-sheet-handle');
    const viewportSize = page.viewportSize();
    expect(viewportSize).toBeTruthy();

    await expect(handle).toBeVisible();
    await expect(sheet).toHaveAttribute('data-state', 'expanded');
    await expect(handle).toHaveAttribute('aria-expanded', 'true');

    await handle.click();
    await expect(sheet).toHaveAttribute('data-state', 'collapsed');
    await expect(handle).toHaveAttribute('aria-expanded', 'false');

    const collapsedBox = await sheet.boundingBox();
    expect(collapsedBox).toBeTruthy();
    expect(collapsedBox!.height).toBeLessThanOrEqual(viewportSize!.height * 0.38);
    expect(Math.round(collapsedBox!.y + collapsedBox!.height)).toBeGreaterThanOrEqual(viewportSize!.height - 1);

    await handle.click();
    await expect(sheet).toHaveAttribute('data-state', 'expanded');
    await expect(handle).toHaveAttribute('aria-expanded', 'true');

    const expandedBox = await sheet.boundingBox();
    expect(expandedBox).toBeTruthy();
    expect(expandedBox!.height).toBeGreaterThan(collapsedBox!.height + 32);
    expect(expandedBox!.height).toBeLessThanOrEqual(viewportSize!.height * 0.6);
  });

  test('결과가 없을 때는 단순 검색 진입점만 보여야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page, []);
    await waitAppReady(page);

    await expect(page.getByTestId('mobile-home-shell')).toBeAttached();
    await expect(page.getByTestId('open-search-overlay-btn')).toBeVisible();
    await expect(page.getByTestId('mobile-idle-sheet')).toBeVisible();
    await expect(page.getByTestId('mobile-category-rail').getByRole('button', { name: '카페' })).toBeVisible();
    await expect(page.getByTestId('mobile-category-rail').getByText('커피')).not.toBeVisible();
    const railOverflow = await page.getByTestId('mobile-category-rail').evaluate((rail) => {
      return Array.from(rail.querySelectorAll('button')).some((button) => {
        const buttonRect = button.getBoundingClientRect();
        return Array.from(button.querySelectorAll('span')).some((span) => {
          const rect = span.getBoundingClientRect();
          return rect.left < buttonRect.left - 0.5 || rect.right > buttonRect.right + 0.5;
        });
      });
    });
    expect(railOverflow).toBe(false);
    const railMaxButtonHeight = await page.getByTestId('mobile-category-rail').evaluate((rail) => {
      return Math.max(...Array.from(rail.querySelectorAll('button')).map((button) => button.getBoundingClientRect().height));
    });
    expect(railMaxButtonHeight).toBeLessThanOrEqual(38);
    await expect(page.getByTestId('mobile-result-sheet')).not.toBeVisible();
    await expect(page.getByText('어디로 갈까요?')).toBeVisible();
    await expect(page.getByText('경로 입력')).toBeVisible();
  });

  test('모바일 검색 중에는 대형 단계 카드와 skeleton 바텀시트를 보여주지 않아야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page, MOCK_RESULTS_5, 1500);
    await waitAppReady(page, {
      start: '강남역',
      slat: 37.4979,
      slng: 127.0276,
      end: '잠실역',
      elat: 37.5133,
      elng: 127.0998,
    });

    await expect(page.getByTestId('open-search-overlay-btn')).toBeVisible();
    await expect(page.getByTestId('mobile-result-sheet')).not.toBeVisible();
    await expect(page.getByTestId('open-search-overlay-btn').getByText('찾는 중...')).toBeVisible();
    await expect(page.getByText('경로 분석 중')).not.toBeVisible();
    await expect(page.getByText('장소 탐색 중')).not.toBeVisible();
    await expect(page.getByText('비용 계산 중')).not.toBeVisible();

    const sheet = page.getByTestId('mobile-result-sheet');
    await expect(sheet.getByText('다이소 강남점')).toBeVisible({ timeout: 5000 });
  });

  test('다크 모드에서도 모바일 결과 시트 정보 대비를 유지해야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    const sheet = await gotoWithSearch(page);

    await page.evaluate(() => document.documentElement.classList.add('theme-dark'));
    await expect(page.locator('html.theme-dark')).toBeVisible({ timeout: 3000 });

    const readability = await sheet.evaluate((el) => {
      const bg = window.getComputedStyle(el).backgroundColor;
      const title = el.querySelector('h2');
      const firstCard = el.querySelector('[data-result-index="0"]');
      const firstTitle = firstCard?.querySelector('h3');
      return {
        bg,
        titleColor: title ? window.getComputedStyle(title).color : '',
        firstCardBg: firstCard ? window.getComputedStyle(firstCard).backgroundColor : '',
        firstTitleColor: firstTitle ? window.getComputedStyle(firstTitle).color : '',
      };
    });
    expect(readability.bg).toBe('rgb(248, 250, 252)');
    expect(readability.titleColor).toBe('rgb(15, 23, 42)');
    expect(readability.firstCardBg).toBe('rgb(255, 255, 255)');
    expect(readability.firstTitleColor).toBe('rgb(15, 23, 42)');
  });

  test('터치 타겟과 모바일 줌 접근성 기준을 만족해야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    await waitAppReady(page);

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).not.toContain('user-scalable=no');
    expect(viewportMeta).not.toContain('maximum-scale=1');

    await page.getByTestId('open-search-overlay-btn').click();
    const overlay = page.locator('[role="dialog"][aria-labelledby="search-overlay-title"]');
    await expect(overlay).toBeVisible();

    const searchButtonBox = await page.getByTestId('mobile-search-route-btn').boundingBox();
    expect(searchButtonBox).toBeTruthy();
    expect(searchButtonBox!.height).toBeGreaterThanOrEqual(44);

    await page.getByTestId('mobile-route-edit-trigger').click();
    const originInput = page.getByTestId('mobile-origin-input');
    const fontSize = await originInput.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16);
  });

  test('검색 오버레이가 모달로 열리고 닫혀야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    await waitAppReady(page);

    const overlayBtn = page.getByTestId('open-search-overlay-btn');
    await overlayBtn.click();

    const overlay = page.locator('[role="dialog"][aria-labelledby="search-overlay-title"]');
    await expect(overlay).toBeVisible({ timeout: 5000 });
    await expect(overlay).toHaveAttribute('aria-modal', 'true');

    const viewportSize = page.viewportSize();
    expect(viewportSize).toBeTruthy();

    await expect.poll(async () => {
      const box = await overlay.boundingBox();
      return box ? Math.round(box.y) : 9999;
    }).toBeLessThanOrEqual(1);

    const overlayBox = await overlay.boundingBox();
    expect(overlayBox).toBeTruthy();
    expect(overlayBox!.x).toBeLessThanOrEqual(1);
    expect(overlayBox!.width).toBeGreaterThanOrEqual(viewportSize!.width - 2);
    expect(overlayBox!.height).toBeGreaterThanOrEqual(viewportSize!.height - 2);

    const overlayPaint = await overlay.evaluate((el) => {
      const bg = window.getComputedStyle(el).backgroundColor;
      const topHit = document.elementsFromPoint(window.innerWidth / 2, 24)
        .some((node) => node === el || el.contains(node));
      return { bg, topHit };
    });
    expect(overlayPaint.bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(overlayPaint.topHit).toBe(true);

    await expect(page.getByTestId('mobile-route-edit-trigger')).toBeVisible();
    await expect(page.getByTestId('mobile-route-input-card')).not.toBeVisible();
    await expect(page.getByTestId('mobile-transport-tabs')).not.toBeVisible();

    await page.getByTestId('mobile-route-edit-trigger').click();
    await expect(page.getByTestId('mobile-origin-input')).toBeVisible();
    await expect(page.getByTestId('mobile-destination-input')).toBeVisible();
    await expect(page.getByTestId('mobile-route-input-card')).toBeVisible();
    await expect(page.getByTestId('mobile-transport-tabs')).toBeVisible();
    await expect(page.getByTestId('mobile-transport-tabs').getByRole('button', { name: '버스' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('mobile-category-input-card')).toBeVisible();
    await expect(page.getByTestId('mobile-search-sticky-footer')).toBeVisible();

    const routeCardBox = await page.getByTestId('mobile-route-input-card').boundingBox();
    const transportBox = await page.getByTestId('mobile-transport-tabs').boundingBox();
    expect(routeCardBox).toBeTruthy();
    expect(transportBox).toBeTruthy();
    expect(routeCardBox!.height).toBeLessThanOrEqual(120);
    expect(transportBox!.height).toBeLessThanOrEqual(52);

    const footerBox = await page.getByTestId('mobile-search-sticky-footer').boundingBox();
    expect(footerBox).toBeTruthy();
    expect(footerBox!.y + footerBox!.height).toBeGreaterThanOrEqual(viewportSize!.height - 2);
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(viewportSize!.height + 2);

    await overlay.locator('[aria-label="뒤로 가기"]').click();
    await expect(overlay).not.toBeVisible({ timeout: 3000 });

    await overlayBtn.click();
    await expect(overlay).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await expect(overlay).not.toBeVisible({ timeout: 3000 });
  });

  test('모바일 키보드 검색 키로 경유지 검색이 실행되어야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    await waitAppReady(page);

    await page.getByTestId('open-search-overlay-btn').click();
    await page.getByTestId('mobile-route-edit-trigger').click();
    await page.getByTestId('mobile-origin-input').fill('스마일게이트캠퍼스');
    await page.getByTestId('mobile-destination-input').fill('서울 광진구 자양동 660-24');
    await page.keyboard.press('Enter');

    const sheet = page.getByTestId('mobile-result-sheet');
    await expect(sheet.getByText('5개 경유지')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[role="dialog"][aria-labelledby="search-overlay-title"]')).not.toBeVisible();
  });

  test('모바일 결과 액션 문구가 대상과 행동을 명확히 보여야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    const sheet = await gotoWithSearch(page);

    await expect(sheet.getByText('5개 경유지')).toBeVisible();
    await expect(sheet.getByText('10개 후보 중 선별')).toBeVisible();
    await expect(sheet.getByRole('button', { name: '경로 저장' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: '조건 수정' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /지도에서 다이소 강남점 보기/ })).toBeVisible();
    await expect(sheet.getByText('+8분').first()).toBeVisible();
    await expect(sheet.getByText('1.3km').first()).toBeVisible();
    await expect(sheet.getByText('78점').first()).toBeVisible();
    await expect(sheet.getByText('지도에서 보기')).not.toBeVisible();

    const sheetPaint = await sheet.evaluate((el) => {
      const bg = window.getComputedStyle(el).backgroundColor;
      const title = el.querySelector('h2');
      const firstCard = el.querySelector('[data-result-index="0"]');
      const firstTitle = firstCard?.querySelector('h3');
      return {
        bg,
        titleColor: title ? window.getComputedStyle(title).color : '',
        cardBg: firstCard ? window.getComputedStyle(firstCard).backgroundColor : '',
        firstTitleFontSize: firstTitle ? window.getComputedStyle(firstTitle).fontSize : '',
        badgeOverflow: firstCard ? Array.from(firstCard.querySelectorAll('span')).some((span) => {
          const text = span.textContent?.trim();
          if (text !== 'BEST' && text !== '표시 중') return false;
          const rect = span.getBoundingClientRect();
          return Array.from(span.childNodes).some(() => false) || rect.width < 34 || rect.height < 14;
        }) : true,
      };
    });
    expect(sheetPaint.bg).toBe('rgb(248, 250, 252)');
    expect(sheetPaint.titleColor).toBe('rgb(15, 23, 42)');
    expect(sheetPaint.cardBg).toBe('rgb(255, 255, 255)');
    expect(parseFloat(sheetPaint.firstTitleFontSize)).toBeGreaterThanOrEqual(16);
    expect(sheetPaint.badgeOverflow).toBe(false);
  });

  test('PWA 카테고리 shortcut URL이 검색 상태에 반영되어야 한다', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockAllAPIs(page);
    await waitAppReady(page, { cat: '스타벅스' });

    await page.getByTestId('open-search-overlay-btn').click();
    await expect(page.locator('button[aria-label="스타벅스"][aria-pressed="true"]')).toBeVisible();
  });
});
