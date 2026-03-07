import type { TimeSlot } from '@/types/recommendation';

/**
 * 빈도 기반 점수 계산 (0-40 points)
 * - 10회 사용 시 만점
 * - 선형적으로 증가
 */
export function calculateFrequencyScore(count: number): number {
  return Math.min(count / 10, 1) * 40;
}

/**
 * 최신성 기반 점수 계산 (0-30 points)
 * - 30일 내 사용 시 만점
 * - 시간이 지날수록 선형적으로 감소
 */
export function calculateRecencyScore(lastUsedTimestamp: number): number {
  const daysSinceLastUse = (Date.now() - lastUsedTimestamp) / (1000 * 60 * 60 * 24);
  return Math.max(0, (1 - daysSinceLastUse / 30)) * 30;
}

/**
 * 시간대 기반 점수 계산 (0-30 points)
 * - 현재 시간대에 맞는 카테고리면 30점
 * - 아니면 0점
 */
export function calculateTimeBasedScore(
  category: string,
  currentHour: number,
  timeSlots: TimeSlot[]
): number {
  const currentSlot = timeSlots.find(
    (slot) => currentHour >= slot.startHour && currentHour < slot.endHour
  );

  if (currentSlot && currentSlot.categories.includes(category)) {
    return 30;
  }

  return 0;
}

/**
 * 최종 추천 점수 계산
 */
export function calculateRecommendationScore(
  category: string,
  count: number,
  lastUsedTimestamp: number,
  currentHour: number,
  timeSlots: TimeSlot[]
) {
  const frequencyScore = calculateFrequencyScore(count);
  const recencyScore = calculateRecencyScore(lastUsedTimestamp);
  const timeScore = calculateTimeBasedScore(category, currentHour, timeSlots);

  return {
    category,
    frequencyScore,
    recencyScore,
    timeScore,
    totalScore: frequencyScore + recencyScore + timeScore
  };
}
