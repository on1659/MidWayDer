/**
 * Recommendation Badges - 추천 이유 뱃지 시스템
 * 사용자에게 "왜 이 경유지가 추천되었는지" 명확하게 설명
 */

import type { DetourResult } from '@/types/detour';

export interface RecommendationBadge {
  icon: string;
  label: string;
  description: string;
  type: 'detour' | 'popular' | 'proximity' | 'personalized' | 'fast';
  priority: number; // 표시 우선순위 (낮을수록 우선)
}

/**
 * 경유지 추천 이유 뱃지 생성
 * @param result 경유지 결과
 * @param rank 검색 결과 순위 (1~10)
 * @param totalClicks 해당 경유지 총 클릭 수 (선택)
 * @param visitCount 사용자 방문 횟수 (선택)
 * @returns 추천 이유 뱃지 배열 (최대 2개)
 */
export function getRecommendationBadges(
  result: DetourResult,
  rank: number,
  totalClicks?: number,
  visitCount?: number
): RecommendationBadge[] {
  const badges: RecommendationBadge[] = [];

  // 1. 최소 이탈 (detourCost 500m 이하 또는 2분 이하)
  if (result.detourCost.distance <= 500 || result.detourCost.duration <= 120) {
    const distanceText = result.detourCost.distance <= 500 
      ? `${result.detourCost.distance}m만 벗어나요`
      : `${Math.round(result.detourCost.duration / 60)}분만 추가돼요`;
    
    badges.push({
      icon: '🎯',
      label: '최소 이탈',
      description: distanceText,
      type: 'detour',
      priority: 1
    });
  }

  // 2. 빠른 접근 (duration 1분 이하 추가)
  if (result.detourCost.duration <= 60) {
    badges.push({
      icon: '⚡',
      label: '빠른 접근',
      description: `${Math.round(result.detourCost.duration)}초만 추가`,
      type: 'fast',
      priority: 1
    });
  }

  // 3. 인기 경유지 (클릭 수 10+)
  if (totalClicks !== undefined && totalClicks >= 10) {
    badges.push({
      icon: '⭐',
      label: '인기 경유지',
      description: `${totalClicks}명이 선택했어요`,
      type: 'popular',
      priority: 2
    });
  }

  // 4. 경로 근접 (proximityScore 90+)
  if (result.proximityScore >= 90) {
    const approxDistance = Math.round(result.detourCost.distance * 0.7); // 근사 직선거리
    badges.push({
      icon: '📍',
      label: '경로와 가까워요',
      description: `직선거리 약 ${approxDistance}m`,
      type: 'proximity',
      priority: 3
    });
  }

  // 5. 개인화 추천 (personalizationBoost > 0 또는 방문 기록)
  if (visitCount && visitCount > 0) {
    badges.push({
      icon: '💡',
      label: '자주 가는 곳',
      description: `${visitCount}번 방문했어요`,
      type: 'personalized',
      priority: 0 // 최우선
    });
  } else if (result.personalizationBoost && result.personalizationBoost > 0) {
    badges.push({
      icon: '💡',
      label: '맞춤 추천',
      description: '당신이 좋아할 것 같아요',
      type: 'personalized',
      priority: 2
    });
  }

  // 6. 1등 (rank === 1이고 특별한 이유 없을 때)
  if (rank === 1 && badges.length === 0) {
    badges.push({
      icon: '🏆',
      label: '최적 경유지',
      description: '종합 점수 1위',
      type: 'detour',
      priority: 4
    });
  }

  // 우선순위 정렬 후 최대 2개 반환
  return badges.sort((a, b) => a.priority - b.priority).slice(0, 2);
}

/**
 * 뱃지 타입별 색상 테마
 */
export function getBadgeColor(type: RecommendationBadge['type']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (type) {
    case 'detour':
      return {
        bg: 'rgba(74, 222, 128, 0.1)', // green-400
        text: '#4ade80',
        border: 'rgba(74, 222, 128, 0.3)'
      };
    case 'fast':
      return {
        bg: 'rgba(251, 191, 36, 0.1)', // amber-400
        text: '#fbbf24',
        border: 'rgba(251, 191, 36, 0.3)'
      };
    case 'popular':
      return {
        bg: 'rgba(96, 165, 250, 0.1)', // blue-400
        text: '#60a5fa',
        border: 'rgba(96, 165, 250, 0.3)'
      };
    case 'proximity':
      return {
        bg: 'rgba(167, 139, 250, 0.1)', // violet-400
        text: '#a78bfa',
        border: 'rgba(167, 139, 250, 0.3)'
      };
    case 'personalized':
      return {
        bg: 'rgba(244, 114, 182, 0.1)', // pink-400
        text: '#f472b6',
        border: 'rgba(244, 114, 182, 0.3)'
      };
    default:
      return {
        bg: 'rgba(156, 163, 175, 0.1)', // gray-400
        text: '#9ca3af',
        border: 'rgba(156, 163, 175, 0.3)'
      };
  }
}
