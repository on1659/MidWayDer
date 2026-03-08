import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bookmark } from '@/types/bookmark';

interface BookmarkState {
  bookmarks: Bookmark[];
  isLoading: boolean;
  initialized: boolean;
  fetchBookmarks: () => Promise<void>;
  addBookmark: (placeId: string, memo?: string) => Promise<void>;
  removeBookmark: (placeId: string) => Promise<void>;
  isBookmarked: (placeId: string) => boolean;
  getBookmark: (placeId: string) => Bookmark | undefined;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      isLoading: false,
      initialized: false,

      fetchBookmarks: async () => {
        // 이미 초기화되었으면 스킵
        if (get().initialized) return;

        set({ isLoading: true });
        try {
          const res = await fetch('/api/bookmarks');
          const data = await res.json();
          set({
            bookmarks: data.bookmarks || [],
            isLoading: false,
            initialized: true,
          });
        } catch (error) {
          console.error('Failed to fetch bookmarks:', error);
          set({ isLoading: false, initialized: true });
        }
      },

      addBookmark: async (placeId, memo) => {
        try {
          const res = await fetch('/api/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId, memo }),
          });

          if (!res.ok) throw new Error('Failed to add bookmark');

          const data = await res.json();
          set((state) => ({
            bookmarks: [
              data.bookmark,
              ...state.bookmarks.filter((b) => b.placeId !== placeId),
            ],
          }));
        } catch (error) {
          console.error('Failed to add bookmark:', error);
          throw error;
        }
      },

      removeBookmark: async (placeId) => {
        try {
          const res = await fetch(`/api/bookmarks/${placeId}`, {
            method: 'DELETE',
          });

          if (!res.ok) throw new Error('Failed to remove bookmark');

          set((state) => ({
            bookmarks: state.bookmarks.filter((b) => b.placeId !== placeId),
          }));
        } catch (error) {
          console.error('Failed to remove bookmark:', error);
          throw error;
        }
      },

      isBookmarked: (placeId) => {
        return get().bookmarks.some((b) => b.placeId === placeId);
      },

      getBookmark: (placeId) => {
        return get().bookmarks.find((b) => b.placeId === placeId);
      },
    }),
    {
      name: 'midwayder-bookmarks',
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        initialized: state.initialized,
      }),
    }
  )
);
