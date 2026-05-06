import { MapPin, Navigation, SlidersHorizontal } from 'lucide-react';
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
  const hasResults = results.length > 0;
  const routeLabel = startAddress && endAddress ? `${startAddress} → ${endAddress}` : '경로를 입력하면 추천을 시작해요';
  const resultSurface = '#f8fafc';
  const resultCard = '#ffffff';
  const resultCardMuted = '#eef4ff';
  const resultText = '#0f172a';
  const resultSubtext = '#334155';
  const resultMuted = '#64748b';
  const resultBorder = '#dbe7f5';

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
        <section
          data-testid="mobile-idle-sheet"
          className="absolute inset-x-3 bottom-3 z-[980] rounded-[2rem] px-4 pb-4 pt-3"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            background: 'color-mix(in srgb, var(--bg-surface) 82%, transparent)',
            border: '1px solid color-mix(in srgb, var(--border-soft) 75%, transparent)',
            boxShadow: '0 24px 70px -26px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          }}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full" style={{ background: 'var(--border-soft)' }} />
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-surface-muted)', color: 'var(--accent)' }}>
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold leading-tight" style={{ color: 'var(--text-strong)' }}>가는 길에 어디 들를까요?</p>
              <p className="mt-1 line-clamp-2 text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>{routeLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSearch}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-extrabold transition active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 58%, #8b5cf6))',
              color: 'var(--text-on-accent)',
              boxShadow: '0 14px 32px -18px rgba(var(--color-accent-rgb), 0.9)',
            }}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            경로 입력하고 추천 받기
          </button>
        </section>
      )}

      {(hasResults || error) && !isLoading && (
        <section
          data-testid="mobile-result-sheet"
          className="absolute inset-x-2 bottom-0 z-[1000] isolate max-h-[66dvh] overflow-hidden rounded-t-[1.75rem]"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
            background: resultSurface,
            border: `1px solid ${resultBorder}`,
            borderBottom: 'none',
            boxShadow: '0 -18px 50px -30px rgba(15,23,42,0.45)',
          }}
        >
          <div className="flex justify-center pt-2" aria-hidden="true">
            <div className="h-1.5 w-12 rounded-full" style={{ background: '#cbd5e1' }} />
          </div>
          <div className="px-4 pb-3 pt-2" style={{ borderBottom: `1px solid ${resultBorder}` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-[0.08em]" style={{ color: 'var(--accent)' }}>추천 경유지</p>
                <h2 className="mt-1 text-2xl font-black leading-tight" style={{ color: resultText }}>
                  {error ? '검색을 다시 시도해요' : `${results.length}개 발견`}
                </h2>
                <p className="mt-1 truncate text-sm font-bold" style={{ color: resultSubtext }}>
                  {totalCandidates ? `${totalCandidates}개 후보 중 선별` : routeLabel}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {hasResults && (
                  <button
                    type="button"
                    onClick={onSaveRoute}
                    className="min-h-10 rounded-full px-3 text-xs font-extrabold"
                    style={{ background: '#ffffff', color: resultText, border: `1px solid ${resultBorder}` }}
                  >
                    저장
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="min-h-10 rounded-full px-3 text-xs font-extrabold"
                  style={{ background: 'var(--accent)', color: 'var(--text-on-accent)', border: '1px solid var(--accent)' }}
                >
                  조건 수정
                </button>
              </div>
            </div>
            {hasResults && (
              <div className="mt-3 grid grid-cols-5 gap-1.5 text-center text-[11px] font-extrabold" style={{ color: resultMuted }}>
                {['출발', '초반', '중간', '후반', '도착'].map((label, index) => (
                  <span key={label} className="rounded-full py-1.5" style={{ background: index === 2 ? 'rgba(37, 99, 235, 0.14)' : '#e8eef7', color: index === 2 ? '#1d4ed8' : resultSubtext }}>
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div data-testid="mobile-result-list" className="max-h-[calc(66dvh_-_126px_-_env(safe-area-inset-bottom))] overflow-y-auto px-3.5 py-3 scrollbar-hide">
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
              <div className="space-y-3">
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
                      className="w-full rounded-[1.65rem] p-3.5 text-left transition active:scale-[0.99]"
                      style={{
                        background: selected ? '#eff6ff' : resultCard,
                        border: selected ? '2px solid #2563eb' : `1px solid ${resultBorder}`,
                        boxShadow: index === 0 ? '0 14px 34px -24px rgba(37,99,235,0.55)' : '0 10px 28px -24px rgba(15,23,42,0.35)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black" style={{ background: index === 0 ? '#3b82f6' : '#e2e8f0', color: index === 0 ? '#ffffff' : resultText }}>
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 text-xl font-black leading-snug" style={{ color: resultText }}>{result.place.name}</h3>
                              <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug" style={{ color: resultSubtext }}>{address}</p>
                            </div>
                            {index === 0 && (
                              <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: '#2563eb', color: '#ffffff' }}>
                                BEST
                              </span>
                            )}
                          </div>
                          <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-2xl" style={{ border: `1px solid ${resultBorder}` }}>
                            {[
                              ['추가', formatMin(result.detourCost.duration)],
                              ['거리', formatKm(result.detourCost.distance)],
                              ['점수', `${Math.round(result.finalScore)}`],
                            ].map(([label, value]) => (
                              <span key={label} className="px-2 py-2.5 text-center" style={{ background: resultCardMuted, borderRight: label !== '점수' ? `1px solid ${resultBorder}` : 'none' }}>
                                <span className="block text-[11px] font-black" style={{ color: resultSubtext }}>{label}</span>
                                <span className="mt-0.5 block text-xl font-black tabular-nums" style={{ color: resultText }}>{value}</span>
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-2xl text-lg font-black" style={{ background: selected ? '#2563eb' : '#eaf2ff', color: selected ? '#ffffff' : '#1d4ed8', border: selected ? '1px solid #2563eb' : '1px solid #bfdbfe' }}>
                            <Navigation className="h-4 w-4" aria-hidden="true" />
                            {selected ? '지도에 표시 중' : '지도에서 보기'}
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
