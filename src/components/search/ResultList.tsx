/**
 * ResultList - 검색 결과 리스트 컴포넌트
 *
 * Detour Cost 계산 결과를 표시하고 경유지를 선택할 수 있습니다.
 */

'use client';

import { MapPin, Clock, Route as RouteIcon } from 'lucide-react';
import type { DetourResult } from '@/types/detour';

interface ResultListProps {
  /** 검색 결과 배열 */
  results: DetourResult[];
  /** 선택된 경유지 ID */
  selectedId: string | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 경유지 선택 콜백 */
  onSelect: (result: DetourResult) => void;
}

export default function ResultList({
  results,
  selectedId,
  isLoading,
  error,
  onSelect,
}: ResultListProps) {
  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border border-gray-200 rounded-lg animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  // 결과 없음
  if (results.length === 0) {
    return (
      <div className="p-8 text-center">
        <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">
          출발지와 도착지를 입력하고 검색해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {results.map((result, index) => {
        const isSelected = selectedId === result.place.id;
        const detourDistance = (result.detourCost.distance / 1000).toFixed(1);
        const detourTime = Math.round(result.detourCost.duration / 60);

        return (
          <button
            key={result.place.id}
            onClick={() => onSelect(result)}
            className={`
              p-4 border rounded-lg text-left transition-all cursor-pointer
              ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
              }
            `}
          >
            {/* 순위 배지 */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`
                    inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    ${index === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-700'}
                  `}
                >
                  {index + 1}
                </span>
                <h3 className="font-semibold text-gray-900">{result.place.name}</h3>
              </div>
              <span className="text-xs text-blue-600 font-medium">
                {result.finalScore.toFixed(0)}점
              </span>
            </div>

            {/* 주소 */}
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 line-clamp-2">{result.place.address}</p>
            </div>

            {/* 이탈 정보 */}
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <RouteIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>+{detourDistance}km</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>+{detourTime}분</span>
              </div>
            </div>
          </button>
        );
      })}

      {/* 안내 문구 */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800 leading-relaxed">
          ⚠️ 추가 시간에는 신호대기 및 주차 시간이 포함되지 않습니다.
          실시간 교통 상황에 따라 실제 소요 시간이 달라질 수 있습니다.
        </p>
      </div>
    </div>
  );
}
