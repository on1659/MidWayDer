import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPlaceMemo, setPlaceMemo, deletePlaceMemo, getPlaceMemos } from '../place-memos';

describe('place-memos', () => {
  let _store: Record<string, string> = {};
  beforeEach(() => {
    _store = {};
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem(key: string) { return _store[key] ?? null; },
      setItem(key: string, value: string) { _store[key] = value; },
      removeItem(key: string) { delete _store[key]; },
      clear() { _store = {}; },
    });
  });

  it('존재하지 않는 장소 메모 → 빈 문자열', () => {
    expect(getPlaceMemo('unknown-id')).toBe('');
  });

  it('setPlaceMemo → getPlaceMemo로 조회 가능', () => {
    setPlaceMemo('place-1', '주차 편해요');
    expect(getPlaceMemo('place-1')).toBe('주차 편해요');
  });

  it('빈 문자열로 setPlaceMemo → 메모 삭제', () => {
    setPlaceMemo('place-2', '테스트 메모');
    setPlaceMemo('place-2', '');
    expect(getPlaceMemo('place-2')).toBe('');
  });

  it('deletePlaceMemo → 메모 제거', () => {
    setPlaceMemo('place-3', '삭제 테스트');
    deletePlaceMemo('place-3');
    expect(getPlaceMemo('place-3')).toBe('');
  });

  it('getPlaceMemos → 전체 메모 배열 반환', () => {
    setPlaceMemo('place-a', '메모 A');
    setPlaceMemo('place-b', '메모 B');
    const memos = getPlaceMemos();
    expect(memos.length).toBeGreaterThanOrEqual(2);
  });
});
