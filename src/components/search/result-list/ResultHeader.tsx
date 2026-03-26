'use client';

import { forwardRef, useState } from 'react';
import type { DetourResult } from '@/types/detour';
import { getBusinessStatus } from '@/lib/business-hours';
import { copyToClipboard } from '@/lib/clipboard';
import { getRelativeSearchTime, getRoutePositionLabel } from './utils';
import { TimeAccuracyNotice } from './TimeAccuracyNotice';

type SortBy = 'score' | 'distance' | 'duration' | 'closing';

interface ResultHeaderProps {
  results: DetourResult[];
  filteredResults: DetourResult[];
  sortedWithPins: DetourResult[];
  searchedAt: number | null;
  onRetry?: () => void;
  onSortChange?: (sort: SortBy) => void;
  sortBy?: SortBy;
  departureTime: string;
  onDepartureTimeChange: (time: string) => void;
  dwellMinutes: number;
  onDwellChange: (mins: number) => void;
  isCompact: boolean;
  isGrouped: boolean;
  onCompactToggle: () => void;
  onGroupedToggle: () => void;
  isHeaderExpanded: boolean;
  onHeaderExpandToggle: () => void;
  isNowDeparture: boolean;
  pinnedIds: Set<string>;
  onQuickGo: () => void;
  currentCategory: string;
}

