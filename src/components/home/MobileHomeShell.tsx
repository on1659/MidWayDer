'use client';

import { useRef, useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, MapPin, Navigation, SlidersHorizontal } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import MobileCategoryRail from './MobileCategoryRail';
import MobileSearchEntry from './MobileSearchEntry';

function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)}km`;
}

function formatMin(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))}분`;
}

type MobileHomeShellProps = {
  categories: string[];
  category: string;
  startAddress?: string;
  endAddress?: string;
  isLoading: boolean;
  error: string | null;
  results: DetourResult[];
  selectedWaypointId?: string | null;
  totalCandidates?: number;
  onOpenSearch: () => void;
  onCategoryChange: (category: string) => void;
  onSaveRoute: () => void;
  onResultSelect: (result: DetourResult) => void;
  onResultHover: (id: string | null) => void;
  onRetry: () => void;
};

export default function MobileHomeShell({
  categories,
  category,
  startAddress,
  endAddress,
  isLoading,
  error,
  results,
  selectedWaypointId,
  totalCandidates,
  onOpenSearch,
  onCategoryChange,
  onSaveRoute,
  onResultSelect,
  onResultHover,
  onRetry,
}: MobileHomeShellProps) {
  const [isResultSheetExpanded, setIsResultSheetExpanded] = useState(true);
  const dragStartYRef = useRef<number | null>(null);
  const hasResults = results.length > 0;
  const routeLabel = startAddress && endAddress ? `${startAddress} → ${endAddress}` : '경로를 입력하면 추천을 시작해요';
  const resultSurface = '#f8fafc';
  const resultCard = '#ffffff';
  const resultText = '#0f172a';
  const resultSubtext = '#334155';
  const resultMuted = '#64748b';
  const resultBorder = '#dbe7f5';
  const resultSheetMaxHeight = isResultSheetExpanded ? '58dvh' : '34dvh';
  const resultSheetHeaderHeight = '78px';

  const handleResultSheetDragEnd = (clientY: number) => {
    if (dragStartYRef.current === null) return;
    const deltaY = clientY - dragStartYRef.current;
    dragStartYRef.current = null;

    if (Math.abs(deltaY) < 28) {
      setIsResultSheetExpanded((current) => !current);
      return;
    }

    setIsResultSheetExpanded(deltaY < 0);
  };

  return (
    <div data-testid="mobile-home-shell" className="md:hidden">
      <MobileSearchEntry
        startAddress={startAddress}
        endAddress={endAddress}
        category={category}
        isLoading={isLoading}
        hasResults={hasResults || Boolean(error)}
        onOpen={onOpenSearch}
      />

      <MobileCategoryRail
        categories={categories}
        selectedCategory={category}
        disabled={isLoading}
        onSelect={onCategoryChange}
      />

      {isLoading && (
        <div
          data-testid="mobile-live-status-pill"
          className="absolute left-1/2 z-[995] hidden -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold max-md:flex"
          style={{
            top: 'calc(max(0.75rem, env(safe-area-inset-top)) + 8.35rem)',
            background: 'rgba(10,10,15,0.78)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 14px 34px -18px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--accent)' }} />
          찾는 중...
        </div>
      )}

      {!hasResults && !error && !isLoading && (
        <button
          type="button"
          data-testid="mobile-idle-sheet"
          onClick={onOpenSearch}
          className="absolute inset-x-4 bottom-4 z-[980] flex min-h-[64px] items-center gap-3 rounded-[1.35rem] px-3.5 text-left transition active:scale-[0.99]"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            paddingTop: '0.75rem',
            background: 'rgba(255,255,255,0.96)',
            border: '1px solid rgba(15,23,42,0.1)',
            boxShadow: '0 18px 44px -28px rgba(15,23,42,0.55)',
          }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <MapPin className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-black leading-tight" style={{ color: '#0f172a' }}>경로 입력</span>
            <span className="mt-0.5 block truncate text-xs font-bold" style={{ color: '#64748b' }}>{routeLabel}</span>
          </span>
          <span className="shrink-0 rounded-full px-3 py-2 text-xs font-black" style={{ background: '#0b84ff', color: '#ffffff' }}>
            추천
          </span>
        </button>
      )}

      {(hasResults || error) && !isLoading && (
        <section
          data-testid="mobile-result-sheet"
          data-state={isResultSheetExpanded ? 'expanded' : 'collapsed'}
          className="absolute inset-x-3 bottom-0 z-[1000] isolate overflow-hidden rounded-t-[1.75rem] transition-none"
          style={{
            maxHeight: resultSheetMaxHeight,
            height: resultSheetMaxHeight,
            paddingBottom: 'env(safe-area-inset-bottom)',
            background: resultSurface,
            border: `1px solid ${resultBorder}`,
            borderBottom: 'none',
            boxShadow: '0 -18px 50px -30px rgba(15,23,42,0.45)',
          }}
        >
          <button
            type="button"
            data-testid="mobile-result-sheet-handle"
            aria-label={isResultSheetExpanded ? '결과 시트 접기' : '결과 시트 펼치기'}
            aria-expanded={isResultSheetExpanded}
            className="flex min-h-7 w-full items-center justify-center gap-2 pt-1.5 text-[11px] font-black"
            style={{ color: resultMuted, touchAction: 'none' }}
            onClick={() => setIsResultSheetExpanded((current) => !current)}
            onTouchStart={(event) => { dragStartYRef.current = event.touches[0].clientY; }}
            onTouchEnd={(event) => {
              event.preventDefault();
              handleResultSheetDragEnd(event.changedTouches[0].clientY);
            }}
          >
            <span className="h-1.5 w-12 rounded-full" style={{ background: '#cbd5e1' }} />
            {isResultSheetExpanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <div className="px-3.5 pb-2 pt-1" style={{ borderBottom: `1px solid ${resultBorder}` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-black leading-tight" style={{ color: resultText }}>
                  {error ? '다시 시도 필요' : `${results.length}개 경유지`}
                </h2>
                <p className="mt-0.5 truncate text-xs font-bold" style={{ color: resultSubtext }}>
                  {totalCandidates ? `${totalCandidates}개 후보 중 선별` : routeLabel}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {hasResults && (
                  <button
                    type="button"
                    aria-label="경로 저장"
                    onClick={onSaveRoute}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95"
                    style={{ background: '#ffffff', color: resultText, border: `1px solid ${resultBorder}` }}
                  >
                    <Bookmark className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="조건 수정"
                  onClick={onOpenSearch}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95"
                  style={{ background: 'var(--accent)', color: 'var(--text-on-accent)', border: '1px solid var(--accent)' }}
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div data-testid="mobile-result-list" className="overflow-y-auto px-3 py-2 scrollbar-hide" style={{ maxHeight: `calc(${resultSheetMaxHeight} - ${resultSheetHeaderHeight} - env(safe-area-inset-bottom))` }}>
            {error ? (
              <div className="rounded-3xl p-4" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-soft)' }}>
                <p className="text-sm font-extrabold" style={{ color: 'var(--text-strong)' }}>검색이 막혔어요</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 min-h-11 rounded-2xl px-4 text-sm font-extrabold"
                  style={{ background: 'var(--accent)', color: 'var(--text-on-accent)' }}
                >
                  다시 검색
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {results.slice(0, 6).map((result, index) => {
                  const selected = selectedWaypointId === result.place.id;
                  const address = result.place.roadAddress || result.place.address;
                  return (
                    <button
                      key={result.place.id}
                      type="button"
                      data-result-index={index}
                      onClick={() => onResultSelect(result)}
                      onMouseEnter={() => onResultHover(result.place.id)}
                      onMouseLeave={() => onResultHover(null)}
                      aria-label={`지도에서 ${result.place.name} 보기`}
                      className="w-full rounded-[1.25rem] p-2.5 text-left transition active:scale-[0.99]"
                      style={{
                        background: selected ? '#eff6ff' : resultCard,
                        border: selected ? '2px solid #2563eb' : `1px solid ${resultBorder}`,
                        boxShadow: index === 0 ? '0 14px 34px -24px rgba(37,99,235,0.55)' : '0 10px 28px -24px rgba(15,23,42,0.35)',
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black" style={{ background: index === 0 ? '#3b82f6' : '#e2e8f0', color: index === 0 ? '#ffffff' : resultText }}>
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="line-clamp-1 text-base font-black leading-snug" style={{ color: resultText }}>{result.place.name}</h3>
                              <p className="mt-0.5 line-clamp-1 text-xs font-bold leading-snug" style={{ color: resultSubtext }}>{address}</p>
                            </div>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: selected ? '#2563eb' : '#eaf2ff', color: selected ? '#ffffff' : '#1d4ed8', border: selected ? '1px solid #2563eb' : '1px solid #bfdbfe' }}>
                              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                          </div>
                          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-black" style={{ color: resultSubtext }}>
                            <span className="shrink-0 whitespace-nowrap">+{formatMin(result.detourCost.duration)}</span>
                            <span className="shrink-0 whitespace-nowrap">{formatKm(result.detourCost.distance)}</span>
                            <span className="shrink-0 whitespace-nowrap">{Math.round(result.finalScore)}점</span>
                            {index === 0 && <span className="ml-0.5 inline-flex min-h-4 min-w-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2 py-1 text-[10px] leading-none" style={{ background: '#2563eb', color: '#ffffff' }}>BEST</span>}
                            {selected && <span className="inline-flex min-h-4 min-w-12 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2 py-1 text-[10px] leading-none" style={{ background: '#dbeafe', color: '#1d4ed8' }}>표시 중</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
