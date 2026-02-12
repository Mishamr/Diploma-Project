/**
 * @fileoverview Axios API client configuration for Fiscus mobile app.
 * 
 * Provides:
 * - Automatic token injection via request interceptor
 * - Token refresh on 401 responses
 * - Centralized API endpoint functions
 * 
 * @module api/client
 */

import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

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
 * Base URL for API requests.
 * Android emulator uses 10.0.2.2 to reach host machine.
 * iOS simulator and web use localhost.
 */
const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000/api/v1',
  ios: 'http://localhost:8000/api/v1',
  default: 'http://localhost:8000/api/v1',
});

/**
 * Axios instance with default configuration.
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Flag to prevent multiple simultaneous token refresh attempts.
 * @type {boolean}
 */
let isRefreshing = false;

/**
 * Queue of requests waiting for token refresh.
 * @type {Array<{resolve: Function, reject: Function}>}
 */
let refreshQueue = [];

/**
 * Process queued requests after token refresh.
 * @param {string|null} token - New access token or null on failure.
 */
const processRefreshQueue = (token) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(new Error('Token refresh failed'));
    }
  });
  refreshQueue = [];
};

/**
 * Request interceptor: Attach JWT token to all requests.
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get access token:', error.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: Handle 401 errors with token refresh.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if this is a 401 error and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await storage.getItem('refresh_token');

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Use plain axios to avoid interceptor loop
        const { data } = await axios.post(`${BASE_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        // Store new tokens
        await storage.setItem('access_token', data.access);

        if (data.refresh) {
          await storage.setItem('refresh_token', data.refresh);
        }

        // Update default header
        apiClient.defaults.headers.common.Authorization = `Bearer ${data.access}`;

        // Process queued requests
        processRefreshQueue(data.access);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.message);

        // Clear tokens on refresh failure
        await storage.deleteItem('access_token');
        await storage.deleteItem('refresh_token');

        processRefreshQueue(null);

        // Could trigger logout event here
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// API Functions
// ============================================================================

/**
 * Authenticate user and obtain JWT tokens.
 * @param {string} username - User's username.
 * @param {string} password - User's password.
 * @returns {Promise<{access: string, refresh: string}>} JWT tokens.
 */
export const loginUser = (username, password) =>
  apiClient.post('/token/', { username, password });

/**
 * Register a new user.
 * @param {Object} userData - { username, password, email }
 * @returns {Promise<Object>} Created user data.
 */
export const registerUser = (userData) =>
  apiClient.post('/auth/register/', userData);

/**
 * Get current user profile.
 * @returns {Promise<Object>} User profile data.
 */
export const getUserProfile = () =>
  apiClient.get('/auth/profile/');

/**
 * Get stores near a location.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {number} [radius=10] - Search radius in km.
 * @returns {Promise<Array>} List of nearby stores.
 */
export const getNearbyStores = (lat, lon, radius = 10) =>
  apiClient.get('/stores/nearby/', { params: { lat, lon, radius } });

/**
 * Search for products.
 * @param {string} [query] - Search query.
 * @returns {Promise<Array>} List of products.
 */
export const getProducts = (query) =>
  apiClient.get('/products/', { params: { search: query } });

/**
 * Get user's shopping lists.
 * @returns {Promise<Array>} List of shopping lists.
 */
export const getShoppingLists = () =>
  apiClient.get('/shopping-lists/');

/**
 * Compare prices for a product across stores.
 * @param {string} query - Product name to search.
 * @returns {Promise<Object>} Price comparison results.
 */
export const compareProducts = (query) =>
  apiClient.get('/comparison/search/', { params: { q: query } });

/**
 * Analyze product for best value (Premium).
 * @param {string} query - Product name to analyze.
 * @returns {Promise<Object>} Analysis with Fiscus Index.
 */
export const analyzeProduct = (query) =>
  apiClient.get('/comparison/analyze/', { params: { q: query } });

/**
 * Find cheapest basket location (Premium).
 * @param {Object} data - Location and shopping list.
 * @param {number} data.latitude - User latitude.
 * @param {number} data.longitude - User longitude.
 * @param {number} [data.radius=10] - Search radius.
 * @param {Array} [data.shopping_list] - Items to price.
 * @returns {Promise<Object>} Stores with basket prices.
 */
export const locateCheapestBasket = (data) =>
  apiClient.post('/geo/locate/', data);

/**
 * Get database sync status.
 * @returns {Promise<Object>} Status with last update time.
 */
export const getStatus = () =>
  apiClient.get('/status/');

/**
 * Get dashboard statistics.
 * @returns {Promise<Object>} Dashboard stats including lists count, savings.
 */
export const getDashboardStats = () =>
  apiClient.get('/dashboard/');

/**
 * Get price history for a product (Premium).
 * @param {number} productId - Product ID.
 * @returns {Promise<Array>} Price history data.
 */
export const getPriceHistory = (productId) =>
  apiClient.get(`/premium/history/${productId}/`);

/**
 * Generate survival menu (Premium).
 * @param {number} budget - Total budget in UAH.
 * @param {number} [days=7] - Number of days.
 * @returns {Promise<Object>} Generated menu.
 */
export const generateSurvivalMenu = (budget, days = 7) =>
  apiClient.post('/premium/survival/', { budget, days });

/**
 * Get current promotions.
 * @returns {Promise<Array>} List of promotions.
 */
export const getPromotions = () =>
  apiClient.get('/promotions/');

/**
 * Create a new shopping list.
 * @param {Object} data - Shopping list data.
 * @param {string} data.name - List name.
 * @returns {Promise<Object>} Created shopping list.
 */
export const createShoppingList = (data) =>
  apiClient.post('/shopping-lists/', data);

/**
 * Delete a shopping list.
 * @param {number} id - Shopping list ID.
 * @returns {Promise<void>}
 */
export const deleteShoppingList = (id) =>
  apiClient.delete(`/shopping-lists/${id}/`);

/**
 * Add item to shopping list.
 * @param {number} listId - Shopping list ID.
 * @param {Object} data - Item data (product_id, quantity).
 * @returns {Promise<Object>} Updated shopping list.
 */
export const addItemToList = (listId, data) =>
  apiClient.post(`/shopping-lists/${listId}/add_item/`, data);

/**
 * Remove item from shopping list.
 * @param {number} listId - Shopping list ID.
 * @param {Object} data - Item data (item_id or product_id).
 * @returns {Promise<Object>} Updated shopping list.
 */
export const removeItemFromList = (listId, data) =>
  apiClient.post(`/shopping-lists/${listId}/remove_item/`, data);

/**
 * Toggle item checked status in shopping list.
 * @param {number} listId - Shopping list ID.
 * @param {number} itemId - Item ID.
 * @returns {Promise<Object>} Updated shopping list.
 */
export const toggleListItem = (listId, itemId) =>
  apiClient.post(`/shopping-lists/${listId}/toggle_item/`, { item_id: itemId });

export default apiClient;
