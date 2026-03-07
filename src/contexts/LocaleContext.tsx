'use client';

/**
 * Locale Context Provider
 * 
 * Provides i18n functionality to the app:
 * - Current locale state
 * - Locale switching with localStorage persistence
 * - Translation function
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  translate,
  Locale,
  isValidLocale,
} from '@/lib/i18n/translations';

interface LocaleContextType {
  /** Current locale */
  locale: Locale;
  /** Change locale and persist to localStorage */
  setLocale: (locale: Locale) => void;
  /** Translate a key to current locale */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Available locales */
  availableLocales: Locale[];
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const STORAGE_KEY = 'midwayder-locale';

interface LocaleProviderProps {
  children: ReactNode;
  /** Default locale if not set in localStorage */
  defaultLocale?: Locale;
}

export function LocaleProvider({
  children,
  defaultLocale = 'ko',
}: LocaleProviderProps) {
  // Initialize locale with lazy initialization to avoid useEffect setState
  const [locale, setLocaleState] = useState<Locale>(() => {
    // SSR safety check
    if (typeof window === 'undefined') return defaultLocale;
    
    // Check localStorage first
    const savedLocale = localStorage.getItem(STORAGE_KEY);
    if (savedLocale && isValidLocale(savedLocale)) {
      return savedLocale;
    }
    
    // Fallback to browser language
    const browserLang = navigator.language.split('-')[0];
    return isValidLocale(browserLang) ? browserLang : defaultLocale;
  });

  // Persist locale changes to localStorage
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
  }, []);

  // Translation function
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(key, locale, params);
    },
    [locale]
  );

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        t,
        availableLocales: ['ko', 'en'],
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Hook to access locale context
 * @throws Error if used outside LocaleProvider
 */
export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
