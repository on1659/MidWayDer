'use client';

import { useState, useEffect } from 'react';

export const COLOR_THEMES = ['blue', 'indigo', 'violet', 'teal', 'emerald', 'rose', 'slate'] as const;
export type ColorTheme = typeof COLOR_THEMES[number];
export const DEFAULT_COLOR_THEME: ColorTheme = 'blue';

const COLOR_THEME_LABELS: Record<ColorTheme, string> = {
  blue: '블루 (기본)',
  indigo: '인디고',
  violet: '바이올렛',
  teal: '틸',
  emerald: '에메랄드',
  rose: '로즈',
  slate: '슬레이트',
};

export function getColorThemeLabel(t: ColorTheme): string {
  return COLOR_THEME_LABELS[t];
}

function isColorTheme(value: string | null): value is ColorTheme {
  return !!value && (COLOR_THEMES as readonly string[]).includes(value);
}

interface UseThemeReturn {
  theme: 'light' | 'dark';
  autoTheme: boolean;
  colorTheme: ColorTheme;
  toggleTheme: () => void;
  toggleAutoTheme: () => void;
  setColorTheme: (next: ColorTheme) => void;
}

export function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [autoTheme, setAutoTheme] = useState(false);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(DEFAULT_COLOR_THEME);

  // 테마 초기화 + 시스템 테마 동기화
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const autoSaved = localStorage.getItem('auto-theme');

      if (autoSaved === 'true') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAutoTheme(true);
        const hour = new Date().getHours();
        const shouldBeDark = hour < 6 || hour >= 18;
        document.documentElement.classList.toggle('theme-dark', shouldBeDark);
        document.documentElement.classList.toggle('theme-light', !shouldBeDark);
        setTheme(shouldBeDark ? 'dark' : 'light');
      } else if (saved === 'dark') {
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
        setTheme('dark');
      } else if (saved === 'light') {
        document.documentElement.classList.remove('theme-dark');
        document.documentElement.classList.add('theme-light');
        setTheme('light');
      } else {
        document.documentElement.classList.add('theme-light');
        setTheme('light');
      }

      // Color theme 초기화
      const savedColor = localStorage.getItem('color-theme');
      const applied = isColorTheme(savedColor) ? savedColor : DEFAULT_COLOR_THEME;
      document.documentElement.setAttribute('data-theme', applied);
      setColorThemeState(applied);
    } catch {
      // localStorage 접근 불가 시 무시 (Private 모드, 저장 공간 부족 등)
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem('theme');
        const autoSaved = localStorage.getItem('auto-theme');
        if (saved || autoSaved === 'true') return;
        const prefersDark = e.matches;
        document.documentElement.classList.toggle('theme-dark', prefersDark);
        document.documentElement.classList.toggle('theme-light', !prefersDark);
        setTheme(prefersDark ? 'dark' : 'light');
      } catch {
        // localStorage 접근 불가 시 무시 (Private 모드, 저장 공간 부족 등)
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 자동 테마 전환 (1분마다 체크)
  useEffect(() => {
    if (!autoTheme) return;

    const checkTheme = () => {
      const hour = new Date().getHours();
      const shouldBeDark = hour < 6 || hour >= 18;
      const currentTheme = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';

      if ((shouldBeDark && currentTheme === 'light') || (!shouldBeDark && currentTheme === 'dark')) {
        const newTheme = shouldBeDark ? 'dark' : 'light';
        document.documentElement.classList.toggle('theme-dark', shouldBeDark);
        document.documentElement.classList.toggle('theme-light', !shouldBeDark);
        setTheme(newTheme);
      }
    };

    const interval = setInterval(checkTheme, 60000);
    return () => clearInterval(interval);
  }, [autoTheme]);

  // theme-color 메타 동기화 (light/dark + colorTheme 둘 다 반응)
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim();
    if (accent) meta.setAttribute('content', accent);
  }, [theme, colorTheme]);

  const toggleTheme = () => {
    setAutoTheme(false);
    try { localStorage.removeItem('auto-theme'); } catch {
      // localStorage 접근 불가 시 무시
    }

    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('theme-dark', next === 'dark');
    document.documentElement.classList.toggle('theme-light', next === 'light');
    try { localStorage.setItem('theme', next); } catch {
      // localStorage 접근 불가 시 무시
    }
  };

  const toggleAutoTheme = () => {
    const nextAuto = !autoTheme;
    setAutoTheme(nextAuto);

    try {
      if (nextAuto) {
        localStorage.setItem('auto-theme', 'true');
        localStorage.removeItem('theme');

        const hour = new Date().getHours();
        const shouldBeDark = hour < 6 || hour >= 18;
        document.documentElement.classList.toggle('theme-dark', shouldBeDark);
        document.documentElement.classList.toggle('theme-light', !shouldBeDark);
        setTheme(shouldBeDark ? 'dark' : 'light');
      } else {
        localStorage.removeItem('auto-theme');
        localStorage.setItem('theme', theme);
      }
    } catch {
      // localStorage 접근 불가 시 무시 (Private 모드, 저장 공간 부족 등)
    }
  };

  const setColorTheme = (next: ColorTheme) => {
    setColorThemeState(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('color-theme', next);
    } catch {
      // localStorage 접근 불가 시 무시
    }
  };

  return { theme, autoTheme, colorTheme, toggleTheme, toggleAutoTheme, setColorTheme };
}
