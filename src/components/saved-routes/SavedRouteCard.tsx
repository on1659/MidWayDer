'use client';

import { useState } from 'react';
import { MapPin, Trash2, Edit2 } from 'lucide-react';
import type { SavedRoute } from '@/types/saved-route';
import { RouteNameDialog } from './RouteNameDialog';

interface SavedRouteCardProps {
  route: SavedRoute;
  onUse: (route: SavedRoute) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, input: { name: string }) => Promise<boolean>;
}

export function SavedRouteCard({ route, onUse, onDelete, onRename }: SavedRouteCardProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{route.name}</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setShowRenameDialog(true)}
              className="p-1.5 text-gray-500 hover:text-blue-500 rounded"
              aria-label="이름 변경"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => onDelete(route.id)}
              className="p-1.5 text-gray-500 hover:text-red-500 rounded"
              aria-label="삭제"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-blue-500 flex-shrink-0" />
            <span className="truncate">{route.startAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-red-500 flex-shrink-0" />
            <span className="truncate">{route.endAddress}</span>
          </div>
        </div>

        {route.category && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            카테고리: {route.category}
          </div>
        )}

        <button
          onClick={() => onUse(route)}
          className="w-full px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
        >
          사용하기
        </button>
      </div>

      <RouteNameDialog
        isOpen={showRenameDialog}
        initialName={route.name}
        onClose={() => setShowRenameDialog(false)}
        onSave={(name) => {
          onRename(route.id, { name });
          setShowRenameDialog(false);
        }}
      />
    </>
  );
}
