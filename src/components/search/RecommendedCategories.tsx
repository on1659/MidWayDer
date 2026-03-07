'use client';

import { useMemo } from 'react';
import { useSearchHistoryStore } from '@/store/search-history-store';
import { getRecommendedCategories, getTimeBasedCategories } from '@/lib/recommendation/recommender';

interface Props {
  onCategorySelect: (category: string) => void;
  maxItems?: number;
}

export function RecommendedCategories({ onCategorySelect, maxItems = 5 }: Props) {
  const categoryUsage = useSearchHistoryStore((state) => state.categoryUsage);

  // 성능 최적화: categoryUsage가 변경될 때만 재계산
  const frequentCategories = useMemo(() => {
    try {
      return getRecommendedCategories({ maxResults: maxItems });
    } catch (error) {
      console.error('Failed to get recommended categories:', error);
      return [];
    }
  }, [categoryUsage, maxItems]);

  // 시간대별 추천 (1분마다 업데이트되도록 시간 의존성 추가 가능)
  const timeBasedCategories = useMemo(() => {
    try {
      return getTimeBasedCategories();
    } catch (error) {
      console.error('Failed to get time-based categories:', error);
      return [];
    }
  }, []);

  const hasHistory = Object.keys(categoryUsage).length > 0;

  // 히스토리도 없고 시간대별 추천도 없으면 렌더링하지 않음
  if (!hasHistory && timeBasedCategories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 자주 찾는 카테고리 */}
      {hasHistory && frequentCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            🔥 자주 찾는 카테고리
          </h3>
          <div className="flex flex-wrap gap-2">
            {frequentCategories.slice(0, maxItems).map((rec) => (
              <button
                key={rec.category}
                onClick={() => onCategorySelect(rec.category)}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`${rec.category} 선택 (추천 점수: ${Math.round(rec.totalScore)}점)`}
              >
                {rec.category}
                {rec.totalScore >= 50 && <span className="ml-1">⭐</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 시간대별 추천 */}
      {timeBasedCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ⏰ 지금 이런 곳 어때요?
          </h3>
          <div className="flex flex-wrap gap-2">
            {timeBasedCategories.map((category) => (
              <button
                key={category}
                onClick={() => onCategorySelect(category)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                aria-label={`${category} 선택`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
