/**
 * Multi-Stop Route Optimization API
 * 
 * 여러 경유지를 최적 순서로 재배열하는 API
 * Greedy Nearest Neighbor 알고리즘 사용
 */

import { NextRequest, NextResponse } from 'next/server';
import { haversineDistance } from '@/lib/utils';
import type { Coordinates } from '@/types/location';
import { logger } from '@/lib/logger';

interface OptimizeRequest {
  start: Coordinates;
  end: Coordinates;
  waypoints: Array<{
    id: string;
    name: string;
    coordinates: Coordinates;
  }>;
}

interface OptimizeResponse {
  success: boolean;
  data?: {
    optimizedOrder: string[]; // waypoint IDs in optimal order
    totalDistance: number; // 추가 이탈 거리 (meters)
    estimatedDuration: number; // 추가 소요 시간 (seconds)
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Greedy Nearest Neighbor TSP
 * 현재 위치에서 가장 가까운 미방문 경유지를 순차 선택
 */
function greedyNearestNeighbor(
  start: Coordinates,
  end: Coordinates,
  waypoints: OptimizeRequest['waypoints']
): string[] {
  if (waypoints.length === 0) return [];
  if (waypoints.length === 1) return [waypoints[0].id];

  const visited = new Set<string>();
  const order: string[] = [];
  let current = start;

  while (visited.size < waypoints.length) {
    let nearest: typeof waypoints[0] | null = null;
    let minDist = Infinity;

    for (const wp of waypoints) {
      if (visited.has(wp.id)) continue;
      const dist = haversineDistance(current, wp.coordinates);
      if (dist < minDist) {
        minDist = dist;
        nearest = wp;
      }
    }

    if (!nearest) break;

    visited.add(nearest.id);
    order.push(nearest.id);
    current = nearest.coordinates;
  }

  return order;
}

/**
 * 총 경로 거리/시간 계산
 * start → wp1 → wp2 → ... → wpN → end
 */
function calculateTotalCost(
  start: Coordinates,
  end: Coordinates,
  waypoints: OptimizeRequest['waypoints'],
  order: string[]
): { distance: number; duration: number } {
  let totalDist = 0;
  let current = start;

  // start → 첫 경유지
  const first = waypoints.find(w => w.id === order[0]);
  if (first) {
    totalDist += haversineDistance(current, first.coordinates);
    current = first.coordinates;
  }

  // 경유지 간 이동
  for (let i = 1; i < order.length; i++) {
    const prev = waypoints.find(w => w.id === order[i - 1]);
    const next = waypoints.find(w => w.id === order[i]);
    if (prev && next) {
      totalDist += haversineDistance(prev.coordinates, next.coordinates);
    }
  }

  // 마지막 경유지 → end
  const last = waypoints.find(w => w.id === order[order.length - 1]);
  if (last) {
    totalDist += haversineDistance(last.coordinates, end);
  }

  // 시간 추정 (도심 평균 속도 20km/h = 5.6m/s)
  const URBAN_SPEED_MS = 5.6;
  const duration = Math.round(totalDist / URBAN_SPEED_MS);

  return { distance: Math.round(totalDist), duration };
}

export async function POST(req: NextRequest) {
  try {
    const body: OptimizeRequest = await req.json();

    // Validation
    if (!body.start || !body.end || !body.waypoints || body.waypoints.length === 0) {
      return NextResponse.json<OptimizeResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: '출발지, 도착지, 경유지가 모두 필요합니다.',
          },
        },
        { status: 400 }
      );
    }

    if (body.waypoints.length > 10) {
      return NextResponse.json<OptimizeResponse>(
        {
          success: false,
          error: {
            code: 'TOO_MANY_WAYPOINTS',
            message: '경유지는 최대 10개까지 선택 가능합니다.',
          },
        },
        { status: 400 }
      );
    }

    // 최적 순서 계산
    const optimizedOrder = greedyNearestNeighbor(
      body.start,
      body.end,
      body.waypoints
    );

    // 총 비용 계산
    const { distance, duration } = calculateTotalCost(
      body.start,
      body.end,
      body.waypoints,
      optimizedOrder
    );

    logger.debug(`[OptimizeRoute] Optimized ${body.waypoints.length} waypoints`);
    logger.debug(`[OptimizeRoute] Order: ${optimizedOrder.join(' → ')}`);
    logger.debug(`[OptimizeRoute] Total: +${distance}m, +${duration}s`);

    return NextResponse.json<OptimizeResponse>({
      success: true,
      data: {
        optimizedOrder,
        totalDistance: distance,
        estimatedDuration: duration,
      },
    });
  } catch (error) {
    logger.error('[OptimizeRoute] Error:', error);
    return NextResponse.json<OptimizeResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '경로 최적화 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
