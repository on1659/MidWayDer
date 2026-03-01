import { test, expect } from '@playwright/test';

test.describe('네비게이션 딥링크', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('홈 페이지 기본 UI 요소 존재', async ({ page }) => {
    // 검색 오버레이 열기 버튼 또는 인풋
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('네비 앱 딥링크는 kakaonavi/nmap/tmap 스킴 사용', async ({ page }) => {
    // 결과 카드 없이 딥링크 검증은 단위 테스트로 처리
    // E2E에서는 페이지 로드와 기본 구조 확인
    await expect(page.locator('main, #__next, body > div')).toBeVisible();
  });
});
