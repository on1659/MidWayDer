import { test, expect, type Page } from '@playwright/test';

const waitAppReady = async (page: Page) => {
  await page.goto('/');
  const splash = page.getByTestId('splash-screen');
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden({ timeout: 5000 });
};

test.describe('Autocomplete E2E', () => {
  test('자동완성 - 데스크톱 입력 필드 존재 확인', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    
    await waitAppReady(page);
    
    // 핵심 입력 필드 확인
    await expect(page.getByTestId('origin-input')).toBeVisible();
    await expect(page.getByTestId('destination-input')).toBeVisible();
    await expect(page.getByTestId('search-route-btn')).toBeVisible();
  });

  test('자동완성 - 검색 버튼 초기 상태', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    
    await waitAppReady(page);
    
    // 입력 없이는 검색 버튼 비활성화
    const searchBtn = page.getByTestId('search-route-btn');
    await expect(searchBtn).toBeDisabled();
  });

  test('자동완성 - 모바일 오버레이 입력 필드', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only');
    
    await waitAppReady(page);
    
    // 오버레이 열기
    const overlayBtn = page.getByTestId('open-search-overlay-btn');
    await expect(overlayBtn).toBeVisible();
    await overlayBtn.click();
    
    // 모바일 경로/카테고리 검색 UI 확인
    await expect(page.getByTestId('mobile-place-search-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('mobile-place-search-input')).toBeVisible();
    await expect(page.getByTestId('mobile-category-input-card')).toBeVisible({ timeout: 5000 });
  });

  test('자동완성 - 입력 필드 포커스', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    
    await waitAppReady(page);
    
    // 출발지 입력 필드 클릭
    const originInput = page.getByTestId('origin-input');
    await originInput.click();
    
    // 포커스 상태 확인
    await expect(originInput).toBeFocused();
  });
});
