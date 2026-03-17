/**
 * API client for Fiscus backend.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
    constructor() {
        this.token = null;
    }

    setToken(token) {
        this.token = token;
    }

    clearToken() {
        this.token = null;
    }

    async _request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Token ${this.token}`;
        }

        console.log(`[API] ${options.method || 'GET'} ${url}`);

        try {
            const response = await fetch(url, { ...options, headers });

            let data;
            try {
                data = await response.json();
            } catch (_) {
                data = {};
            }

            if (!response.ok) {
                const msg = data.error || data.detail || `HTTP ${response.status}`;
                console.error(`[API] Error ${response.status} [${endpoint}]:`, msg, data);
                throw new Error(msg);
            }

            return data;
        } catch (error) {
            if (error.message === 'Network request failed') {
                console.error(`[API] ❌ Network request failed — backend недоступний?`);
                console.error(`[API] URL: ${url}`);
                console.error(`[API] API_BASE: ${API_BASE}`);
            } else {
                console.error(`[API] Error [${endpoint}]:`, error.message, error);
            }
            throw error;
        }
    }

    // ─── Auth ───
    async register(username, email, password) {
        return this._request('/auth/register/', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        });
    }

    async login(username, password) {
        return this._request('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    }

    async logout() {
        return this._request('/auth/logout/', { method: 'POST' });
    }

    async loginWithGoogle(googleAccessToken) {
        return this._request('/auth/google/', {
            method: 'POST',
            body: JSON.stringify({ access_token: googleAccessToken }),
        });
    }

    async getProfile() {
        return this._request('/auth/profile/');
    }

    async updateProfile(data) {
        return this._request('/auth/profile/', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // ─── Products & Categories ───
    async getCategories() {
        return this._request('/categories/');
    }

    async getProducts(params = {}) {
        if (typeof params === 'string') {
            // Full URL from pagination 'next' field — strip the base prefix
            const urlObj = new URL(params);
            const basePath = new URL(API_BASE).pathname; // e.g. '/api/v1'
            const relativePath = urlObj.pathname.replace(basePath, '') + urlObj.search;
            return this._request(relativePath);
        }
        const query = new URLSearchParams(params).toString();
        return this._request(`/products/?${query}`);
    }

    async getProduct(id) {
        return this._request(`/products/${id}/`);
    }

    async getProductPrices(id, days = 30) {
        return this._request(`/products/${id}/prices/?days=${days}`);
    }

    async searchProducts(query) {
        return this._request(`/products/?search=${encodeURIComponent(query)}`);
    }

    async comparePrice(productId) {
        return this._request(`/compare/?product_id=${productId}`);
    }

    // ─── Chains ───
    async getChains() {
        return this._request('/chains/');
    }

    async getChainProducts(slug, lat, lon) {
        let endpoint = `/chains/${slug}/products/`;
        if (lat && lon) {
            endpoint += `?lat=${lat}&lon=${lon}`;
        }
        return this._request(endpoint);
    }

    async getChainStores(slug) {
        return this._request(`/chains/${slug}/stores/`);
    }

    // ─── Categories ───
    async getCategories() {
        return this._request('/categories/');
    }

    // ─── Shopping Lists ───
    async getShoppingLists() {
        return this._request('/shopping-lists/');
    }

    async createShoppingList(name) {
        return this._request('/shopping-lists/', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }

    async addToShoppingList(listId, productId, customName = '', quantity = 1) {
        return this._request(`/shopping-lists/${listId}/add_item/`, {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, custom_name: customName, quantity }),
        });
    }

    async toggleShoppingItem(listId, itemId) {
        return this._request(`/shopping-lists/${listId}/toggle-item/${itemId}/`, {
            method: 'POST',
        });
    }

    async removeShoppingItem(listId, itemId) {
        return this._request(`/shopping-lists/${listId}/remove-item/${itemId}/`, {
            method: 'DELETE',
        });
    }

    // ─── Features ───
    async getPromotions(limit = 20, chain = null) {
        let endpoint = `/promotions/?limit=${limit}`;
        if (chain) endpoint += `&chain=${chain}`;
        return this._request(endpoint);
    }

    async getSurvivalBasket(budget = 5000, days = 7, lat = null, lon = null) {
        let endpoint = `/survival/?budget=${budget}&days=${days}`;
        if (lat && lon) endpoint += `&lat=${lat}&lon=${lon}`;
        return this._request(endpoint);
    }

    // ─── Analytics ───
    async getInflation(days = 30) {
        return this._request(`/analytics/inflation/?days=${days}`);
    }

    async getPriceIndex() {
        return this._request('/analytics/price-index/');
    }

    // ─── Geo ───
    async getNearbyStores(lat, lon, limit = 10) {
        return this._request(`/geo/nearby/?lat=${lat}&lon=${lon}&limit=${limit}`);
    }

    async getStoresOnMap(chain = null) {
        let endpoint = '/geo/stores/';
        if (chain) endpoint += `?chain=${chain}`;
        return this._request(endpoint);
    }

    async getCheapestBasket(lat, lon, productIds) {
        return this._request('/geo/cheapest-basket/', {
            method: 'POST',
            body: JSON.stringify({ lat, lon, product_ids: productIds }),
        });
    }

    // ─── Analytics ───
    async getSavingsAnalytics() {
        return this._request('/analytics/savings/');
    }

    async getAIRecommendations(cartItems) {
        return this._request('/analytics/ai-recommend/', {
            method: 'POST',
            body: JSON.stringify({ items: cartItems }),
        });
    }

    // ─── Health ───
    async healthCheck() {
        return this._request('/health/');
    }
}

const apiClient = new ApiClient();
export default apiClient;
