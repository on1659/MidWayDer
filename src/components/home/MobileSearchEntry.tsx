import { Mic, Search } from 'lucide-react';

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
  const routeLabel = startAddress && endAddress ? `${startAddress} → ${endAddress}` : '어디로 갈까요?';
  const statusLabel = isLoading ? '찾는 중...' : hasResults ? `${category} 추천 결과` : '출발지 · 도착지 · 경유지 검색';

  return (
    <button
      data-testid="open-search-overlay-btn"
      type="button"
      onClick={onOpen}
      className="absolute inset-x-4 z-[1000] hidden h-11 items-center gap-1.5 rounded-full px-2 text-left text-sm font-semibold max-md:flex"
      style={{
        top: 'max(0.75rem, env(safe-area-inset-top))',
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '0 12px 32px -20px rgba(15,23,42,0.5)',
        color: '#0f172a',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-700">
        <Search className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold leading-tight text-slate-900">
          {routeLabel}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-500">
          {statusLabel}
        </span>
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-700" aria-hidden="true">
        <Mic className="h-[18px] w-[18px]" />
      </span>
    </button>
  );
}
