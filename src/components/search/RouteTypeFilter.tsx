/**
 * RouteTypeFilter - 경로 타입 필터 (최단거리/최단시간/전체)
 */

'use client';

interface RouteTypeFilterProps {
  selected: 'all' | 'shortest' | 'fastest';
  onChange: (type: 'all' | 'shortest' | 'fastest') => void;
  counts: {
    all: number;
    shortest: number;
    fastest: number;
  };
}

export default function RouteTypeFilter({ selected, onChange, counts }: RouteTypeFilterProps) {
  const options = [
    { value: 'all' as const, label: '전체', emoji: '📍', count: counts.all },
    { value: 'shortest' as const, label: '최단거리', emoji: '📏', count: counts.shortest },
    { value: 'fastest' as const, label: '최단시간', emoji: '⚡', count: counts.fastest },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {options.map((option) => {
        const isSelected = selected === option.value;
        const isDisabled = option.count === 0;
        
        return (
          <button
            key={option.value}
            onClick={() => !isDisabled && onChange(option.value)}
            disabled={isDisabled}
            className={[
              'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap',
              'transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
              isSelected ? 'ring-2' : '',
            ].join(' ')}
            style={{
              background: isSelected ? 'var(--accent)' : 'var(--blue-150)',
              color: isSelected ? 'white' : 'var(--blue-700)',
              borderColor: isSelected ? 'var(--accent)' : 'transparent',
            }}
          >
            <span>{option.emoji}</span>
            <span>{option.label}</span>
            {option.count > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--blue-200)',
                  color: isSelected ? 'white' : 'var(--blue-700)',
                }}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
