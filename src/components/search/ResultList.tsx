/**
 * ResultList - 키즈 프렌들리 결과 카드
 *
 * 큰 글씨, 심플한 카드, +몇분/+몇km 배지
 */

'use client';

import { MapPin } from 'lucide-react';
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
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 bg-white rounded-3xl animate-pulse">
            <div className="h-6 bg-gray-200 rounded-xl w-2/3 mb-3" />
            <div className="flex gap-2">
              <div className="h-8 bg-gray-100 rounded-xl w-20" />
              <div className="h-8 bg-gray-100 rounded-xl w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-red-50 rounded-3xl">
        <p className="text-base text-red-500 font-medium">😢 {error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="text-5xl mb-4">🗺️</div>
        <p className="text-lg text-gray-400 font-medium">
          출발지와 도착지를 넣고<br />검색 버튼을 눌러보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result, index) => {
        const isSelected = selectedId === result.place.id;
        const detourKm = (result.detourCost.distance / 1000).toFixed(1);
        const detourMin = Math.round(result.detourCost.duration / 60);
        const routeLabel = (result as any).routeType === 'shortest' ? '🛣️ 최단거리' : (result as any).routeType === 'fastest' ? '⚡ 최단시간' : null;

        return (
          <button
            key={result.place.id}
            onClick={() => onSelect(result)}
            className={`
              w-full p-5 rounded-3xl text-left transition-all active:scale-[0.97]
              ${isSelected
                ? 'bg-blue-50 ring-3 ring-blue-400 shadow-lg'
                : 'bg-white shadow-sm hover:shadow-md'
              }
            `}
          >
            {/* Rank + Name */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shrink-0
                ${index === 0 ? 'bg-yellow-400 text-white' : index < 3 ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'}
              `}>
                {index + 1}
              </div>
              <h3 className="text-lg font-bold text-gray-900 truncate flex-1">{result.place.name}</h3>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                🚗 +{detourKm}km
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                ⏱️ +{detourMin}분
              </span>
              {routeLabel && (
                <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                  {routeLabel}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
