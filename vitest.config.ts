import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // environmentMatchGlobs 제거 — 파일별 // @vitest-environment jsdom 주석으로 대체
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/app/api/**'],
      exclude: ['src/lib/__tests__/**', 'src/app/api/**/__tests__/**'],
      thresholds: {
        lines: 55,
        functions: 50,
        branches: 50,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
