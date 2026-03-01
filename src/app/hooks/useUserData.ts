'use client';

import { useState, useEffect } from 'react';
import { getRecentSearches, type RecentSearch } from '@/lib/recent-searches';
import { getFavorites, type Favorite } from '@/lib/favorites';

interface UseUserDataReturn {
  recentSearches: RecentSearch[];
  setRecentSearches: React.Dispatch<React.SetStateAction<RecentSearch[]>>;
  favorites: Favorite[];
  setFavorites: React.Dispatch<React.SetStateAction<Favorite[]>>;
}

export function useUserData(): UseUserDataReturn {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>(getFavorites());

  // 최근 검색 로드
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  return { recentSearches, setRecentSearches, favorites, setFavorites };
}
