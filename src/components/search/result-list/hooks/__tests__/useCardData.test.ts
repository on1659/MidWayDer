/**
 * useCardData.test.ts
 *
 * NOTE: React hooks 테스트는 jsdom 환경이 필요합니다.
 *       현재 환경(Node)에서는 todo로 표시합니다.
 *       추후 jsdom 환경 설정 후 구현 예정.
 */
import { describe, it, expect } from 'vitest';

// useCardData 훅이 올바르게 export되는지 확인
describe('useCardData — 모듈 export 검증', () => {
  it('useCardData 함수가 export됨', async () => {
    const mod = await import('../useCardData');
    expect(typeof mod.useCardData).toBe('function');
  });
});

describe('useCardData (React hook — jsdom 환경 필요)', () => {
  it.todo('togglePin: 동일 id 두 번 호출 시 토글');
  it.todo('toggleFav: addPlaceFavorite / removePlaceFavorite 호출 확인');
  it.todo('startEditMemo / cancelMemo: editingMemoId 상태 관리');
  it.todo('saveMemo: 메모 저장 후 editingMemoId 초기화');
  it.todo('pinnedIds: 새 results 배열이 들어오면 초기화');
  it.todo('초기화: getPlaceFavorites().placeId로 favPlaces Set 구성');
  it.todo('방문 기록: routeHash 기준으로 visitedDates 필터링');
});
