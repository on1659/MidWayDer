/**
 * CategorySelect - 가로 스크롤 파스텔 칩
 */

'use client';

interface CategorySelectProps {
  selected: string;
  onChange: (category: string) => void;
}

const categories = [
  { name: '카페', emoji: '☕', query: '카페', bg: 'var(--blue-100)', activeBg: 'var(--accent)' },
  { name: '편의점', emoji: '🏪', query: 'CU', bg: 'var(--orange-100)', activeBg: 'var(--orange-500)' },
  { name: '다이소', emoji: '🛒', query: '다이소', bg: 'var(--green-100)', activeBg: 'var(--green-600)' },
  { name: '올리브영', emoji: '💄', query: '올리브영', bg: 'var(--pink-100)', activeBg: 'var(--pink-500)' },
  { name: '스타벅스', emoji: '⭐', query: '스타벅스', bg: 'var(--blue-100)', activeBg: 'var(--accent)' },
  { name: '이디야', emoji: '🏠', query: '이디야', bg: 'var(--purple-100)', activeBg: 'var(--blue-600)' },
];

export default function CategorySelect({ selected, onChange }: CategorySelectProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {categories.map(({ name, emoji, query, bg, activeBg }) => {
        const isSelected = selected === query;
        return (
          <button
            key={query}
            onClick={() => onChange(query)}
            className="flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap
              transition-all active:scale-95 shrink-0 text-base font-semibold"
            style={{
              background: isSelected ? activeBg : bg,
              color: isSelected ? 'var(--bg-surface)' : 'var(--text-strong)',
              boxShadow: isSelected ? `0 2px 8px ${activeBg}40` : 'none',
            }}
          >
            <span className="text-lg">{emoji}</span>
            <span>{name}</span>
          </button>
        );
      })}
    </div>
  );
}
