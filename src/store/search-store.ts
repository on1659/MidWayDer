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

  // Actions
  /** 카테고리 변경 */
  setCategory: (category: string) => void;
  /** 검유지 검색 */
  search: (start: SearchWaypointsRequest['start'], end: SearchWaypointsRequest['end'], category: string, extraOptions?: { bufferDistance?: number }) => Promise<void>;
  /** 검색 결과 초기화 */
  clearResults: () => void;
  /** 검색 취소 */
  cancelSearch: () => void;
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

  setCategory: (category) => set({ category }),

  search: async (start, end, category, extraOptions) => {
    // 이전 검색 취소
    const prevController = get().abortController;
    if (prevController) {
      prevController.abort();
    }

    // 새 AbortController 생성
    const controller = new AbortController();
    set({ 
      isLoading: true, 
      error: null, 
      results: [], 
      totalCandidates: 0, 
      apiCallsUsed: 0, 
      hasSearched: true, 
      isCached: false,
      abortController: controller,
    });

    // 좌표 추출
    const startCoords: Coordinates = ('coordinates' in start && start.coordinates) ? start.coordinates : start as Coordinates;
    const endCoords: Coordinates = ('coordinates' in end && end.coordinates) ? end.coordinates : end as Coordinates;

    // 1. 캐시 확인
    const routeHash = hashRoute(startCoords, endCoords);
    const cached = getCachedSearch(routeHash, category);

    if (cached) {
      console.log('✅ Cache HIT:', routeHash, category);
      set({
        results: cached.data.results,
        totalCandidates: cached.data.totalCandidates,
        apiCallsUsed: cached.data.apiCallsUsed,
        isLoading: false,
        hasSearched: true,
        isCached: true,
        abortController: null,
      });
      return;
    }

    console.log('❌ Cache MISS:', routeHash, category);

    try {
      const requestBody: SearchWaypointsRequest = {
        start,
        end,
        category,
        options: {
          maxResults: 10,
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
        set({
          error: friendlyError,
          isLoading: false,
          isCached: false,
          abortController: null,
        });
        return;
      }

      // 2. 캐시 저장
      setCachedSearch(routeHash, category, data);

      // 3. 상태 업데이트
      set({
        results: data.data.results,
        totalCandidates: data.data.totalCandidates,
        apiCallsUsed: data.data.apiCallsUsed,
        isLoading: false,
        error: null,
        isCached: false,
        abortController: null,
      });
    } catch (error) {
      let errorMessage: string;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // 취소 시 에러 메시지 표시하지 않음
          set({
            isLoading: false,
            isCached: false,
            abortController: null,
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
      
      set({
        error: errorMessage,
        isLoading: false,
        isCached: false,
        abortController: null,
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
}));
