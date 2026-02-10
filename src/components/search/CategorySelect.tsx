/**
 * CategorySelect - 키즈 프렌들리 카테고리 선택
 *
 * 큰 이모지 + 큰 터치 타겟, 7세도 쓸 수 있는 UI
 */

'use client';

interface CategorySelectProps {
  selected: string;
  onChange: (category: string) => void;
}

const categories = [
  { name: '카페', emoji: '☕', query: '카페' },
  { name: '편의점', emoji: '🏪', query: 'CU' },
  { name: '다이소', emoji: '🛒', query: '다이소' },
  { name: '올리브영', emoji: '💄', query: '올리브영' },
  { name: '스타벅스', emoji: '⭐', query: '스타벅스' },
  { name: '이디야', emoji: '🏠', query: '이디야' },
];

export default function CategorySelect({ selected, onChange }: CategorySelectProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {categories.map(({ name, emoji, query }) => {
        const isSelected = selected === query;
        return (
          <button
            key={query}
            onClick={() => onChange(query)}
            className={`
              flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl
              transition-all active:scale-95 min-h-[80px]
              ${isSelected
                ? 'bg-blue-100 ring-3 ring-blue-400 shadow-lg shadow-blue-200/50'
                : 'bg-white shadow-sm hover:shadow-md hover:bg-gray-50'
              }
            `}
          >
            <span className="text-3xl">{emoji}</span>
            <span className={`text-sm font-bold ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
              {name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
