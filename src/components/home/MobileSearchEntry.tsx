import { Mic, Search, SlidersHorizontal } from 'lucide-react';

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
  const statusLabel = isLoading ? '찾는 중...' : hasResults ? `${category} 주변 추천` : '장소, 주소 검색';

  return (
    <button
      data-testid="open-search-overlay-btn"
      type="button"
      onClick={onOpen}
      className="absolute inset-x-4 z-[1000] hidden h-14 items-center gap-2 rounded-full px-3 text-left text-sm font-semibold max-md:flex"
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
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700">
        <Search className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-extrabold leading-tight text-slate-900">
          {routeLabel}
        </span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-bold text-slate-500">
          <SlidersHorizontal className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{statusLabel}</span>
        </span>
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700" aria-hidden="true">
        <Mic className="h-5 w-5" />
      </span>
    </button>
  );
}
