/**
 * CartContext — in-memory shopping cart + history (AsyncStorage).
 */

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext(null);
const HISTORY_KEY = '@fiscus_cart_history';

const initialState = {
    items: [],
    selectedChain: null,
};

function cartReducer(state, action) {
    switch (action.type) {
        case 'ADD_ITEM': {
            const existing = state.items.find((i) => i.productId === action.item.productId);
            if (existing) {
                return {
                    ...state,
                    items: state.items.map((i) =>
                        i.productId === action.item.productId
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                    ),
                };
            }
            return { ...state, items: [...state.items, { ...action.item, quantity: 1 }] };
        }

        case 'ADD_BULK': {
            const newItems = [...state.items];
            action.items.forEach((newItem) => {
                const existingIndex = newItems.findIndex(i => i.productId === newItem.productId);
                if (existingIndex >= 0) {
                    newItems[existingIndex] = {
                        ...newItems[existingIndex],
                        quantity: newItems[existingIndex].quantity + newItem.quantity
                    };
                } else {
                    newItems.push({ ...newItem });
                }
            });
            return { ...state, items: newItems };
        }

        case 'REMOVE_ITEM':
            return {
                ...state,
                items: state.items.filter((i) => i.productId !== action.productId),
            };

        case 'UPDATE_QUANTITY':
            return {
                ...state,
                items: state.items.map((i) =>
                    i.productId === action.productId
                        ? { ...i, quantity: Math.max(0, action.quantity) }
                        : i
                ).filter((i) => i.quantity > 0),
            };

        case 'REPLACE_ITEM': {
            // Replace one product with another in the cart
            return {
                ...state,
                items: state.items.map((i) =>
                    i.productId === action.oldProductId
                        ? { ...action.newItem, quantity: i.quantity }
                        : i
                ),
            };
        }

        case 'RESTORE_CART':
            return { ...state, items: action.items };

        case 'CLEAR_CART':
            return { ...initialState };

        case 'SET_CHAIN':
            return { ...state, selectedChain: action.chain };

        default:
            return state;
    }
}

export function CartProvider({ children }) {
    const [state, dispatch] = useReducer(cartReducer, initialState);
    const [cartHistory, setCartHistory] = useState([]);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    // Load history from storage
    useEffect(() => {
        AsyncStorage.getItem(HISTORY_KEY)
            .then((json) => { if (json) setCartHistory(JSON.parse(json)); })
            .catch(() => {})
            .finally(() => setHistoryLoaded(true));
    }, []);

    const addItem = (item) => dispatch({ type: 'ADD_ITEM', item });
    const addBulkItems = (items) => dispatch({ type: 'ADD_BULK', items });
    const removeItem = (productId) => dispatch({ type: 'REMOVE_ITEM', productId });
    const updateQuantity = (productId, quantity) =>
        dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
    const clearCart = () => dispatch({ type: 'CLEAR_CART' });
    const setChain = (chain) => dispatch({ type: 'SET_CHAIN', chain });

    const replaceItem = (oldProductId, newItem) =>
        dispatch({ type: 'REPLACE_ITEM', oldProductId, newItem });

    const restoreCart = (historyItems) =>
        dispatch({ type: 'RESTORE_CART', items: historyItems });

    const saveCartToHistory = async () => {
        if (state.items.length === 0) return false;
        const snapshot = {
            id: Date.now().toString(),
            savedAt: new Date().toISOString(),
            items: state.items,
            totalPrice: state.items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0),
            totalItems: state.items.reduce((sum, i) => sum + i.quantity, 0),
        };
        const updated = [snapshot, ...cartHistory].slice(0, 20); // max 20 history entries
        setCartHistory(updated);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        return true;
    };

    const deleteHistoryItem = async (historyId) => {
        const updated = cartHistory.filter((h) => h.id !== historyId);
        setCartHistory(updated);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    };

    const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = state.items.reduce(
        (sum, i) => sum + (i.price || 0) * i.quantity,
        0
    );

    const value = {
        items: state.items,
        selectedChain: state.selectedChain,
        totalItems,
        totalPrice,
        cartHistory,
        historyLoaded,
        addItem,
        addBulkItems,
        removeItem,
        updateQuantity,
        clearCart,
        setChain,
        replaceItem,
        restoreCart,
        saveCartToHistory,
        deleteHistoryItem,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
}

export default CartContext;
