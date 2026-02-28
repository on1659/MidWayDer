/**
 * SortFilter - 검색 결과 정렬 옵션
 */

'use client';

interface SortFilterProps {
  selected: 'score' | 'distance' | 'duration' | 'closing';
  onChange: (sort: 'score' | 'distance' | 'duration' | 'closing') => void;
}

export default function SortFilter({ selected, onChange }: SortFilterProps) {
  const options = [
    { value: 'score', label: '추천순', emoji: '⭐' },
    { value: 'distance', label: '거리순', emoji: '📍' },
    { value: 'duration', label: '시간순', emoji: '⏱️' },
    { value: 'closing', label: '마감임박', emoji: '⏰' },
  ] as const;

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
          style={{
            background: selected === opt.value ? 'var(--accent)' : 'var(--blue-150)',
            color: selected === opt.value ? 'white' : 'var(--blue-700)',
          }}
        >
          <span>{opt.emoji}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
