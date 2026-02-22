import { test, expect, type Page } from '@playwright/test';

const mockSearchSuccess = async (page: Page) => {
  await page.route('**/api/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          results: [
            {
              place: {
                id: 'mock-place-1',
                name: '다이소 강남점',
                address: '서울 강남구 테헤란로 1',
                roadAddress: '서울 강남구 테헤란로 1',
              },
              detourCost: {
                distance: 1200,
                duration: 420,
              },
              routes: {
                original: null,
                toWaypoint: null,
                fromWaypoint: null,
              },
              routeType: 'fastest',
            },
          ],
          totalCandidates: 12,
          apiCallsUsed: 2,
        },
      }),
    });
  });
};

const waitAppReady = async (page: Page) => {
  await page.goto('/');
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
    await waitAppReady(page);

    await page.getByTestId('origin-input').fill('강남역');
    await page.getByTestId('destination-input').fill('잠실역');
    await page.getByTestId('search-route-btn').click();

    await expect(page.getByTestId('route-result-panel')).toBeVisible();
    await expect(page.getByText('다이소 강남점')).toBeVisible();
    await expect(page.getByText('+1.2km')).toBeVisible();
  });

  test('desktop: API 실패 시 에러 메시지 표시', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop project only');
    await page.route('**/api/search', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            message: '검색 중 오류가 발생했습니다.',
          },
        }),
      });
    });

    await waitAppReady(page);

    await page.getByTestId('origin-input').fill('강남역');
    await page.getByTestId('destination-input').fill('잠실역');
    await page.getByTestId('search-route-btn').click();

    await expect(page.getByText(/오류|실패/)).toBeVisible();
  });

  test('mobile: 오버레이에서 검색 가능', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile project only');

    await mockSearchSuccess(page);
    await waitAppReady(page);

    await page.getByTestId('open-search-overlay-btn').click();
    await page.getByTestId('mobile-origin-input').fill('홍대입구역');
    await page.getByTestId('mobile-destination-input').fill('서울역');
    await page.getByTestId('mobile-search-route-btn').click();

    await expect(page.getByText('다이소 강남점')).toBeVisible();
  });
});
