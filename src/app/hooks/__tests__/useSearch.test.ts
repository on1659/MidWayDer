/**
 * useSearch.test.ts
 * P1에서 분리된 useSearch 훅 테스트 (후속 작업)
 *
 * NOTE: React hooks 테스트는 jsdom/happy-dom 환경이 필요합니다.
 *       현재 환경(Node)에서는 todo로 표시하고,
 *       추후 테스트 환경 설정 후 구현합니다.
 */
import { describe, it } from 'vitest';

describe('useSearch (후속 작업 — jsdom 환경 필요)', () => {
  it.todo('handleSearch: start/end 미설정 시 search() 미호출');
  it.todo('handleSearch: search() 성공 시 bottomSheetSnap=half 설정');
  it.todo('handleInstantSearch: RecentSearch 데이터로 search() 즉시 호출');
  it.todo('handleExpandRadius: bufferDistance=2000으로 재검색');
  it.todo('handleCategoryChange: 800ms 디바운스 후 search() 호출');
  it.todo('handleCategoryChange: 빠른 연속 호출 시 마지막 값만 반영');
  it.todo('URL params 자동검색: ?start=&end=&category= → search() 호출');
  it.todo('세션 캐시 복원: 마운트 시 restoreResults() 자동 호출');
  it.todo('카테고리 토스트: 검색 완료 후 pendingCategoryToastRef 메시지 표시');
});
