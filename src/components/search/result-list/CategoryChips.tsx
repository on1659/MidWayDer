'use client';

import { getCategoryIcon } from '@/lib/category-icons';
import { POPULAR_CATEGORIES } from './utils';

interface CategoryChipsProps {
  currentCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryChips({ currentCategory, onCategoryChange }: CategoryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
      <button
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold whitespace-nowrap shrink-0 transition-all"
        style={{
          background: 'var(--accent)',
          color: 'white',
          border: '1.5px solid var(--accent)',
        }}
        disabled
        aria-current="true"
      >
        <span>{getCategoryIcon(currentCategory)}</span>
        <span>{currentCategory}</span>
      </button>
      {POPULAR_CATEGORIES.filter((c) => c !== currentCategory).map((cat) => (
        <button
          key={cat}
          onClick={() => onCategoryChange(cat)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            border: '1.5px solid var(--border-soft)',
          }}
        >
          <span>{getCategoryIcon(cat)}</span>
          <span>{cat}</span>
        </button>
      ))}
    </div>
  );
}
