/**
 * @fileoverview Shopping cart context for Fiscus mobile app.
 * 
 * Provides:
 * - Cart state management
 * - Add/remove/update item operations
 * - Persistent storage via AsyncStorage
 * - Automatic total calculation
 * 
 * @module context/CartContext
 */

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage key for cart data.
 * @constant {string}
 */
const CART_STORAGE_KEY = 'fiscus_cart_items';

/**
 * Cart context for accessing cart state and operations.
 * @type {React.Context}
 */
export const CartContext = createContext(null);

/**
 * Cart provider component.
 * Wraps the app to provide cart state and methods.
 * 
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child components.
 * @returns {JSX.Element} Provider component.
 */
export const CartProvider = ({ children }) => {
    /**
     * Cart items array.
     * @type {Array<{id: number, name: string, price: number, quantity: number}>}
     */
    const [items, setItems] = useState([]);

    /**
     * Loading state for async operations.
     * @type {boolean}
     */
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Calculate total price from items.
     * Memoized to avoid unnecessary recalculations.
     * @type {number}
     */
    const total = useMemo(() => {
        return items.reduce((acc, item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity, 10) || 0;
            return acc + (price * quantity);
        }, 0);
    }, [items]);

    /**
     * Calculate total item count.
     * @type {number}
     */
    const itemCount = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.quantity || 0), 0);
    }, [items]);

    /**
     * Load cart from storage on mount.
     */
    useEffect(() => {
        loadCart();
    }, []);

    /**
     * Save cart to storage when items change.
     */
    useEffect(() => {
        if (!isLoading) {
            saveCart();
        }
    }, [items, isLoading]);

    /**
     * Load cart data from AsyncStorage.
     */
    const loadCart = async () => {
        try {
            const storedItems = await AsyncStorage.getItem(CART_STORAGE_KEY);

            if (storedItems) {
                const parsed = JSON.parse(storedItems);

                // Validate loaded data
                if (Array.isArray(parsed)) {
                    setItems(parsed);
                }
            }
        } catch (error) {
            console.error('Failed to load cart:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Save cart data to AsyncStorage.
     */
    const saveCart = async () => {
        try {
            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error('Failed to save cart:', error);
        }
    };

    /**
     * Add product to cart or increment quantity if exists.
     * 
     * @param {Object} product - Product to add.
     * @param {number} product.id - Product ID.
     * @param {string} product.name - Product name.
     * @param {number} product.price - Product price.
     * 
     * @example
     * addToCart({ id: 1, name: 'Milk', price: 35.50 });
     */
    const addToCart = useCallback((product) => {
        if (!product?.id) {
            console.warn('Cannot add product without ID');
            return;
        }

        setItems((prevItems) => {
            const existingIndex = prevItems.findIndex((i) => i.id === product.id);

            if (existingIndex >= 0) {
                // Increment quantity of existing item
                const updated = [...prevItems];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + 1,
                };
                return updated;
            }

            // Add new item with quantity 1
            return [...prevItems, { ...product, quantity: 1 }];
        });
    }, []);

    /**
     * Remove product from cart.
     * 
     * @param {number} productId - ID of product to remove.
     * 
     * @example
     * removeFromCart(1);
     */
    const removeFromCart = useCallback((productId) => {
        setItems((prevItems) => prevItems.filter((i) => i.id !== productId));
    }, []);

    /**
     * Update quantity of a product in cart.
     * 
     * @param {number} productId - ID of product to update.
     * @param {number} change - Amount to change (+1 or -1).
     * 
     * @example
     * updateQuantity(1, 1);  // Increment
     * updateQuantity(1, -1); // Decrement (min 1)
     */
    const updateQuantity = useCallback((productId, change) => {
        setItems((prevItems) =>
            prevItems.map((item) => {
                if (item.id === productId) {
                    const newQuantity = Math.max(1, item.quantity + change);
                    return { ...item, quantity: newQuantity };
                }
                return item;
            })
        );
    }, []);

    /**
     * Set exact quantity for a product.
     * 
     * @param {number} productId - ID of product to update.
     * @param {number} quantity - New quantity (minimum 1).
     */
    const setQuantity = useCallback((productId, quantity) => {
        const validQuantity = Math.max(1, parseInt(quantity, 10) || 1);

        setItems((prevItems) =>
            prevItems.map((item) =>
                item.id === productId ? { ...item, quantity: validQuantity } : item
            )
        );
    }, []);

    /**
     * Clear all items from cart.
     */
    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    /**
     * Check if product is in cart.
     * 
     * @param {number} productId - Product ID to check.
     * @returns {boolean} True if product is in cart.
     */
    const isInCart = useCallback((productId) => {
        return items.some((item) => item.id === productId);
    }, [items]);

    /**
     * Get quantity of a specific product.
     * 
     * @param {number} productId - Product ID.
     * @returns {number} Quantity in cart (0 if not found).
     */
    const getQuantity = useCallback((productId) => {
        const item = items.find((i) => i.id === productId);
        return item?.quantity || 0;
    }, [items]);

    // Context value
    const contextValue = {
        items,
        total,
        itemCount,
        isLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        setQuantity,
        clearCart,
        isInCart,
        getQuantity,
    };

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
};

export default CartContext;
