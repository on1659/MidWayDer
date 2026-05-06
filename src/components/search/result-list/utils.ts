'use client';

import React from 'react';
import type { DetourResult } from '@/types/detour';

// haversineDistanceKm은 @/lib/utils에서 통합 관리
export { haversineDistanceKm } from '@/lib/utils';

/** 카테고리별 기본 체류 시간 (분) */
export function getDefaultDwellMinutes(category: string): number {
  const map: Record<string, number> = {
    '편의점': 5, 'CU': 5, 'GS25': 5, '세븐일레븐': 5, '이마트24': 5,
    '스타벅스': 20, '이디야': 15, '메가커피': 15, '빽다방': 15, '카페': 15,
    '다이소': 20, '올리브영': 15,
    '맥도날드': 20, '버거킹': 20, '롯데리아': 20, '맘스터치': 20,
    '주유소': 10, '세차장': 15,
    '은행': 15, '우체국': 10,
    '약국': 5, '병원': 20,
    '주차장': 5,
  };
  for (const [key, val] of Object.entries(map)) {
    if (category === key || category.includes(key) || key.includes(category)) return val;
  }
  return 10;
}

/** 예상 도착 시간 계산 (baseMs: 출발 기준 밀리초, dwellMin: 경유지 체류 시간(분)) */
export function getETAText(result: DetourResult, baseMs?: number, dwellMin?: number): { waypoint: string; destination: string } | null {
  const toSec = result.routes?.toWaypoint?.duration;
  const fromSec = result.routes?.fromWaypoint?.duration;
  if (!toSec || !fromSec) return null;
  const now = baseMs ?? Date.now();
  const dwellMs = (dwellMin ?? 0) * 60 * 1000;
  const fmt = (ms: number) => {
    const d = new Date(ms);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return {
    waypoint: fmt(now + toSec * 1000),
    destination: fmt(now + toSec * 1000 + dwellMs + fromSec * 1000),
  };
}

/** 방문 날짜 상대 라벨 (visitedAt ms → "오늘", "어제", "N일 전" 등) */
export function getVisitDateLabel(ms: number): string {
  const diffMs = Date.now() - ms;
  const diffMin = Math.floor(diffMs / 60000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 60) return '방금';
  if (diffDay === 0) return '오늘';
  if (diffDay === 1) return '어제';
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`;
  return `${Math.floor(diffDay / 30)}달 전`;
}

/** 검색 시각 상대 표시 (searchedAt ms → "방금 검색", "N분 전" 등) */
export function getRelativeSearchTime(ms: number): string {
  const diff = Math.floor((Date.now() - ms) / 60000);
  if (diff < 1) return '방금 검색';
  if (diff < 60) return `${diff}분 전`;
  return `${Math.floor(diff / 60)}시간 전`;
}

/** 베스트 픽 이유 한 줄 (1등 카드용) */
export function getBestPickReason(result: DetourResult): string {
  const detourMin = Math.round(result.detourCost.duration / 60);
  if (result.detourCost.distance <= 150) return '경로에서 거의 이탈 없음 — 그냥 지나가는 길!';
  if (detourMin <= 2) return `+${detourMin}분으로 들를 수 있어요`;
  if (result.proximityScore >= 75) return '경로 바로 옆 — 접근성 최고';
  return '이탈 비용 + 접근성 종합 1위';
}

/** nameFilter 검색어 하이라이팅 */
export function highlightText(text: string, query?: string): React.ReactNode {
  if (!query?.trim()) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return React.createElement(
    React.Fragment,
    null,
    text.slice(0, idx),
    React.createElement(
      'mark',
      { style: { background: '#fef08a', color: 'inherit', borderRadius: '2px', padding: '0 1px' } },
      text.slice(idx, idx + q.length)
    ),
    text.slice(idx + q.length)
  );
}

/** 경로상 위치를 5단계 자연어 라벨로 변환 */
export function getRoutePositionLabel(result: DetourResult): string | null {
  const toWaypointDist = result.routes.toWaypoint.distance;
  const originalDist = result.routes.original.distance;
  if (!originalDist || originalDist === 0) return null;
  const progress = toWaypointDist / originalDist;
  if (progress < 0.2) return '출발 직후';
  if (progress < 0.4) return '경로 초반';
  if (progress < 0.6) return '경로 중간';
  if (progress < 0.8) return '경로 후반';
  return '도착 직전';
}

/** 경로 구간 라벨 → 이모지 */
export function getSegmentEmoji(label: string): string {
  switch (label) {
    case '출발 직후': return '🚦';
    case '경로 초반': return '🛣️';
    case '경로 중간': return '📍';
    case '경로 후반': return '🏁';
    case '도착 직전': return '🎯';
    default: return '📌';
  }
}

/** 구간별 그룹핑 렌더 아이템 유니온 타입 */
export type RenderItem =
  | { type: 'header'; label: string; count: number }
  | { type: 'card'; result: DetourResult; index: number };

/** 빠른 카테고리 전환 칩에 표시할 인기 카테고리 목록 */
export const POPULAR_CATEGORIES = [
  '편의점', 'CU', 'GS25', '세븐일레븐', '스타벅스', '이디야', '메가커피', '카페',
  '다이소', '올리브영', '약국', '맥도날드', '버거킹', '롯데리아', '주유소', '은행', '우체국',
];

/** 현재 카테고리와 연관된 인접 카테고리 목록 */
export const RELATED_CATEGORIES: Record<string, string[]> = {
  '스타벅스': ['이디야', '빽다방', '메가커피', 'CU', 'GS25'],
  '이디야': ['스타벅스', '메가커피', '빽다방', 'CU', '편의점'],
  '카페': ['편의점', 'CU', 'GS25', '베이커리', '스타벅스'],
  '다이소': ['올리브영', 'CU', 'GS25', '약국', '편의점'],
  'CU': ['GS25', '세븐일레븐', '스타벅스', '이디야', '약국'],
  'GS25': ['CU', '세븐일레븐', '스타벅스', '이디야', '약국'],
  '편의점': ['CU', 'GS25', '세븐일레븐', '스타벅스', '약국'],
  '세븐일레븐': ['CU', 'GS25', '이마트24', '스타벅스', '약국'],
  '이마트24': ['CU', 'GS25', '세븐일레븐', '스타벅스', '약국'],
  '맥도날드': ['버거킹', '롯데리아', '맘스터치', '스타벅스', 'CU'],
  '버거킹': ['맥도날드', '롯데리아', '맘스터치', '스타벅스', 'CU'],
  '롯데리아': ['맥도날드', '버거킹', '맘스터치', 'CU', '편의점'],
  '주유소': ['편의점', 'CU', 'GS25', '세차장', '맥도날드'],
  '올리브영': ['다이소', '편의점', 'CU', '약국', '스타벅스'],
  '약국': ['편의점', 'CU', 'GS25', '병원', '올리브영'],
  '은행': ['편의점', 'CU', '우체국', '약국', '스타벅스'],
  '우체국': ['편의점', 'CU', '은행', '약국', '스타벅스'],
  '주차장': ['편의점', 'CU', 'GS25', '맥도날드', '스타벅스'],
};

export function getRelatedCategories(currentCategory: string): string[] {
  if (RELATED_CATEGORIES[currentCategory]) {
    return RELATED_CATEGORIES[currentCategory];
  }
  for (const [key, cats] of Object.entries(RELATED_CATEGORIES)) {
    if (currentCategory.includes(key) || key.includes(currentCategory)) {
      return cats.filter((c) => c !== currentCategory);
    }
  }
  return ['편의점', 'CU', 'GS25', '스타벅스', '약국', '맥도날드'].filter(
    (c) => c !== currentCategory
  );
}
