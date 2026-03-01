import { describe, it, expect } from 'vitest';
import { getCategoryIcon, CATEGORY_ICONS } from '../category-icons';

describe('getCategoryIcon', () => {
  it('알려진 카테고리 → 해당 이모지 반환', () => {
    expect(getCategoryIcon('다이소')).toBe('🛒');
    expect(getCategoryIcon('스타벅스')).toBe('☕');
    expect(getCategoryIcon('병원')).toBe('🏥');
  });

  it('알 수 없는 카테고리 → 기본값 📍', () => {
    expect(getCategoryIcon('존재하지않는카테고리')).toBe('📍');
  });

  it('CATEGORY_ICONS에 주요 편의점 포함', () => {
    expect(CATEGORY_ICONS['CU']).toBe('🏪');
    expect(CATEGORY_ICONS['GS25']).toBe('🏪');
  });
});
