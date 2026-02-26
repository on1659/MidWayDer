/**
 * Smart Summary - 결과 카드용 한 줄 추천 문구 자동 생성
 *
 * 이탈 비용, 순위, 영업 상태, 개인화 여부를 복합 판단하여
 * 사용자가 한눈에 이해할 수 있는 한 줄 문구를 생성합니다.
 *
 * @example
 * getSmartOneLiner(result, 1) // "🏆 이 경로 최고의 선택! 딱 1분만 더 가면 돼요"
 * getSmartOneLiner(result, 3) // "⚡ 거의 이탈 없어요 — 경로에서 50m 이내!"
 */

import type { DetourResult } from '@/types/detour';
import { getBusinessStatus } from '@/lib/business-hours';

export function getSmartOneLiner(
  result: DetourResult,
  rank: number,
  visitCount?: number
): string | null {
  const detourSec = result.detourCost.duration;
  const detourM = result.detourCost.distance;
  const detourMin = Math.round(detourSec / 60);
  const proxScore = result.proximityScore;
  const businessStatus = result.place.businessHours
    ? getBusinessStatus(result.place.businessHours)
    : null;

  // 방문한 적 있는 곳
  if (visitCount && visitCount >= 2) {
    return `💡 ${visitCount}번 들른 곳이에요 — 익숙한 경유지!`;
  }

  // 거의 이탈 없음 (100m & 30초 이하)
  if (detourM <= 100 && detourSec <= 30) {
    return `📍 경로에서 딱 ${detourM}m — 거의 그냥 지나가는 길!`;
  }

  // 1분 미만
  if (detourSec < 60) {
    return `⚡ 1분도 안 걸려요 — 바로 들를 수 있어요!`;
  }

  // 2분 미만
  if (detourSec < 120) {
    return `✨ 딱 ${detourMin}분만 더 가면 돼요 — 가성비 최고!`;
  }

  // 1등이면서 5분 이내
  if (rank === 1 && detourSec <= 300) {
    return `🏆 이 경로 최고의 선택! +${detourMin}분으로 해결`;
  }

  // 영업 중이고 5분 이내
  if (businessStatus?.isOpen && detourSec <= 300) {
    return `🟢 지금 영업 중! +${detourMin}분이면 들를 수 있어요`;
  }

  // 경로 근접도 높음
  if (proxScore >= 85) {
    return `📐 경로와 가장 가까운 곳이에요 — 이탈 최소화!`;
  }

  // 5분 이내 (일반)
  if (detourSec <= 300) {
    return `⏱️ +${detourMin}분 이내 — 가는 길에 충분히 들를 수 있어요`;
  }

  // 그 외: null (문구 없음)
  return null;
}
