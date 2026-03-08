/**
 * Search Store - 검색 상태 관리
 *
 * 카테고리, 검색 결과, 로딩 상태 등을 관리하고 검색 API를 호출합니다.
 */

import { create } from 'zustand';
import type { DetourResult } from '@/types/detour';
import type { SearchWaypointsRequest, SearchWaypointsResponse, SearchWaypointsErrorResponse } from '@/types/api';
import { getAPIErrorMessage } from '@/lib/error-messages';
import { getCachedSearch, setCachedSearch } from '@/lib/cache/search-cache';
import { hashRoute } from '@/lib/utils/route-hash';
import type { Coordinates } from '@/types/location';
import { logger } from '@/lib/logger';

// 검색 필터 타입 (v0.61.0)
export interface SearchFilters {
  /** 최대 이탈 거리 (미터) | null = 전체 */
  maxDetourDistance: number | null;
}

interface SearchState {
  /** 선택된 카테고리 */
  category: string;
  /** 검색 결과 */
  results: DetourResult[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 1차 필터링 후보 수 */
  totalCandidates: number;
  /** 사용된 API 호출 수 */
  apiCallsUsed: number;
  /** 검색이 한 번이라도 실행되었는지 */
  hasSearched: boolean;
  /** 캐시에서 로드되었는지 */
  isCached: boolean;
  /** AbortController (검색 취소용) */
  abortController: AbortController | null;

  // === 단일 선택 UX 상태 ===
  /** 선택된 경유지 ID 집합 */
  selectedPlaces: Set<string>;
  /** 다중 선택 허용 여부 */
  allowMultiSelect: boolean;

  // === 검색 진행 상태 (v0.36.0) ===
  /** 검색 단계 (로딩 메시지용) */
  searchPhase: 'idle' | 'route' | 'places' | 'detour';

  // === 검색 필터 (v0.61.0) ===
  /** 활성 필터 */
  filters: SearchFilters;

  // Actions
  /** 카테고리 변경 */
  setCategory: (category: string) => void;
  /** 검유지 검색 */
  search: (start: SearchWaypointsRequest['start'], end: SearchWaypointsRequest['end'], category: string, extraOptions?: { bufferDistance?: number }) => Promise<void>;
  /** 검색 결과 초기화 */
  clearResults: () => void;
  /** 검색 취소 */
  cancelSearch: () => void;
  /** 세션 캐시에서 결과 복원 */
  restoreResults: (results: DetourResult[], totalCandidates: number, apiCallsUsed: number) => void;

  // === 단일 선택 액션 ===
  /** 경유지 선택 토글 */
  togglePlaceSelection: (placeId: string) => void;
  /** 다중 선택 활성화 */
  enableMultiSelect: () => void;
  /** 선택 초기화 */
  resetSelection: () => void;

  // === 필터 액션 (v0.61.0) ===
  /** 필터 설정 */
  setFilters: (filters: Partial<SearchFilters>) => void;
  /** 필터 초기화 */
  resetFilters: () => void;
  /** 필터링된 결과 반환 */
  getFilteredResults: () => DetourResult[];
}

export const useSearchStore = create<SearchState>((set, get) => ({
  category: '다이소',
  results: [],
  isLoading: false,
  error: null,
  totalCandidates: 0,
  apiCallsUsed: 0,
  hasSearched: false,
  isCached: false,
  abortController: null,

  // 단일 선택 UX 초기 상태
  selectedPlaces: new Set(),
  allowMultiSelect: false,

  // 검색 진행 상태 초기값
  searchPhase: 'idle',

  // 필터 초기 상태
  filters: {
    maxDetourDistance: null,
  },

  setCategory: (category) => set({ category }),

  search: async (start, end, category, extraOptions) => {
    // 이전 검색 취소
    const prevController = get().abortController;
    if (prevController) {
      prevController.abort();
    }

    // 새 AbortController 생성
    const controller = new AbortController();
    
    // 검색 시작 시간 (단계별 메시지용)
    const searchStartTime = Date.now();
    
    // 단계별 메시지 업데이트 interval
    const phaseInterval = setInterval(() => {
      const elapsed = Date.now() - searchStartTime;
      if (elapsed < 1000) {
        set({ searchPhase: 'route' });
      } else if (elapsed < 3000) {
        set({ searchPhase: 'places' });
      } else {
        set({ searchPhase: 'detour' });
      }
    }, 500);
    
    set({ 
      isLoading: true, 
      error: null, 
      results: [], 
      totalCandidates: 0, 
      apiCallsUsed: 0, 
      hasSearched: true, 
      isCached: false,
      abortController: controller,
      searchPhase: 'route',
    });

    // 좌표 추출
    const startCoords: Coordinates = ('coordinates' in start && start.coordinates) ? start.coordinates : start as Coordinates;
    const endCoords: Coordinates = ('coordinates' in end && end.coordinates) ? end.coordinates : end as Coordinates;

    // 1. 캐시 확인
    const routeHash = hashRoute(startCoords, endCoords);
    const cached = getCachedSearch(routeHash, category);

    if (cached) {
      logger.debug('✅ Cache HIT:', routeHash, category);
      clearInterval(phaseInterval);
      set({
        results: cached.data.results,
        totalCandidates: cached.data.totalCandidates,
        apiCallsUsed: cached.data.apiCallsUsed,
        isLoading: false,
        hasSearched: true,
        isCached: true,
        abortController: null,
        searchPhase: 'idle',
      });
      return;
    }

    logger.debug('❌ Cache MISS:', routeHash, category);

    try {
      const requestBody: SearchWaypointsRequest = {
        start,
        end,
        category,
        options: {
          maxResults: 20, // 결과 더보기 지원 (UI에서 처음 10개만 표시)
          ...(extraOptions?.bufferDistance ? { bufferDistance: extraOptions.bufferDistance } : {}),
        },
      };

      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: SearchWaypointsResponse | SearchWaypointsErrorResponse = await response.json();

      if (!data.success) {
        const friendlyError = getAPIErrorMessage(response.status, data.error.message);
        clearInterval(phaseInterval);
        set({
          error: friendlyError,
          isLoading: false,
          isCached: false,
          abortController: null,
          searchPhase: 'idle',
        });
        return;
      }

      // 2. 캐시 저장
      setCachedSearch(routeHash, category, data);

      // 3. 상태 업데이트
      clearInterval(phaseInterval);
      set({
        results: data.data.results,
        totalCandidates: data.data.totalCandidates,
        apiCallsUsed: data.data.apiCallsUsed,
        isLoading: false,
        error: null,
        isCached: false,
        abortController: null,
        searchPhase: 'idle',
      });
    } catch (error) {
      let errorMessage: string;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // 취소 시 에러 메시지 표시하지 않음
          clearInterval(phaseInterval);
          set({
            isLoading: false,
            isCached: false,
            abortController: null,
            searchPhase: 'idle',
          });
          return;
        } else if (error.message.includes('fetch')) {
          errorMessage = getAPIErrorMessage();
        } else {
          errorMessage = getAPIErrorMessage(undefined, error.message);
        }
      } else {
        errorMessage = getAPIErrorMessage();
      }
      
      clearInterval(phaseInterval);
      set({
        error: errorMessage,
        isLoading: false,
        isCached: false,
        abortController: null,
        searchPhase: 'idle',
      });
    }
  },

  clearResults: () =>
    set({
      results: [],
      error: null,
      totalCandidates: 0,
      apiCallsUsed: 0,
      hasSearched: false,
      isCached: false,
    }),

  restoreResults: (results, totalCandidates, apiCallsUsed) =>
    set({
      results,
      totalCandidates,
      apiCallsUsed,
      hasSearched: true,
      isCached: true,
      isLoading: false,
      error: null,
      abortController: null,
    }),

  cancelSearch: () => {
    const controller = get().abortController;
    if (controller) {
      controller.abort();
      set({
        abortController: null,
        isLoading: false,
      });
    }
  },

  // === 단일 선택 액션 ===
  togglePlaceSelection: (placeId) => {
    const { selectedPlaces, allowMultiSelect } = get();
    const newSelected = new Set(selectedPlaces);

    if (newSelected.has(placeId)) {
      // 이미 선택된 경우 → 선택 해제
      newSelected.delete(placeId);
    } else {
      // 선택되지 않은 경우
      if (newSelected.size === 0) {
        // 첫 번째 선택은 자유롭게
        newSelected.add(placeId);
      } else if (allowMultiSelect) {
        // 다중 선택 허용 시 추가
        newSelected.add(placeId);
      }
      // else: 다중 선택 비허용 시 아무 동작 안 함
    }

    set({ selectedPlaces: newSelected });
  },

  enableMultiSelect: () => set({ allowMultiSelect: true }),

  resetSelection: () =>
    set({
      selectedPlaces: new Set(),
      allowMultiSelect: false,
    }),

  // === 필터 액션 (v0.61.0) ===
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetFilters: () =>
    set({
      filters: {
        maxDetourDistance: null,
      },
    }),

  getFilteredResults: () => {
    const { results, filters } = get();

    if (!filters.maxDetourDistance) {
      return results;
    }

    return results.filter(
      (result) => result.detourCost.distance <= (filters.maxDetourDistance ?? Infinity)
    );
  },
}));
