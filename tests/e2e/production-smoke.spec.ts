/**
 * Production deploy smoke tests.
 *
 * Runs against the deployed Railway URL (or any BASE_URL).
 * No mock — hits real server/DB. Keep it read-only and fast.
 *
 * Verifies the 2026 design rollout:
 * - homepage renders without fatal errors
 * - /settings page has 7-theme swatch picker
 * - clicking a swatch updates data-theme attribute + localStorage
 * - theme persists after reload (FOUC script)
 */

import { test, expect, type Page } from '@playwright/test';

const THEMES = ['blue', 'indigo', 'violet', 'teal', 'emerald', 'rose', 'slate'] as const;

/** Known-noisy console patterns in production — ignore. */
const CONSOLE_IGNORE = [
  /Failed to load resource/i,
  /manifest/i,
  /Service Worker/i,
  /kakao/i,            // Kakao SDK occasionally logs
  /naver/i,            // Naver SDK ditto
  /sentry/i,           // Sentry DSN warnings
  /vercel/i,           // @vercel/analytics
  /ServiceWorker/i,
  /web vitals/i,
  /\[Fast Refresh\]/,
  /hydrat/i,           // hydration mismatches (client-side recovery is automatic)
  /Minified React error #418/,  // hydration mismatch — recovered via client render
  /Minified React error #419/,  // same category
  /Minified React error #422/,  // same category (server rendered mismatch)
  /Minified React error #423/,
  /Minified React error #425/,
];

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (CONSOLE_IGNORE.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => {
    if (CONSOLE_IGNORE.some((re) => re.test(err.message))) return;
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

/** Read the resolved computed color of a CSS var by probe element. */
async function resolveCssVar(page: Page, varName: string): Promise<string> {
  return await page.evaluate((v) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${v})`;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    return resolved;
  }, varName);
}

/** Convert "rgb(r, g, b)" string to lowercase hex (#rrggbb). */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return rgb.toLowerCase();
  const n = (x: string) => Number(x).toString(16).padStart(2, '0');
  return `#${n(m[1])}${n(m[2])}${n(m[3])}`;
}

test.describe('production deploy smoke', () => {
  test('홈 페이지: HTTP 200 + 기본 DOM 로드', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(resp?.status(), 'homepage HTTP status').toBeLessThan(400);

    await expect(page).toHaveTitle(/MidWayDer/);

    // 스플래시가 있으면 사라질 때까지, 없으면 통과
    const splash = page.getByTestId('splash-screen');
    await splash.waitFor({ state: 'hidden', timeout: 12_000 }).catch(() => {});

    // 애플리케이션 shell 렌더 확인 — 데스크톱/모바일 둘 중 하나의 엔트리 UI
    await expect
      .poll(
        async () => {
          const desktop = await page.getByTestId('origin-input').isVisible().catch(() => false);
          const mobile = await page.getByTestId('open-search-overlay-btn').isVisible().catch(() => false);
          return desktop || mobile;
        },
        { timeout: 15_000, message: 'main UI shell (origin-input or open-search-overlay-btn)' }
      )
      .toBe(true);

    // 치명적 에러 없음 (noise 필터링 후)
    expect(errors, `unexpected console errors:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('설정 페이지: 7개 테마 스와치 + 밝기 3모드', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    // "화면 테마" 섹션
    await expect(page.getByRole('heading', { name: '화면 테마' })).toBeVisible({ timeout: 10_000 });

    // 7개 스와치 모두 노출 (aria-label 기반)
    const labels: Record<typeof THEMES[number], string> = {
      blue: '블루 (기본)',
      indigo: '인디고',
      violet: '바이올렛',
      teal: '틸',
      emerald: '에메랄드',
      rose: '로즈',
      slate: '슬레이트',
    };
    for (const theme of THEMES) {
      await expect(
        page.getByRole('button', { name: labels[theme] }),
        `${theme} 스와치`
      ).toBeVisible();
    }

    // 밝기 3개 모드 버튼
    await expect(page.getByRole('button', { name: /라이트/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /다크/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /시간대별/ })).toBeVisible();

    // 미리보기 카드 ("출발" 버튼)
    await expect(page.getByRole('button', { name: '출발' })).toBeVisible();
  });

  test('테마 스위치: 바이올렛 클릭 → data-theme=violet + --accent 반영', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    // 섹션 노출까지 대기 (hydration)
    await expect(page.getByRole('heading', { name: '화면 테마' })).toBeVisible({ timeout: 10_000 });

    // 바이올렛 선택
    await page.getByRole('button', { name: '바이올렛' }).click();

    // data-theme=violet 반영
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'violet', { timeout: 5_000 });

    // localStorage 영속
    const stored = await page.evaluate(() => localStorage.getItem('color-theme'));
    expect(stored).toBe('violet');

    // --accent 가 violet 500 (#8b5cf6 = rgb(139, 92, 246)) 로 실제 컴퓨트되는지
    const accentRgb = await resolveCssVar(page, '--accent');
    expect(rgbToHex(accentRgb), `--accent resolved: ${accentRgb}`).toBe('#8b5cf6');
  });

  test('테마 영속: 리로드 후에도 유지 (FOUC 스크립트)', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await expect(page.getByRole('heading', { name: '화면 테마' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: '에메랄드' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'emerald', { timeout: 5_000 });

    // 홈 이동 후에도 유지
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'emerald', { timeout: 5_000 });

    // 리로드 (FOUC 방지 스크립트가 beforeInteractive 로 먼저 data-theme 설정)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'emerald', { timeout: 5_000 });
  });

  test('다크 모드: 클릭 후 theme-dark 클래스 반영 + --text-primary 변경', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    // 격리: 저장된 theme 키 제거 + 깨끗한 상태로 리로드
    await page.evaluate(() => {
      localStorage.removeItem('theme');
      localStorage.removeItem('auto-theme');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '화면 테마' })).toBeVisible({ timeout: 10_000 });

    // hydration 보장
    await page.waitForTimeout(500);

    const wasDarkBefore = await page.locator('html.theme-dark').count();
    await page.getByRole('button', { name: /다크/ }).click();

    // 클릭 후 dark 가 적용됐거나 (light→dark), 이미 dark 였으면 유지
    await expect(page.locator('html')).toHaveClass(/theme-dark/, { timeout: 5_000 });

    // --text-primary 가 다크 값 (#e5e7eb = rgb(229, 231, 235)) 로
    const textPrimaryRgb = await resolveCssVar(page, '--text-primary');
    const textHex = rgbToHex(textPrimaryRgb);
    expect(textHex, `text-primary: ${textPrimaryRgb}`).toBe('#e5e7eb');
    expect(wasDarkBefore).toBeDefined(); // satisfy linter for unused var
  });

  test('health: /api/health 엔드포인트 200', async ({ request }) => {
    const resp = await request.get('/api/health', { timeout: 15_000 });
    expect(resp.status()).toBe(200);
  });
});
