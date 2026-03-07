import { useSearchHistoryStore } from '@/store/search-history-store';
import { calculateRecommendationScore } from './scorer';
import { TIME_SLOTS } from '@/types/recommendation';
import type { RecommendationScore, RecommendationOptions } from '@/types/recommendation';

/**
 * 개인화된 추천 카테고리 목록 반환
 */
export function getRecommendedCategories(options: RecommendationOptions = {}): RecommendationScore[] {
  const { currentTime = new Date().getHours(), maxResults = 10 } = options;

  const state = useSearchHistoryStore.getState();
  const categories = Object.keys(state.categoryUsage);

  if (categories.length === 0) {
    // 기본 카테고리 반환
    return getDefaultCategories(currentTime);
  }

  const scores = categories.map((category) => {
    const usage = state.categoryUsage[category];
    return calculateRecommendationScore(
      category,
      usage.count,
      usage.lastUsed,
      currentTime,
      TIME_SLOTS
    );
  });

  return scores.sort((a, b) => b.totalScore - a.totalScore).slice(0, maxResults);
}

/**
 * 시간대별 추천 카테고리 반환 ("지금 이런 곳 어때요?")
 */
export function getTimeBasedCategories(currentHour?: number): string[] {
  const hour = currentHour ?? new Date().getHours();
  const currentSlot = TIME_SLOTS.find(
    (slot) => hour >= slot.startHour && hour < slot.endHour
  );

  return currentSlot?.categories.slice(0, 3) ?? [];
}

/**
 * 기본 카테고리 반환 (히스토리 없을 때)
 */
function getDefaultCategories(currentHour: number): RecommendationScore[] {
  const timeBased = getTimeBasedCategories(currentHour);

  return timeBased.map((category, index) => ({
    category,
    frequencyScore: 0,
    recencyScore: 0,
    timeScore: 30 - index * 5,
    totalScore: 30 - index * 5
  }));
}

/**
 * 현재 시간대 이름 반환
 */
export function getCurrentTimeSlotName(currentHour?: number): string {
  const hour = currentHour ?? new Date().getHours();
  const slot = TIME_SLOTS.find((s) => hour >= s.startHour && hour < s.endHour);
  return slot?.name ?? 'default';
}
