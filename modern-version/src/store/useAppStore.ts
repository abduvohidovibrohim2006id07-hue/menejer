import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Tabs
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Selection
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;

  // Filters
  selectedCategory: string;
  searchQuery: string;
  brandFilter: string;
  colorFilter: string;
  minPrice: string;
  maxPrice: string;
  statusFilter: string; // 'all' | 'active' | 'quarantine' | 'archive'
  selectedMarkets: string[];
  sortBy: string;
  isFilterPanelOpen: boolean;

  setFilter: (key: keyof Omit<AppState, 'setFilter' | 'setActiveTab' | 'selectedIds' | 'toggleSelection' | 'clearSelection' | 'selectAll'>, value: any) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'products',
      setActiveTab: (tab) => set({ activeTab: tab }),

      selectedIds: new Set<string>(),
      toggleSelection: (id) => set((state) => {
        const next = new Set(state.selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selectedIds: next };
      }),
      clearSelection: () => set({ selectedIds: new Set() }),
      selectAll: (ids) => {
        const state = get();
        if (state.selectedIds.size === ids.length && ids.length > 0) {
          set({ selectedIds: new Set() });
        } else {
          set({ selectedIds: new Set(ids) });
        }
      },

      selectedCategory: 'Barchasi',
      searchQuery: '',
      brandFilter: '',
      colorFilter: '',
      minPrice: '',
      maxPrice: '',
      statusFilter: 'all',
      selectedMarkets: [],
      sortBy: 'newest',
      isFilterPanelOpen: false,

      setFilter: (key, value) => set({ [key]: value }),
    }),
    {
      name: 'menejer-pro-storage',
      // We don't want to persist `selectedIds` because it's transient UI state.
      partialize: (state) => ({
        activeTab: state.activeTab,
        selectedCategory: state.selectedCategory,
        statusFilter: state.statusFilter,
        selectedMarkets: state.selectedMarkets,
        searchQuery: state.searchQuery,
        brandFilter: state.brandFilter,
        colorFilter: state.colorFilter,
        minPrice: state.minPrice,
        maxPrice: state.maxPrice,
        isFilterPanelOpen: state.isFilterPanelOpen,
        sortBy: state.sortBy,
      }),
    }
  )
);
