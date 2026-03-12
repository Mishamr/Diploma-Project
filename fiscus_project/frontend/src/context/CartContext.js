/**
 * Cart context — in-memory shopping cart for price comparison.
 */

import React, { createContext, useContext, useReducer } from 'react';

const CartContext = createContext(null);

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

    const addItem = (item) => dispatch({ type: 'ADD_ITEM', item });
    const removeItem = (productId) => dispatch({ type: 'REMOVE_ITEM', productId });
    const updateQuantity = (productId, quantity) =>
        dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
    const clearCart = () => dispatch({ type: 'CLEAR_CART' });
    const setChain = (chain) => dispatch({ type: 'SET_CHAIN', chain });

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
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setChain,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
}

export default CartContext;
