/**
 * ResultList - 파스텔톤 카드형 결과 리스트
 */

'use client';

import type { DetourResult } from '@/types/detour';

interface ResultListProps {
  results: DetourResult[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (result: DetourResult) => void;
}

export default function ResultList({
  results,
  selectedId,
  isLoading,
  error,
  onSelect,
}: ResultListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-center font-medium animate-pulse" style={{ color: '#6C9CFF' }}>
          경유지를 찾고 있어요...
        </p>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-white rounded-2xl animate-pulse shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-full shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded-lg w-2/3 mb-2" />
                <div className="h-3 bg-gray-50 rounded-lg w-1/2 mb-3" />
                <div className="flex gap-1.5">
                  <div className="h-6 w-16 bg-blue-50 rounded-full" />
                  <div className="h-6 w-14 bg-orange-50 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl" style={{ background: '#FFF0F3' }}>
        <p className="text-sm font-medium" style={{ color: '#FF8FA3' }}>😢 {error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-4xl mb-3">🗺️</div>
        <p className="text-sm" style={{ color: '#8B95A5' }}>
          출발지와 도착지를 설정하고<br />경유지를 검색해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {results.map((result, index) => {
        const isSelected = selectedId === result.place.id;
        const detourKm = (result.detourCost.distance / 1000).toFixed(1);
        const detourMin = Math.round(result.detourCost.duration / 60);
        const routeLabel = (result as any).routeType === 'shortest' ? '최단거리' : (result as any).routeType === 'fastest' ? '최단시간' : null;

        return (
          <button
            key={result.place.id}
            onClick={() => onSelect(result)}
            className="w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98] shadow-sm"
            style={{
              background: isSelected ? '#EEF4FF' : '#FFFFFF',
              border: isSelected ? '1.5px solid #6C9CFF' : '1px solid #F0F2F5',
            }}
          >
            <div className="flex items-start gap-3">
              {/* Rank badge */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  background: index === 0 ? '#6C9CFF' : '#F0F4FF',
                  color: index === 0 ? '#FFFFFF' : '#6C9CFF',
                }}
              >
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                {/* Name */}
                <h3 className="text-[15px] font-bold truncate" style={{ color: '#2D3748' }}>
                  {result.place.name}
                </h3>
                {/* Address */}
                {(result.place.roadAddress || result.place.address) && (
                  <p className="text-[12px] mt-0.5 truncate" style={{ color: '#8B95A5' }}>
                    {result.place.roadAddress || result.place.address}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: '#E8F0FE', color: '#4A7AE8' }}
                  >
                    +{detourKm}km
                  </span>
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: '#FFF4E5', color: '#D4850F' }}
                  >
                    +{detourMin}분
                  </span>
                  {routeLabel && (
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: '#E6F7ED', color: '#2D8F5E' }}
                    >
                      {routeLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
