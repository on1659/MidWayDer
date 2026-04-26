/**
 * Playwright config for production deploy smoke tests.
 *
 * Hits the live Railway deployment (no local webServer).
 * Verifies: homepage loads, /settings has 7 theme swatches,
 * theme switching updates DOM, no console errors on load.
 *
 * Usage:
 *   npm run test:prod                         # default Railway URL
 *   BASE_URL=https://staging.example.com npm run test:prod
 */

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://midwayder.up.railway.app';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /production-smoke\.spec\.ts$/,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: 2,
  workers: 2,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  // No webServer — we're hitting live prod.
});
