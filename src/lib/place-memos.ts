/**
 * place-memos.ts — 경유지 개인 메모 (localStorage CRUD)
 *
 * 사용자가 특정 장소에 메모를 남겨두고,
 * 다음에 같은 장소를 다시 볼 때 참고할 수 있게 해주는 유틸리티.
 */

const STORAGE_KEY = 'place-memos';

export interface PlaceMemo {
  placeId: string;
  memo: string;
  updatedAt: number;
}

function load(): PlaceMemo[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlaceMemo[]) : [];
  } catch {
    return [];
  }
}

function persist(memos: PlaceMemo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
  } catch {
    // 스토리지 가득 찬 경우 조용히 실패
  }
}

/** 저장된 메모 전체 조회 */
export function getPlaceMemos(): PlaceMemo[] {
  return load();
}

/** 특정 장소의 메모 조회 (없으면 빈 문자열) */
export function getPlaceMemo(placeId: string): string {
  return load().find((m) => m.placeId === placeId)?.memo ?? '';
}

/** 메모 저장 (빈 문자열 전달 시 삭제) */
export function setPlaceMemo(placeId: string, memo: string): void {
  const all = load().filter((m) => m.placeId !== placeId);
  if (memo.trim()) {
    all.push({ placeId, memo: memo.trim(), updatedAt: Date.now() });
  }
  persist(all);
}

/** 특정 장소 메모 삭제 */
export function deletePlaceMemo(placeId: string): void {
  persist(load().filter((m) => m.placeId !== placeId));
}
