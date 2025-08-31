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
        console.log('🔐 setToken called with:', token ? `${token.substring(0, 20)}...` : 'null');

        this.token = token;

        if (token) {
            try {
                localStorage.setItem('auth_token', token);
                console.log('✅ Token saved to localStorage');
            } catch (error) {
                console.warn('⚠️ Could not save token to localStorage:', error);
            }
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
        this.checkAuth();
        this.init();
    }

    async init() {
        console.log('🚀 CoWorkSpace App inizializzazione...');

        try {
            // Test connessione API
            await this.testAPIConnection();

            // Controlla autenticazione esistente
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

    async initializeAuth() {
        console.log('🔐 Initializing authentication with enhanced token protection...');

        const justLoggedIn = localStorage.getItem('just_logged_in') === 'true';
        const loginInProgress = sessionStorage.getItem('login_in_progress') === 'true';

        console.log('🔍 Login status:', { justLoggedIn, loginInProgress });

        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('user');

        console.log('📦 Stored data check:', {
            hasToken: !!savedToken,
            hasUser: !!savedUser,
            tokenLength: savedToken?.length,
            userEmail: savedUser ? (() => {
                try { return JSON.parse(savedUser).email; }
                catch { return 'INVALID_JSON'; }
            })() : null
        });

        if (savedToken && savedUser) {
            try {
                console.log('🔄 Restoring authentication state...');

                // 1. Ripristina token nell'API client
                this.state.api.setToken(savedToken);

                // 2. Ripristina dati utente
                this.state.currentUser = JSON.parse(savedUser);
                this.state.isAuthenticated = true;

                // 3. Verifica coerenza tra API client e localStorage
                if (this.state.api.token !== savedToken) {
                    console.warn('⚠️ Token mismatch, fixing...');
                    this.state.api.setToken(savedToken);
                }

                console.log('✅ Authentication state restored:', {
                    email: this.state.currentUser.email,
                    role: this.state.currentUser.role,
                    isAuthenticated: this.state.isAuthenticated,
                    tokenPresent: !!this.state.api.token
                });

                // 4. Se appena loggato, pulisci flag e mostra welcome
                if (justLoggedIn) {
                    setTimeout(() => {
                        localStorage.setItem('just_logged_in', 'false');
                        this.showNotification(`Benvenuto, ${this.state.currentUser.firstName || this.state.currentUser.first_name || this.state.currentUser.email}!`, 'success');
                    }, 1000);
                }

                // 5. Verifica token solo se NON appena loggato (evita rallentamenti)
                if (!justLoggedIn && !loginInProgress) {
                    try {
                        console.log('🔍 Verifying token with server...');
                        const profileCheck = await this.state.api.getProfile();
                        if (profileCheck.success) {
                            // Aggiorna con dati freschi
                            this.state.currentUser = profileCheck.data;
                            localStorage.setItem('user', JSON.stringify(profileCheck.data));
                            console.log('✅ Token verified and user data refreshed');
                        } else {
                            throw new Error('Token validation failed');
                        }
                    } catch (verificationError) {
                        console.warn('⚠️ Token verification failed:', verificationError.message);

                        // NON fare clear se siamo sulla home page o appena loggati
                        const onHomePage = ['/', '/index.html'].includes(window.location.pathname);
                        if (!onHomePage && !justLoggedIn) {
                            console.log('🧹 Clearing invalid authentication');
                            this.clearAuth();
                            return;
                        } else {
                            console.log('🛡️ Keeping authentication despite verification failure (on home page or just logged in)');
                        }
                    }
                }

                this.updateAuthUI();

            } catch (restoreError) {
                console.warn('⚠️ Error restoring authentication:', restoreError);

                if (!justLoggedIn && !loginInProgress) {
                    this.clearAuth();
                } else {
                    console.log('🛡️ Prevented auth clear during login process');
                }
            }
        } else {
            console.log('📝 No authentication data found, starting as guest');
            this.updateAuthUI();
        }

        // Pulisci flag obsoleti dopo l'inizializzazione
        setTimeout(() => {
            if (justLoggedIn) {
                localStorage.setItem('just_logged_in', 'false');
            }
        }, 5000);
    }

    async testAPIConnection() {
        try {
            console.log('🔗 Testing API connection...');
            const health = await this.state.api.healthCheck();
            if (health.success) {
                console.log('✅ API Backend connesso:', health.message);
                this.showNotification('Backend connesso correttamente', 'success', 2000);
            }
        } catch (error) {
            console.error('❌ Errore connessione API:', error);
            this.showNotification('Errore di connessione al server', 'error');
        }
    }

    async checkAuth() {
        console.log('🔍 Checking existing authentication...');

        // IMPORTANTE: Pulisci sempre lo stato all'inizio per evitare dati fantasma
        /*this.state.currentUser = null;
        this.state.isAuthenticated = false;
        this.state.api.setToken(null);*/

        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('user') || localStorage.getItem('user_data');

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

        // IMPORTANTE: Aggiorna l'UI alla fine
        this.updateAuthUI();
    }

    clearAuth() {
        console.log('🧹 Clearing authentication...');

        // Verifica se dobbiamo davvero fare clear
        const justLoggedIn = localStorage.getItem('just_logged_in') === 'true';
        const loginInProgress = sessionStorage.getItem('login_in_progress') === 'true';
        const onHomePage = ['/', '/index.html'].includes(window.location.pathname);

        console.log('🔍 Clear auth check:', { justLoggedIn, loginInProgress, onHomePage });

        // Previeni clear inappropriato
        if ((justLoggedIn || loginInProgress) && onHomePage) {
            console.log('⚠️ Prevented inappropriate auth clear');
            return;
        }

        // Procedi con il clear
        /*this.state.currentUser = null;
        this.state.isAuthenticated = false;
        this.state.api.setToken(null);*/

        // Pulisci tutto il localStorage relativo all'auth
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('user_data');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('just_logged_in');
        sessionStorage.removeItem('login_success');
        sessionStorage.removeItem('login_in_progress');

        this.updateAuthUI();
        console.log('✅ Authentication cleared');
    }

    updateAuthUI() {
        console.log('🔄 Updating auth UI...');
        console.log('Current user object:', this.state.currentUser);
        console.log('User role:', this.state.currentUser?.role);
        console.log('Is authenticated:', this.state.isAuthenticated);

        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userInitial = document.getElementById('userInitial');
        const userFullName = document.getElementById('userFullName');
        const userEmail = document.getElementById('userEmail');
        const adminMenuItem = document.getElementById('adminMenuItem');

        if (this.state.isAuthenticated && this.state.currentUser) {
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';

            // Imposta l'iniziale dell'utente
            if (userInitial && this.state.currentUser.first_name) {
                userInitial.textContent = this.state.currentUser.first_name.charAt(0).toUpperCase();
            }

            // Imposta il nome completo
            if (userFullName) {
                const fullName = `${this.state.currentUser.first_name || ''} ${this.state.currentUser.last_name || ''}`.trim();
                userFullName.textContent = fullName || 'Utente';
            }

            // Imposta l'email
            if (userEmail) {
                userEmail.textContent = this.state.currentUser.email || '';
            }

            // Mostra/nascondi voce admin nel menu
            if (adminMenuItem) {
                if (this.state.currentUser.role === 'admin') {
                    adminMenuItem.style.display = 'block';
                    console.log('👑 Admin menu item shown');
                } else {
                    adminMenuItem.style.display = 'none';
                }
            }

            console.log('✅ Auth UI updated for authenticated user');
        } else {
            if (authButtons) authButtons.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
            if (adminMenuItem) adminMenuItem.style.display = 'none';

            console.log('👋 Auth UI updated for guest user');
        }
    }

    setupGlobalListeners() {
        console.log('👂 Setting up global listeners...');

        document.addEventListener('DOMContentLoaded', async function() {
            console.log('🚀 App starting with improved auth handling...');

            try {
                window.coworkspaceApp = new CoWorkSpaceApp();

                // Inizializza l'autenticazione con il nuovo sistema
                await window.coworkspaceApp.initializeAuth();

                console.log('✅ App initialization completed');

            } catch (error) {
                console.error('❌ Errore durante inizializzazione:', error);
            }
        });

        // Gestione form di login e registrazione
        document.addEventListener('submit', async (e) => {
            console.log('📝 Form submit detected:', e.target.id);

            if (e.target.id === 'loginForm') {
                console.log('🔑 Login form submitted');
                e.preventDefault();
                await this.handleLogin(e.target);
            } else if (e.target.id === 'registerForm') {
                console.log('📝 Register form submitted');
                e.preventDefault();
                await this.handleRegister(e.target);
            }
        });

        // Gestione click sui pulsanti
        document.addEventListener('click', (e) => {
            console.log('🖱️ Click detected on:', e.target.tagName, e.target.id, e.target.className);

            if (e.target.classList.contains('quick-filter-btn')) {
                this.handleQuickFilter(e.target);
            }

            // Debug: log clicks sui pulsanti di login/register
            if (e.target.id === 'loginBtn' || e.target.textContent.includes('Accedi')) {
                console.log('🔑 Login button clicked');
            }
            if (e.target.id === 'registerBtn' || e.target.textContent.includes('Registrati')) {
                console.log('📝 Register button clicked');
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.id === 'applyFiltersBtn') {
                window.coworkspaceApp.applyFilters();
            }
            if (e.target.id === 'clearFiltersBtn') {
                window.coworkspaceApp.clearFilters();
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

        console.log('Login credentials:', {email: credentials.email, password: '[HIDDEN]'});

        try {
            this.showFormLoading(form, true);

            localStorage.setItem('just_logged_in', 'true');
            sessionStorage.setItem('login_in_progress', 'true');

            const result = await this.state.api.login(credentials);
            console.log('🎯 Login API result:', result);

            if (result.success) {
                console.log('✅ Login successful, processing result...');

                // Estrai i dati dall'oggetto result
                let userData, tokenData, refreshToken;

                // Prova diverse strutture di risposta possibili
                if (result.data) {
                    userData = result.data.user || result.data;
                    tokenData = result.data.tokens?.accessToken || result.data.token || result.data.accessToken;
                    refreshToken = result.data.tokens?.refreshToken || result.data.refreshToken;
                } else if (result.user) {
                    userData = result.user;
                    tokenData = result.tokens?.accessToken || result.token || result.accessToken;
                    refreshToken = result.tokens?.refreshToken || result.refreshToken;
                } else {
                    // Fallback: usa direttamente result
                    userData = result;
                    tokenData = result.tokens?.accessToken || result.token;
                    refreshToken = result.tokens?.refreshToken || result.refreshToken;
                }

                console.log('📊 Extracted data:', {
                    user: userData,
                    hasToken: !!tokenData,
                    hasRefreshToken: !!refreshToken,
                    userRole: userData?.role
                });

                // IMPORTANTE: Verifica che userData contenga i campi necessari
                if (!userData || !userData.id || !userData.email) {
                    throw new Error('Dati utente incompleti ricevuti dal server');
                }

                console.log('💾 Saving authentication data...');

                try {
                    // 1. Salva il token nell'API client E localStorage
                    this.state.api.setToken(tokenData);

                    // 2. Doppia verifica salvataggio token
                    localStorage.setItem('auth_token', tokenData);
                    const tokenCheck1 = localStorage.getItem('auth_token');
                    if (!tokenCheck1) {
                        throw new Error('Token non salvato correttamente (primo tentativo)');
                    }

                    // 3. Salva dati utente
                    localStorage.setItem('user', JSON.stringify(userData));
                    const userCheck = localStorage.getItem('user');
                    if (!userCheck) {
                        throw new Error('Dati utente non salvati correttamente');
                    }

                    // 4. Salva refresh token se presente
                    if (refreshToken) {
                        localStorage.setItem('refresh_token', refreshToken);
                    }

                    // 5. Aggiorna stato app
                    this.state.currentUser = userData;
                    this.state.isAuthenticated = true;

                    // 6. Verifica finale multipla
                    setTimeout(() => {
                        const finalTokenCheck = localStorage.getItem('auth_token');
                        const finalUserCheck = localStorage.getItem('user');
                        const apiTokenCheck = this.state.api.token;

                        console.log('🔍 Final verification:', {
                            localStorage_token: !!finalTokenCheck,
                            localStorage_user: !!finalUserCheck,
                            api_token: !!apiTokenCheck,
                            app_authenticated: this.state.isAuthenticated,
                            token_match: finalTokenCheck === apiTokenCheck
                        });

                        if (!finalTokenCheck || !apiTokenCheck || finalTokenCheck !== apiTokenCheck) {
                            console.error('❌ Token mismatch detected! Re-saving...');
                            localStorage.setItem('auth_token', tokenData);
                            this.state.api.setToken(tokenData);
                        }
                    }, 100);

                    console.log('✅ Authentication data saved successfully');

                } catch (saveError) {
                    console.error('❌ Error saving authentication data:', saveError);
                    localStorage.setItem('just_logged_in', 'false');
                    throw saveError;
                }

                // Chiudi modal
                const loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    const modal = bootstrap.Modal.getInstance(loginModal) || new bootstrap.Modal(loginModal);
                    modal.hide();
                }

                // Aggiorna UI per mostrare utente loggato
                this.updateAuthUI();
                this.showNotification('Login effettuato con successo!', 'success');

                console.log('🎯 Preparing redirect for role:', userData.role);

                // ===== REDIRECT MIGLIORATO PER CLIENT =====
                if (userData.role === 'admin') {
                    setTimeout(() => {
                        window.location.href = '/template/admin-dashboard.html';
                    }, 100);
                } else if (userData.role === 'manager') {
                    setTimeout(() => {
                        window.location.href = '/template/manager-dashboard.html';
                    }, 100);
                } else {
                    console.log('👥 Client user - setting up persistent redirect');

                    // Salva un flag per indicare che è appena stato fatto login
                    localStorage.setItem('just_logged_in', 'true');
                    sessionStorage.setItem('login_success', 'true');
                }
            } else {
                localStorage.setItem('just_logged_in', 'false');
                console.error('❌ Login failed:', result.message);
                this.showNotification(result.message || 'Credenziali non valide', 'error');
            }
        } catch (error) {
            localStorage.setItem('just_logged_in', 'false');
            sessionStorage.removeItem('login_in_progress');
            console.error('❌ Login error:', error);
            this.showNotification('Errore durante il login: ' + error.message, 'error');
        } finally {
            sessionStorage.removeItem('login_in_progress');
            this.showFormLoading(form, false);
        }
    }

    async handleRegister(form) {
        console.log('📝 Handling register form...');
        const formData = new FormData(form);

        // Log all form data
        for (let [key, value] of formData.entries()) {
            console.log(`📄 Form field ${key}:`, key.includes('password') ? '***' : value);
        }

        const userData = {
            email: formData.get('registerEmail')?.trim() || formData.get('email')?.trim(),
            password: formData.get('registerPassword') || formData.get('password'),
            firstName: formData.get('registerName')?.trim() || formData.get('firstName')?.trim() || formData.get('name')?.trim(),
            lastName: formData.get('registerSurname')?.trim() || formData.get('lastName')?.trim() || formData.get('surname')?.trim(),
            phone: formData.get('registerPhone')?.trim() || formData.get('phone')?.trim(),
            company: formData.get('registerCompany')?.trim() || formData.get('company')?.trim()
        };

        const confirmPassword = formData.get('registerPasswordConfirm');

        console.log('🔍 Extracted user data:', { ...userData, password: '***' });

        // Validazioni
        if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
            console.warn('⚠️ Missing required fields');
            this.showNotification('Compila tutti i campi obbligatori', 'warning');
            return;
        }

        if (userData.password !== confirmPassword) {
            console.warn('⚠️ Password mismatch');
            this.showNotification('Le password non coincidono', 'error');
            return;
        }

        const acceptTerms = form.querySelector('#acceptTerms') || form.querySelector('[name="acceptTerms"]');
        if (!acceptTerms?.checked) {
            console.warn('⚠️ Terms not accepted');
            this.showNotification('Devi accettare i termini e condizioni', 'warning');
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(userData.password)) {
            this.showNotification('La password deve contenere almeno 8 caratteri con una maiuscola, una minuscola e un numero', 'warning');
            return;
        }


        try {
            this.showFormLoading(form, true);

            const result = await this.state.api.register(userData);
            console.log('📥 Register result:', result);

            if (result.success) {

                if (result.tokens) {
                    this.state.api.setToken(result.tokens.accessToken);
                    localStorage.setItem('refresh_token', result.tokens.refreshToken);
                }

                if (result.user) {
                    this.state.currentUser = result.user;
                    this.state.isAuthenticated = true;
                    localStorage.setItem('user_data', JSON.stringify(result.user));
                }

                // Chiudi modal registrazione
                const registerModal = document.getElementById('registerModal');
                if (registerModal) {
                    const modal = bootstrap.Modal.getInstance(registerModal) || new bootstrap.Modal(registerModal);
                    modal.hide();
                }

                // Aggiorna UI e mostra notifica
                this.updateAuthUI();
                this.showNotification('Registrazione completata! Benvenuto!', 'success');

                // Mostra automaticamente login modal
                setTimeout(() => {
                    const loginModal = document.getElementById('loginModal');
                    if (loginModal) {
                        const modal = new bootstrap.Modal(loginModal);
                        modal.show();

                        // Pre-compila email
                        const emailInput = document.getElementById('loginEmail') || document.querySelector('[name="loginEmail"]') || document.querySelector('[name="email"]');
                        if (emailInput) emailInput.value = userData.email;
                    }
                }, 1000);
            } else {
                this.showNotification(result.message || 'Errore durante la registrazione', 'error');
            }
        } catch (error) {
            console.error('❌ Register error:', error);
            this.showNotification('Errore durante la registrazione: ' + error.message, 'error');
        } finally {
            this.showFormLoading(form, false);
        }
    }

    // Controlla se serve setup admin all'avvio
    async checkAdminSetup() {
        try {
            const response = await fetch('/api/auth/setup-status');
            const data = await response.json();

            if (data.needsSetup) {
                // Mostra modal setup
                const setupModal = new bootstrap.Modal(document.getElementById('adminSetupModal'));
                setupModal.show();

                // Gestisci form setup
                document.getElementById('adminSetupForm').onsubmit = async (e) => {
                    e.preventDefault();
                    await this.handleAdminSetup(e.target);
                };
            }
        } catch (error) {
            console.error('Setup check failed:', error);
        }
    }

    async handleAdminSetup(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/auth/setup-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('Admin creato! Ora puoi fare login.');
                bootstrap.Modal.getInstance(document.getElementById('adminSetupModal')).hide();
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('Errore durante la creazione admin');
        }
    }

    handleQuickFilter(button) {
        const filter = button.getAttribute('data-filter');
        button.classList.toggle('active');

        // Applica filtro
        if (typeof applyFilter === 'function') {
            applyFilter(filter, button.classList.contains('active'));
        }
    }

    showFormLoading(form, loading) {
        console.log('⏳ Setting form loading state:', loading);
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.btn-primary');
        if (submitBtn) {
            if (loading) {
                submitBtn.disabled = true;
                const originalText = submitBtn.textContent;
                submitBtn.setAttribute('data-original-text', originalText);
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Attendere...';
            } else {
                submitBtn.disabled = false;
                const originalText = submitBtn.getAttribute('data-original-text') || 'Invia';
                submitBtn.innerHTML = originalText;
            }
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        console.log(`📢 Notification: [${type}] ${message}`);

        // Rimuovi notifiche esistenti
        const existing = document.querySelectorAll('.notification-toast');
        existing.forEach(el => el.remove());

        const notification = document.createElement('div');
        notification.className = `notification-toast alert alert-${type === 'error' ? 'danger' : type} alert-dismissible position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type] || 'ℹ️';

        notification.innerHTML = `
            ${icon} ${message}
            <button type="button" class="btn-close" aria-label="Close"></button>
        `;

        document.body.appendChild(notification);

        // Gestione chiusura
        const closeBtn = notification.querySelector('.btn-close');
        closeBtn?.addEventListener('click', () => notification.remove());

        // Auto rimozione
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
    }

    initializeComponents() {
        console.log('🔧 Initializing Bootstrap components...');

        try {
            // Inizializza tooltip Bootstrap
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });

            // Inizializza popover Bootstrap
            const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
            popoverTriggerList.map(function (popoverTriggerEl) {
                return new bootstrap.Popover(popoverTriggerEl);
            });

            console.log('✅ Bootstrap components initialized');
        } catch (error) {
            console.warn('⚠️ Bootstrap components initialization failed:', error);
        }
    }

    setupScrollHandler() {
        console.log('📜 Setting up scroll handler...');
        let lastScroll = 0;
        const navbar = document.querySelector('.navbar');
        const backToTop = document.getElementById('backToTop');

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            // Mostra/nascondi back to top
            if (backToTop) {
                if (currentScroll > 100) {
                    backToTop.style.display = 'block';
                } else {
                    backToTop.style.display = 'none';
                }
            }

            // Navbar scroll effect
            if (navbar) {
                if (currentScroll > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }

            lastScroll = currentScroll;
        });
    }

    async loadSpaces(filters = {}) {
        try {
            console.log('📍 Loading spaces with filters:', filters);

            const result = await this.state.api.getSpaces(filters);

            if (result.success) {
                this.state.spaces = result.spaces || [];
                this.state.pagination = result.pagination || {};
                console.log(`✅ Loaded ${this.state.spaces.length} spaces`);

                this.renderSpaces();
                this.renderPagination();
            } else {
                this.showNotification('Errore nel caricamento degli spazi', 'error');
            }
        } catch (error) {
            console.error('❌ Error loading spaces:', error);
            this.showNotification('Errore di connessione durante il caricamento degli spazi', 'error');
        }
    }

    renderSpaces() {
        const container = document.getElementById('spacesContainer');
        if (!container) return;

        if (this.state.spaces.length === 0) {
            container.innerHTML = this.getEmptySpacesHTML();
            return;
        }

        const spacesHTML = this.state.spaces.map(space => this.getSpaceCardHTML(space)).join('');
        container.innerHTML = spacesHTML;
    }

    getSpaceCardHTML(space) {
        const typeLabels = {
            'hot-desk': 'Hot Desk',
            'private-office': 'Ufficio Privato',
            'meeting-room': 'Sala Riunioni',
            'event-space': 'Spazio Eventi'
        };

        const amenityIcons = {
            'wifi': 'fas fa-wifi',
            'coffee': 'fas fa-coffee',
            'printer': 'fas fa-print',
            'parking': 'fas fa-parking',
            'kitchen': 'fas fa-utensils',
            'lounge_area': 'fas fa-couch',
            'outdoor_space': 'fas fa-tree',
            'air_conditioning': 'fas fa-snowflake',
            'bike_parking': 'fas fa-bicycle',
            'projector': 'fas fa-video',
            'whiteboard': 'fas fa-chalkboard',
            'terrace': 'fas fa-umbrella-beach',
            'meeting_room': 'fas fa-users'
        };

        const rating = parseFloat(space.rating) || 0;
        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

        return `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="card space-card h-100" onclick="showSpaceDetails('${space.id}')">
                <div class="card-img-wrapper">
                    <img src="${space.images[0] || '/assets/images/placeholder-space.jpg'}" 
                         class="card-img-top" alt="${space.name}">
                    <div class="card-badges">
                        ${space.is_featured ? '<span class="badge bg-warning">Featured</span>' : ''}
                        <span class="badge bg-primary">${typeLabels[space.type] || space.type}</span>
                    </div>
                </div>
                <div class="card-body">
                    <h5 class="card-title">${space.name}</h5>
                    <p class="card-text text-muted small mb-2">
                        <i class="fas fa-map-marker-alt"></i> ${space.city}
                    </p>
                    <p class="card-text">${space.description.substring(0, 100)}...</p>
                    
                    <div class="space-amenities mb-3">
                        ${space.amenities.slice(0, 4).map(amenity =>
            `<i class="${amenityIcons[amenity] || 'fas fa-check'}" title="${amenity}"></i>`
        ).join(' ')}
                        ${space.amenities.length > 4 ? `<span class="text-muted">+${space.amenities.length - 4}</span>` : ''}
                    </div>
                    
                    <div class="space-info">
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted">Capacità</small>
                                <div><strong>${space.capacity} persone</strong></div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Prezzo/giorno</small>
                                <div><strong>€${space.price_per_day}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <button class="btn btn-primary w-100" onclick="event.stopPropagation(); showBookingModal('${space.id}')">
                        <i class="fas fa-calendar-plus"></i> Prenota
                    </button>
                </div>
            </div>
        </div>
    `;
    }

    getEmptySpacesHTML() {
        return `
        <div class="col-12">
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h4>Nessuno spazio trovato</h4>
                <p class="text-muted">Prova a modificare i filtri di ricerca</p>
                <button class="btn btn-outline-primary" onclick="clearFilters()">
                    <i class="fas fa-eraser"></i> Cancella Filtri
                </button>
            </div>
        </div>
    `;
    }

    renderPagination() {
        const container = document.getElementById('paginationContainer');
        if (!container || !this.state.pagination) return;

        const { page, totalPages, hasNext, hasPrev } = this.state.pagination;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
        <nav aria-label="Navigazione spazi">
            <ul class="pagination justify-content-center">
                <li class="page-item ${!hasPrev ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="loadPage(${page - 1})" ${!hasPrev ? 'tabindex="-1"' : ''}>
                        <i class="fas fa-chevron-left"></i> Precedente
                    </a>
                </li>
                
                ${Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => `
                    <li class="page-item ${pageNum === page ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="loadPage(${pageNum})">${pageNum}</a>
                    </li>
                `).join('')}
                
                <li class="page-item ${!hasNext ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="loadPage(${page + 1})" ${!hasNext ? 'tabindex="-1"' : ''}>
                        Successiva <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            </ul>
        </nav>
    `;
    }

    // ==== GESTIONE FILTRI ====

    applyFilters() {
        const filters = {
            city: document.getElementById('filterCity')?.value || '',
            type: document.getElementById('filterType')?.value || '',
            search: document.getElementById('filterSearch')?.value || '',
            minPrice: document.getElementById('filterMinPrice')?.value || '',
            maxPrice: document.getElementById('filterMaxPrice')?.value || '',
            sortBy: document.getElementById('sortBy')?.value || 'created_at',
            sortOrder: document.getElementById('sortOrder')?.value || 'DESC',
            page: 1
        };

        this.state.currentFilters = filters;
        this.loadSpaces(filters);
    }

    clearFilters() {
        // Reset form filters
        document.getElementById('filterCity').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterSearch').value = '';
        document.getElementById('filterMinPrice').value = '';
        document.getElementById('filterMaxPrice').value = '';
        document.getElementById('sortBy').value = 'created_at';
        document.getElementById('sortOrder').value = 'DESC';

        // Reset state and reload
        this.state.currentFilters = {};
        this.loadSpaces();
    }

// ==== GESTIONE EVENTI ====

    async showSpaceDetails(spaceId) {
        try {
            console.log('📍 Loading space details:', spaceId);

            const result = await this.state.api.getSpace(spaceId);

            if (result.success) {
                this.openSpaceModal(result.space);
            } else {
                this.showNotification('Errore nel caricamento dei dettagli', 'error');
            }
        } catch (error) {
            console.error('❌ Error loading space details:', error);
            this.showNotification('Errore di connessione', 'error');
        }
    }

    openSpaceModal(space) {
        const modal = document.getElementById('spaceDetailModal');
        if (!modal) {
            this.createSpaceModal();
            return this.openSpaceModal(space);
        }

        // Popola il modal con i dati dello spazio
        document.getElementById('modalSpaceName').textContent = space.name;
        document.getElementById('modalSpaceDescription').textContent = space.description;
        document.getElementById('modalSpaceCity').textContent = space.city;
        document.getElementById('modalSpaceAddress').textContent = space.address;
        document.getElementById('modalSpaceCapacity').textContent = space.capacity;
        document.getElementById('modalSpacePrice').textContent = `€${space.price_per_day}/giorno`;

        // Gestisci immagini multiple
        const carousel = document.getElementById('spaceImageCarousel');
        if (carousel && space.images.length > 0) {
            carousel.innerHTML = space.images.map((img, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img src="${img}" class="d-block w-100" alt="${space.name}">
            </div>
        `).join('');
        }

        // Mostra il modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    createSpaceModal() {
        const modalHTML = `
        <div class="modal fade" id="spaceDetailModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="modalSpaceName"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="spaceImageCarousel" class="carousel slide mb-3">
                            <!-- Immagini caricate dinamicamente -->
                        </div>
                        <p id="modalSpaceDescription"></p>
                        <div class="row">
                            <div class="col-md-6">
                                <strong>Posizione:</strong>
                                <p id="modalSpaceCity"></p>
                                <p id="modalSpaceAddress"></p>
                            </div>
                            <div class="col-md-6">
                                <strong>Capacità:</strong> <span id="modalSpaceCapacity"></span><br>
                                <strong>Prezzo:</strong> <span id="modalSpacePrice"></span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                        <button type="button" class="btn btn-primary">Prenota Ora</button>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    showBookingModal(spaceId) {
        console.log('📅 Opening booking modal for space:', spaceId);
        this.showNotification('Funzionalità di prenotazione in arrivo!', 'info');
    }
}

function showManagerMenuItem(userRole) {
    const managerMenuItem = document.getElementById('managerMenuItem');
    if (userRole === 'manager' && managerMenuItem) {
        managerMenuItem.style.display = 'block';
    } else {
        managerMenuItem.style.display = 'none';
    }
}

// ===== FUNZIONI GLOBALI =====

// Logout
function logout() {
    console.log('🚪 Eseguo il logout...');

    // Usa l’istanza globale corretta
    if (window.coworkspaceApp) {
        window.coworkspaceApp.state.api.setToken(null);
    }

    // Pulisci storage
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('login_success');
    localStorage.removeItem('just_logged_in');

    // Reindirizza
    window.location.href = './index.html';
}


// Mostra modal login
function showLogin() {
    console.log('🔑 showLogin function called');
    const loginModal = document.getElementById('loginModal');
    console.log('🔍 Login modal found:', !!loginModal);

    if (loginModal) {
        const modal = new bootstrap.Modal(loginModal);
        modal.show();
        console.log('✅ Login modal shown');
    } else {
        console.error('❌ Login modal not found!');
    }
}

// Mostra modal registrazione
function showRegister() {
    console.log('📝 showRegister function called');
    const registerModal = document.getElementById('registerModal');
    console.log('🔍 Register modal found:', !!registerModal);

    if (registerModal) {
        const modal = new bootstrap.Modal(registerModal);
        modal.show();
        console.log('✅ Register modal shown');
    } else {
        console.error('❌ Register modal not found!');
    }
}

// Switch tra login e registrazione
function switchToRegister() {
    console.log('🔄 switchToRegister called');
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    if (loginModal) loginModal.hide();
    setTimeout(() => {
        showRegister();
    }, 300);
}

function switchToLogin() {
    console.log('🔄 switchToLogin called');
    const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
    if (registerModal) registerModal.hide();
    setTimeout(() => {
        showLogin();
    }, 300);
}

// Scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Cookie functions
function showCookieBanner() {
    if (!localStorage.getItem('cookiesAccepted')) {
        const banner = document.getElementById('cookieBanner');
        if (banner) banner.style.display = 'block';
    }
}

function acceptCookies() {
    localStorage.setItem('cookiesAccepted', 'true');
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.style.display = 'none';
}

function declineCookies() {
    localStorage.setItem('cookiesAccepted', 'false');
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.style.display = 'none';
}

function showFilters() {
    // Cerca il container dei filtri e lo toggle
    const filters = document.querySelector('.filters-expanded, .advanced-filters, .filter-panel');
    if (filters) {
        filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
    } else {
        console.log('Container filtri non trovato');
    }
}

function showMapView() {
    console.log('Switch to map view');
    window.coworkspaceApp.showNotification('Vista mappa in arrivo!', 'info');
}

function loadMoreSpaces() {
    // Carica effettivamente gli spazi
    if (window.coworkspaceApp && window.coworkspaceApp.loadSpaces) {
        window.coworkspaceApp.loadSpaces();
    } else {
        console.log('App non inizializzata o metodo loadSpaces non trovato');
    }
}

// Funzione placeholder per l'annullamento della prenotazione
function cancelBooking(bookingId) {
    alert('Annullamento prenotazione ' + bookingId + ' in corso...');
    // Qui dovresti implementare la logica di annullamento, ad esempio una chiamata API
}

// Funzione da usare per il link "Le Mie Prenotazioni"
function showMyBookingsSection() {
    // Nascondi tutte le sezioni tranne la home (se esistono)
    const allSections = ['homeSection', 'spacesSection', 'aboutSection', 'supportSection', 'bookingsSection'];

    allSections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'none';
        }
    });

    // Mostra la sezione delle prenotazioni
    const bookingsSection = document.getElementById('bookingsSection');
    if (bookingsSection) {
        bookingsSection.style.display = 'block';

        // Lancia il caricamento dei dati delle prenotazioni
        if (window.BookingManager) {
            window.BookingManager.loadBookings();
        } else {
            console.error('BookingManager non è stato trovato. Assicurati che booking.js sia caricato correttamente.');
        }
    }
}

// ===== UTILITY FUNCTIONS =====

// Funzione per testare la connessione API
async function testAPIConnection() {
    try {
        const result = await AppState.api.healthCheck();
        console.log('🔗 Test API:', result);
        return result.success;
    } catch (error) {
        console.error('❌ Test API fallito:', error);
        return false;
    }
}

// Debug DOM
function debugDOM() {
    console.log('🔍 DOM Debug:');
    console.log('- Login modal:', !!document.getElementById('loginModal'));
    console.log('- Register modal:', !!document.getElementById('registerModal'));
    console.log('- Login form:', !!document.getElementById('loginForm'));
    console.log('- Register form:', !!document.getElementById('registerForm'));
    console.log('- Auth buttons:', !!document.getElementById('authButtons'));
    console.log('- User menu:', !!document.getElementById('userMenu'));

    // Check for login/register buttons
    const loginBtns = document.querySelectorAll('[onclick*="showLogin"], .btn-login, #loginBtn');
    const registerBtns = document.querySelectorAll('[onclick*="showRegister"], .btn-register, #registerBtn');
    console.log('- Login buttons found:', loginBtns.length);
    console.log('- Register buttons found:', registerBtns.length);

    loginBtns.forEach((btn, i) => console.log(`  Login btn ${i}:`, btn.tagName, btn.id, btn.className));
    registerBtns.forEach((btn, i) => console.log(`  Register btn ${i}:`, btn.tagName, btn.id, btn.className));
}

// ===== INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded fired');

    // Debug DOM
    setTimeout(() => {
        debugDOM();
    }, 100);

    // Crea istanza dell'app
    window.coworkspaceApp = new CoWorkSpaceApp();

    // Test connessione API dopo 1 secondo
    setTimeout(() => {
        testAPIConnection();
    }, 1000);

    // Mostra cookie banner dopo 2 secondi
    setTimeout(showCookieBanner, 2000);

    console.log('CoWorkSpace Frontend inizializzato e connesso al backend!');
});


// Rendi le funzioni globalmente accessibili
window.showLogin = showLogin;
window.showRegister = showRegister;
window.switchToLogin = switchToLogin;
window.switchToRegister = switchToRegister;
window.logout = logout;
window.testAPIConnection = testAPIConnection;
window.debugDOM = debugDOM;
window.showFilters = showFilters;
window.showMapView = showMapView;
window.loadMoreSpaces = loadMoreSpaces;

window.loadPage = function(page) {
    const filters = { ...window.coworkspaceApp.state.currentFilters, page };
    window.coworkspaceApp.loadSpaces(filters);
};

window.showSpaceDetails = function(spaceId) {
    window.coworkspaceApp.showSpaceDetails(spaceId);
};

window.showBookingModal = function(spaceId) {
    window.coworkspaceApp.showBookingModal(spaceId);
};

window.clearFilters = function() {
    window.coworkspaceApp.clearFilters();
};

window.showSection = function(sectionId) {
    console.log('Mostrando sezione:', sectionId);

    // Nascondi tutte le sezioni
    const allSections = ['homeSection', 'spacesSection', 'bookingsSection', 'aboutSection', 'supportSection'];
    allSections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'none';
        }
    });

    // Mostra la sezione richiesta
    const targetSection = document.getElementById(sectionId + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Se è la sezione prenotazioni, carica direttamente
    if (sectionId === 'bookings') {
        loadUserBookingsDirectly();
    }
};

