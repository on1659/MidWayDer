/**
 * Route utilities
 */

/**
 * shortest 경로를 제거할지 결정
 * duration ratio >= 1.35이면 제거 (너무 느린 최단 경로)
 */
export function shouldDropShortestRoute(
  shortest: { route: { duration: number } },
  fastest: { route: { duration: number } }
): boolean {
  if (fastest.route.duration === 0) return false; // 0 나누기 방지
  return shortest.route.duration / fastest.route.duration >= 1.35;
}
