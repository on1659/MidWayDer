export interface SearchHistoryItem {
  id: string;
  category: string;
  timestamp: number;
  startAddress: string;
  endAddress: string;
  startCoords?: { lat: number; lng: number };
  endCoords?: { lat: number; lng: number };
}

export interface CategoryUsage {
  category: string;
  count: number;
  lastUsed: number; // timestamp
}

export interface SearchHistoryState {
  items: SearchHistoryItem[];
  categoryUsage: Record<string, CategoryUsage>;
  maxItems: number;

  // Actions
  addItem: (item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;

  // Getters
  getCategoryScore: (category: string) => number;
  getTopCategories: (limit?: number) => CategoryUsage[];
  getRecentCategories: (limit?: number) => string[];
}
