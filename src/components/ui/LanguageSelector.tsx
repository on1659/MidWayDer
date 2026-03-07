'use client';

/**
 * Language Selector Component
 * 
 * Toggle button to switch between Korean and English
 * - Shows opposite language option
 * - Persists choice to localStorage via LocaleContext
 */

import { useLocale } from '@/contexts/LocaleContext';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { locale, setLocale, t } = useLocale();

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko');
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium 
                 text-gray-700 dark:text-gray-300 
                 hover:bg-gray-100 dark:hover:bg-gray-800 
                 rounded-lg transition-colors duration-200"
      aria-label={t('language.selector')}
    >
      <Globe className="w-4 h-4" />
      <span>{locale === 'ko' ? 'EN' : '한국어'}</span>
    </button>
  );
}
