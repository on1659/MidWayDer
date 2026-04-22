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

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw || fallback;
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

export function getWarningColor(): string {
  return readVar('--warning', DEFAULT_WARNING);
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
