import type { ReactNode } from 'react';
import type { DetourResult } from '@/types/detour';

export type LocationInput = {
  address: string;
  coordinates?: { lat: number; lng: number };
};

export type HomeUxState = 'idle' | 'searching' | 'results' | 'error' | 'detail';

export type CategoryOption = {
  label: string;
  description?: string;
};

export type ResultInteractionHandlers = {
  onResultSelect: (result: DetourResult) => void;
  onResultHover: (id: string | null) => void;
};

export type HomeShellProps = {
  children?: ReactNode;
  map?: ReactNode;
  desktop?: ReactNode;
  mobile?: ReactNode;
  overlays?: ReactNode;
  appReady: boolean;
  isLoading: boolean;
  resultCount: number;
  error: string | null;
};
