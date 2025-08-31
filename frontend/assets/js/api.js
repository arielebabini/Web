/**
 * CoWorkSpace API Client
 * Handles all communication with the backend API
 * Includes authentication, error handling, and retry logic
 */

// ==================== CONFIGURATION ====================
const API_CONFIG = {
    baseUrl: (() => {
        // Auto-detect backend URL based on environment
        const hostname = window.location.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }

        // For Docker or production
        return `http://${hostname}:3000`;
    })(),

    endpoints: {
        // System
        health: '/api/health',

        // Authentication
        auth: {
            test: '/api/auth/test',
            login: '/api/auth/login',
            register: '/api/auth/register',
            refresh: '/api/auth/refresh',
            logout: '/api/auth/logout',
            forgotPassword: '/api/auth/forgot-password',
            resetPassword: '/api/auth/reset-password'
        },

        // Users
        users: {
            profile: '/api/users/profile',
            update: '/api/users/profile',
            list: '/api/users',
            get: '/api/users/:id',
            delete: '/api/users/:id',
            updateRole: '/api/users/:id/role'
        },

        // Spaces
        spaces: {
            list: '/api/spaces',
            get: '/api/spaces/:id',
            create: '/api/spaces',
            update: '/api/spaces/:id',
            delete: '/api/spaces/:id',
            search: '/api/spaces/search',
            availability: '/api/spaces/:id/availability',
            images: '/api/spaces/:id/images'
        },

        // Bookings
        bookings: {
            list: '/api/bookings',
            get: '/api/bookings/:id',
            create: '/api/bookings',
            update: '/api/bookings/:id',
            cancel: '/api/bookings/:id/cancel',
            confirm: '/api/bookings/:id/confirm',
            my: '/api/bookings/my',
            upcoming: '/api/bookings/upcoming',
            history: '/api/bookings/history'
        },

        // Payments
        payments: {
            createIntent: '/api/payments/create-intent',
            confirm: '/api/payments/confirm',
            refund: '/api/payments/refund',
            history: '/api/payments/history',
            methods: '/api/payments/methods',
            webhook: '/api/payments/webhook'
        },

        // Analytics
        analytics: {
            dashboard: '/api/analytics/dashboard',
            spaces: '/api/analytics/spaces',
            bookings: '/api/analytics/bookings',
            revenue: '/api/analytics/revenue',
            users: '/api/analytics/users'
        }
    },

    timeout: 15000,
    retries: 3,
    retryDelay: 1000
};

// ==================== API CLIENT CLASS ====================
class ApiClient {
    constructor() {
        this.config = API_CONFIG;
        this.token = this.getStoredToken();
        this.refreshPromise = null;
        this.requestQueue = [];
        this.isRefreshing = false;

        // Initialize event listeners
        this.setupEventListeners();

        console.log('🔌 ApiClient initialized:', {
            baseUrl: this.config.baseUrl,
            hasToken: !!this.token
        });
    }

    // ==================== EVENT LISTENERS ====================

    setupEventListeners() {
        // Listen for auth events
        window.addEventListener('auth:login', (event) => {
            this.token = event.detail.token;
        });

        window.addEventListener('auth:logout', () => {
            this.token = null;
        });

        // Network status monitoring
        window.addEventListener('online', () => {
            console.log('📶 Network reconnected');
            this.retryQueuedRequests();
        });

        window.addEventListener('offline', () => {
            console.log('📵 Network disconnected');
        });
    }

    // ==================== TOKEN MANAGEMENT ====================

    getStoredToken() {
        try {
            return localStorage.getItem('auth_token');
        } catch (error) {
            console.warn('Could not access localStorage:', error);
            return null;
        }
    }

    setToken(token) {
        this.token = token;
        try {
            if (token) {
                localStorage.setItem('auth_token', token);
            } else {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user_data');
            }
        } catch (error) {
            console.warn('Could not access localStorage:', error);
        }
    }

