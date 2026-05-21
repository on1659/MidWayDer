import { MapPin, Mic, Search } from 'lucide-react';
import { MOBILE_HOME_LAYOUT } from './mobileHomeLayout';

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
  const searchLabel = hasResults ? `${category || '장소'} 추천 결과` : '어디를 경유할까요?';
  const statusLabel = isLoading ? '찾는 중...' : hasResults ? '장소·주소·카테고리 다시 검색' : '장소·주소·카테고리 검색';
  const startLabel = startAddress || '출발지를 선택하세요';
  const endLabel = endAddress || '도착지를 선택하세요';
  const routeReady = Boolean(startAddress && endAddress);

  return (
    <button
      data-testid="open-search-overlay-btn"
      type="button"
      onClick={onOpen}
      aria-label={`검색 조건 열기, 출발 ${startLabel}, 도착 ${endLabel}`}
      className="absolute inset-x-3 z-[1000] hidden max-h-[7.25rem] flex-col gap-1.5 overflow-hidden rounded-[1.25rem] p-2 text-left text-sm font-semibold max-md:flex"
      style={{
        top: MOBILE_HOME_LAYOUT.topInset,
        maxHeight: MOBILE_HOME_LAYOUT.searchEntryMaxHeight,
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid rgba(15,23,42,0.09)',
        boxShadow: '0 18px 42px -26px rgba(15,23,42,0.58)',
        color: '#0f172a',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      }}
    >
      <span className="flex min-h-11 w-full items-center gap-1.5 rounded-full bg-slate-50 px-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-700">
          <Search className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span data-testid={hasResults ? 'mobile-summary-pill' : 'mobile-idle-search-pill'} className="block truncate text-[15px] font-extrabold leading-tight text-slate-900">
            {searchLabel}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-500">
            {statusLabel}
          </span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-700" aria-hidden="true">
          <Mic className="h-[18px] w-[18px]" />
        </span>
      </span>

      <span
        data-testid="mobile-route-entry"
        data-route-ready={routeReady ? 'true' : 'false'}
        className="grid w-full grid-cols-[auto_1fr] gap-x-2 rounded-[0.95rem] bg-white px-2.5 py-1.5"
        style={{ border: '1px solid rgba(15,23,42,0.07)' }}
      >
        <span className="flex flex-col items-center pt-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          <span className="my-0.5 h-4 w-px bg-slate-300" />
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
        </span>
        <span className="min-w-0 space-y-1">
          <span className="grid min-w-0 grid-cols-[2.15rem_1fr] items-center gap-1.5 text-[12px] leading-tight">
            <span className="font-black text-slate-500">출발</span>
            <span className="truncate font-extrabold text-slate-900">{startLabel}</span>
          </span>
          <span className="grid min-w-0 grid-cols-[2.15rem_1fr] items-center gap-1.5 text-[12px] leading-tight">
            <span className="font-black text-slate-500">도착</span>
            <span className="truncate font-extrabold text-slate-900">{endLabel}</span>
          </span>
        </span>
      </span>
    </button>
  );
}
