/**
 * Zustand stores — lightweight global state.
 */

import { create } from 'zustand';
import apiClient from '../api/client';

// ─── Products Store ───
export const useProductStore = create((set, get) => ({
    products: [],
    nextUrl: null,
    loading: false,
    loadingMore: false,
    error: null,
    searchQuery: '',
    selectedCategory: null,

    fetchProducts: async (params = {}) => {
        set({ loading: true, error: null });
        try {
            const data = await apiClient.getProducts(params);
            set({
                products: data.results || data,
                nextUrl: data.next || null,
                loading: false
            });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    loadMoreProducts: async () => {
        const { nextUrl, loadingMore } = get();
        if (!nextUrl || loadingMore) return;

        set({ loadingMore: true, error: null });
        try {
            const data = await apiClient.getProducts(nextUrl);
            set((state) => ({
                products: [...state.products, ...(data.results || data)],
                nextUrl: data.next || null,
                loadingMore: false
            }));
        } catch (error) {
            set({ error: error.message, loadingMore: false });
        }
    },

    searchProducts: async (query) => {
        set({ searchQuery: query, loading: true });
        try {
            const data = await apiClient.searchProducts(query);
            set({
                products: data.results || data,
                nextUrl: data.next || null,
                loading: false
            });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    setCategory: (category) => set({ selectedCategory: category }),
}));

// ─── Categories Store ───
export const useCategoryStore = create((set) => ({
    categories: [],
    loading: false,
    error: null,

    fetchCategories: async () => {
        set({ loading: true, error: null });
        try {
            const data = await apiClient.getCategories();
            set({ categories: data.results || data, loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },
}));

// ─── Chain Store ───
export const useChainStore = create((set) => ({
    chains: [],
    selectedChain: null,
    chainProducts: [],
    loading: false,

    fetchChains: async () => {
        set({ loading: true });
        try {
            const data = await apiClient.getChains();
            set({ chains: data.results || data, loading: false });
        } catch (error) {
            set({ loading: false });
        }
    },

    selectChain: async (slug, lat, lon) => {
        set({ selectedChain: slug, loading: true });
        try {
            const data = await apiClient.getChainProducts(slug, lat, lon);
            set({ chainProducts: data.products || [], loading: false });
        } catch (error) {
            set({ loading: false });
        }
    },
}));

// ─── Promotions Store ───
export const usePromotionStore = create((set) => ({
    promotions: [],
    loading: false,

    fetchPromotions: async (limit = 20, chain = null) => {
        set({ loading: true });
        try {
            const data = await apiClient.getPromotions(limit, chain);
            set({ promotions: data || [], loading: false });
        } catch (error) {
            set({ loading: false });
        }
    },
}));

export const useSurvivalStore = create((set) => ({
    basket: null,
    loading: false,

    fetchSurvival: async (budget = 5000, days = 7, lat = null, lon = null) => {
        set({ loading: true });
        try {
            const data = await apiClient.getSurvivalBasket(budget, days, lat, lon);
            set({ basket: data, loading: false });
        } catch (error) {
            set({ loading: false });
        }
    },
}));

// ─── Geo Store ───
export const useGeoStore = create((set) => ({
    location: null,
    nearbyStores: [],
    mapStores: [],
    loading: false,

    setLocation: (lat, lon) => set({ location: { lat, lon } }),

    fetchNearby: async (lat, lon, limit = 10) => {
        set({ loading: true });
        try {
            const data = await apiClient.getNearbyStores(lat, lon, limit);
            set({ nearbyStores: data, loading: false });
        } catch (error) {
            set({ loading: false });
        }
    },

    fetchMapStores: async (chain = null) => {
        set({ loading: true });
        try {
            const data = await apiClient.getStoresOnMap(chain);
            set({ mapStores: data, loading: false });
        } catch (error) {
            set({ loading: false });
        }
    },
}));

// ─── Analytics Store ───
export const useAnalyticsStore = create((set) => ({
    savings: null,
    loading: false,

    fetchSavings: async () => {
        set({ loading: true });
        try {
            const data = await apiClient.getSavingsAnalytics();
            set({ savings: data, loading: false });
        } catch (error) {
            // Use mock data if API not available
            set({
                savings: {
                    total_saved: 1190,
                    avg_per_trip: 170,
                    best_deal: 310,
                    history: [
                        { label: '01/02', value: 45 },
                        { label: '05/02', value: 120 },
                        { label: '10/02', value: 85 },
                        { label: '15/02', value: 200 },
                        { label: '18/02', value: 150 },
                        { label: '22/02', value: 310 },
                        { label: '26/02', value: 280 },
                    ],
                    active_days: [1, 5, 10, 15, 18, 22, 26],
                },
                loading: false,
            });
        }
    },
}));

// ─── Settings Store ───
export const useSettingsStore = create((set) => ({
    viewMode: 'list',
    familySize: 1,
    budget: 5000,
    enabledChains: {},

    setViewMode: (mode) => set({ viewMode: mode }),
    setFamilySize: (size) => set({ familySize: size }),
    setBudget: (amount) => set({ budget: amount }),
    toggleChain: (slug) => set((state) => ({
        enabledChains: {
            ...state.enabledChains,
            [slug]: !state.enabledChains[slug],
        },
    })),
}));
