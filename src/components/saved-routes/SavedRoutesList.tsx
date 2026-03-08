'use client';

import { useEffect } from 'react';
import { useSavedRouteStore } from '@/store/saved-route-store';
import { SavedRouteCard } from './SavedRouteCard';
import type { SavedRoute } from '@/types/saved-route';

interface SavedRoutesListProps {
  onRouteSelect: (route: SavedRoute) => void;
}

export function SavedRoutesList({ onRouteSelect }: SavedRoutesListProps) {
  const { routes, isLoading, error, fetchRoutes, deleteRoute, updateRouteName } = useSavedRouteStore();

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  if (isLoading && routes.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        <p>오류 발생: {error}</p>
        <button
          onClick={fetchRoutes}
          className="mt-2 text-blue-500 hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <p>저장된 경로가 없습니다</p>
        <p className="text-sm mt-1">검색 후 &quot;경로 저장&quot; 버튼을 눌러보세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {routes.map((route) => (
        <SavedRouteCard
          key={route.id}
          route={route}
          onUse={onRouteSelect}
          onDelete={deleteRoute}
          onRename={updateRouteName}
        />
      ))}
    </div>
  );
}
