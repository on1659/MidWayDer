/**
 * FavoritesList - 즐겨찾기 경로 리스트
 */

'use client';

import { useState } from 'react';
import { Star, X, Edit2, Check } from 'lucide-react';
import { getFavorites, removeFavorite, updateFavorite, type Favorite } from '@/lib/favorites';

interface FavoritesListProps {
  onSelect: (favorite: Favorite) => void;
}

export default function FavoritesList({ onSelect }: FavoritesListProps) {
  const [favorites, setFavorites] = useState(getFavorites());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleRemove = (id: string) => {
    removeFavorite(id);
    setFavorites(getFavorites());
  };

  const handleStartEdit = (fav: Favorite) => {
    setEditingId(fav.id);
    setEditName(fav.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateFavorite(id, { name: editName.trim() });
      setFavorites(getFavorites());
    }
    setEditingId(null);
    setEditName('');
  };

  if (favorites.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>즐겨찾기</p>
      </div>
      <div className="space-y-2">
        {favorites.map((fav) => (
          <div
            key={fav.id}
            className="group flex items-center gap-3 p-3 rounded-xl transition-colors"
            style={{ background: 'var(--bg-surface-muted)' }}
          >
            {editingId === fav.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(fav.id)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 focus:outline-none focus:border-blue-400"
                  style={{ color: 'var(--text-strong)' }}
                  autoFocus
                />
                <button
                  onClick={() => handleSaveEdit(fav.id)}
                  className="shrink-0 p-2 rounded-full transition-colors"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <Check className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => onSelect(fav)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-strong)' }}>
                      {fav.name}
                    </p>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {fav.startAddress} → {fav.endAddress}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-disabled)' }}>{fav.category}</p>
                </button>
                <button
                  onClick={() => handleStartEdit(fav)}
                  className="shrink-0 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                >
                  <Edit2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
                <button
                  onClick={() => handleRemove(fav.id)}
                  className="shrink-0 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
