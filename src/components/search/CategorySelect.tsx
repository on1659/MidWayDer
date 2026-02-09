/**
 * CategorySelect - 카테고리 선택 (리디자인)
 *
 * 가로 스크롤 칩 스타일, 모바일 최적화
 */

'use client';

import { Store, Coffee, ShoppingBag } from 'lucide-react';

interface CategorySelectProps {
  selected: string;
  onChange: (category: string) => void;
}

const categories = [
  { name: '다이소', icon: Store },
  { name: '스타벅스', icon: Coffee },
  { name: '이디야', icon: Coffee },
  { name: 'CU', icon: ShoppingBag },
  { name: 'GS25', icon: ShoppingBag },
  { name: '올리브영', icon: Store },
];

export default function CategorySelect({ selected, onChange }: CategorySelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">카테고리</label>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {categories.map(({ name, icon: Icon }) => {
          const isSelected = selected === name;
          return (
            <button
              key={name}
              onClick={() => onChange(name)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-medium
                transition-all active:scale-95 shrink-0
                ${isSelected
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