export const ResultHeader = forwardRef<HTMLDivElement, ResultHeaderProps>(({
  results,
  sortedWithPins,
  searchedAt,
  onRetry,
  departureTime,
  onDepartureTimeChange,
  dwellMinutes,
  onDwellChange,
  isCompact,
  isGrouped,
  onCompactToggle,
  onGroupedToggle,
  isHeaderExpanded,
  onHeaderExpandToggle,
  isNowDeparture,
  pinnedIds,
  onQuickGo,
  currentCategory,
}, ref) => {
  const [showCompare, setShowCompare] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);

  const avgDetourMin = Math.round(
    results.reduce((sum, r) => sum + (r.detourCost?.duration ?? 0), 0) / results.length / 60
  );
  const withinFiveMin = results.filter((r) => (r.detourCost?.duration ?? Infinity) <= 300).length;
  const bestResult = results.reduce((best, r) =>
    (r.detourCost?.duration ?? Infinity) < (best.detourCost?.duration ?? Infinity) ? r : best, results[0]
  );

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const lines = sortedWithPins.map((r, i) => {
      const dMin = Math.round((r.detourCost?.duration ?? 0) / 60);
      const dKm = ((r.detourCost?.distance ?? 0) / 1000).toFixed(1);
      const bizStatus = r.place.businessHours ? getBusinessStatus(r.place.businessHours) : null;
      const bizLabel = bizStatus && bizStatus.label !== '정보 없음' ? ` [${bizStatus.label}]` : '';
      return `${i + 1}. ${r.place.name} — +${dMin}분 +${dKm}km${bizLabel}`;
    });
    const text = `[MidWayDer] ${currentCategory} 검색 결과 (${results.length}개)\n` + lines.join('\n');
    const success = await copyToClipboard(text);
    if (success) {
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
    }
  };

  return (
    <div
      ref={ref}
      className="px-4 py-3 rounded-2xl space-y-2.5"
      style={{
        background: 'linear-gradient(135deg, var(--blue-50), var(--accent-weak))',
        border: '1px solid var(--blue-200)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          <span className="text-sm font-bold" style={{ color: 'var(--blue-700)' }}>
            ✅ {results.length}개 발견
          </span>
          <span
            className="text-xs px-2 py-1 rounded-full font-semibold"
            style={{ background: 'var(--blue-150)', color: 'var(--blue-600)' }}
          >
            평균 +{avgDetourMin}분
          </span>
          {withinFiveMin > 0 && (
            <span
              className="text-xs px-2 py-1 rounded-full font-semibold"
              style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}
            >
              ⚡ {withinFiveMin}개 +5분 이내
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isHeaderExpanded && (
            <span className="text-[11px] font-medium truncate max-w-[80px]" style={{ color: 'var(--text-secondary)' }}>
              최단 {bestResult.place.name}
            </span>
          )}
          {searchedAt && (
            <span className="text-[11px] font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>
              {getRelativeSearchTime(searchedAt)}
            </span>
          )}
          {searchedAt && onRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
              className="shrink-0 flex items-center px-2 py-1 rounded-xl text-[11px] font-bold transition-all active:scale-95"
              style={{ background: 'var(--blue-100)', color: 'var(--blue-600)' }}
              title="동일 경로 재검색"
              aria-label="재검색"
            >
              🔄
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
            style={{
              background: exportCopied ? 'var(--green-500)' : 'var(--blue-100)',
              color: exportCopied ? 'white' : 'var(--blue-700)',
            }}
            title="전체 결과 목록 클립보드에 복사"
          >
            {exportCopied ? '✓ 복사됨' : '📋'}
          </button>
          <button
            onClick={onHeaderExpandToggle}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
            style={{ background: 'var(--blue-200)', color: 'var(--blue-700)' }}
            aria-label={isHeaderExpanded ? '헤더 접기' : '헤더 펼치기'}
          >
            {isHeaderExpanded ? '▲ 접기' : '▼ 펼치기'}
          </button>
        </div>
      </div>

      {isHeaderExpanded && (
        <>
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>최단</p>
              <p className="text-xs font-bold truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }}>
                {bestResult.place.name}
              </p>
            </div>
          </div>

          {/* 경로 구간별 분포 미니 차트 */}
          {results.length >= 3 && (() => {
            const segs = [
              { label: '출발직후', key: '출발 직후', color: '#60a5fa' },
              { label: '초반', key: '경로 초반', color: '#34d399' },
              { label: '중간', key: '경로 중간', color: '#a78bfa' },
              { label: '후반', key: '경로 후반', color: '#f59e0b' },
              { label: '도착직전', key: '도착 직전', color: '#f87171' },
            ];
            const counts = segs.map((s) => results.filter((r) => getRoutePositionLabel(r) === s.key).length);
            const maxCount = Math.max(...counts, 1);
            if (counts.every((c) => c === 0)) return null;
            return (
              <div className="pt-2 border-t" style={{ borderColor: 'var(--blue-200)' }}>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--blue-600)' }}>
                  📊 경로 구간별 분포
                </p>
                <div className="flex items-end gap-1" style={{ height: 40 }}>
                  {segs.map((seg, i) => {
                    const count = counts[i];
                    const barH = count === 0 ? 3 : Math.max(8, Math.round((count / maxCount) * 32));
                    return (
                      <div key={seg.key} className="flex flex-col items-center flex-1">
                        {count > 0 && (
                          <span className="text-[10px] font-bold mb-0.5" style={{ color: seg.color }}>{count}</span>
                        )}
                        <div
                          className="w-full rounded-t transition-all duration-500"
                          style={{ height: barH, background: count > 0 ? seg.color : 'var(--border-soft)', opacity: count > 0 ? 1 : 0.35 }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-0.5">
                  {segs.map((seg) => (
                    <span key={seg.key} className="flex-1 text-center text-[8px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {seg.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 출발 예정 시각 설정 */}
          <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--blue-200)' }}>
            <span className="text-[12px] font-semibold shrink-0 flex items-center gap-1" style={{ color: 'var(--blue-700)' }}>
              {isNowDeparture ? <span className="animate-pulse">🟢</span> : '🕐'}
              {isNowDeparture ? '출발 중' : '출발 시각'}
            </span>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => onDepartureTimeChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-sm font-bold border-0 outline-none focus:ring-2 transition-all"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            />
            <button
              onClick={() => {
                const now = new Date();
                onDepartureTimeChange(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
              }}
              className="shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
              style={{ background: 'var(--blue-200)', color: 'var(--blue-700)' }}
            >
              지금
            </button>
          </div>

          {/* 빠른 출발 시각 버튼 */}
          <div className="flex items-center gap-1.5">
            {([30, 60, 120] as const).map((mins) => (
              <button
                key={mins}
                onClick={() => {
                  const d = new Date(Date.now() + mins * 60000);
                  onDepartureTimeChange(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                }}
                className="flex-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                style={{ background: 'var(--blue-100)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' }}
              >
                +{mins < 60 ? `${mins}분` : `${mins / 60}시간`}
              </button>
            ))}
          </div>

          {/* 체류 시간 설정 */}
          <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--blue-200)' }}>
            <span className="text-[12px] font-semibold shrink-0 flex items-center gap-1" style={{ color: 'var(--blue-700)' }}>
              🏪 체류 시간
            </span>
            <div className="flex gap-1 flex-1 justify-end">
              {([5, 10, 15, 20, 30] as const).map((min) => (
                <button
                  key={min}
                  onClick={() => onDwellChange(min)}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                  style={{
                    background: dwellMinutes === min ? 'var(--accent)' : 'var(--blue-100)',
                    color: dwellMinutes === min ? 'white' : 'var(--blue-700)',
                    border: `1px solid ${dwellMinutes === min ? 'var(--accent)' : 'var(--blue-200)'}`,
                  }}
                >
                  {min}분
                </button>
              ))}
            </div>
          </div>

          {/* 베스트 픽으로 바로 출발 */}
          <button
            onClick={onQuickGo}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 mt-1"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #2563eb)',
              color: 'white',
              boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
            }}
            title={`베스트 픽: ${sortedWithPins[0]?.place.name ?? ''}`}
          >
            🚀 <span>베스트 픽으로 바로 출발</span>
            {pinnedIds.size > 0 && <span className="opacity-70 text-[11px]">(📌 고정 기준)</span>}
          </button>
        </>
      )}

      {/* 상위 N개 비교 패널 */}
      {results.length >= 2 && (
        <div>
          <button
            onClick={() => setShowCompare((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: showCompare ? 'var(--blue-100)' : 'var(--bg-surface)',
              color: 'var(--blue-700)',
              border: '1.5px solid var(--blue-200)',
            }}
          >
            <span>⚖️ 상위 {Math.min(3, results.length)}개 한눈에 비교</span>
            <span style={{ fontSize: 10 }}>{showCompare ? '▲ 접기' : '▼ 펼치기'}</span>
          </button>
          {showCompare && (
            <div
              className="grid gap-2 mt-2"
              style={{ gridTemplateColumns: `repeat(${Math.min(3, sortedWithPins.length)}, 1fr)` }}
            >
              {sortedWithPins.slice(0, 3).map((r, i) => {
                const dMin = Math.round((r.detourCost?.duration ?? 0) / 60);
                const dKm = ((r.detourCost?.distance ?? 0) / 1000).toFixed(1);
                const bizStatus = r.place.businessHours ? getBusinessStatus(r.place.businessHours) : null;
                return (
                  <div
                    key={r.place.id}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-center"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1.5px solid var(--border-soft)',
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: i === 0 ? 'var(--accent)' : 'var(--blue-150)',
                        color: i === 0 ? 'white' : 'var(--accent)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[11px] font-bold w-full truncate" style={{ color: 'var(--text-primary)' }}>
                      {r.place.name}
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--yellow-600)' }}>+{dMin}분</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{dKm}km</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--blue-100)', color: 'var(--blue-700)' }}
                    >
                      {Math.round(r.finalScore)}점
                    </span>
                    {bizStatus && bizStatus.label !== '정보 없음' && (
                      <span className="text-[9px] font-semibold" style={{ color: bizStatus.isOpen ? '#16a34a' : '#dc2626' }}>
                        {bizStatus.emoji} {bizStatus.isOpen ? '영업중' : '마감'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 뷰 토글 버튼들 */}
      <div className="flex gap-2">
        <button
          onClick={onCompactToggle}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{
            background: isCompact ? 'linear-gradient(135deg, var(--accent), var(--blue-600, #2563eb))' : 'var(--bg-surface)',
            color: isCompact ? 'white' : 'var(--text-secondary)',
            border: `1.5px solid ${isCompact ? 'transparent' : 'var(--border-soft)'}`,
            boxShadow: isCompact ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
          }}
        >
          <span className="text-sm leading-none">{isCompact ? '☰' : '≡'}</span>
          {isCompact ? '자세히' : '간략'}
        </button>
        <button
          onClick={onGroupedToggle}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{
            background: isGrouped ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'var(--bg-surface)',
            color: isGrouped ? 'white' : 'var(--text-secondary)',
            border: `1.5px solid ${isGrouped ? 'transparent' : 'var(--border-soft)'}`,
            boxShadow: isGrouped ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
          }}
        >
          <span className="text-sm leading-none">🗺️</span>
          구간
        </button>
      </div>

      {/* 시간 정확도 안내 (QA_REVIEW 반영) */}
      <TimeAccuracyNotice />
    </div>
  );
});

ResultHeader.displayName = 'ResultHeader';
