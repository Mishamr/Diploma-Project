/**
 * Custom hooks for products, location, and data fetching.
 */

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import apiClient from '../api/client';

/**
 * Debounced value hook.
 */
export function useDebounce(value, delay = 500) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

/**
 * User location hook.
 */
export function useLocation() {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setError('Доступ до геолокації не надано');
                    setLoading(false);
                    return;
                }

                const loc = await Location.getCurrentPositionAsync({});
                setLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
            } catch (err) {
                setError(err.message);
                // Default to Kyiv center
                setLocation({ latitude: 50.4501, longitude: 30.5234 });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return { location, error, loading };
}

/**
 * Price comparison hook.
 */
export function usePriceComparison(productId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchComparison = useCallback(async () => {
        if (!productId) return;
        setLoading(true);
        try {
            const result = await apiClient.comparePrice(productId);
            setData(result);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchComparison();
    }, [fetchComparison]);

    return { data, loading, error, refetch: fetchComparison };
}

/**
 * Price history hook.
 */
export function usePriceHistory(productId, days = 30) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!productId) return;
        setLoading(true);
        apiClient
            .getProductPrices(productId, days)
            .then((data) => setHistory(data || []))
            .catch(() => setHistory([]))
            .finally(() => setLoading(false));
    }, [productId, days]);

    return { history, loading };
}

/**
 * Inflation data hook.
 */
export function useInflation(days = 30) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        apiClient
            .getInflation(days)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [days]);

    return { data, loading };
}
