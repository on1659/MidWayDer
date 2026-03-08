/**
 * FilterChips - 검색 필터 칩 UI (v0.61.0)
 *
 * 이탈 거리 필터를 선택할 수 있는 칩 형태 UI
 */

'use client';

import { useSearchStore, type SearchFilters } from '@/store/search-store';

const DISTANCE_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: '전체' },
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: 2000, label: '2km' },
  { value: 5000, label: '5km' },
];

export function FilterChips() {
  const { filters, setFilters, getFilteredResults } = useSearchStore();
  const filteredCount = getFilteredResults().length;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2">
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        이탈 거리:
      </span>

      {DISTANCE_OPTIONS.map((option) => {
        const isActive = filters.maxDetourDistance === option.value;

        return (
          <button
            key={option.label}
            onClick={() => setFilters({ maxDetourDistance: option.value })}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium
              transition-all duration-200
              ${isActive
                ? 'shadow-sm'
                : 'hover:opacity-80'
              }
            `}
            style={{
              background: isActive ? 'var(--accent)' : 'var(--bg-surface-muted)',
              color: isActive ? 'white' : 'var(--text-primary)',
            }}
          >
            {option.label}
          </button>
        );
      })}

      {/* 필터 적용 시 결과 개수 표시 */}
      {filters.maxDetourDistance !== null && (
        <span
          className="text-xs px-2 py-1 rounded-md"
          style={{
            background: 'var(--bg-surface-muted)',
            color: 'var(--text-muted)',
          }}
        >
          {filteredCount}개 결과
        </span>
      )}
    </div>
  );
}
