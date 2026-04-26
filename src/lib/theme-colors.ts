/**
 * Runtime CSS custom property resolution.
 *
 * Used by code paths that can't reference CSS vars directly:
 * - Kakao Map markers (base64-encoded SVG data URIs)
 * - Canvas / WebGL rendering
 * - Programmatic style strings passed to third-party SDKs
 *
 * For component styles, prefer `style={{ color: 'var(--accent)' }}` directly.
 */

const DEFAULT_ACCENT = '#3274f9';
const DEFAULT_ACCENT_DARK = '#2563eb';
const DEFAULT_SUCCESS = '#16a34a';
const DEFAULT_WARNING = '#d97706';
const DEFAULT_ERROR = '#dc2626';

function resolveVar(value: string, fallback: string, seen = new Set<string>()): string {
  const trimmed = value.trim();
  if (!trimmed.includes('var(')) return trimmed || fallback;

  const resolved = trimmed.replace(/var\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\s*\)/g, (_, name: string, varFallback?: string) => {
    if (seen.has(name)) return varFallback?.trim() || fallback;
    seen.add(name);
    return readVar(name, varFallback?.trim() || fallback, seen);
  }).trim();

  return resolved || fallback;
}

function readVar(name: string, fallback: string, seen = new Set<string>()): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return resolveVar(raw, fallback, seen);
}

export function subscribeToThemeColorChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {};
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === 'attributes')) {
      onChange();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });

  const mediaQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
  mediaQuery?.addEventListener('change', onChange);

  return () => {
    observer.disconnect();
    mediaQuery?.removeEventListener('change', onChange);
  };
}

export function getAccentColor(): string {
  return readVar('--accent', DEFAULT_ACCENT);
}

export function getAccentDarkColor(): string {
  return readVar('--accent-dark', DEFAULT_ACCENT_DARK);
}

export function getAccentWeakColor(): string {
  return readVar('--accent-weak', '#dbeafe');
}

export function getAccentRgb(): string {
  return readVar('--color-accent-rgb', '50, 116, 249');
}

export function getSuccessColor(): string {
  return readVar('--success', DEFAULT_SUCCESS);
}

export function getSuccessWeakColor(): string {
  return readVar('--color-success-100', '#dcfce7');
}

export function getWarningColor(): string {
  return readVar('--warning', DEFAULT_WARNING);
}

export function getWarningWeakColor(): string {
  return readVar('--color-warning-100', '#fef3c7');
}

export function getErrorColor(): string {
  return readVar('--color-error-current', DEFAULT_ERROR);
}

export function getTextPrimary(): string {
  return readVar('--text-primary', '#1f2937');
}

export function getTextSecondary(): string {
  return readVar('--text-secondary', '#6b7280');
}

export function getSurface1(): string {
  return readVar('--surface-1', '#ffffff');
}

export function getSurface2(): string {
  return readVar('--surface-2', '#ffffff');
}

export function getTextOnAccent(): string {
  return readVar('--text-on-accent', '#ffffff');
}

export function getShadow1(): string {
  return readVar('--shadow-1', '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)');
}

export function getShadow3(): string {
  return readVar('--shadow-3', '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.05)');
}
