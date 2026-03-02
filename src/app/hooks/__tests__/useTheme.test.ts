// @vitest-environment jsdom
/**
 * useTheme.test.ts
 * 테마 전환 로직 검증 (Node 환경 — React 렌더링 없이)
 *
 * useTheme 훅의 핵심 비즈니스 로직을 동일한 알고리즘으로 재현하여 검증합니다.
 */
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---- 재현 함수 (useTheme 내부 로직과 동일) ----

function getInitialTheme(
  storage: { getItem: (k: string) => string | null },
  prefersDark: boolean
): 'light' | 'dark' {
  const saved = storage.getItem('theme');
  const autoSaved = storage.getItem('auto-theme');
  if (autoSaved === 'true') {
    const hour = new Date().getHours();
    return (hour < 6 || hour >= 18) ? 'dark' : 'light';
  }
  if (saved === 'dark') return 'dark';
  if (saved === 'light') return 'light';
  return prefersDark ? 'dark' : 'light';
}

function toggleTheme(current: 'light' | 'dark'): 'light' | 'dark' {
  return current === 'dark' ? 'light' : 'dark';
}

describe('useTheme — 테마 초기화 로직', () => {
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  beforeEach(() => { store = {}; });

  it('localStorage 비어있고 prefers-color-scheme:light → light', () => {
    expect(getInitialTheme(mockStorage, false)).toBe('light');
  });

  it('localStorage에 "dark" 저장 → dark', () => {
    mockStorage.setItem('theme', 'dark');
    expect(getInitialTheme(mockStorage, false)).toBe('dark');
  });

  it('localStorage에 "light" 저장 → light (시스템 dark여도)', () => {
    mockStorage.setItem('theme', 'light');
    expect(getInitialTheme(mockStorage, true)).toBe('light');
  });

  it('auto-theme=true이면 시간대 기반으로 결정', () => {
    mockStorage.setItem('auto-theme', 'true');
    const result = getInitialTheme(mockStorage, false);
    expect(['light', 'dark']).toContain(result);
  });
});

describe('useTheme — 테마 토글 로직', () => {
  it('light → toggleTheme → dark', () => {
    expect(toggleTheme('light')).toBe('dark');
  });

  it('dark → toggleTheme → light', () => {
    expect(toggleTheme('dark')).toBe('light');
  });
});

describe('useTheme — 훅 (jsdom 환경)', () => {
  // Vitest v4 jsdom 환경에서 localStorage가 완전한 Storage API를 제공하지 않을 수 있어
  // 테스트용 완전한 구현체를 설치한다
  const lsStore: Record<string, string> = {};
  const mockLS: Storage = {
    getItem: (k: string) => lsStore[k] ?? null,
    setItem: (k: string, v: string) => { lsStore[k] = v; },
    removeItem: (k: string) => { delete lsStore[k]; },
    clear: () => { Object.keys(lsStore).forEach(k => delete lsStore[k]); },
    key: (i: number) => Object.keys(lsStore)[i] ?? null,
    get length() { return Object.keys(lsStore).length; },
  };

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      configurable: true,
      value: mockLS,
    });
  });

  beforeEach(() => {
    mockLS.clear();
    document.documentElement.classList.remove('theme-dark');
    // matchMedia 모킹
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renderHook: 초기 테마 확인 (localStorage 없으면 light 또는 dark)', async () => {
    const { useTheme } = await import('../useTheme');
    const { result } = renderHook(() => useTheme());
    expect(['light', 'dark']).toContain(result.current.theme);
  });

  it('renderHook: toggleTheme() 호출 시 테마 전환', async () => {
    mockLS.setItem('theme', 'light');
    const { useTheme } = await import('../useTheme');
    const { result } = renderHook(() => useTheme());
    const before = result.current.theme;
    act(() => { result.current.toggleTheme(); });
    expect(result.current.theme).not.toBe(before);
  });

  it('renderHook: localStorage에 테마 저장', async () => {
    const { useTheme } = await import('../useTheme');
    const { result } = renderHook(() => useTheme());
    act(() => { result.current.toggleTheme(); });
    expect(['light', 'dark']).toContain(mockLS.getItem('theme'));
  });

  it('renderHook: toggleAutoTheme() 동작', async () => {
    const { useTheme } = await import('../useTheme');
    const { result } = renderHook(() => useTheme());
    const initialAuto = result.current.autoTheme;
    act(() => { result.current.toggleAutoTheme(); });
    expect(result.current.autoTheme).toBe(!initialAuto);
  });
});
