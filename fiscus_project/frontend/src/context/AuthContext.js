/**
 * Auth context — token-based authentication with AsyncStorage persistence.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('auth_token');
            const storedUser = await AsyncStorage.getItem('auth_user');
            if (storedToken && storedUser) {
                apiClient.setToken(storedToken);
                try {
                    // Try fetching profile to validate the token and get latest fields
                    const profile = await apiClient.getProfile();
                    setToken(storedToken);

                    const updatedUser = { ...JSON.parse(storedUser), ...profile };
                    setUser(updatedUser);
                    await AsyncStorage.setItem('auth_user', JSON.stringify(updatedUser)); // update stored format
                } catch (err) {
                    // Invalid or expired token (e.g. backend was reset)
                    apiClient.clearToken();
                    await AsyncStorage.removeItem('auth_token');
                    await AsyncStorage.removeItem('auth_user');
                }
            }
        } catch (error) {
            console.error('Failed to load auth:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async () => {
        if (!apiClient.token) return null;
        try {
            const profile = await apiClient.getProfile();
            setUser(prev => {
                const updated = { ...prev, ...profile };
                AsyncStorage.setItem('auth_user', JSON.stringify(updated));
                return updated;
            });
            return profile;
        } catch (err) {
            console.error('Fetch profile err:', err);
            return null;
        }
    };

    const login = async (username, password) => {
        try {
            console.log('[Auth] Attempting login for:', username);
            const data = await apiClient.login(username, password);
            console.log('[Auth] Login success, token received');
            setToken(data.token);
            setUser(data.user);
            apiClient.setToken(data.token);
            await AsyncStorage.setItem('auth_token', data.token);
            await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
            return { success: true };
        } catch (error) {
            console.error('[Auth] Login error:', error.message);
            return { success: false, error: error.message };
        }
    };

    const register = async (username, email, password) => {
        try {
            console.log('[Auth] Attempting register for:', username);
            const data = await apiClient.register(username, email, password);
            console.log('[Auth] Register success');
            setToken(data.token);
            setUser(data.user);
            apiClient.setToken(data.token);
            await AsyncStorage.setItem('auth_token', data.token);
            await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
            return { success: true };
        } catch (error) {
            console.error('[Auth] Register error:', error.message);
            return { success: false, error: error.message };
        }
    };

    const loginWithGoogle = async (googleAccessToken) => {
        try {
            const data = await apiClient.loginWithGoogle(googleAccessToken);
            setToken(data.token);
            setUser(data.user);
            apiClient.setToken(data.token);
            await AsyncStorage.setItem('auth_token', data.token);
            await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const updateTickets = async (amount) => {
        try {
            const res = await apiClient.updateTickets(amount);
            setUser(prev => ({ ...prev, tickets: res.tickets }));
            return res.tickets;
        } catch (e) { console.error('updateTickets error', e); return null; }
    };

    const addCoins = async (amount) => {
        try {
            const res = await apiClient.addCoins(amount);
            setUser(prev => ({ ...prev, coins: res.coins }));
            return res.coins;
        } catch (e) { console.error('addCoins error', e); return null; }
    };

    const buyTickets = async (packageType) => {
        const res = await apiClient.buyTickets(packageType);
        setUser(prev => ({ ...prev, coins: res.coins, tickets: res.tickets }));
        return res;
    };

    const upgradeToPro = async () => {
        const res = await apiClient.upgradeToPro();
        setUser(prev => ({ ...prev, is_pro: res.is_pro }));
        return res.is_pro;
    };

    const logout = async () => {
        try {
            await apiClient.logout();
        } catch (_) { }
        setToken(null);
        setUser(null);
        apiClient.clearToken();
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('auth_user');
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        loginWithGoogle,
        logout,
        fetchProfile,
        updateTickets,
        addCoins,
        buyTickets,
        upgradeToPro,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

export default AuthContext;
