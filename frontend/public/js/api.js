/**
 * API Client for GeneReviews Database
 * Handles all HTTP requests to the backend API
 */
class ApiClient {
    constructor() {
        this.baseUrl = '/api';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Generic HTTP request method
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Get from cache or fetch from API
     */
    async cachedRequest(endpoint, options = {}) {
        const cacheKey = `${endpoint}?${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        const data = await this.request(endpoint, options);
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    }

    /**
     * Health check
     */
    async healthCheck() {
        return await this.request('/health');
    }

    /**
     * Get all categories
     */
    async getCategories() {
        return await this.cachedRequest('/categories');
    }

    /**
     * Search reviews
     */
    async searchReviews(query, options = {}) {
        const params = new URLSearchParams({
            q: query,
            ...options
        });
        
        return await this.request(`/search?${params}`);
    }

    /**
     * Get reviews by category
     */
    async getReviewsByCategory(category, options = {}) {
        const params = new URLSearchParams(options);
        return await this.request(`/categories/${encodeURIComponent(category)}/reviews?${params}`);
    }

    /**
     * Get specific review by ID
     */
    async getReviewById(id) {
        return await this.cachedRequest(`/reviews/${id}`);
    }

    /**
     * Get all reviews with pagination
     */
    async getAllReviews(options = {}) {
        const params = new URLSearchParams(options);
        return await this.request(`/reviews?${params}`);
    }

    /**
     * Get database statistics
     */
    async getStats() {
        return await this.cachedRequest('/stats');
    }

    /**
     * Load data from JSON (admin function)
     */
    async loadData() {
        return await this.request('/admin/load-data', { method: 'POST' });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Create global API client instance
window.api = new ApiClient();