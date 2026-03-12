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
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                apiClient.setToken(storedToken);
            }
        } catch (error) {
            console.error('Failed to load auth:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const data = await apiClient.login(username, password);
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

    const register = async (username, email, password) => {
        try {
            const data = await apiClient.register(username, email, password);
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
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

export default AuthContext;
