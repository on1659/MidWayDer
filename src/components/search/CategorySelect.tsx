/**
 * CategorySelect - 카테고리 선택 컴포넌트
 *
 * 매장 카테고리를 선택하는 버튼 그룹입니다.
 */

'use client';

import { Store, Coffee, ShoppingBag } from 'lucide-react';

interface CategorySelectProps {
  /** 선택된 카테고리 */
  selected: string;
  /** 카테고리 변경 콜백 */
  onChange: (category: string) => void;
}

const categoryIcons: Record<string, typeof Store> = {
  '다이소': Store,
  '스타벅스': Coffee,
  '이디야': Coffee,
  'CU': ShoppingBag,
  'GS25': ShoppingBag,
  '올리브영': Store,
};

export default function CategorySelect({ selected, onChange }: CategorySelectProps) {
  const categories = ['다이소', '스타벅스', '이디야', 'CU', 'GS25', '올리브영'];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">카테고리</label>
      <div className="grid grid-cols-3 gap-2">
        {categories.map((category) => {
          const Icon = categoryIcons[category] || Store;
          const isSelected = selected === category;

          return (
            <button
              key={category}
              onClick={() => onChange(category)}
              className={`
                flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all
                ${
                  isSelected
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{category}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
