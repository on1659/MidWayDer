'use client';

import { Clock, Zap, Circle, Search, X as XIcon } from 'lucide-react';
import type { UseFiltersReturn } from './hooks/useFilters';

interface FilterChipsProps {
  filterState: UseFiltersReturn;
  filteredCount: number;
  totalCount: number;
  hasBusinessHoursData: boolean;
  openNowCount: number;
  visitedCount: number;
  isSticky: boolean;
  onScrollTop: () => void;
}

export function FilterChips({
  filterState,
  filteredCount,
  totalCount,
  hasBusinessHoursData,
  openNowCount,
  visitedCount,
  isSticky,
  onScrollTop,
}: FilterChipsProps) {
  const {
    openNowOnly, setOpenNowOnly,
    maxDetourMin, setMaxDetourMin,
    maxDetourKm, setMaxDetourKm,
    proxScoreOnly, setProxScoreOnly,
    unvisitedOnly, setUnvisitedOnly,
    nameFilter, setNameFilter,
    activePreset, showFilterChips, setShowFilterChips,
    filteredResults,
    filterCounts,
    applyPreset,
    resetAllFilters,
  } = filterState;

  const hasActiveFilter = openNowOnly || maxDetourMin !== null || maxDetourKm !== null || proxScoreOnly || unvisitedOnly || nameFilter.trim() !== '';

  return (
    <div
      className="sticky top-0 z-20"
      style={{
        background: 'var(--bg-surface)',
        boxShadow: isSticky ? '0 4px 20px rgba(0,0,0,0.10)' : 'none',
        borderBottomLeftRadius: isSticky ? 20 : 0,
        borderBottomRightRadius: isSticky ? 20 : 0,
        paddingBottom: isSticky ? 10 : 0,
        paddingTop: isSticky ? 10 : 0,
        marginLeft: isSticky ? -4 : 0,
        marginRight: isSticky ? -4 : 0,
        paddingLeft: isSticky ? 4 : 0,
        paddingRight: isSticky ? 4 : 0,
        transition: 'box-shadow 0.25s, border-radius 0.25s, padding 0.2s',
      }}
    >
      <div className="space-y-2">
        {/* ⬆ 맨 위로 버튼 */}
        {isSticky && (
          <div className="flex justify-end">
            <button
              onClick={onScrollTop}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95"
              style={{ background: 'var(--blue-100)', color: 'var(--blue-600)', border: '1px solid var(--blue-200)' }}
              aria-label="맨 위로 스크롤"
            >
              ⬆ 맨 위로
            </button>
          </div>
        )}

        {/* 프리셋 + 필터 토글 + 간략/자세히 */}
        <div className="flex gap-2">
          <button
            onClick={() => applyPreset('quick')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: activePreset === 'quick' ? 'var(--accent)' : 'var(--accent-weak)',
              color: activePreset === 'quick' ? 'white' : 'var(--accent)',
              border: `1.5px solid ${activePreset === 'quick' ? 'var(--accent)' : 'transparent'}`,
            }}
            title="영업중 + 5분 이내 자동 적용"
          >
            <Zap className="w-3.5 h-3.5" />
            빠른 경유
          </button>
          <button
            onClick={() => applyPreset('now')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: activePreset === 'now' ? '#dc2626' : '#fee2e2',
              color: activePreset === 'now' ? 'white' : '#dc2626',
              border: `1.5px solid ${activePreset === 'now' ? '#dc2626' : 'transparent'}`,
            }}
            title="영업중 + 5분이내 + 경로근접 + 1km이내 자동 적용"
          >
            🔥 당장!
          </button>
          <button
            onClick={() => setShowFilterChips(!showFilterChips)}
            className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: showFilterChips
                ? 'var(--blue-200)'
                : hasActiveFilter
                ? 'var(--accent)'
                : 'var(--bg-surface)',
              color: (showFilterChips || hasActiveFilter)
                ? showFilterChips ? 'var(--blue-700)' : 'white'
                : 'var(--text-secondary)',
              border: '1.5px solid var(--border-soft)',
            }}
            aria-expanded={showFilterChips}
          >
            🎛{showFilterChips ? '▲' : '▼'}
          </button>
        </div>

        {/* 상세 필터 칩 */}
        {showFilterChips && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasBusinessHoursData && (
              <button
                onClick={() => { setOpenNowOnly(!openNowOnly); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: openNowOnly ? 'var(--green-500)' : 'var(--green-50)',
                  color: openNowOnly ? 'white' : 'var(--green-700)',
                  border: `1.5px solid ${openNowOnly ? 'var(--green-500)' : 'var(--green-200)'}`,
                }}
              >
                <Clock className="w-3 h-3" />
                지금 열려있는 곳만
                {openNowOnly && openNowCount > 0 && (
                  <span className="ml-0.5 opacity-80">({openNowCount})</span>
                )}
              </button>
            )}

            {([5, 10, 15] as const).map((min) => {
              const countKey = min === 5 ? 'detour5' : min === 10 ? 'detour10' : 'detour15';
              const chipCount = filterCounts[countKey as keyof typeof filterCounts];
              return (
                <button
                  key={min}
                  onClick={() => setMaxDetourMin(maxDetourMin === min ? null : min)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: maxDetourMin === min ? 'var(--accent)' : 'var(--blue-50)',
                    color: maxDetourMin === min ? 'white' : 'var(--blue-700)',
                    border: `1.5px solid ${maxDetourMin === min ? 'var(--accent)' : 'var(--blue-200)'}`,
                  }}
                >
                  <Zap className="w-3 h-3" />
                  +{min}분 이내
                  {chipCount > 0 && chipCount < totalCount && (
                    <span className="ml-0.5 opacity-70 text-[10px]">({chipCount})</span>
                  )}
                </button>
              );
            })}

            {([1, 2] as const).map((km) => {
              const chipCount = km === 1 ? filterCounts.dist1km : filterCounts.dist2km;
              return (
                <button
                  key={km}
                  onClick={() => setMaxDetourKm(maxDetourKm === km ? null : km)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: maxDetourKm === km ? 'var(--purple-600, #7c3aed)' : 'var(--purple-50, #f5f3ff)',
                    color: maxDetourKm === km ? 'white' : 'var(--purple-700, #6d28d9)',
                    border: `1.5px solid ${maxDetourKm === km ? 'var(--purple-600, #7c3aed)' : 'var(--purple-200, #ddd6fe)'}`,
                  }}
                >
                  📏 +{km}km 이내
                  {chipCount > 0 && chipCount < totalCount && (
                    <span className="ml-0.5 opacity-70 text-[10px]">({chipCount})</span>
                  )}
                </button>
              );
            })}

            <button
              onClick={() => setProxScoreOnly(!proxScoreOnly)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={{
                background: proxScoreOnly ? '#0f766e' : '#f0fdfa',
                color: proxScoreOnly ? 'white' : '#0f766e',
                border: `1.5px solid ${proxScoreOnly ? '#0f766e' : '#99f6e4'}`,
              }}
            >
              📍 경로 근접
              {filterCounts.proxScore > 0 && filterCounts.proxScore < totalCount && !proxScoreOnly && (
                <span className="ml-0.5 opacity-70 text-[10px]">({filterCounts.proxScore})</span>
              )}
            </button>

            {visitedCount > 0 && (
              <button
                onClick={() => setUnvisitedOnly(!unvisitedOnly)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: unvisitedOnly ? 'var(--orange-500, #f97316)' : 'var(--orange-50, #fff7ed)',
                  color: unvisitedOnly ? 'white' : 'var(--orange-700, #c2410c)',
                  border: `1.5px solid ${unvisitedOnly ? 'var(--orange-500, #f97316)' : 'var(--orange-200, #fed7aa)'}`,
                }}
              >
                <Circle className="w-3 h-3" />
                미방문만
                {!unvisitedOnly && (
                  <span className="ml-0.5 opacity-70">({totalCount - visitedCount})</span>
                )}
              </button>
            )}

            {hasActiveFilter && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {filteredCount}개 (전체 {totalCount}개)
              </span>
            )}
          </div>
        )}

        {/* 이름 검색 */}
        {totalCount >= 5 && (
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="매장 이름으로 검색"
              className="w-full pl-8 pr-8 py-2 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1.5px solid var(--border-soft)',
                color: 'var(--text-primary)',
              }}
            />
            {nameFilter && (
              <button
                onClick={() => setNameFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full"
                style={{ color: 'var(--text-muted)' }}
                aria-label="검색 초기화"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* 필터 결과 없음 */}
        {filteredResults.length === 0 && hasActiveFilter && (
          <div className="py-8 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {nameFilter.trim()
                ? `"${nameFilter}" 에 해당하는 매장이 없어요`
                : unvisitedOnly
                ? '이미 방문한 곳이에요. 필터를 해제해보세요'
                : '조건에 맞는 경유지가 없어요'}
            </p>
            <button
              onClick={resetAllFilters}
              className="mt-3 text-xs underline"
              style={{ color: 'var(--accent)' }}
            >
              필터 초기화
            </button>
          </div>
        )}

        {/* 활성 필터 요약 바 */}
        {hasActiveFilter && filteredResults.length > 0 && (
          <div
            className="flex items-center gap-1.5 flex-wrap px-3 py-2 rounded-xl"
            style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-200)' }}
          >
            <span className="text-[11px] font-bold shrink-0" style={{ color: 'var(--blue-600)' }}>🔽 필터</span>
            {openNowOnly && (
              <button
                onClick={() => { setOpenNowOnly(false); }}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all"
                style={{ background: 'var(--green-100)', color: 'var(--green-700)', border: '1px solid var(--green-200)' }}
              >
                영업중 ✕
              </button>
            )}
            {maxDetourMin !== null && (
              <button
                onClick={() => setMaxDetourMin(null)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all"
                style={{ background: 'var(--blue-100)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' }}
              >
                +{maxDetourMin}분 ✕
              </button>
            )}
            {maxDetourKm !== null && (
              <button
                onClick={() => setMaxDetourKm(null)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all"
                style={{ background: 'var(--purple-50, #f5f3ff)', color: 'var(--purple-700, #6d28d9)', border: '1px solid var(--purple-200, #ddd6fe)' }}
              >
                +{maxDetourKm}km ✕
              </button>
            )}
            {proxScoreOnly && (
              <button
                onClick={() => setProxScoreOnly(false)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all"
                style={{ background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}
              >
                경로근접 ✕
              </button>
            )}
            {unvisitedOnly && (
              <button
                onClick={() => setUnvisitedOnly(false)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold active:scale-95 transition-all"
                style={{ background: 'var(--orange-50, #fff7ed)', color: 'var(--orange-700, #c2410c)', border: '1px solid var(--orange-200, #fed7aa)' }}
              >
                미방문 ✕
              </button>
            )}
            <div className="flex-1" />
            <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--blue-600)' }}>
              {filteredCount}/{totalCount}개
            </span>
            <button
              onClick={resetAllFilters}
              className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              전체 해제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
