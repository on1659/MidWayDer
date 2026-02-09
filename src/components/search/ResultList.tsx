/**
 * ResultList - 검색 결과 (리디자인)
 *
 * 모바일 퍼스트 카드 디자인, 이탈 비용 뱃지, 간결한 정보
 */

'use client';

import { MapPin, Clock, Route as RouteIcon, Loader2 } from 'lucide-react';
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
      <div className="space-y-3 px-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-white rounded-2xl animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded-lg w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-1 p-4 bg-red-50 rounded-2xl">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <MapPin className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-sm text-gray-400">
          출발지와 도착지를 입력하고<br />검색해주세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 px-1">
      {results.map((result, index) => {
        const isSelected = selectedId === result.place.id;
        const detourKm = (result.detourCost.distance / 1000).toFixed(1);
        const detourMin = Math.round(result.detourCost.duration / 60);

        return (
          <button
            key={result.place.id}
            onClick={() => onSelect(result)}
            className={`
              w-full p-4 rounded-2xl text-left transition-all active:scale-[0.98]
              ${isSelected
                ? 'bg-blue-50 ring-2 ring-blue-500 shadow-md shadow-blue-500/10'
                : 'bg-white shadow-sm hover:shadow-md'
              }
            `}
          >
            <div className="flex items-start gap-3">
              {/* Rank */}
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0
                ${index === 0 ? 'bg-amber-400 text-white' : index < 3 ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'}
              `}>
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                {/* Name + Score */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{result.place.name}</h3>
                  <span className="text-xs font-medium text-blue-500 shrink-0">
                    {result.finalScore.toFixed(0)}점
                  </span>
                </div>

                {/* Address */}
                <p className="text-xs text-gray-400 truncate mb-2.5">{result.place.address}</p>

                {/* Detour badges */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
                    <RouteIcon className="w-3 h-3" />
                    +{detourKm}km
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    +{detourMin}분
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-400 text-center py-3 leading-relaxed">
        ⚠️ 신호대기·주차 시간 미포함 | 실시간 교통에 따라 변동
      </p>
    </div>
  );
}
