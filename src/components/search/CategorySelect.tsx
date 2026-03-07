/**
 * CategorySelect - 가로 스크롤 파스텔 칩 + 직접 입력
 *
 * 미리 정의된 카테고리 칩과 사용자 직접 입력을 지원하는 카테고리 선택 컴포넌트.
 * React.memo로 최적화되어 불필요한 리렌더링을 방지합니다.
 *
 * @param selected - 현재 선택된 카테고리 쿼리
 * @param onChange - 카테고리 변경 시 호출되는 콜백
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

const CUSTOM_CATEGORIES_KEY = 'midwayder_custom_categories';

function getCustomCategories(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomCategory(category: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getCustomCategories().filter((c) => c !== category);
    const updated = [category, ...existing].slice(0, 3);
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
  } catch {
    // localStorage 접근 실패 시 무시
  }
}

interface CategorySelectProps {
  /** 현재 선택된 카테고리 쿼리 */
  selected: string;
  /** 카테고리 변경 시 호출되는 콜백 */
  onChange: (category: string) => void;
}

const categories = [
  { name: '주유소', emoji: '⛽', query: '주유소', bg: 'var(--red-100)', activeBg: 'var(--red-500)' },
  { name: '카페', emoji: '☕', query: '카페', bg: 'var(--blue-100)', activeBg: 'var(--accent)' },
  { name: '편의점', emoji: '🏪', query: 'CU', bg: 'var(--orange-100)', activeBg: 'var(--orange-500)' },
  { name: '다이소', emoji: '🛒', query: '다이소', bg: 'var(--green-100)', activeBg: 'var(--green-600)' },
  { name: '올리브영', emoji: '💄', query: '올리브영', bg: 'var(--pink-100)', activeBg: 'var(--pink-500)' },
  { name: '스타벅스', emoji: '⭐', query: '스타벅스', bg: 'var(--blue-100)', activeBg: 'var(--accent)' },
  { name: '이디야', emoji: '🏠', query: '이디야', bg: 'var(--purple-100)', activeBg: 'var(--blue-600)' },
  { name: '휴게소', emoji: '🛣️', query: '휴게소', bg: 'var(--gray-100)', activeBg: 'var(--gray-600)' },
];

const CategorySelectComponent = ({ selected, onChange }: CategorySelectProps) => {
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomCategories(getCustomCategories());
  }, []);

  useEffect(() => {
    if (isInputMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputMode]);

  const handleCustomSubmit = () => {
    const trimmed = inputValue.trim();
    setIsInputMode(false);
    setInputValue('');
    if (!trimmed) return;
    saveCustomCategory(trimmed);
    setCustomCategories(getCustomCategories());
    onChange(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomSubmit();
    }
    if (e.key === 'Escape') {
      setIsInputMode(false);
      setInputValue('');
    }
  };

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {/* 기본 카테고리 칩 */}
        {categories.map(({ name, emoji, query, bg, activeBg }) => {
          const isSelected = selected === query;
          return (
            <button
              key={query}
              onClick={() => onChange(query)}
              aria-label={name}
              aria-pressed={isSelected}
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

        {/* 최근 직접 입력 카테고리 칩 */}
        {customCategories.map((cat) => {
          const isSelected = selected === cat;
          return (
            <button
              key={`custom-${cat}`}
              onClick={() => onChange(cat)}
              aria-label={`${cat}, 최근 사용`}
              aria-pressed={isSelected}
              className="flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap
                transition-all active:scale-95 shrink-0 text-base font-semibold"
              style={{
                background: isSelected ? 'var(--purple-500, #8b5cf6)' : 'var(--purple-100)',
                color: isSelected ? 'var(--bg-surface)' : 'var(--purple-700, #6d28d9)',
                boxShadow: isSelected ? '0 2px 8px rgba(139,92,246,0.35)' : 'none',
              }}
            >
              <span className="text-lg">🔍</span>
              <span>{cat}</span>
            </button>
          );
        })}

        <button
          onClick={() => setIsInputMode(true)}
          data-testid="custom-category-toggle"
          aria-label="직접 입력"
          className="flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap
            transition-all active:scale-95 shrink-0 text-base font-semibold"
          style={{
            background: 'var(--purple-100)',
            color: 'var(--purple-700, #6d28d9)',
            border: '1.5px dashed var(--purple-300, #c4b5fd)',
          }}
          title="원하는 카테고리를 직접 입력하세요"
        >
          <span className="text-lg">✏️</span>
          <span>직접 입력</span>
        </button>
      </div>

      {isInputMode && (
        <div className="mt-2">
          <input
            ref={inputRef}
            data-testid="custom-category-input"
            aria-label="카테고리 직접 입력"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCustomSubmit}
            placeholder="카테고리 입력..."
            maxLength={20}
            className="w-full px-4 py-3 rounded-2xl text-base font-semibold outline-none"
            style={{
              background: 'var(--purple-100)',
              color: 'var(--purple-700, #6d28d9)',
              border: '2px solid var(--purple-400, #a78bfa)',
            }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * React.memo로 최적화된 CategorySelect 컴포넌트
 * selected와 onChange props가 변경될 때만 리렌더링됩니다.
 */
const CategorySelect = React.memo(CategorySelectComponent);

export default CategorySelect;
