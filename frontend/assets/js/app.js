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
        this.token = localStorage.getItem('auth_token');
        console.log('🔧 APIClient initialized with token:', this.token ? 'YES' : 'NO');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
            console.log('🔐 Token saved:', token.substring(0, 20) + '...');
        } else {
            localStorage.removeItem('auth_token');
            console.log('🗑️ Token removed');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.config.baseURL}${endpoint}`;
        console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token && !options.skipAuth) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        const requestOptions = {
            method: options.method || 'GET',
            headers,
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            requestOptions.body = JSON.stringify(options.body);
            console.log('📦 Request body:', options.body);
        }

        try {
            const response = await fetch(url, requestOptions);
            const data = await response.json();

            console.log(`📥 API Response (${response.status}):`, data);

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`❌ API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // Auth endpoints
    async login(credentials) {
        console.log('🔑 Attempting login with:', { email: credentials.email, password: '***' });
        return this.request('/auth/login', {
            method: 'POST',
            body: credentials,
            skipAuth: true
        });
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
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('user_data');

        console.log('💾 Saved data:', {
            token: savedToken ? 'YES' : 'NO',
            user: savedUser ? 'YES' : 'NO'
        });

        if (savedToken && savedUser) {
            try {
                this.state.api.setToken(savedToken);
                this.state.currentUser = JSON.parse(savedUser);
                this.state.isAuthenticated = true;
                this.updateAuthUI();
                console.log('🔐 Utente autenticato:', this.state.currentUser.email);
            } catch (e) {
                console.warn('⚠️ Dati utente corrotti, reset auth');
                this.clearAuth();
            }
        }
    }

    clearAuth() {
        console.log('🧹 Clearing authentication...');
        this.state.currentUser = null;
        this.state.isAuthenticated = false;
        this.state.api.setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('refresh_token');
        this.updateAuthUI();
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

        console.log('Login credentials:', { email: credentials.email, password: '[HIDDEN]' });

        try {
            this.showFormLoading(form, true);

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

                // Salva il token
                if (tokenData) {
                    this.state.api.setToken(tokenData);
                    localStorage.setItem('auth_token', tokenData);
                    console.log('💾 Token saved to localStorage');
                } else {
                    throw new Error('Token di accesso non ricevuto dal server');
                }

                // Salva refresh token se presente
                if (refreshToken) {
                    localStorage.setItem('refresh_token', refreshToken);
                    console.log('💾 Refresh token saved');
                }

                // Salva i dati utente
                this.state.currentUser = userData;
                this.state.isAuthenticated = true;
                localStorage.setItem('user', JSON.stringify(userData));  // Nota: 'user' non 'user_data'
                console.log('💾 User data saved to localStorage:', userData);

                // Verifica che i dati siano stati salvati correttamente
                const savedUser = localStorage.getItem('user');
                const savedToken = localStorage.getItem('auth_token');
                console.log('🔍 Verification - Saved user:', savedUser);
                console.log('🔍 Verification - Saved token length:', savedToken?.length);

                // Chiudi modal
                const loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    const modal = bootstrap.Modal.getInstance(loginModal) || new bootstrap.Modal(loginModal);
                    modal.hide();
                }

                this.updateAuthUI();
                this.showNotification('Login effettuato con successo!', 'success');

                // Reindirizza in base al ruolo
                setTimeout(() => {
                    if (userData.role === 'admin') {
                        console.log('🚀 Redirecting admin to dashboard...');
                        window.location.href = './template/admin-dashboard.html';
                    } else {
                        console.log('🚀 Redirecting user to dashboard...');
                        window.location.href = './template/user-dashboard.html';
                    }
                }, 10);

            } else {
                console.error('❌ Login failed:', result.message);
                this.showNotification(result.message || 'Credenziali non valide', 'error');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showNotification('Errore durante il login: ' + error.message, 'error');
        } finally {
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

// ===== FUNZIONI GLOBALI =====

// Logout
async function logout() {
    console.log('👋 Logout function called');
    try {
        await AppState.api.logout();
        window.coworkspaceApp.showNotification('Logout effettuato con successo', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('Errore durante logout:', error);
        // Forza logout locale anche se API fallisce
        window.coworkspaceApp.clearAuth();
        window.location.href = 'index.html';
    }
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
    console.log('🎬 DOMContentLoaded fired');

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

    console.log('🎉 CoWorkSpace Frontend inizializzato e connesso al backend!');
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

console.log('✅ Script loaded completely');

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