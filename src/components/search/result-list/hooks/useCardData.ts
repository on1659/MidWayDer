'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPlaceFavorites, addPlaceFavorite, removePlaceFavorite } from '@/lib/place-favorites';
import { getPlaceMemos, setPlaceMemo } from '@/lib/place-memos';
import { getVisitHistory, recordVisit } from '@/lib/visit-tracking';
import type { DetourResult } from '@/types/detour';

export interface UseCardDataReturn {
  pinnedIds: Set<string>;
  favPlaces: Set<string>;
  visitedDates: Map<string, number>;
  memoMap: Map<string, string>;
  editingMemoId: string | null;
  editingMemoText: string;
  togglePin: (id: string) => void;
  toggleFav: (id: string, result: DetourResult) => void;
  toggleVisit: (id: string, result: DetourResult) => void;
  startEditMemo: (id: string) => void;
  saveMemo: (id: string, text: string) => void;
  setEditingMemoText: (text: string) => void;
  cancelMemo: () => void;
}

export function useCardData(results: DetourResult[], routeHash: string): UseCardDataReturn {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [favPlaces, setFavPlaces] = useState<Set<string>>(new Set());
  const [visitedDates, setVisitedDates] = useState<Map<string, number>>(new Map());
  const [memoMap, setMemoMap] = useState<Map<string, string>>(new Map());
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingMemoText, setEditingMemoText] = useState('');

  // 즐겨찾기 초기화 (1회)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavPlaces(new Set(getPlaceFavorites().map((p) => p.placeId)));
  }, []);

  // 메모 초기화 (results 변경 시)
  useEffect(() => {
    if (results.length === 0) return;
    const memos = getPlaceMemos();
    const map = new Map<string, string>();
    for (const m of memos) map.set(m.placeId, m.memo);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMemoMap(map);
  }, [results]);

  // 방문 기록 초기화 (routeHash + results 변경 시)
  useEffect(() => {
    if (!routeHash || results.length === 0) return;
    const history = getVisitHistory();
    const dateMap = new Map<string, number>();
    for (const visit of history) {
      if (visit.routeHash === routeHash && !dateMap.has(visit.placeId)) {
        dateMap.set(visit.placeId, visit.visitedAt);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitedDates(dateMap);
  }, [results, routeHash]);

  // 새 결과 시 pinnedIds 초기화
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinnedIds(new Set());
  }, [results]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleFav = useCallback((id: string, result: DetourResult) => {
    setFavPlaces((prev) => {
      if (prev.has(id)) {
        removePlaceFavorite(id);
        const next = new Set(prev);
        next.delete(id);
        return next;
      } else {
        addPlaceFavorite({
          placeId: id,
          placeName: result.place.name,
          category: result.place.category,
          address: result.place.roadAddress || result.place.address || '',
          lat: result.place.coordinates.lat,
          lng: result.place.coordinates.lng,
        });
        return new Set([...prev, id]);
      }
    });
  }, []);

  const toggleVisit = useCallback((id: string, result: DetourResult) => {
    setVisitedDates((prev) => {
      if (prev.has(id)) {
        const next = new Map(prev);
        next.delete(id);
        return next;
      } else {
        if (routeHash) recordVisit(id, result.place.name, result.place.category, routeHash);
        return new Map([...prev, [id, Date.now()]]);
      }
    });
  }, [routeHash]);

  const startEditMemo = useCallback((id: string) => {
    setEditingMemoId(id);
    setEditingMemoText((memoMap.get(id)) ?? '');
  }, [memoMap]);

  const saveMemo = useCallback((id: string, text: string) => {
    setPlaceMemo(id, text);
    setMemoMap((prev) => {
      const m = new Map(prev);
      if (text.trim()) m.set(id, text.trim());
      else m.delete(id);
      return m;
    });
    setEditingMemoId(null);
    setEditingMemoText('');
  }, []);

  const cancelMemo = useCallback(() => {
    setEditingMemoId(null);
    setEditingMemoText('');
  }, []);

  return {
    pinnedIds, favPlaces, visitedDates, memoMap,
    editingMemoId, editingMemoText,
    togglePin, toggleFav, toggleVisit,
    startEditMemo, saveMemo, setEditingMemoText, cancelMemo,
  };
}
