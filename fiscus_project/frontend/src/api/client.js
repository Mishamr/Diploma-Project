/**
 * API client for Fiscus backend.
 */

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1').trim();

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
            ...(this.token ? { 'Authorization': `Token ${this.token}` } : {}),
            ...options.headers,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            let data;
            try {
                data = await response.json();
            } catch (_) {
                data = {};
            }

            if (!response.ok) {
                let msg = data.error || data.detail;

                if (!msg && typeof data === 'object') {
                    const firstKey = Object.keys(data)[0];
                    if (firstKey) {
                        const firstErr = data[firstKey];
                        msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : `${firstKey}: ${firstErr}`;
                    }
                }

                msg = msg || `HTTP ${response.status}`;
                console.error(`[API] Error ${response.status} [${endpoint}]:`, msg, data);
                throw new Error(msg);
            }
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.error(`[API] Timeout [${endpoint}]`);
                throw new Error('Перевищено час очікування відповіді від сервера. Перевірте з\'єднання.');
            }
            console.error(`[API] Error [${endpoint}]:`, error.message);
            throw error;
        }
    }

    async get(endpoint, options = {}) {
        return this._request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, body = {}, options = {}) {
        return this._request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
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

    async updateTickets(amount) {
        return this._request('/auth/profile/tickets/', {
            method: 'POST',
            body: JSON.stringify({ amount }),
        });
    }

    async addCoins(amount) {
        return this._request('/auth/profile/coins/', {
            method: 'POST',
            body: JSON.stringify({ amount }),
        });
    }

    async buyTickets(packageType) {
        return this._request('/auth/profile/store/buy/', {
            method: 'POST',
            body: JSON.stringify({ package: packageType }),
        });
    }

    async upgradeToPro() {
        return this._request('/auth/profile/upgrade-pro/', { method: 'POST' });
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

    async getProductAlternatives(productId, maxPrice = null) {
        let endpoint = `/products/${productId}/alternatives/`;
        if (maxPrice != null) endpoint += `?max_price=${maxPrice}`;
        return this._request(endpoint);
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
    async getCategories(chain = null) {
        let endpoint = '/categories/';
        if (chain) endpoint += `?chain=${chain}`;
        return this._request(endpoint);
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

    async getSurvivalBasket(budget = 5000, days = 7, lat = null, lon = null, chain = null, mealsPerDay = 3) {
        let endpoint = `/survival/?budget=${budget}&days=${days}&meals_per_day=${mealsPerDay}`;
        if (lat && lon) endpoint += `&lat=${lat}&lon=${lon}`;
        if (chain) endpoint += `&chain=${chain}`;
        return this._request(endpoint);
    }

    async getSurvivalSubstitutions(itemName, itemPrice, budget, days, lat = null, lon = null, chain = null) {
        const body = { item_name: itemName, item_price: itemPrice, budget, days };
        if (lat && lon) { body.lat = lat; body.lon = lon; }
        if (chain) { body.chain = chain; }
        return this._request('/survival/substitute/', {
            method: 'POST',
            body: JSON.stringify(body),
        });
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

    async getUserAnalytics() {
        return this._request('/analytics/user/');
    }
}

const apiClient = new ApiClient();
export default apiClient;