    // ==================== REQUEST CORE ====================

    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.config.baseUrl}${endpoint}`;
        const requestId = Math.random().toString(36).substr(2, 9);

        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Request-ID': requestId,
                ...options.headers
            },
            signal: options.signal,
            ...options
        };

        // Add authentication
        if (this.token && !options.skipAuth) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        // Add body for non-GET requests
        if (data && method !== 'GET') {
            if (data instanceof FormData) {
                // Remove content-type for FormData (browser sets it)
                delete config.headers['Content-Type'];
                config.body = data;
            } else {
                config.body = JSON.stringify(data);
            }
        }

        // Add query parameters for GET requests
        if (data && method === 'GET') {
            const params = new URLSearchParams(data);
            const separator = url.includes('?') ? '&' : '?';
            endpoint = `${endpoint}${separator}${params.toString()}`;
        }

        try {
            console.log(`📡 API Request [${requestId}]: ${method} ${endpoint}`, {
                hasData: !!data,
                hasAuth: !!this.token
            });

            const response = await this.executeRequest(url, config);
            const result = await this.handleResponse(response, method, endpoint, requestId);

            console.log(`✅ API Success [${requestId}]: ${method} ${endpoint}`);
            return result;

        } catch (error) {
            return this.handleError(error, method, endpoint, requestId, config, data);
        }
    }

    async executeRequest(url, config) {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), this.config.timeout);
        });

        // Execute request with timeout
        const response = await Promise.race([
            fetch(url, config),
            timeoutPromise
        ]);

        return response;
    }

    async handleResponse(response, method, endpoint, requestId) {
        // Handle different content types
        const contentType = response.headers.get('content-type');
        let result;

        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            result = {
                success: response.ok,
                data: await response.text(),
                status: response.status
            };
        }

        // Handle HTTP errors
        if (!response.ok) {
            if (response.status === 401 && !endpoint.includes('/auth/') && this.token) {
                // Try to refresh token
                const refreshed = await this.handleTokenRefresh();
                if (refreshed) {
                    throw new Error('TOKEN_REFRESHED'); // Will trigger retry
                }
            }

            const error = new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.response = result;
            throw error;
        }

        return result;
    }

    async handleError(error, method, endpoint, requestId, config, data) {
        console.error(`❌ API Error [${requestId}]: ${method} ${endpoint}`, {
            error: error.message,
            status: error.status
        });

        // Handle token refresh retry
        if (error.message === 'TOKEN_REFRESHED') {
            console.log(`🔄 Retrying request [${requestId}] with new token`);
            config.headers.Authorization = `Bearer ${this.token}`;
            return this.request(method, endpoint, data, { ...config, skipAuth: false });
        }

        // Handle network errors with retry
        if (this.shouldRetry(error) && !config._retryCount) {
            return this.retryRequest(method, endpoint, data, config);
        }

        // Handle specific error types
        if (error.status === 401) {
            this.handleAuthFailure();
            throw new Error('Sessione scaduta. Effettua nuovamente il login.');
        }

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Impossibile contattare il server. Verifica la connessione.');
        }

        throw error;
    }

    shouldRetry(error) {
        // Retry on network errors, timeouts, or 5xx server errors
        return (
            error.name === 'TypeError' ||
            error.message.includes('timeout') ||
            error.message.includes('fetch') ||
            (error.status >= 500 && error.status < 600)
        );
    }

    async retryRequest(method, endpoint, data, config, attempt = 1) {
        if (attempt > this.config.retries) {
            throw new Error(`Request failed after ${this.config.retries} retries`);
        }

        const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`🔄 Retrying request in ${delay}ms (attempt ${attempt}/${this.config.retries})`);

        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            config._retryCount = attempt;
            return await this.request(method, endpoint, data, config);
        } catch (error) {
            if (this.shouldRetry(error)) {
                return this.retryRequest(method, endpoint, data, config, attempt + 1);
            }
            throw error;
        }
    }

    // ==================== TOKEN REFRESH ====================

    async handleTokenRefresh() {
        if (this.isRefreshing) {
            // Wait for existing refresh to complete
            return new Promise((resolve) => {
                this.requestQueue.push(resolve);
            });
        }

        this.isRefreshing = true;

        try {
            const refreshed = await this.performTokenRefresh();

            // Resolve queued requests
            this.requestQueue.forEach(resolve => resolve(refreshed));
            this.requestQueue = [];

            return refreshed;
        } finally {
            this.isRefreshing = false;
        }
    }

    async performTokenRefresh() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                return false;
            }

            const response = await fetch(`${this.config.baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            const result = await response.json();

            if (response.ok && result.success && result.data.token) {
                this.setToken(result.data.token);

                if (result.data.refreshToken) {
                    localStorage.setItem('refresh_token', result.data.refreshToken);
                }

                console.log('✅ Token refreshed successfully');
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Token refresh failed:', error);
            return false;
        }
    }

    handleAuthFailure() {
        this.setToken(null);

        // Trigger global auth failure event
        window.dispatchEvent(new CustomEvent('auth:failure', {
            detail: { reason: 'token_expired' }
        }));
    }

    async retryQueuedRequests() {
        // Retry failed requests when network comes back online
        // Implementation depends on your needs
        console.log('🔄 Network restored, ready for new requests');
    }

    // ==================== HTTP METHODS ====================

    async get(endpoint, params = {}, options = {}) {
        return this.request('GET', endpoint, params, options);
    }

    async post(endpoint, data = {}, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data = {}, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    async patch(endpoint, data = {}, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    // ==================== UTILITY METHODS ====================

    replaceUrlParams(endpoint, params) {
        let url = endpoint;
        Object.entries(params).forEach(([key, value]) => {
            url = url.replace(`:${key}`, encodeURIComponent(value));
        });
        return url;
    }

    buildQueryString(params) {
        const filtered = Object.entries(params)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => {
                if (Array.isArray(value)) {
                    return value.map(v => `${encodeURIComponent(key)}[]=${encodeURIComponent(v)}`).join('&');
                }
                return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            });

        return filtered.length > 0 ? `?${filtered.join('&')}` : '';
    }

    // ==================== CONNECTION TESTING ====================

    async testConnection() {
        try {
            const result = await this.get(this.config.endpoints.health, {}, { skipAuth: true });
            console.log('🔗 API Connection test:', result.success ? 'SUCCESS' : 'FAILED');
            return result.success;
        } catch (error) {
            console.error('🔗 API Connection test failed:', error);
            return false;
        }
    }

    async checkHealth() {
        try {
            const result = await this.get(this.config.endpoints.health, {}, { skipAuth: true });
            return {
                healthy: result.success,
                services: result.services || {},
                uptime: result.uptime || 0
            };
        } catch (error) {
            console.error('🏥 Health check failed:', error);
            return { healthy: false, error: error.message };
        }
    }

    // ==================== AUTHENTICATION METHODS ====================

    async login(credentials) {
        const result = await this.post(this.config.endpoints.auth.login, credentials, { skipAuth: true });

        if (result.success && result.data) {
            this.setToken(result.data.token);

            // Store refresh token
            if (result.data.refreshToken) {
                localStorage.setItem('refresh_token', result.data.refreshToken);
            }

            // Store user data
            if (result.data.user) {
                localStorage.setItem('user_data', JSON.stringify(result.data.user));
            }

            console.log('✅ Login successful for user:', result.data.user?.email);

            // Trigger login event
            window.dispatchEvent(new CustomEvent('auth:login', {
                detail: {
                    user: result.data.user,
                    token: result.data.token
                }
            }));
        }

        return result;
    }

    async register(userData) {
        const result = await this.post(this.config.endpoints.auth.register, userData, { skipAuth: true });
        console.log('📝 Registration result:', result.success ? 'SUCCESS' : 'FAILED');
        return result;
    }

    async logout() {
        try {
            if (this.token) {
                await this.post(this.config.endpoints.auth.logout);
            }
        } catch (error) {
            console.warn('⚠️ Logout API call failed:', error.message);
        } finally {
            this.setToken(null);
            console.log('👋 Logout completed');

            window.dispatchEvent(new CustomEvent('auth:logout'));
        }
    }

    async forgotPassword(email) {
        return this.post(this.config.endpoints.auth.forgotPassword, { email }, { skipAuth: true });
    }

    async resetPassword(token, newPassword) {
        return this.post(this.config.endpoints.auth.resetPassword, {
            token,
            newPassword
        }, { skipAuth: true });
    }

    // ==================== USER METHODS ====================

    async getProfile() {
        return this.get(this.config.endpoints.users.profile);
    }

    async updateProfile(userData) {
        const result = await this.put(this.config.endpoints.users.update, userData);

        if (result.success && result.data) {
            // Update stored user data
            localStorage.setItem('user_data', JSON.stringify(result.data));
        }

        return result;
    }

    async getUsers(filters = {}) {
        const queryString = this.buildQueryString(filters);
        return this.get(`${this.config.endpoints.users.list}${queryString}`);
    }

    async getUser(id) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.users.get, { id });
        return this.get(endpoint);
    }

    async deleteUser(id) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.users.delete, { id });
        return this.delete(endpoint);
    }

    async updateUserRole(id, role) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.users.updateRole, { id });
        return this.patch(endpoint, { role });
    }

    // ==================== SPACE METHODS ====================

    async getSpaces(filters = {}) {
        const queryString = this.buildQueryString(filters);
        return this.get(`${this.config.endpoints.spaces.list}${queryString}`);
    }

    async getSpace(id) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.spaces.get, { id });
        return this.get(endpoint);
    }

    async createSpace(spaceData) {
        return this.post(this.config.endpoints.spaces.create, spaceData);
    }

    async updateSpace(id, spaceData) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.spaces.update, { id });
        return this.put(endpoint, spaceData);
    }

    async deleteSpace(id) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.spaces.delete, { id });
        return this.delete(endpoint);
    }

    async searchSpaces(query, filters = {}) {
        const params = { q: query, ...filters };
        const queryString = this.buildQueryString(params);
        return this.get(`${this.config.endpoints.spaces.search}${queryString}`);
    }

    async getSpaceAvailability(id, startDate, endDate) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.spaces.availability, { id });
        const params = { startDate, endDate };
        const queryString = this.buildQueryString(params);
        return this.get(`${endpoint}${queryString}`);
    }

    async uploadSpaceImages(id, images) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.spaces.images, { id });
        const formData = new FormData();

        if (Array.isArray(images)) {
            images.forEach(image => formData.append('images', image));
        } else {
            formData.append('images', images);
        }

        return this.post(endpoint, formData);
    }

    // ==================== BOOKING METHODS ====================

    async getBookings(filters = {}) {
        const queryString = this.buildQueryString(filters);
        return this.get(`${this.config.endpoints.bookings.list}${queryString}`);
    }

    async getMyBookings() {
        return this.get(this.config.endpoints.bookings.my);
    }

    async getUpcomingBookings() {
        return this.get(this.config.endpoints.bookings.upcoming);
    }

    async getBookingHistory() {
        return this.get(this.config.endpoints.bookings.history);
    }

    async getBooking(id) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.bookings.get, { id });
        return this.get(endpoint);
    }

    async createBooking(bookingData) {
        return this.post(this.config.endpoints.bookings.create, bookingData);
    }

    async updateBooking(id, bookingData) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.bookings.update, { id });
        return this.put(endpoint, bookingData);
    }

    async cancelBooking(id, reason = '') {
        const endpoint = this.replaceUrlParams(this.config.endpoints.bookings.cancel, { id });
        return this.post(endpoint, { reason });
    }

    async confirmBooking(id) {
        const endpoint = this.replaceUrlParams(this.config.endpoints.bookings.confirm, { id });
        return this.post(endpoint);
    }

    // ==================== PAYMENT METHODS ====================

    async createPaymentIntent(bookingData) {
        return this.post(this.config.endpoints.payments.createIntent, bookingData);
    }

    async confirmPayment(paymentIntentId, paymentMethodId = null) {
        return this.post(this.config.endpoints.payments.confirm, {
            paymentIntentId,
            paymentMethodId
        });
    }

    async refundPayment(paymentId, amount = null, reason = '') {
        return this.post(this.config.endpoints.payments.refund, {
            paymentId,
            amount,
            reason
        });
    }

    async getPaymentHistory(filters = {}) {
        const queryString = this.buildQueryString(filters);
        return this.get(`${this.config.endpoints.payments.history}${queryString}`);
    }

    async getPaymentMethods() {
        return this.get(this.config.endpoints.payments.methods);
    }

    // ==================== ANALYTICS METHODS ====================

    async getDashboardAnalytics(dateRange = {}) {
        const queryString = this.buildQueryString(dateRange);
        return this.get(`${this.config.endpoints.analytics.dashboard}${queryString}`);
    }

    async getSpaceAnalytics(spaceId = null, dateRange = {}) {
        const params = spaceId ? { spaceId, ...dateRange } : dateRange;
        const queryString = this.buildQueryString(params);
        return this.get(`${this.config.endpoints.analytics.spaces}${queryString}`);
    }

    async getBookingAnalytics(filters = {}) {
        const queryString = this.buildQueryString(filters);
        return this.get(`${this.config.endpoints.analytics.bookings}${queryString}`);
    }

    async getRevenueAnalytics(dateRange = {}) {
        const queryString = this.buildQueryString(dateRange);
        return this.get(`${this.config.endpoints.analytics.revenue}${queryString}`);
    }

    async getUserAnalytics(filters = {}) {
        const queryString = this.buildQueryString(filters);
        return this.get(`${this.config.endpoints.analytics.users}${queryString}`);
    }
}

// ==================== GLOBAL INITIALIZATION ====================

// Create global instance
window.api = new ApiClient();

// Auto-test connection on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 CoWorkSpace API Client loaded');

    // Test connection
    const isHealthy = await window.api.checkHealth();
    if (isHealthy.healthy) {
        console.log('✅ Backend connection established');
    } else {
        console.warn('⚠️ Backend connection failed:', isHealthy.error);

        // Show user notification if available
        if (window.notifications?.show) {
            window.notifications.show(
                'Problema di connessione con il server. Alcune funzionalità potrebbero non essere disponibili.',
                'warning'
            );
        }
    }
});

// Export for ES6 modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}