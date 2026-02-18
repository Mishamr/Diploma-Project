/**
 * @fileoverview Shared storage utility for Fiscus mobile app.
 * 
 * Provides platform-agnostic storage interface:
 * - Uses expo-secure-store on Native (iOS/Android) for security
 * - Uses localStorage on Web for compatibility
 * 
 * @module utils/storage
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const storage = {
    /**
     * Get an item from storage.
     * @param {string} key 
     * @returns {Promise<string|null>}
     */
    async getItem(key) {
        if (Platform.OS === 'web') {
            try {
                if (typeof localStorage !== 'undefined') {
                    return localStorage.getItem(key);
                }
            } catch (e) {
                console.warn('LocalStorage access failed:', e);
            }
            return null;
        }
        return SecureStore.getItemAsync(key);
    },

    /**
     * Set an item in storage.
     * @param {string} key 
     * @param {string} value 
     */
    async setItem(key, value) {
        if (Platform.OS === 'web') {
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(key, value);
                }
            } catch (e) {
                console.warn('LocalStorage access failed:', e);
            }
            return;
        }
        return SecureStore.setItemAsync(key, value);
    },

    /**
     * Remove an item from storage.
     * @param {string} key 
     */
    async deleteItem(key) {
        if (Platform.OS === 'web') {
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                console.warn('LocalStorage access failed:', e);
            }
            return;
        }
        return SecureStore.deleteItemAsync(key);
    },
};

export default storage;
