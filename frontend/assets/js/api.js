/**
 * CoWorkSpace - API Manager
 * Gestione delle chiamate API e comunicazione con il backend
 */

window.API = {
    /**
     * Stato del modulo
     */
    state: {
        initialized: false,
        baseURL: '',
        defaultHeaders: {},
        interceptors: {
            request: [],
            response: []
        },
        cache: new Map(),
        retryAttempts: 3,
        retryDelay: 1000
    },

    /**
     * Configurazione
     */
    config: {
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        cacheTimeout: 300000, // 5 minuti
        endpoints: {
            auth: {
                login: '/api/auth/login',
                register: '/api/auth/register',
                logout: '/api/auth/logout',
                refresh: '/api/auth/refresh',
                verify: '/api/auth/verify'
            },
            users: {
                profile: '/api/users/profile',
                settings: '/api/users/settings',
                bookings: '/api/users/bookings',
                favorites: '/api/users/favorites'
            },
            spaces: {
                list: '/api/spaces',
                search: '/api/spaces/search',
                details: '/api/spaces/:id',
                reviews: '/api/spaces/:id/reviews',
                availability: '/api/spaces/:id/availability'
            },
            bookings: {
                create: '/api/bookings',
                list: '/api/bookings',
                details: '/api/bookings/:id',
                cancel: '/api/bookings/:id/cancel',
                update: '/api/bookings/:id'
            }
        }
    },

    /**
     * Inizializza il modulo API
     */
    async init() {
        try {
            console.log('🌐 Initializing API Manager...');

            // Imposta URL base
            this.setBaseURL(window.CoWorkSpaceConfig?.api?.baseURL || '/api');

            // Imposta headers di default
            this.setDefaultHeaders({
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            });

            // Setup interceptors di base
            this.setupDefaultInterceptors();

            // Test connessione
            await this.testConnection();

            this.state.initialized = true;
            console.log('✅ API Manager initialized');

            return true;

        } catch (error) {
            console.error('❌ Failed to initialize API Manager:', error);
            return false;
        }
    },

    /**
     * Imposta URL base per le API
     */
    setBaseURL(url) {
        this.state.baseURL = url.endsWith('/') ? url.slice(0, -1) : url;
    },

    /**
     * Imposta headers di default
     */
    setDefaultHeaders(headers) {
        this.state.defaultHeaders = { ...this.state.defaultHeaders, ...headers };
    },

    /**
     * Aggiunge header di autenticazione
     */
    setAuthHeader(token) {
        if (token) {
            this.state.defaultHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.state.defaultHeaders['Authorization'];
        }
    },

    /**
     * Setup interceptors di default
     */
    setupDefaultInterceptors() {
        // Request interceptor per aggiungere token
        this.addRequestInterceptor((config) => {
            const token = window.Utils?.storage?.get('auth_token');
            if (token) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
        });

        // Response interceptor per gestire errori comuni
        this.addResponseInterceptor(
            (response) => response,
            (error) => this.handleResponseError(error)
        );
    },

    /**
     * Aggiunge interceptor per le richieste
     */
    addRequestInterceptor(interceptor) {
        this.state.interceptors.request.push(interceptor);
    },

    /**
     * Aggiunge interceptor per le risposte
     */
    addResponseInterceptor(onSuccess, onError) {
        this.state.interceptors.response.push({ onSuccess, onError });
    },

    /**
     * Costruisce URL completo
     */
    buildURL(endpoint, params = {}) {
        let url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        // Sostituisce parametri nel path (es. /api/spaces/:id)
        Object.keys(params).forEach(key => {
            url = url.replace(`:${key}`, params[key]);
        });

        return `${this.state.baseURL}${url}`;
    },

    /**
     * Costruisce query string
     */
    buildQueryString(params) {
        if (!params || Object.keys(params).length === 0) return '';

        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            const value = params[key];
            if (value !== null && value !== undefined && value !== '') {
                queryParams.append(key, value);
            }
        });

        return queryParams.toString() ? `?${queryParams.toString()}` : '';
    },

    /**
     * Applica interceptors alle richieste
     */
    applyRequestInterceptors(config) {
        return this.state.interceptors.request.reduce((acc, interceptor) => {
            return interceptor(acc) || acc;
        }, config);
    },

    /**
     * Applica interceptors alle risposte
     */
    applyResponseInterceptors(response, error = null) {
        return this.state.interceptors.response.reduce((acc, interceptor) => {
            if (error && interceptor.onError) {
                return interceptor.onError(error);
            } else if (!error && interceptor.onSuccess) {
                return interceptor.onSuccess(acc);
            }
            return acc;
        }, response);
    },

    /**
     * Metodo generico per fare richieste HTTP
     */
    async request(method, endpoint, data = null, options = {}) {
        const {
            params = {},
            headers = {},
            timeout = this.config.timeout,
            cache = false,
            retry = true
        } = options;

        // Costruisci configurazione richiesta
        let config = {
            method: method.toUpperCase(),
            headers: { ...this.state.defaultHeaders, ...headers },
            signal: AbortSignal.timeout(timeout)
        };

        // Applica interceptors
        config = this.applyRequestInterceptors(config);

        // Costruisci URL
        const url = this.buildURL(endpoint, params);
        const queryString = this.buildQueryString(data && method === 'GET' ? data : {});
        const fullURL = `${url}${queryString}`;

        // Controlla cache per GET requests
        if (method === 'GET' && cache) {
            const cachedResponse = this.getFromCache(fullURL);
            if (cachedResponse) {
                return cachedResponse;
            }
        }

        // Aggiungi body per richieste non-GET
        if (data && method !== 'GET') {
            if (data instanceof FormData) {
                // Per FormData non impostare Content-Type (lascia che il browser lo faccia)
                delete config.headers['Content-Type'];
                config.body = data;
            } else {
                config.body = JSON.stringify(data);
            }
        }

        // Esegui richiesta con retry
        return this.executeRequestWithRetry(fullURL, config, retry ? this.config.retryAttempts : 0, cache);
    },

    /**
     * Esegue richiesta con logic di retry
     */
    async executeRequestWithRetry(url, config, attemptsLeft, cache = false) {
        try {
            const response = await fetch(url, config);

            // Processa risposta
            const result = await this.processResponse(response);

            // Salva in cache se richiesto
            if (cache && config.method === 'GET') {
                this.saveToCache(url, result);
            }

            return this.applyResponseInterceptors(result);

        } catch (error) {
            console.error(`API request failed: ${error.message}`);

            // Retry se ci sono tentativi rimasti e l'errore è recuperabile
            if (attemptsLeft > 0 && this.isRetryableError(error)) {
                console.log(`Retrying request... ${attemptsLeft} attempts left`);
                await this.delay(this.config.retryDelay);
                return this.executeRequestWithRetry(url, config, attemptsLeft - 1, cache);
            }

            // Applica interceptor di errore
            throw this.applyResponseInterceptors(null, error);
        }
    },

    /**
     * Processa risposta HTTP
     */
    async processResponse(response) {
        let data = null;

        // Tenta di parsare JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (parseError) {
                console.warn('Failed to parse JSON response:', parseError);
                data = await response.text();
            }
        } else {
            data = await response.text();
        }

        // Costruisci oggetto risposta
        const result = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: data,
            headers: Object.fromEntries(response.headers.entries())
        };

        // Aggiungi messaggio di errore se non successful
        if (!response.ok) {
            result.message = data?.message || data?.error || response.statusText;
        }

        return result;
    },

    /**
     * Controlla se l'errore è retry-abile
     */
    isRetryableError(error) {
        // Retry per errori di rete, timeout, e alcuni status HTTP
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            return true;
        }

        if (error.status) {
            // Retry per errori server (5xx) e alcuni 4xx
            return error.status >= 500 || error.status === 408 || error.status === 429;
        }

        return false;
    },

    /**
     * Gestisce errori di risposta
     */
    handleResponseError(error) {
        console.error('API Response Error:', error);

        let userMessage = 'Si è verificato un errore. Riprova più tardi.';

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            userMessage = 'Errore di connessione. Verifica la tua connessione internet.';
        } else if (error.status === 404) {
            userMessage = 'Risorsa non trovata.';
        } else if (error.status === 401 || error.status === 403) {
            userMessage = 'Accesso non autorizzato. Effettua nuovamente il login.';
            this.handleAuthError();
        } else if (error.status === 500) {
            userMessage = 'Errore del server. Riprova più tardi.';
        } else if (error.name === 'AbortError') {
            userMessage = 'Richiesta interrotta per timeout.';
        }

        // Mostra notifica all'utente se Utils disponibile
        if (window.Utils?.notifications?.show) {
            window.Utils.notifications.show(userMessage, 'error');
        }

        // Log per debugging
        if (window.Utils?.error?.handle) {
            window.Utils.error.handle(error, 'API');
        }

        return { error: userMessage, originalError: error };
    },

    /**
     * Gestisce errori di autenticazione
     */
    handleAuthError() {
        // Rimuovi token non valido
        if (window.Utils?.storage?.remove) {
            window.Utils.storage.remove('auth_token');
            window.Utils.storage.remove('user_data');
        }

        // Aggiorna header
        delete this.state.defaultHeaders['Authorization'];

        // Trigger evento logout
        document.dispatchEvent(new CustomEvent('auth:tokenExpired'));

        // Reindirizza al login se necessario
        if (window.Navigation?.showSection) {
            setTimeout(() => {
                window.Navigation.showSection('home');
            }, 1000);
        }
    },

    /**
     * Utility per delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Salva risposta in cache
     */
    saveToCache(url, data) {
        this.state.cache.set(url, {
            data: data,
            timestamp: Date.now()
        });
    },

    /**
     * Recupera risposta dalla cache
     */
    getFromCache(url) {
        const cached = this.state.cache.get(url);
        if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout) {
            return cached.data;
        }
        return null;
    },

    /**
     * Pulisci cache
     */
    clearCache() {
        this.state.cache.clear();
    },

    /**
     * Test connessione API
     */
    async testConnection() {
        try {
            // Tenta una chiamata di test (se endpoint disponibile)
            const response = await fetch(`${this.state.baseURL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                console.log('✅ API connection test successful');
                return true;
            }
        } catch (error) {
            console.warn('⚠️ API connection test failed (endpoint might not exist):', error.message);
            // Non è un errore critico se l'endpoint di health non esiste
        }

        return true; // Assume connessione OK
    },

    // ==================== METODI HTTP SHORTHAND ====================

    /**
     * GET request
     */
    async get(endpoint, params = {}, options = {}) {
        return this.request('GET', endpoint, params, { ...options, cache: options.cache !== false });
    },

    /**
     * POST request
     */
    async post(endpoint, data = {}, options = {}) {
        return this.request('POST', endpoint, data, options);
    },

    /**
     * PUT request
     */
    async put(endpoint, data = {}, options = {}) {
        return this.request('PUT', endpoint, data, options);
    },

    /**
     * PATCH request
     */
    async patch(endpoint, data = {}, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    },

    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    },

    // ==================== METODI SPECIFICI API ====================

    /**
     * Autenticazione - Login
     */
    async login(credentials) {
        return this.post(this.config.endpoints.auth.login, credentials);
    },

    /**
     * Autenticazione - Registrazione
     */
    async register(userData) {
        return this.post(this.config.endpoints.auth.register, userData);
    },

    /**
     * Autenticazione - Logout
     */
    async logout() {
        const result = await this.post(this.config.endpoints.auth.logout);

        // Pulisci token locale
        this.setAuthHeader(null);
        if (window.Utils?.storage?.remove) {
            window.Utils.storage.remove('auth_token');
            window.Utils.storage.remove('user_data');
        }

        return result;
    },

    /**
     * Autenticazione - Refresh token
     */
    async refreshToken() {
        return this.post(this.config.endpoints.auth.refresh);
    },

    /**
     * Profilo utente
     */
    async getUserProfile() {
        return this.get(this.config.endpoints.users.profile);
    },

    /**
     * Aggiorna profilo utente
     */
    async updateUserProfile(profileData) {
        return this.put(this.config.endpoints.users.profile, profileData);
    },

    /**
     * Ottieni impostazioni utente
     */
    async getUserSettings() {
        return this.get(this.config.endpoints.users.settings);
    },

    /**
     * Aggiorna impostazioni utente
     */
    async updateUserSettings(settings) {
        return this.put(this.config.endpoints.users.settings, settings);
    },

    /**
     * Lista spazi
     */
    async getSpaces(filters = {}) {
        return this.get(this.config.endpoints.spaces.list, filters);
    },

    /**
     * Cerca spazi
     */
    async searchSpaces(query, filters = {}) {
        return this.get(this.config.endpoints.spaces.search, { q: query, ...filters });
    },

    /**
     * Dettagli spazio
     */
    async getSpaceDetails(spaceId) {
        return this.get(this.config.endpoints.spaces.details, { id: spaceId });
    },

    /**
     * Recensioni spazio
     */
    async getSpaceReviews(spaceId) {
        return this.get(this.config.endpoints.spaces.reviews, { id: spaceId });
    },

    /**
     * Disponibilità spazio
     */
    async getSpaceAvailability(spaceId, date, startTime, endTime) {
        return this.get(this.config.endpoints.spaces.availability, {
            id: spaceId,
            date,
            startTime,
            endTime
        });
    },

    /**
     * Crea prenotazione
     */
    async createBooking(bookingData) {
        return this.post(this.config.endpoints.bookings.create, bookingData);
    },

    /**
     * Lista prenotazioni utente
     */
    async getUserBookings() {
        return this.get(this.config.endpoints.bookings.list);
    },

    /**
     * Dettagli prenotazione
     */
    async getBookingDetails(bookingId) {
        return this.get(this.config.endpoints.bookings.details, { id: bookingId });
    },

    /**
     * Cancella prenotazione
     */
    async cancelBooking(bookingId, reason = '') {
        return this.post(this.config.endpoints.bookings.cancel, { id: bookingId, reason });
    },

    /**
     * Aggiorna prenotazione
     */
    async updateBooking(bookingId, updateData) {
        return this.put(this.config.endpoints.bookings.update, { id: bookingId, ...updateData });
    },

    /**
     * Upload file
     */
    async uploadFile(file, endpoint = '/api/upload') {
        const formData = new FormData();
        formData.append('file', file);

        return this.post(endpoint, formData, {
            headers: {} // Rimuovi Content-Type per FormData
        });
    },

    /**
     * Download file
     */
    async downloadFile(url, filename) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();

            // Crea link per download
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            return { success: true };

        } catch (error) {
            console.error('Download failed:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== METODI UTILITY ====================

    /**
     * Controlla se API è inizializzata
     */
    isInitialized() {
        return this.state.initialized;
    },

    /**
     * Ottieni stato API
     */
    getStatus() {
        return {
            initialized: this.state.initialized,
            baseURL: this.state.baseURL,
            cacheSize: this.state.cache.size,
            hasAuthToken: !!this.state.defaultHeaders['Authorization']
        };
    },

    /**
     * Reset configurazione
     */
    reset() {
        this.state.defaultHeaders = {};
        this.state.cache.clear();
        this.state.interceptors = { request: [], response: [] };
        this.state.initialized = false;
    }
};

// Auto-inizializzazione se DOM pronto e configurazione disponibile
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.CoWorkSpaceConfig) {
            window.API.init();
        }
    });
} else if (window.CoWorkSpaceConfig) {
    window.API.init();
}