window.addEventListener('beforeunload', () => {
    // Salva token prima di uscire dalla pagina
    if (window.coworkspaceApp?.state?.isAuthenticated) {
        const currentToken = window.coworkspaceApp.state.api.token;
        const currentUser = window.coworkspaceApp.state.currentUser;

        if (currentToken && currentUser) {
            localStorage.setItem('auth_token', currentToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            console.log('💾 Auth preserved before page unload');
        }
    }
});

setInterval(() => {
    // Controlla ogni 10 secondi se il token è sincronizzato
    if (window.coworkspaceApp?.state?.isAuthenticated) {
        const apiToken = window.coworkspaceApp.state.api.token;
        const storageToken = localStorage.getItem('auth_token');

        if (storageToken && !apiToken) {
            console.log('🔄 Auto-recovery: Restoring API token from storage');
            window.coworkspaceApp.state.api.setToken(storageToken);
        } else if (!storageToken && apiToken) {
            console.log('🔄 Auto-recovery: Saving API token to storage');
            localStorage.setItem('auth_token', apiToken);
        }
    }
}, 10000);

// Gestisci il ritorno del focus sulla finestra
window.addEventListener('focus', () => {
    // Quando l'utente torna sulla tab, verifica che l'auth sia presente
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');

    if (token && user && !this.state.isAuthenticated) {
        console.log('🔄 Restoring authentication on window focus');
        try {
            this.state.currentUser = JSON.parse(user);
            this.state.isAuthenticated = true;
            this.state.api.setToken(token);
            this.updateAuthUI();
            console.log('✅ Authentication restored on focus');
        } catch (error) {
            console.warn('⚠️ Failed to restore auth on focus:', error);
        }
    }
});

// ===== 5. DEBUG HELPER (rimuovi in produzione) =====
window.debugAuthDetailed = function() {
    const app = window.coworkspaceApp;
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    const refreshToken = localStorage.getItem('refresh_token');
    const justLoggedIn = localStorage.getItem('just_logged_in');

    console.log('🔍 DETAILED AUTH DEBUG:', {
        localStorage: {
            auth_token: token ? `${token.substring(0, 20)}...` : null,
            user_email: user ? JSON.parse(user).email : null,
            refresh_token: refreshToken ? 'Present' : 'Missing',
            just_logged_in: justLoggedIn
        },
        appState: app ? {
            isAuthenticated: app.state.isAuthenticated,
            currentUserEmail: app.state.currentUser?.email,
            apiToken: app.state.api.token ? `${app.state.api.token.substring(0, 20)}...` : null
        } : 'App not initialized',
        consistency: {
            tokensMatch: app && token && app.state.api.token === token,
            userDataValid: app && user && app.state.currentUser?.email === JSON.parse(user).email
        }
    });
};

// ===== ESEMPIO DI INIZIALIZZAZIONE CORRETTA =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 App starting with improved client auth handling...');

    try {
        // Crea l'app
        window.coworkspaceApp = new CoWorkSpaceApp();

        // Inizializza l'autenticazione con il nuovo sistema
        await window.coworkspaceApp.initializeAuth();

        // Resto dell'inizializzazione...

        console.log('✅ App initialization completed');

        // Debug in dev mode
        if (window.location.hostname === 'localhost') {
            console.log('🔧 Debug mode - use debugAuth() for troubleshooting');
        }

    } catch (error) {
        console.error('❌ Errore durante inizializzazione:', error);
    }
});

