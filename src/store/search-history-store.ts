import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SearchHistoryState, SearchHistoryItem } from '@/types/search-history';

const MAX_ITEMS = 100;

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      categoryUsage: {},
      maxItems: MAX_ITEMS,

      addItem: (item) => {
        try {
          const newItem: SearchHistoryItem = {
            ...item,
            id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
          };

          set((state) => {
            // Add new item
            const newItems = [newItem, ...state.items].slice(0, MAX_ITEMS);

            // Update category usage
            const newCategoryUsage = { ...state.categoryUsage };
            if (newCategoryUsage[item.category]) {
              newCategoryUsage[item.category] = {
                category: item.category,
                count: newCategoryUsage[item.category].count + 1,
                lastUsed: newItem.timestamp
              };
            } else {
              newCategoryUsage[item.category] = {
                category: item.category,
                count: 1,
                lastUsed: newItem.timestamp
              };
            }

            return {
              items: newItems,
              categoryUsage: newCategoryUsage
            };
          });
        } catch (error) {
          console.error('Failed to add search history item:', error);
          // 에러 시 조용히 실패 (사용자 경험 저해 방지)
        }
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id)
        }));
      },

      clearHistory: () => {
        set({ items: [], categoryUsage: {} });
      },

      getCategoryScore: (category) => {
        const state = get();
        const usage = state.categoryUsage[category];
        if (!usage) return 0;

        // Frequency score (0-40)
        const frequencyScore = Math.min(usage.count / 10, 1) * 40;

        // Recency score (0-30)
        const daysSinceLastUse = (Date.now() - usage.lastUsed) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, (1 - daysSinceLastUse / 30)) * 30;

        return frequencyScore + recencyScore;
      },

      getTopCategories: (limit = 5) => {
        const state = get();
        return Object.values(state.categoryUsage)
          .sort((a, b) => {
            const scoreA = state.getCategoryScore(a.category);
            const scoreB = state.getCategoryScore(b.category);
            return scoreB - scoreA;
          })
          .slice(0, limit);
      },

      getRecentCategories: (limit = 5) => {
        const state = get();
        const recentItems = state.items.slice(0, limit * 2);
        const uniqueCategories = [...new Set(recentItems.map((item) => item.category))];
        return uniqueCategories.slice(0, limit);
      }
    }),
    {
      name: 'midwayder-search-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        categoryUsage: state.categoryUsage
      })
    }
  )
);
