'use client';

/**
 * Client Providers Wrapper
 * 
 * Wraps all client-side context providers
 * - LocaleProvider for i18n
 */

import { ReactNode } from 'react';
import { LocaleProvider } from '@/contexts/LocaleContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <LocaleProvider defaultLocale="ko">
      {children}
    </LocaleProvider>
  );
}
