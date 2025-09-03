/**
 * CoWorkSpace - Debug e Fix Frontend
 * Versione con logging esteso per identificare problemi
 */

console.log('🚀 Loading CoWorkSpace Frontend...');

// ===== CONFIGURAZIONE API =====
const API_CONFIG = {
    baseURL: 'http://localhost:3000/api',
    timeout: 10000,
    retries: 2
};

// ===== CLASSE API CLIENT =====
class APIClient {
    constructor(config) {
        this.config = config;
        this.token = localStorage.getItem('auth_token'); // Inizializza il token direttamente da localStorage
        console.log('🔧 APIClient initialized with token:', this.token ? 'YES' : 'NO');
    }


    restoreTokenFromStorage() {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
            this.token = storedToken;
            console.log('🔄 Token restored from localStorage on API client init');
        }
    }

    setToken(token) {
        console.log('🔑 setToken called with:', token ? `${token.substring(0, 20)}...` : 'null');

        this.token = token;

        if (token) {
            try {
                localStorage.setItem('auth_token', token);
                localStorage.setItem('authToken', token); // AGGIUNGI QUESTA RIGA
                console.log('✅ Token saved to localStorage');
            } catch (error) {
                console.warn('⚠️ Could not save token to localStorage:', error);
            }
        } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('authToken'); // AGGIUNGI QUESTA RIGA
        }
    }

    hasValidToken() {
        const memoryToken = this.token;
        const storageToken = localStorage.getItem('auth_token');

        if (memoryToken) {
            if (storageToken && storageToken === memoryToken) {
                console.log('✅ Token in memoria e storage concordano.');
                return true;
            }
        }

        console.log('❌ Token non valido o non presente.');
        return false;
    }

    async request(endpoint, options = {}) {
        const url = `${this.config.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Aggiungi il token di autenticazione se presente
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const fetchOptions = {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : null
        };

        try {
            const response = await fetch(url, fetchOptions);

            // Altrimenti, continua con la gestione normale della risposta
            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Errore nella richiesta API:', error);
            return {
                success: false,
                message: 'Errore di connessione al server.'
            };
        }
    }

    // Auth endpoints
    async login(credentials) {
        console.log('🔐 Attempting login with:', { email: credentials.email, password: '***' });

        const result = await this.request('/auth/login', {
            method: 'POST',
            body: credentials,
            skipAuth: true
        });

        // FIX: Estrai correttamente il token dalla risposta
        if (result.success && result.tokens) {
            console.log('✅ Login successful, extracting token...');

            // Il server restituisce { tokens: { accessToken, refreshToken } }
            const accessToken = result.tokens.accessToken || result.tokens.access_token;
            const refreshToken = result.tokens.refreshToken || result.tokens.refresh_token;

            if (accessToken) {
                console.log('✅ Access token found:', accessToken.substring(0, 20) + '...');

                // Salva i token
                this.setToken(accessToken);
                localStorage.setItem('auth_token', accessToken);

                if (refreshToken) {
                    localStorage.setItem('refresh_token', refreshToken);
                }

                // Aggiungi il token al risultato per compatibilità
                result.token = accessToken;
            } else {
                console.error('❌ No access token found in response:', result);
            }
        } else if (result.success && result.user && result.user.tokens) {
            // Gestisce una struttura di risposta leggermente diversa
            const accessToken = result.user.tokens.accessToken;
            if (accessToken) {
                this.setToken(accessToken);
                localStorage.setItem('auth_token', accessToken);
            }
        }


        return result;
    }

    async register(userData) {
        console.log('📝 Attempting registration with:', { ...userData, password: '***' });
        return this.request('/auth/register', {
            method: 'POST',
            body: userData,
            skipAuth: true
        });
    }

    async logout() {
        try {
            console.log('👋 Attempting logout...');
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.setToken(null);
        }
    }

    async healthCheck() {
        console.log('🏥 Health check...');
        return this.request('/health', { skipAuth: true });
    }

    async getSpaces(filters = {}) {
        const queryString = this.buildQueryString(filters);
        return this.request(`/spaces${queryString}`, { skipAuth: true });
    }

    async getSpace(id) {
        return this.request(`/spaces/${id}`, { skipAuth: true });
    }

    async createSpace(spaceData) {
        return this.request('/spaces', {
            method: 'POST',
            body: spaceData
        });
    }

    async updateSpace(id, spaceData) {
        return this.request(`/spaces/${id}`, {
            method: 'PUT',
            body: spaceData
        });
    }

    async deleteSpace(id) {
        return this.request(`/spaces/${id}`, {
            method: 'DELETE'
        });
    }

    buildQueryString(params) {
        const filtered = Object.entries(params)
            .filter(([key, value]) => value !== '' && value != null && value !== undefined)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        return filtered.length > 0 ? `?${filtered.join('&')}` : '';
    }
}

// ===== STATO GLOBALE DELL'APPLICAZIONE =====
const AppState = {
    currentUser: null,
    isAuthenticated: false,
    currentSpaces: [],
    activeSection: 'home',
    mapZoomLevel: 1,
    selectedCity: null,
    bookings: [],
    filters: {
        city: '',
        type: '',
        minPrice: 0,
        maxPrice: 999999,
        onlyAvailable: false
    },
    spaces: [],
    currentFilters: {
        city: '',
        type: '',
        minPrice: 0,
        maxPrice: 999999,
        search: '',
        sortBy: 'created_at',
        sortOrder: 'DESC'
    },
    api: new APIClient(API_CONFIG)
};

console.log('📊 AppState initialized:', AppState);

// ===== INIZIALIZZAZIONE APP =====
class CoWorkSpaceApp {
    constructor() {
        this.state = AppState;
        console.log('🏗️ CoWorkSpaceApp constructor called');
        this.init();
    }

    async init() {
        console.log('🚀 CoWorkSpace App inizializzazione...');

        // ===================================================================
        // NUOVO CODICE PER GESTIRE IL REDIRECT DI GOOGLE OAUTH - INIZIA QUI
        // ===================================================================
        const params = new URLSearchParams(window.location.search);
        // Nel metodo init() di app.js, nella sezione Google OAuth:
        if (params.has('login_success') && params.get('login_success') === 'true') {
            console.log('✅ Google OAuth redirect detected. Processing...');

            const token = params.get('token');
            const refreshToken = params.get('refresh');
            const userJson = params.get('user');

            if (token && userJson) {
                try {
                    // 1. Salva i dati nel localStorage con le CHIAVI CORRETTE
                    localStorage.setItem('auth_token', token);
                    localStorage.setItem('authToken', token); // Per user.js
                    localStorage.setItem('refresh_token', refreshToken);
                    localStorage.setItem('currentUser', decodeURIComponent(userJson));
                    console.log('📁 Token and user data saved to localStorage.');

                    // 2. Pulisci l'URL per rimuovere i dati sensibili
                    window.history.replaceState({}, document.title, window.location.pathname);
                    console.log('🧹 URL cleaned.');

                    // 3. NUOVO: Forza user.js a ricaricare i dati e aggiornare l'UI
                    if (window.User) {
                        window.User.initializeUser(); // Ricarica dati da localStorage
                        setTimeout(() => {
                            window.User.updateAuthUI(); // Aggiorna UI
                        }, 200);
                    }

                    // 4. Mostra una notifica di successo
                    this.showNotification('Accesso con Google effettuato con successo!', 'success');

                } catch (error) {
                    console.error('❌ Failed to process OAuth data:', error);
                    this.showNotification('Si è verificato un errore durante il login con Google.', 'error');
                }
            }
        }
        // =================================================================
        // NUOVO CODICE PER GESTIRE IL REDIRECT DI GOOGLE OAUTH - FINISCE QUI
        // =================================================================

        try {
            // Test connessione API
            await this.testAPIConnection();

            // Controlla autenticazione esistente (ora funzionerà anche per OAuth)
            await this.checkAuth();

            // Setup event listeners globali
            this.setupGlobalListeners();

            // Inizializza componenti Bootstrap
            this.initializeComponents();

            // Setup scroll handler
            this.setupScrollHandler();

            console.log('✅ App inizializzazione completata');
        } catch (error) {
            console.error('❌ Errore durante inizializzazione:', error);
        }
    }

    async testAPIConnection() {
        try {
            console.log('🔗 Testing API connection...');
            const health = await this.state.api.healthCheck();
            if (health.success) {
                console.log('✅ API Backend connesso:', health.message);
            }
        } catch (error) {
            console.error('❌ Errore connessione API:', error);
            this.showNotification('Errore di connessione al server', 'error');
        }
    }

    async checkAuth() {
        console.log('🔍 Checking existing authentication...');

        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('currentUser');

        console.log('💾 Saved data:', {
            token: savedToken ? 'YES' : 'NO',
            user: savedUser ? 'YES' : 'NO'
        });

        if (savedToken && savedUser) {
            try {
                this.state.api.setToken(savedToken);
                this.state.currentUser = JSON.parse(savedUser);
                this.state.isAuthenticated = true;
                console.log('🔓 Utente ripristinato:', this.state.currentUser.email);
            } catch (e) {
                console.warn('⚠️ Dati utente corrotti, reset auth');
                this.clearAuth();
            }
        }

        // Aggiorna l'UI in base allo stato di autenticazione
        //this.updateAuthUI();
    }

    clearAuth() {
        console.log('🧹 Clearing authentication...');

        this.state.currentUser = null;
        this.state.isAuthenticated = false;
        this.state.api.setToken(null);

        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('refresh_token');

        this.updateAuthUI();
        console.log('✅ Authentication cleared');
    }

    updateAuthUI() {
        console.log('🔄 Updating auth UI...');

        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userInitial = document.getElementById('userInitial');
        const userFullName = document.getElementById('userFullName');
        const userEmail = document.getElementById('userEmail');
        const adminMenuItem = document.getElementById('adminMenuItem');
        const managerMenuItem = document.getElementById('managerMenuItem');


        if (this.state.isAuthenticated && this.state.currentUser) {
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';

            const firstName = this.state.currentUser.firstName || this.state.currentUser.first_name || 'Utente';
            const lastName = this.state.currentUser.lastName || this.state.currentUser.last_name || '';

            if (userInitial) {
                userInitial.textContent = firstName.charAt(0).toUpperCase();
            }
            if (userFullName) {
                userFullName.textContent = `${firstName} ${lastName}`.trim();
            }
            if (userEmail) {
                userEmail.textContent = this.state.currentUser.email || '';
            }

            // Mostra/nascondi voci del menu in base al ruolo
            const userRole = this.state.currentUser.role;
            if (adminMenuItem) {
                adminMenuItem.style.display = userRole === 'admin' ? 'block' : 'none';
            }
            if (managerMenuItem) {
                managerMenuItem.style.display = userRole === 'manager' ? 'block' : 'none';
            }

            console.log(`✅ Auth UI updated for authenticated user (${userRole})`);
        } else {
            if (authButtons) authButtons.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';

            console.log('👋 Auth UI updated for guest user');
        }
    }

    setupGlobalListeners() {
        console.log('👂 Setting up global listeners...');

        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'loginForm') {
                e.preventDefault();
                await this.handleLogin(e.target);
            } else if (e.target.id === 'registerForm') {
                e.preventDefault();
                await this.handleRegister(e.target);
            }
        });

        console.log('✅ Global listeners configured');
    }

    async handleLogin(form) {
        console.log('🔐 Handling login form...');
        const formData = new FormData(form);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            this.showFormLoading(form, true);
            const result = await this.state.api.login(credentials);

            if (result.success) {
                const user = result.user || result.data.user;
                this.state.currentUser = user;
                this.state.isAuthenticated = true;

                // Salva i dati utente nel localStorage
                localStorage.setItem('user', JSON.stringify(user));

                // Chiudi il modal
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (loginModal) loginModal.hide();

                // Aggiorna l'UI e mostra notifica
                this.updateAuthUI();
                this.showNotification('Login effettuato con successo!', 'success');

                // Redirect per admin/manager
                if (user.role === 'admin') {
                    window.location.href = 'template/admin-dashboard.html';
                } else if (user.role === 'manager') {
                    window.location.href = 'template/manager-dashboard.html';
                }

            } else {
                this.showNotification(result.message || 'Credenziali non valide', 'error');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showNotification('Errore durante il login', 'error');
        } finally {
            this.showFormLoading(form, false);
        }
    }

    async handleRegister(form) {
        console.log('📝 Handling register form...');
        const formData = new FormData(form);

        const userData = {
            email: formData.get('registerEmail'),
            password: formData.get('registerPassword'),
            firstName: formData.get('registerName'),
            lastName: formData.get('registerSurname'),
            phone: formData.get('registerPhone'),
            company: formData.get('registerCompany')
        };

        if (userData.password !== formData.get('registerPasswordConfirm')) {
            this.showNotification('Le password non coincidono', 'error');
            return;
        }

        try {
            this.showFormLoading(form, true);
            const result = await this.state.api.register(userData);

            if (result.success) {
                // Chiudi modal
                const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                if(registerModal) registerModal.hide();

                this.showNotification('Registrazione completata! Ora puoi effettuare il login.', 'success');

                // Apri automaticamente il modal di login
                setTimeout(() => showLogin(), 500);
            } else {
                this.showNotification(result.message || 'Errore durante la registrazione', 'error');
            }
        } catch (error) {
            console.error('❌ Register error:', error);
            this.showNotification('Errore durante la registrazione', 'error');
        } finally {
            this.showFormLoading(form, false);
        }
    }

    showFormLoading(form, loading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            if (loading) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Caricamento...';
            } else {
                submitBtn.disabled = false;
                // Ripristina il testo originale (potrebbe essere necessario salvarlo prima)
                if (form.id === 'loginForm') {
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Accedi';
                } else {
                    submitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Registrati';
                }
            }
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        console.log(`📢 Notification: [${type}] ${message}`);
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        container.appendChild(alert);

        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, duration);
    }

    initializeComponents() {
        // ... (codice esistente)
    }

    setupScrollHandler() {
        // ... (codice esistente)
    }

    // Altri metodi della classe...
}


// ===== FUNZIONI GLOBALI =====
function logout() {
    if (window.coworkspaceApp) {
        window.coworkspaceApp.clearAuth();
        window.coworkspaceApp.showNotification('Logout effettuato con successo.', 'info');
        // Ricarica la pagina per assicurare che lo stato sia pulito
        setTimeout(() => window.location.reload(), 500);
    }
}

function showLogin() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

function showRegister() {
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    registerModal.show();
}

function switchToRegister() {
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    if (loginModal) loginModal.hide();

    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    registerModal.show();
}

function switchToLogin() {
    const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
    if (registerModal) registerModal.hide();

    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

// ===== INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', function() {
    window.coworkspaceApp = new CoWorkSpaceApp();
});


// Rendi le funzioni globalmente accessibili se non sono metodi di classe
window.logout = logout;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.switchToLogin = switchToLogin;
window.switchToRegister = switchToRegister;