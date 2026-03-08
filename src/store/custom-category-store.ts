/**
 * Custom Category Store - 커스텀 카테고리 상태 관리 (v0.61.0)
 *
 * 사용자 정의 카테고리를 localStorage에 저장하고 관리합니다.
 */

import { create } from 'zustand';
import { logger } from '@/lib/logger';

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;      // emoji
  color: string;     // hex color (#RRGGBB)
  keywords: string[]; // 검색 키워드
  createdAt: number;
}

const STORAGE_KEY = 'midwayder-custom-categories';

interface CustomCategoryState {
  categories: CustomCategory[];

  // Actions
  addCategory: (category: Omit<CustomCategory, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, updates: Partial<Omit<CustomCategory, 'id' | 'createdAt'>>) => void;
  deleteCategory: (id: string) => void;
  loadFromStorage: () => void;
}

export const useCustomCategoryStore = create<CustomCategoryState>((set, get) => ({
  categories: [],

  addCategory: (categoryData) => {
    const newCategory: CustomCategory = {
      ...categoryData,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };

    set((state) => {
      const updated = [...state.categories, newCategory];
      saveToStorage(updated);
      return { categories: updated };
    });

    logger.debug('Added custom category:', newCategory.name);
  },

  updateCategory: (id, updates) => {
    set((state) => {
      const updated = state.categories.map((cat) =>
        cat.id === id ? { ...cat, ...updates } : cat
      );
      saveToStorage(updated);
      return { categories: updated };
    });
  },

  deleteCategory: (id) => {
    set((state) => {
      const updated = state.categories.filter((cat) => cat.id !== id);
      saveToStorage(updated);
      return { categories: updated };
    });

    logger.debug('Deleted custom category:', id);
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const categories = JSON.parse(stored) as CustomCategory[];
        set({ categories });
        logger.debug('Loaded custom categories from storage:', categories.length);
      }
    } catch (error) {
      logger.error('Failed to load custom categories:', error);
    }
  },
}));

// Helper: localStorage에 저장
function saveToStorage(categories: CustomCategory[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch (error) {
    logger.error('Failed to save custom categories:', error);
  }
}
