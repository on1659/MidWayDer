/**
 * Search Store - 검색 상태 관리
 *
 * 카테고리, 검색 결과, 로딩 상태 등을 관리하고 검색 API를 호출합니다.
 */

import { create } from 'zustand';
import type { DetourResult } from '@/types/detour';
import type { SearchWaypointsRequest, SearchWaypointsResponse, SearchWaypointsErrorResponse } from '@/types/api';

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

  // Actions
  /** 카테고리 변경 */
  setCategory: (category: string) => void;
  /** 검유지 검색 */
  search: (start: SearchWaypointsRequest['start'], end: SearchWaypointsRequest['end'], category: string) => Promise<void>;
  /** 검색 결과 초기화 */
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  category: '다이소',
  results: [],
  isLoading: false,
  error: null,
  totalCandidates: 0,
  apiCallsUsed: 0,

  setCategory: (category) => set({ category }),

  search: async (start, end, category) => {
    set({ isLoading: true, error: null, results: [], totalCandidates: 0, apiCallsUsed: 0 });

    try {
      const requestBody: SearchWaypointsRequest = {
        start,
        end,
        category,
        options: {
          maxResults: 10,
        },
      };

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: SearchWaypointsResponse | SearchWaypointsErrorResponse = await response.json();

      if (!data.success) {
        set({
          error: data.error.message,
          isLoading: false,
        });
        return;
      }

      set({
        results: data.data.results,
        totalCandidates: data.data.totalCandidates,
        apiCallsUsed: data.data.apiCallsUsed,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.';
      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  clearResults: () =>
    set({
      results: [],
      error: null,
      totalCandidates: 0,
      apiCallsUsed: 0,
    }),
}));
