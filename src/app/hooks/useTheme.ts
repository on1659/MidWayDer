'use client';

import { useState, useEffect } from 'react';

interface UseThemeReturn {
  theme: 'light' | 'dark';
  autoTheme: boolean;
  toggleTheme: () => void;
  toggleAutoTheme: () => void;
}

export function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [autoTheme, setAutoTheme] = useState(false);

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
        setTheme(shouldBeDark ? 'dark' : 'light');
      } else if (saved === 'dark') {
        document.documentElement.classList.add('theme-dark');
        setTheme('dark');
      } else if (saved === 'light') {
        document.documentElement.classList.remove('theme-dark');
        setTheme('light');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('theme-dark');
          setTheme('dark');
        }
      }
    } catch { /* ignore */ }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem('theme');
        const autoSaved = localStorage.getItem('auto-theme');
        if (saved || autoSaved === 'true') return;
        const prefersDark = e.matches;
        document.documentElement.classList.toggle('theme-dark', prefersDark);
        setTheme(prefersDark ? 'dark' : 'light');
      } catch { /* ignore */ }
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
        setTheme(newTheme);
      }
    };

    const interval = setInterval(checkTheme, 60000);
    return () => clearInterval(interval);
  }, [autoTheme]);

  // theme-color 메타 동기화
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim();
    if (accent) meta.setAttribute('content', accent);
  }, [theme]);

  const toggleTheme = () => {
    setAutoTheme(false);
    try { localStorage.removeItem('auto-theme'); } catch { /* ignore */ }

    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('theme-dark', next === 'dark');
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
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
        setTheme(shouldBeDark ? 'dark' : 'light');
      } else {
        localStorage.removeItem('auto-theme');
        localStorage.setItem('theme', theme);
      }
    } catch { /* ignore */ }
  };

  return { theme, autoTheme, toggleTheme, toggleAutoTheme };
}
