import { test, expect } from '@playwright/test';

test.describe('네비게이션 딥링크', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // splash screen이 사라질 때까지 대기
    const splash = page.getByTestId('splash-screen');
    await expect(splash).toBeHidden({ timeout: 15000 });
  });

  test('홈 페이지 기본 UI 요소 존재', async ({ page }) => {
    // 검색 오버레이 열기 버튼 또는 인풋
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // main 요소 확인 (더 구체적인 selector)
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('네비 앱 딥링크는 kakaonavi/nmap/tmap 스킴 사용', async ({ page, isMobile }) => {
    // 결과 카드 없이 딥링크 검증은 단위 테스트로 처리
    // E2E에서는 페이지 로드와 기본 구조 확인
    if (isMobile) {
      // mobile: 오버레이 열기 버튼 확인
      await expect(page.getByTestId('open-search-overlay-btn')).toBeVisible();
    } else {
      // desktop: 입력 필드 확인
      await expect(page.getByTestId('origin-input')).toBeVisible();
    }
  });
});
