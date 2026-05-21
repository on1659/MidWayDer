import { RefreshCw } from 'lucide-react';
import { MOBILE_HOME_LAYOUT } from './mobileHomeLayout';

export const MOBILE_MAP_RESEARCH_TOP = `calc(${MOBILE_HOME_LAYOUT.topInset} + ${MOBILE_HOME_LAYOUT.mapReSearchTopOffset})`;

type MapReSearchButtonProps = {
  variant: 'desktop' | 'mobile';
  onClick: () => void;
};

export default function MapReSearchButton({ variant, onClick }: MapReSearchButtonProps) {
  const isMobile = variant === 'mobile';

  return (
    <button
      type="button"
      data-testid={isMobile ? 'mobile-map-research-button' : 'desktop-map-research-button'}
      className={isMobile
        ? 'absolute left-1/2 z-[995] flex min-h-10 max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-black whitespace-nowrap backdrop-blur-xl transition-all active:scale-95 md:hidden'
        : 'absolute left-1/2 top-4 z-20 hidden min-h-11 -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold backdrop-blur-xl transition-all active:scale-95 md:flex'}
      style={{
        ...(isMobile ? { top: MOBILE_MAP_RESEARCH_TOP } : {}),
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        boxShadow: isMobile
          ? '0 16px 34px -22px rgba(15,23,42,0.58)'
          : 'var(--shadow-4)',
        color: 'var(--accent)',
      }}
      onClick={onClick}
    >
      <RefreshCw className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
      이 지역 재검색
    </button>
  );
}
