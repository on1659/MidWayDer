/**
 * Session Results Cache — 마지막 검색 결과를 sessionStorage에 저장/복원
 * TTL: 30분 (새 탭이나 브라우저 종료 시 자동 만료)
 */

import type { DetourResult } from '@/types/detour';

const SESSION_KEY = 'midwayder_last_search';
const TTL_MS = 30 * 60 * 1000; // 30분

export interface SessionResultsCache {
  results: DetourResult[];
  startAddress: string;
  startCoords?: { lat: number; lng: number };
  endAddress: string;
  endCoords?: { lat: number; lng: number };
  category: string;
  totalCandidates: number;
  apiCallsUsed: number;
  savedAt: number;
}

export function saveSessionResults(data: SessionResultsCache): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // 저장 실패 무시 (private 모드, 할당량 초과 등)
  }
}

export function loadSessionResults(): SessionResultsCache | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data: SessionResultsCache = JSON.parse(raw);
    if (Date.now() - data.savedAt > TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSessionResults(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // 무시
  }
}
