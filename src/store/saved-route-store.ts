import { create } from 'zustand';
import type { SavedRoute, SaveRouteInput, UpdateRouteInput } from '@/types/saved-route';

interface SavedRouteState {
  routes: SavedRoute[];
  isLoading: boolean;
  error: string | null;
  fetchRoutes: () => Promise<void>;
  saveRoute: (input: SaveRouteInput) => Promise<SavedRoute | null>;
  updateRouteName: (id: string, input: UpdateRouteInput) => Promise<boolean>;
  deleteRoute: (id: string) => Promise<boolean>;
}

export const useSavedRouteStore = create<SavedRouteState>((set, get) => ({
  routes: [],
  isLoading: false,
  error: null,

  fetchRoutes: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/routes');
      if (!res.ok) throw new Error('Failed to fetch routes');
      const data = await res.json();
      set({ routes: data.routes, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  saveRoute: async (input: SaveRouteInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save route');
      }
      const data = await res.json();
      set((state) => ({
        routes: [data.route, ...state.routes],
        isLoading: false,
      }));
      return data.route;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updateRouteName: async (id: string, input: UpdateRouteInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/routes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to update route');
      set((state) => ({
        routes: state.routes.map((r) =>
          r.id === id ? { ...r, name: input.name } : r
        ),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return false;
    }
  },

  deleteRoute: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete route');
      set((state) => ({
        routes: state.routes.filter((r) => r.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return false;
    }
  },
}));
