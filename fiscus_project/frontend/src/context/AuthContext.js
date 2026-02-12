/**
 * @fileoverview Authentication context for Fiscus mobile app.
 * 
 * Provides:
 * - User authentication state
 * - Login/logout functionality
 * - Token persistence via SecureStore
 * 
 * @module context/AuthContext
 */

import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';
import { loginUser, registerUser, getUserProfile } from '../api/client';

/**
 * Platform-aware storage utilities.
 * Uses SecureStore on native, localStorage on web.
 */
const storage = {
    async getItem(key) {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return SecureStore.getItemAsync(key);
    },
    async setItem(key, value) {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        return SecureStore.setItemAsync(key, value);
    },
    async deleteItem(key) {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        return SecureStore.deleteItemAsync(key);
    },
};

/**
 * Authentication context for accessing user state.
 * @type {React.Context}
 */
export const AuthContext = createContext(null);

/**
 * Authentication provider component.
 * Wraps the app to provide authentication state and methods.
 * 
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child components.
 * @returns {JSX.Element} Provider component.
 * 
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export const AuthProvider = ({ children }) => {
    /**
     * Current user object.
     * @type {Object|null}
     */
    const [user, setUser] = useState(null);

    /**
     * Loading state for async operations.
     * @type {boolean}
     */
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Current access token.
     * @type {string|null}
     */
    const [token, setToken] = useState(null);

    /**
     * Initial loading state (checking stored credentials).
     * @type {boolean}
     */
    const [isInitializing, setIsInitializing] = useState(true);

    /**
     * Check for existing login session on app start.
     */
    useEffect(() => {
        checkLoginStatus();
    }, []);

    /**
     * Check if user has valid stored credentials.
     * Attempts to restore session from SecureStore.
     */
    const checkLoginStatus = async () => {
        try {
            const accessToken = await storage.getItem('access_token');

            if (accessToken) {
                setToken(accessToken);

                // Try to get stored user info
                const storedUser = await storage.getItem('user_info');
                if (storedUser) {
                    try {
                        setUser(JSON.parse(storedUser));
                    } catch (parseError) {
                        console.warn('Failed to parse stored user info');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking login status:', error);
            // Clear potentially corrupted data
            await clearCredentials();
        } finally {
            setIsInitializing(false);
        }
    };

    /**
     * Clear all stored credentials.
     */
    const clearCredentials = async () => {
        try {
            await storage.deleteItem('access_token');
            await storage.deleteItem('refresh_token');
            await storage.deleteItem('user_info');
        } catch (error) {
            console.error('Error clearing credentials:', error);
        }
    };

    /**
     * Authenticate user with username and password.
     * 
     * @param {string} username - User's username.
     * @param {string} password - User's password.
     * @returns {Promise<boolean>} True if login successful.
     */
    const login = useCallback(async (username, password) => {
        if (!username?.trim() || !password) {
            Alert.alert('Error', 'Please enter both username and password');
            return false;
        }

        setIsLoading(true);

        try {
            const { data } = await loginUser(username.trim(), password);

            // Store tokens securely
            await storage.setItem('access_token', data.access);
            await storage.setItem('refresh_token', data.refresh);

            setToken(data.access);

            // Fetch full user profile
            try {
                // Wait a bit or retry if immediate fetch fails due to race conditions
                // But axios interceptor should handle token injection if setToken state isn't instant
                // We'll rely on storage injection in client.js for consistency
                const profileResponse = await getUserProfile();
                const userProfile = profileResponse.data;

                setUser(userProfile);
                await storage.setItem('user_info', JSON.stringify(userProfile));

            } catch (profileError) {
                console.warn('Failed to fetch profile after login:', profileError);
                // Fallback to basic info
                const fallbackUser = { username: username.trim() };
                setUser(fallbackUser);
                await storage.setItem('user_info', JSON.stringify(fallbackUser));
            }

            return true;

        } catch (error) {
            console.error('Login error:', error);
            let message = 'Login failed. Please try again.';
            if (error.response?.status === 401) {
                message = 'Invalid username or password';
            }
            Alert.alert('Login Failed', message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Register a new user.
     * @param {Object} userData - { username, password, email }
     * @returns {Promise<boolean>} True if registration and subsequent login successful.
     */
    const register = useCallback(async (userData) => {
        setIsLoading(true);
        try {
            await registerUser(userData);
            // Auto-login after registration
            // We need to call login, but we need to handle loading state carefully
            // login sets loading state too
            setIsLoading(false); // Reset so login can set it
            return await login(userData.username, userData.password);
        } catch (error) {
            console.error('Registration error:', error);
            let message = 'Registration failed.';
            if (error.response?.data?.username) {
                message = 'Username already exists.';
            } else if (error.response?.data?.password) {
                message = `Password error: ${error.response.data.password}`;
            }
            Alert.alert('Registration Failed', message);
            setIsLoading(false);
            return false;
        }
    }, [login]);

    /**
     * Manually refresh the access token using stored refresh token.
     * Used when API calls return 401 and automatic refresh fails.
     * 
     * @returns {Promise<boolean>} True if refresh successful.
     */
    const refreshToken = useCallback(async () => {
        try {
            const storedRefreshToken = await storage.getItem('refresh_token');

            if (!storedRefreshToken) {
                console.warn('No refresh token available');
                return false;
            }

            // Call refresh endpoint
            const response = await fetch('http://localhost:8000/api/v1/token/refresh/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: storedRefreshToken }),
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();

            // Store new access token
            await storage.setItem('access_token', data.access);
            setToken(data.access);

            // If new refresh token provided, store it too
            if (data.refresh) {
                await storage.setItem('refresh_token', data.refresh);
            }

            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            // Clear credentials and force re-login
            await clearCredentials();
            setToken(null);
            setUser(null);
            return false;
        }
    }, []);

    /**
     * Log out current user and clear credentials.
     */
    const logout = useCallback(async () => {
        setIsLoading(true);

        try {
            await clearCredentials();
            setToken(null);
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Check if user has premium subscription.
     * @returns {boolean} True if user is premium.
     */
    const isPremium = user?.is_premium ?? false;

    /**
     * Check if user is authenticated.
     * @returns {boolean} True if user is logged in.
     */
    const isAuthenticated = !!token;

    // Context value
    const contextValue = {
        user,
        token,
        isLoading,
        isInitializing,
        isAuthenticated,
        isPremium,
        login,
        register,
        logout,
        refreshToken,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
