/**
 * i18n Tests
 * 
 * Tests for translation functionality
 */

import { describe, it, expect } from 'vitest';
import { translate, isValidLocale, getAvailableLocales } from '../lib/i18n/translations';

describe('i18n Translations', () => {
  describe('translate', () => {
    it('translates simple keys', () => {
      expect(translate('common.loading', 'ko')).toBe('로딩 중...');
      expect(translate('common.loading', 'en')).toBe('Loading...');
    });

    it('translates nested keys', () => {
      expect(translate('search.startPlaceholder', 'ko')).toBe('출발지를 입력하세요');
      expect(translate('search.startPlaceholder', 'en')).toBe('Enter start point');
    });

    it('returns key if translation not found', () => {
      expect(translate('nonexistent.key', 'ko')).toBe('nonexistent.key');
      expect(translate('nonexistent.key', 'en')).toBe('nonexistent.key');
    });

    it('interpolates parameters', () => {
      expect(
        translate('results.detour', 'ko', { distance: 450, duration: 2 })
      ).toBe('+450m, +2분');
      
      expect(
        translate('results.detour', 'en', { distance: 450, duration: 2 })
      ).toBe('+450m, +2min');
    });

    it('handles multiple parameters', () => {
      expect(
        translate('results.proximity', 'ko', { score: 85 })
      ).toBe('근접도: 85점');
      
      expect(
        translate('results.proximity', 'en', { score: 85 })
      ).toBe('Proximity: 85pts');
    });
  });

  describe('isValidLocale', () => {
    it('returns true for valid locales', () => {
      expect(isValidLocale('ko')).toBe(true);
      expect(isValidLocale('en')).toBe(true);
    });

    it('returns false for invalid locales', () => {
      expect(isValidLocale('ja')).toBe(false);
      expect(isValidLocale('zh')).toBe(false);
      expect(isValidLocale('')).toBe(false);
    });
  });

  describe('getAvailableLocales', () => {
    it('returns array of available locales', () => {
      const locales = getAvailableLocales();
      expect(locales).toContain('ko');
      expect(locales).toContain('en');
      expect(locales.length).toBe(2);
    });
  });
});
