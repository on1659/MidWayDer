/**
 * i18n Translation Utility
 * 
 * Provides translation functionality for MidWayDer
 * - Fallback to key if translation not found
 * - Supports parameter interpolation (e.g., "+{distance}m")
 */

import ko from '@/locales/ko.json';
import en from '@/locales/en.json';

export type Locale = 'ko' | 'en';

type TranslationValue = string | Record<string, unknown>;
type Translations = Record<string, TranslationValue>;

const translations: Record<Locale, Translations> = { ko, en };

/**
 * Translates a key to the current locale
 * @param key - Translation key (e.g., "search.placeholder")
 * @param locale - Target locale
 * @param params - Optional parameters for interpolation
 * @returns Translated string or key if not found
 */
export function translate(
  key: string,
  locale: Locale,
  params?: Record<string, string | number>
): string {
  const keys = key.split('.');
  let value: unknown = translations[locale];

  // Navigate through nested keys
  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // Fallback to key if not found
    }
  }

  // Return key if value is not a string
  if (typeof value !== 'string') {
    return key;
  }

  // Interpolate parameters (e.g., "+{distance}m" → "+450m")
  if (params) {
    return Object.entries(params).reduce(
      (str, [paramKey, paramValue]) =>
        str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue)),
      value
    );
  }

  return value;
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): Locale[] {
  return ['ko', 'en'];
}

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string): locale is Locale {
  return getAvailableLocales().includes(locale as Locale);
}
