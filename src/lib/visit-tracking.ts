/**
 * Visit Tracking - 방문 체크 & 학습 시스템
 * 사용자가 실제로 방문한 경유지 기록 → 개인화 점수 향상
 */

import { logger } from '@/lib/logger';

export interface VisitRecord {
  placeId: string;
  placeName: string;
  category: string;
  routeHash: string; // 어떤 경로에서 방문했는지
  visitedAt: number;
}

const STORAGE_KEY = 'midwayder_visit_history';
const MAX_VISITS = 100; // 최근 100개 방문 기록 유지

/**
 * 방문 기록 조회
 */
export function getVisitHistory(): VisitRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 방문 기록 추가
 */
export function recordVisit(
  placeId: string,
  placeName: string,
  category: string,
  routeHash: string
): void {
  const visits = getVisitHistory();
  const newVisit: VisitRecord = {
    placeId,
    placeName,
    category,
    routeHash,
    visitedAt: Date.now()
  };

  // 중복 방지: 같은 placeId + 같은 routeHash + 최근 1시간 이내 방문은 무시
  const recentDuplicate = visits.find(
    v => v.placeId === placeId &&
         v.routeHash === routeHash &&
         Date.now() - v.visitedAt < 60 * 60 * 1000
  );
  if (recentDuplicate) {
    logger.debug('[VisitTracking] Skip duplicate visit (within 1 hour)');
    return;
  }

  const updated = [newVisit, ...visits].slice(0, MAX_VISITS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    logger.debug('[VisitTracking] Recorded visit:', newVisit);
  } catch (e) {
    console.error('[VisitTracking] Failed to record visit:', e);
  }
}

/**
 * 특정 경유지 방문 횟수 (경로별)
 */
export function getVisitCount(placeId: string, routeHash: string): number {
  const visits = getVisitHistory();
  return visits.filter(v => v.placeId === placeId && v.routeHash === routeHash).length;
}

/**
 * 특정 경유지 전체 방문 횟수 (모든 경로 포함)
 */
export function getTotalVisitCount(placeId: string): number {
  const visits = getVisitHistory();
  return visits.filter(v => v.placeId === placeId).length;
}

/**
 * 특정 카테고리 방문 횟수
 */
export function getCategoryVisitCount(category: string): number {
  const visits = getVisitHistory();
  return visits.filter(v => v.category === category).length;
}

/**
 * 최근 방문한 경유지 (최대 10개)
 */
export function getRecentVisits(limit: number = 10): VisitRecord[] {
  return getVisitHistory().slice(0, limit);
}

/**
 * 방문 기록 초기화
 */
export function clearVisitHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    logger.debug('[VisitTracking] Cleared all visit history');
  } catch (e) {
    console.error('[VisitTracking] Failed to clear visit history:', e);
  }
}

/**
 * 방문 여부 확인
 */
export function hasVisited(placeId: string, routeHash: string): boolean {
  return getVisitCount(placeId, routeHash) > 0;
}
