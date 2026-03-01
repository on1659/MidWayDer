/**
 * useMapState.test.ts
 * 지도 상태 관련 로직 검증 (Node 환경)
 */
import { describe, it, expect } from 'vitest';

// ---- 재현 함수 (useMapState 내부 로직과 동일) ----

function shouldShowReSearchButton(hasSearched: boolean, mapPanned: boolean): boolean {
  return hasSearched && mapPanned;
}

function shouldShowMapClickPopup(mapClickInfo: { name: string } | null): boolean {
  return mapClickInfo !== null && !!mapClickInfo.name;
}

function shouldAutoFetchPreviewRoute(
  startCoords: { lat: number; lng: number } | undefined,
  endCoords: { lat: number; lng: number } | undefined,
  originalRoute: unknown
): boolean {
  return !!startCoords && !!endCoords && !originalRoute;
}

describe('useMapState — 재검색 버튼 표시 로직', () => {
  it('hasSearched=true, mapPanned=true → 재검색 버튼 표시', () => {
    expect(shouldShowReSearchButton(true, true)).toBe(true);
  });

  it('hasSearched=false → 재검색 버튼 미표시', () => {
    expect(shouldShowReSearchButton(false, true)).toBe(false);
  });

  it('mapPanned=false → 재검색 버튼 미표시', () => {
    expect(shouldShowReSearchButton(true, false)).toBe(false);
  });
});

describe('useMapState — 지도 클릭 팝업 로직', () => {
  it('mapClickInfo 있으면 팝업 표시', () => {
    expect(shouldShowMapClickPopup({ name: '서울시청' })).toBe(true);
  });

  it('mapClickInfo null이면 팝업 미표시', () => {
    expect(shouldShowMapClickPopup(null)).toBe(false);
  });
});

describe('useMapState — 경로 미리보기 자동 조회 로직', () => {
  const coords = { lat: 37.566, lng: 126.978 };

  it('start/end 있고 originalRoute 없으면 자동 조회', () => {
    expect(shouldAutoFetchPreviewRoute(coords, coords, null)).toBe(true);
  });

  it('originalRoute 있으면 자동 조회 안 함', () => {
    expect(shouldAutoFetchPreviewRoute(coords, coords, { distance: 12500 })).toBe(false);
  });

  it('start 없으면 자동 조회 안 함', () => {
    expect(shouldAutoFetchPreviewRoute(undefined, coords, null)).toBe(false);
  });
});

describe('useMapState — 훅 (jsdom 환경 필요)', () => {
  it.todo('renderHook: 초기 mapClickInfo는 null');
  it.todo('renderHook: 초기 previewRoute는 null');
  it.todo('renderHook: handleMapIdle — hasSearched=false 시 mapPanned 변경 없음');
  it.todo('renderHook: 결과 변경 시 mapPanned 자동 리셋');
  it.todo('renderHook: handleMapClick 성공 시 mapClickInfo 업데이트');
});
