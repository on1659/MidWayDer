'use client';

import { useRef, useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, Navigation, SlidersHorizontal } from 'lucide-react';
import type { DetourResult } from '@/types/detour';
import MobileCategoryRail from './MobileCategoryRail';
import MobileSearchEntry from './MobileSearchEntry';
import { MOBILE_HOME_LAYOUT } from './mobileHomeLayout';

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
  hasSearched: boolean;
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
  hasSearched,
  selectedWaypointId,
  totalCandidates,
  onOpenSearch,
  onCategoryChange,
  onSaveRoute,
  onResultSelect,
  onResultHover,
  onRetry,
}: MobileHomeShellProps) {
  const [resultSheetViewState, setResultSheetViewState] = useState({
    resultSetSignature: '',
    isExpanded: true,
  });
  const [expandedWaypointOverrideId, setExpandedWaypointOverrideId] = useState<string | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const hasResults = results.length > 0;
  const shouldShowResultSheet = !isLoading && (hasSearched || Boolean(error));
  const routeLabel = startAddress && endAddress ? `${startAddress} → ${endAddress}` : '경로를 입력하면 추천을 시작해요';
  const sheetTitle = error ? '다시 시도 필요' : hasResults ? `${results.length}개 경유지` : '추천 경유지 없음';
  const hasCandidateCount = typeof totalCandidates === 'number';
  const candidateSummary = hasCandidateCount
    ? hasResults
      ? `${totalCandidates}개 후보 중 선별`
      : `${totalCandidates}개 후보 확인`
    : null;
  const resultSurface = '#f8fafc';
  const resultCard = '#ffffff';
  const resultText = '#0f172a';
  const resultSubtext = '#334155';
  // 고정 라이트 시트의 중립 muted 그레이 (slate-600). 다크모드에서도 시트는 라이트 고정이라 토큰 대신 리터럴 사용.
  // slate-500은 slate 테마 accent hex와 충돌해 color-hardcoding-guard가 차단하므로 한 단계 진한 600 사용 (대비 ↑).
  const resultMuted = '#475569';
  const resultBorder = '#dbe7f5';
  const selectedResult = selectedWaypointId
    ? results.find((result) => result.place.id === selectedWaypointId) || null
    : null;
  const resultSetSignature = results.map((result) => result.place.id).join('|');
  // 결과 세트가 바뀌면(재검색 중 빈 결과 단계 포함) 이전 세트의 접힘 기억을 폐기한다.
  // 동일 지역 재검색으로 같은 장소 목록이 돌아와도 새 검색은 펼친 상태로 제시하기 위함.
  if (resultSheetViewState.resultSetSignature !== resultSetSignature && resultSheetViewState.resultSetSignature !== '') {
    setResultSheetViewState({ resultSetSignature: '', isExpanded: true });
  }
  const isResultSheetExpanded = resultSheetViewState.resultSetSignature === resultSetSignature
    ? resultSheetViewState.isExpanded
    : true;
  const isResultSheetExpandedForView = hasResults && selectedWaypointId && expandedWaypointOverrideId !== selectedWaypointId
    ? false
    : isResultSheetExpanded;
  const showSelectedMapFocus = Boolean(selectedResult && !isResultSheetExpandedForView);
  const resultSheetMaxHeight = isResultSheetExpandedForView
    ? MOBILE_HOME_LAYOUT.resultSheetExpandedHeight
    : MOBILE_HOME_LAYOUT.resultSheetCollapsedHeight;
  const resultSheetHeaderHeight = MOBILE_HOME_LAYOUT.resultSheetHeaderHeight;

  const setResultSheetExpandedForView = (nextExpanded: boolean) => {
    setExpandedWaypointOverrideId(selectedWaypointId && nextExpanded ? selectedWaypointId : null);
    setResultSheetViewState({ resultSetSignature, isExpanded: nextExpanded });
  };

  const handleResultSheetDragEnd = (clientY: number) => {
    if (dragStartYRef.current === null) return;
    const deltaY = clientY - dragStartYRef.current;
    dragStartYRef.current = null;

    if (Math.abs(deltaY) < 28) {
      setResultSheetExpandedForView(!isResultSheetExpandedForView);
      return;
    }

    setResultSheetExpandedForView(deltaY < 0);
  };

  const handleResultSelect = (result: DetourResult) => {
    onResultSelect(result);
    setExpandedWaypointOverrideId(null);
    setResultSheetViewState({ resultSetSignature, isExpanded: false });
  };

  return (
    <div data-testid="mobile-home-shell" className="md:hidden">
      <MobileSearchEntry
        startAddress={startAddress}
        endAddress={endAddress}
        category={category}
        isLoading={isLoading}
        hasResults={hasResults || hasSearched || Boolean(error)}
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
            top: `calc(${MOBILE_HOME_LAYOUT.topInset} + ${MOBILE_HOME_LAYOUT.liveStatusTopOffset})`,
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

      {!shouldShowResultSheet && !isLoading && (
        <div
          data-testid="mobile-bottom-search-cta"
          className="absolute inset-x-4 bottom-4 z-[995] hidden max-md:block"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition active:scale-[0.98]"
            style={{
              background: 'var(--accent)',
              color: 'var(--text-on-accent)',
              border: '1px solid var(--accent)',
              boxShadow: '0 18px 36px -22px rgba(37,99,235,0.75)',
            }}
          >
            <Navigation className="h-4 w-4" aria-hidden="true" />
            <span className="min-w-0 truncate">조건 입력하고 경유지 찾기</span>
          </button>
        </div>
      )}

      {showSelectedMapFocus && selectedResult && (
        <button
          type="button"
          data-testid="mobile-map-focus-pill"
          aria-label={`${selectedResult.place.name} 결과 자세히 보기`}
          onClick={() => setResultSheetExpandedForView(true)}
          className="absolute inset-x-4 z-[999] hidden min-h-11 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-full px-3 text-left text-xs font-black transition active:scale-[0.98] max-md:grid"
          style={{
            bottom: `calc(${resultSheetMaxHeight} + env(safe-area-inset-bottom, 0px) + 0.5rem)`,
            background: 'rgba(255,255,255,0.94)',
            color: resultText,
            border: `1px solid ${resultBorder}`,
            boxShadow: '0 12px 34px -24px rgba(15,23,42,0.55)',
            backdropFilter: 'blur(18px) saturate(160%)',
            WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          }}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: '#2563eb', color: '#ffffff' }}>
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate leading-tight" title={selectedResult.place.name}>
              {selectedResult.place.name}
            </span>
            <span className="block truncate text-[10px] leading-tight" style={{ color: resultMuted }}>
              지도에 표시 중
            </span>
          </span>
          <span className="shrink-0 rounded-full px-2 py-1 text-[10px] leading-none" style={{ background: '#eef6ff', color: '#1d4ed8' }}>
            {Math.round(selectedResult.finalScore)}점
          </span>
        </button>
      )}

      {shouldShowResultSheet && (
        <section
          data-testid="mobile-result-sheet"
          data-state={isResultSheetExpandedForView ? 'expanded' : 'collapsed'}
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
            aria-label={isResultSheetExpandedForView ? '결과 시트 접기' : '결과 시트 펼치기'}
            aria-expanded={isResultSheetExpandedForView}
            className="flex min-h-7 w-full items-center justify-center gap-2 pt-1.5 text-[11px] font-black"
            style={{ color: resultMuted, touchAction: 'none' }}
            onClick={() => setResultSheetExpandedForView(!isResultSheetExpandedForView)}
            onTouchStart={(event) => { dragStartYRef.current = event.touches[0].clientY; }}
            onTouchEnd={(event) => {
              event.preventDefault();
              handleResultSheetDragEnd(event.changedTouches[0].clientY);
            }}
          >
            <span className="h-1.5 w-12 rounded-full" style={{ background: '#cbd5e1' }} />
            {isResultSheetExpandedForView ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <div data-testid="mobile-result-sheet-header" className="px-3 pb-2 pt-0.5" style={{ borderBottom: `1px solid ${resultBorder}` }}>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <h2 className="min-w-0 truncate text-lg font-black leading-tight" title={sheetTitle} style={{ color: resultText }}>
                  {sheetTitle}
                </h2>
                <div
                  data-testid="mobile-result-sheet-meta"
                  className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] font-black leading-none"
                  style={{ color: resultSubtext }}
                >
                  {candidateSummary && (
                    <span
                      data-testid="mobile-result-candidate-summary"
                      className="inline-flex min-h-5 max-w-[8.25rem] shrink-0 items-center truncate whitespace-nowrap rounded-full px-2"
                      title={candidateSummary}
                      style={{ background: '#eaf2ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                    >
                      {candidateSummary}
                    </span>
                  )}
                  <span
                    data-testid="mobile-result-route-context"
                    className="inline-flex min-h-5 min-w-0 flex-1 items-center truncate whitespace-nowrap rounded-full px-2"
                    title={routeLabel}
                    style={{ background: '#ffffff', color: resultSubtext, border: `1px solid ${resultBorder}` }}
                  >
                    {routeLabel}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {hasResults && (
                  <button
                    type="button"
                    aria-label="경로 저장"
                    onClick={onSaveRoute}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition active:scale-95"
                    style={{ background: '#ffffff', color: resultText, border: `1px solid ${resultBorder}` }}
                  >
                    <Bookmark className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="조건 수정"
                  onClick={onOpenSearch}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition active:scale-95"
                  style={{ background: 'var(--accent)', color: 'var(--text-on-accent)', border: '1px solid var(--accent)' }}
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div data-testid="mobile-result-list" className="overflow-y-auto px-3 py-2 scrollbar-hide" style={{ maxHeight: `calc(${resultSheetMaxHeight} - ${resultSheetHeaderHeight} - env(safe-area-inset-bottom))` }}>
            {error ? (
              <div
                data-testid="mobile-error-result"
                className="rounded-3xl p-4"
                style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-soft)' }}
              >
                <p className="text-sm font-extrabold leading-tight" style={{ color: 'var(--text-strong)' }}>검색이 막혔어요</p>
                <p className="mt-1 break-keep text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 flex min-h-11 w-full min-w-0 items-center justify-center rounded-2xl px-4 text-center text-sm font-extrabold leading-tight whitespace-nowrap"
                  style={{ background: 'var(--accent)', color: 'var(--text-on-accent)' }}
                >
                  다시 검색
                </button>
              </div>
            ) : !hasResults ? (
              <div
                data-testid="mobile-empty-result"
                className="rounded-[1.25rem] p-4"
                style={{ background: resultCard, border: `1px solid ${resultBorder}` }}
              >
                <p className="text-base font-black" style={{ color: resultText }}>
                  {category} 경유지를 찾지 못했어요
                </p>
                <p className="mt-1 text-sm font-semibold leading-relaxed" style={{ color: resultSubtext }}>
                  {routeLabel} 주변에 조건에 맞는 후보가 없어요. 카테고리나 경로를 바꾸거나 다시 검색해 보세요.
                </p>
                <div
                  data-testid="mobile-empty-result-actions"
                  className="mt-4 grid min-w-0 grid-cols-2 gap-2"
                >
                  <button
                    type="button"
                    onClick={onOpenSearch}
                    className="flex min-h-11 min-w-0 items-center justify-center rounded-2xl px-3 text-center text-sm font-extrabold leading-tight whitespace-nowrap"
                    style={{ background: 'var(--accent)', color: 'var(--text-on-accent)' }}
                  >
                    조건 수정
                  </button>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex min-h-11 min-w-0 items-center justify-center rounded-2xl px-3 text-center text-sm font-extrabold leading-tight whitespace-nowrap"
                    style={{ background: '#ffffff', color: resultText, border: `1px solid ${resultBorder}` }}
                  >
                    다시 검색
                  </button>
                </div>
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
                      data-testid={`mobile-result-card-${result.place.id}`}
                      data-result-index={index}
                      onClick={() => handleResultSelect(result)}
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
                      <div className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black" style={{ background: index === 0 ? '#3b82f6' : '#e2e8f0', color: index === 0 ? '#ffffff' : resultText }}>
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_1.75rem] items-start gap-2">
                            <div className="min-w-0 overflow-hidden">
                              <h3 className="max-w-full truncate break-keep text-base font-black leading-snug" title={result.place.name} style={{ color: resultText }}>{result.place.name}</h3>
                              <p className="mt-0.5 max-w-full truncate break-keep text-xs font-bold leading-snug" title={address} style={{ color: resultSubtext }}>{address}</p>
                            </div>
                            <span data-testid={`mobile-result-map-action-${result.place.id}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: selected ? '#2563eb' : '#eaf2ff', color: selected ? '#ffffff' : '#1d4ed8', border: selected ? '1px solid #2563eb' : '1px solid #bfdbfe' }}>
                              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                          </div>
                          <div
                            data-testid={`mobile-result-stats-${result.place.id}`}
                            className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1.5"
                            style={{ color: resultSubtext }}
                          >
                            <span className="min-w-0 overflow-hidden rounded-xl px-2 py-1.5 text-center" style={{ background: '#f1f5f9' }}>
                              <span className="block truncate text-[10px] font-black leading-none" style={{ color: resultMuted }}>우회</span>
                              <span className="mt-0.5 block truncate text-[12px] font-black leading-none tabular-nums">+{formatMin(result.detourCost.duration)}</span>
                            </span>
                            <span className="min-w-0 overflow-hidden rounded-xl px-2 py-1.5 text-center" style={{ background: '#f1f5f9' }}>
                              <span className="block truncate text-[10px] font-black leading-none" style={{ color: resultMuted }}>거리</span>
                              <span className="mt-0.5 block truncate text-[12px] font-black leading-none tabular-nums">{formatKm(result.detourCost.distance)}</span>
                            </span>
                            <span className="min-w-0 overflow-hidden rounded-xl px-2 py-1.5 text-center" style={{ background: '#eef6ff', color: '#1d4ed8' }}>
                              <span className="block truncate text-[10px] font-black leading-none" style={{ color: '#2563eb' }}>점수</span>
                              <span className="mt-0.5 block truncate text-[12px] font-black leading-none tabular-nums">{Math.round(result.finalScore)}점</span>
                            </span>
                          </div>
                          {(index === 0 || selected) && (
                            <div data-testid={`mobile-result-badges-${result.place.id}`} className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 overflow-hidden text-[10px] font-black leading-none">
                              {index === 0 && <span className="inline-flex min-h-4 min-w-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2 py-1" style={{ background: '#2563eb', color: '#ffffff' }}>BEST</span>}
                              {selected && <span className="inline-flex min-h-4 min-w-12 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2 py-1" style={{ background: '#dbeafe', color: '#1d4ed8' }}>표시 중</span>}
                            </div>
                          )}
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
