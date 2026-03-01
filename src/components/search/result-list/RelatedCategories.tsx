'use client';

import { getCategoryIcon } from '@/lib/category-icons';
import { getRelatedCategories } from './utils';

interface RelatedCategoriesProps {
  currentCategory: string;
  onCategoryChange: (category: string) => void;
}

export function RelatedCategories({ currentCategory, onCategoryChange }: RelatedCategoriesProps) {
  const relatedCats = getRelatedCategories(currentCategory).slice(0, 5);
  if (relatedCats.length === 0) return null;

  return (
    <div className="pt-1 space-y-2">
      <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
        👀 이 근처에도 있어요
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {relatedCats.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1.5px solid var(--border-soft)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <span>{getCategoryIcon(cat)}</span>
            <span>{cat}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
