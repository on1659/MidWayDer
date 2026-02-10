/**
 * CategorySelect - 가로 스크롤 파스텔 칩
 */

'use client';

interface CategorySelectProps {
  selected: string;
  onChange: (category: string) => void;
}

const categories = [
  { name: '카페', emoji: '☕', query: '카페', bg: '#E8F0FE', activeBg: '#6C9CFF' },
  { name: '편의점', emoji: '🏪', query: 'CU', bg: '#FFF4E5', activeBg: '#FFB366' },
  { name: '다이소', emoji: '🛒', query: '다이소', bg: '#E6F7ED', activeBg: '#7ED6A8' },
  { name: '올리브영', emoji: '💄', query: '올리브영', bg: '#FFF0F3', activeBg: '#FF8FA3' },
  { name: '스타벅스', emoji: '⭐', query: '스타벅스', bg: '#E8F0FE', activeBg: '#6C9CFF' },
  { name: '이디야', emoji: '🏠', query: '이디야', bg: '#F0EBFF', activeBg: '#A78BFA' },
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
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full whitespace-nowrap
              transition-all active:scale-95 shrink-0 text-sm font-medium"
            style={{
              background: isSelected ? activeBg : bg,
              color: isSelected ? '#FFFFFF' : '#2D3748',
              boxShadow: isSelected ? `0 2px 8px ${activeBg}40` : 'none',
            }}
          >
            <span>{emoji}</span>
            <span>{name}</span>
          </button>
        );
      })}
    </div>
  );
}
