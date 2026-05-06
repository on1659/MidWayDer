import { Search } from 'lucide-react';

export type MobileSearchEntryProps = {
  startAddress?: string;
  endAddress?: string;
  category: string;
  isLoading: boolean;
  hasResults: boolean;
  onOpen: () => void;
};

export default function MobileSearchEntry({
  startAddress,
  endAddress,
  category,
  isLoading,
  hasResults,
  onOpen,
}: MobileSearchEntryProps) {
  const routeLabel = startAddress && endAddress ? `${startAddress} → ${endAddress}` : '출발지와 도착지 입력';
  const statusLabel = isLoading ? '찾는 중...' : hasResults ? `${category} · 경로 주변 추천` : '가는 길에 들를 곳을 찾아요';

  return (
    <button
      data-testid="open-search-overlay-btn"
      type="button"
      onClick={onOpen}
      className="absolute inset-x-4 z-[1000] hidden min-h-16 items-center gap-3 rounded-[1.75rem] px-3 text-left text-sm font-semibold max-md:flex"
      style={{
        top: 'max(0.75rem, env(safe-area-inset-top))',
        background: 'color-mix(in srgb, var(--bg-surface) 78%, transparent)',
        border: '1px solid color-mix(in srgb, var(--border-soft) 75%, transparent)',
        boxShadow: '0 18px 48px -18px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset',
        backdropFilter: 'blur(22px) saturate(180%)',
        WebkitBackdropFilter: 'blur(22px) saturate(180%)',
      }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #8b5cf6))',
          color: 'var(--text-on-accent)',
          boxShadow: '0 10px 28px -14px rgba(var(--color-accent-rgb), 0.75)',
        }}
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold leading-tight" style={{ color: 'var(--text-strong)' }}>
          {routeLabel}
        </span>
        <span className="mt-1 block truncate text-xs font-semibold" style={{ color: isLoading ? 'var(--accent)' : 'var(--text-muted)' }}>
          {statusLabel}
        </span>
      </span>
      <span
        className="shrink-0 rounded-full px-3 py-2 text-xs font-extrabold"
        style={{
          background: isLoading ? 'color-mix(in srgb, var(--accent) 14%, var(--bg-surface) 86%)' : 'var(--bg-surface-muted)',
          color: 'var(--accent)',
          border: '1px solid var(--border-soft)',
        }}
      >
        수정
      </span>
    </button>
  );
}
