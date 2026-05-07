/**
 * FavoritesContext — зберігає улюблені продукти в AsyncStorage.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@fiscus_favorites';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
    const [favorites, setFavorites] = useState([]);
    const [loaded, setLoaded] = useState(false);

    // Load from storage on mount
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((json) => {
                if (json) setFavorites(JSON.parse(json));
            })
            .catch(() => {})
            .finally(() => setLoaded(true));
    }, []);

    // Persist whenever favorites change
    useEffect(() => {
        if (loaded) {
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)).catch(() => {});
        }
    }, [favorites, loaded]);

    const isFavorite = useCallback(
        (productId) => favorites.some((f) => f.id === productId || f.productId === productId),
        [favorites]
    );

    const toggleFavorite = useCallback((product) => {
        setFavorites((prev) => {
            const id = product.id || product.productId;
            const exists = prev.some((f) => (f.id || f.productId) === id);
            if (exists) return prev.filter((f) => (f.id || f.productId) !== id);
            return [...prev, { ...product, savedAt: new Date().toISOString() }];
        });
    }, []);

    const removeFavorite = useCallback((productId) => {
        setFavorites((prev) =>
            prev.filter((f) => (f.id || f.productId) !== productId)
        );
    }, []);

    return (
        <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, removeFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const ctx = useContext(FavoritesContext);
    if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
    return ctx;
}

export default FavoritesContext;