// in app.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    console.log("✅ LOGIN REALE RIUSCITO. Dati ricevuti:", data.user);
                    window.User.login(data.user, data.token);

                    const loginModalEl = document.getElementById('loginModal');
                    const loginModal = bootstrap.Modal.getInstance(loginModalEl);
                    if (loginModal) {
                        loginModal.hide();
                    }
                } else {
                    alert(data.message || 'Credenziali non valide.');
                }
            } catch (error) {
                console.error("ERRORE NELLA CHIAMATA FETCH:", error);
                alert("Si è verificato un errore di connessione.");
            }
        });
    }
});

// Funzione che carica le prenotazioni senza dipendere da BookingManager
async function loadUserBookingsDirectly() {
    console.log('Caricamento prenotazioni diretto...');

    const container = document.getElementById('bookingsContainer');
    if (!container) {
        console.error('Container prenotazioni non trovato');
        return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h4>Accesso Richiesto</h4>
                <p class="text-muted">Devi effettuare il login per vedere le prenotazioni.</p>
                <button class="btn btn-primary" onclick="showLogin()">
                    <i class="fas fa-sign-in-alt me-2"></i>Accedi
                </button>
            </div>
        `;
        return;
    }

    // Mostra loading
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Caricamento...</span>
            </div>
            <p class="mt-3">Caricamento prenotazioni...</p>
        </div>
    `;

    try {
        const response = await fetch('http://localhost:3000/api/bookings/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore nel caricamento delle prenotazioni');
        }

        const bookings = data.data || [];
        renderBookingsDirectly(bookings, container);

    } catch (error) {
        console.error('Errore caricamento prenotazioni:', error);
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
                <h4>Errore nel caricamento</h4>
                <p class="text-muted">Impossibile caricare le prenotazioni: ${error.message}</p>
                <button class="btn btn-outline-primary" onclick="loadUserBookingsDirectly()">
                    <i class="fas fa-redo me-2"></i>Riprova
                </button>
            </div>
        `;
    }
}

function renderBookingsDirectly(bookings, container) {
    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h4>Nessuna prenotazione trovata</h4>
                <p class="text-muted">Non hai ancora effettuato alcuna prenotazione.</p>
                <a href="#" onclick="showSection('spaces')" class="btn btn-primary">
                    <i class="fas fa-search me-2"></i>Cerca Spazi
                </a>
            </div>
        `;
        return;
    }

    let bookingsHtml = '';
    bookings.forEach(booking => {
        const formattedStartDate = formatDate(booking.start_date);
        const formattedEndDate = formatDate(booking.end_date);

        bookingsHtml += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card booking-card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <small class="text-muted">ID: ${booking.id.substring(0, 8)}...</small>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${booking.space_name || 'Spazio Coworking'}</h5>
                        <p class="card-text">
                            <i class="fas fa-map-marker-alt text-primary me-2"></i>
                            ${booking.space_city || 'Non specificato'}
                        </p>
                        <div class="booking-details">
                            <div class="mb-2">
                                <i class="fas fa-calendar text-primary me-2"></i>
                                <strong>Dal:</strong> ${formattedStartDate}
                            </div>
                            <div class="mb-2">
                                <i class="fas fa-calendar text-primary me-2"></i>
                                <strong>Al:</strong> ${formattedEndDate}
                            </div>
                            ${booking.start_time ? `
                                <div class="mb-2">
                                    <i class="fas fa-clock text-primary me-2"></i>
                                    <strong>Orario:</strong> ${booking.start_time} - ${booking.end_time}
                                </div>
                            ` : ''}
                            <div class="mb-2">
                                <i class="fas fa-users text-primary me-2"></i>
                                <strong>Persone:</strong> ${booking.people_count}
                            </div>
                            <div class="mb-2">
                                <i class="fas fa-euro-sign text-primary me-2"></i>
                                <strong>Prezzo:</strong> €${parseFloat(booking.total_price).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    container.innerHTML = bookingsHtml;
}

console.log('Script loaded completely');

// Export per moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CoWorkSpaceApp,
        AppState,
        APIClient,
        logout,
        showLogin,
        showRegister,
        testAPIConnection
    };
}