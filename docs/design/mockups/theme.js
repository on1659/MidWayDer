// 공통 테마 관리 — localStorage + URL 파라미터 지원
(function() {
  const THEMES = ['indigo', 'teal', 'violet', 'emerald', 'blue', 'rose', 'slate'];
  const MODES = ['light', 'dark'];
  const KEY_THEME = 'mwd-mockup-theme';
  const KEY_MODE = 'mwd-mockup-mode';

  // URL 파라미터 → localStorage → 기본값 우선순위
  function resolveTheme() {
    const urlParams = new URLSearchParams(location.search);
    const fromUrl = urlParams.get('theme');
    if (fromUrl && THEMES.includes(fromUrl)) return fromUrl;
    const stored = localStorage.getItem(KEY_THEME);
    if (stored && THEMES.includes(stored)) return stored;
    return 'indigo';
  }

  function resolveMode() {
    const urlParams = new URLSearchParams(location.search);
    const fromUrl = urlParams.get('mode');
    if (fromUrl && MODES.includes(fromUrl)) return fromUrl;
    const stored = localStorage.getItem(KEY_MODE);
    if (stored && MODES.includes(stored)) return stored;
    return null; // OS 기본 따름
  }

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(KEY_THEME, theme);
    document.querySelectorAll('.tp-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.t === theme);
    });
    // URL 동기화 (history 불필요 push — replace로 깔끔하게)
    const url = new URL(location.href);
    url.searchParams.set('theme', theme);
    history.replaceState({}, '', url);
  }

  function applyMode(mode) {
    if (!mode) {
      document.body.removeAttribute('data-mode');
      localStorage.removeItem(KEY_MODE);
    } else {
      document.body.setAttribute('data-mode', mode);
      localStorage.setItem(KEY_MODE, mode);
    }
    document.querySelectorAll('.tp-mode').forEach(m => {
      m.classList.toggle('active', m.dataset.m === mode);
    });
    const url = new URL(location.href);
    if (mode) url.searchParams.set('mode', mode);
    else url.searchParams.delete('mode');
    history.replaceState({}, '', url);
  }

  // 초기 적용
  const initTheme = resolveTheme();
  const initMode = resolveMode();
  applyTheme(initTheme);
  if (initMode) applyMode(initMode);

  // 이벤트 바인딩 (DOM 로드 후)
  function bind() {
    document.querySelectorAll('.tp-swatch').forEach(el => {
      el.addEventListener('click', () => applyTheme(el.dataset.t));
    });
    document.querySelectorAll('.tp-mode').forEach(el => {
      el.addEventListener('click', () => applyMode(el.dataset.m));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  // 다른 탭에서 변경 시 동기화
  window.addEventListener('storage', (e) => {
    if (e.key === KEY_THEME && e.newValue) applyTheme(e.newValue);
    if (e.key === KEY_MODE) applyMode(e.newValue);
  });

  // 링크 클릭 시 현재 테마를 쿼리로 전파
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
    if (a.target === '_blank') return;
    try {
      const url = new URL(href, location.href);
      // 같은 origin의 .html 파일만
      if (url.origin !== location.origin) return;
      if (!url.pathname.endsWith('.html')) return;
      const theme = localStorage.getItem(KEY_THEME);
      const mode = localStorage.getItem(KEY_MODE);
      if (theme) url.searchParams.set('theme', theme);
      if (mode) url.searchParams.set('mode', mode);
      a.setAttribute('href', url.pathname + url.search);
    } catch {}
  }, true);

  window.MWDTheme = { apply: applyTheme, applyMode };
})();
