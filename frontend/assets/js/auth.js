/**
 * CoWorkSpace - Authentication Manager
 * Gestione autenticazione e autorizzazione utenti
 */

window.Auth = {
    /**
     * Stato del modulo
     */
    state: {
        initialized: false,
        isAuthenticated: false,
        currentUser: null,
        token: null,
        refreshToken: null,
        loginInProgress: false,
        sessionTimeout: null
    },

    /**
     * Configurazione
     */
    config: {
        tokenKey: 'coworkspace_auth_token',
        refreshTokenKey: 'coworkspace_refresh_token',
        userKey: 'coworkspace_user_data',
        sessionDuration: 24 * 60 * 60 * 1000, // 24 ore
        refreshThreshold: 5 * 60 * 1000, // 5 minuti prima della scadenza
        endpoints: {
            login: '/api/auth/login',
            register: '/api/auth/register',
            logout: '/api/auth/logout',
            refresh: '/api/auth/refresh',
            verify: '/api/auth/verify',
            forgotPassword: '/api/auth/forgot-password',
            resetPassword: '/api/auth/reset-password'
        }
    },

    /**
     * Inizializza il modulo di autenticazione
     */
    async init() {
        try {
            console.log('🔐 Initializing Auth Manager...');

            // Verifica dipendenze
            if (!window.API || !window.Utils) {
                console.warn('Auth dependencies not available, some features may not work');
            }

            // Carica stato salvato
            this.loadStoredState();

            // Setup event listeners
            this.setupEventListeners();

            // Verifica token esistente
            if (this.state.token) {
                await this.verifyToken();
            }

            this.state.initialized = true;
            console.log('✅ Auth Manager initialized');

            return true;

        } catch (error) {
            console.error('Auth initialization failed:', error);
            return false;
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listener per aggiornamenti auth
        document.addEventListener('auth:login', this.handleAuthChange.bind(this));
        document.addEventListener('auth:logout', this.handleAuthChange.bind(this));

        // Listener per visibilità pagina (pausa/riprendi refresh token)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTokenRefresh();
            } else {
                this.resumeTokenRefresh();
            }
        });
    },

    /**
     * Carica stato salvato dal localStorage
     */
    loadStoredState() {
        try {
            const token = localStorage.getItem(this.config.tokenKey);
            const refreshToken = localStorage.getItem(this.config.refreshTokenKey);
            const userData = localStorage.getItem(this.config.userKey);

            if (token && userData) {
                this.state.token = token;
                this.state.refreshToken = refreshToken;
                this.state.currentUser = JSON.parse(userData);
                this.state.isAuthenticated = true;

                // Setup auth header nell'API
                if (window.API) {
                    window.API.setAuthHeader(token);
                }
            }
        } catch (error) {
            console.error('Error loading stored auth state:', error);
            this.clearStoredState();
        }
    },

    /**
     * Salva stato nel localStorage
     */
    saveStoredState() {
        try {
            if (this.state.token && this.state.currentUser) {
                localStorage.setItem(this.config.tokenKey, this.state.token);
                if (this.state.refreshToken) {
                    localStorage.setItem(this.config.refreshTokenKey, this.state.refreshToken);
                }
                localStorage.setItem(this.config.userKey, JSON.stringify(this.state.currentUser));
            }
        } catch (error) {
            console.error('Error saving auth state:', error);
        }
    },

    /**
     * Pulisce stato salvato
     */
    clearStoredState() {
        localStorage.removeItem(this.config.tokenKey);
        localStorage.removeItem(this.config.refreshTokenKey);
        localStorage.removeItem(this.config.userKey);
    },

    // ==================== METODI DI AUTENTICAZIONE ====================

    /**
     * Mostra modulo di login
     * @param {Object} options - Opzioni di visualizzazione
     */
    showLogin(options = {}) {
        try {
            console.log('📱 Showing login form');

            // Se ha il navigation module, usa quello
            if (window.App?.navigation?.showSection) {
                window.App.navigation.showSection('login');
                return;
            }

            // Altrimenti mostra login in modal
            this.showLoginModal(options);

        } catch (error) {
            console.error('Error showing login:', error);
            Utils?.error?.handle(error, 'Auth.showLogin');
        }
    },

    /**
     * Mostra login in modal
     */
    showLoginModal(options = {}) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            console.error('Modal container not found');
            return;
        }

        modalContainer.innerHTML = `
            <div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="loginModalLabel">
                                <i class="fas fa-sign-in-alt me-2"></i>
                                Accedi a CoWorkSpace
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="loginForm">
                                <div class="mb-3">
                                    <label for="loginEmail" class="form-label">
                                        <i class="fas fa-envelope me-1"></i>
                                        Email
                                    </label>
                                    <input type="email" class="form-control" id="loginEmail" required>
                                </div>
                                <div class="mb-3">
                                    <label for="loginPassword" class="form-label">
                                        <i class="fas fa-lock me-1"></i>
                                        Password
                                    </label>
                                    <input type="password" class="form-control" id="loginPassword" required>
                                </div>
                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" id="rememberMe">
                                    <label class="form-check-label" for="rememberMe">
                                        Ricordami
                                    </label>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-sign-in-alt me-2"></i>
                                        Accedi
                                    </button>
                                </div>
                            </form>
                            
                            <hr class="my-4">
                            
                            <div class="text-center">
                                <p class="mb-2">Non hai ancora un account?</p>
                                <button class="btn btn-outline-primary" onclick="Auth.showRegister()">
                                    <i class="fas fa-user-plus me-2"></i>
                                    Registrati Ora
                                </button>
                            </div>
                            
                            <div class="text-center mt-3">
                                <a href="#" class="text-muted" onclick="Auth.showForgotPassword()">
                                    Hai dimenticato la password?
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Mostra il modal
        const modal = new bootstrap.Modal(document.getElementById('loginModal'));
        modal.show();

        // Aggiungi event listener per il form
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
    },

    /**
     * Mostra modulo di registrazione
     */
    showRegister() {
        try {
            console.log('📱 Showing register form');

            // Se ha il navigation module, usa quello
            if (window.App?.navigation?.showSection) {
                window.App.navigation.showSection('register');
                return;
            }

            // Altrimenti mostra registrazione in modal
            this.showRegisterModal();

        } catch (error) {
            console.error('Error showing register:', error);
            Utils?.error?.handle(error, 'Auth.showRegister');
        }
    },

    /**
     * Mostra registrazione in modal
     */
    showRegisterModal() {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            console.error('Modal container not found');
            return;
        }

        modalContainer.innerHTML = `
            <div class="modal fade" id="registerModal" tabindex="-1" aria-labelledby="registerModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="registerModalLabel">
                                <i class="fas fa-user-plus me-2"></i>
                                Registrati su CoWorkSpace
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="registerForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="registerNome" class="form-label">
                                            <i class="fas fa-user me-1"></i>
                                            Nome
                                        </label>
                                        <input type="text" class="form-control" id="registerNome" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="registerCognome" class="form-label">
                                            <i class="fas fa-user me-1"></i>
                                            Cognome
                                        </label>
                                        <input type="text" class="form-control" id="registerCognome" required>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="registerEmail" class="form-label">
                                        <i class="fas fa-envelope me-1"></i>
                                        Email
                                    </label>
                                    <input type="email" class="form-control" id="registerEmail" required>
                                </div>
                                <div class="mb-3">
                                    <label for="registerPassword" class="form-label">
                                        <i class="fas fa-lock me-1"></i>
                                        Password
                                    </label>
                                    <input type="password" class="form-control" id="registerPassword" required>
                                </div>
                                <div class="mb-3">
                                    <label for="registerPasswordConfirm" class="form-label">
                                        <i class="fas fa-lock me-1"></i>
                                        Conferma Password
                                    </label>
                                    <input type="password" class="form-control" id="registerPasswordConfirm" required>
                                </div>
                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" id="acceptTerms" required>
                                    <label class="form-check-label" for="acceptTerms">
                                        Accetto i <a href="#" target="_blank">Termini di Servizio</a> e la <a href="#" target="_blank">Privacy Policy</a>
                                    </label>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-user-plus me-2"></i>
                                        Registrati
                                    </button>
                                </div>
                            </form>
                            
                            <hr class="my-4">
                            
                            <div class="text-center">
                                <p class="mb-2">Hai già un account?</p>
                                <button class="btn btn-outline-primary" onclick="Auth.showLogin()">
                                    <i class="fas fa-sign-in-alt me-2"></i>
                                    Accedi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Mostra il modal
        const modal = new bootstrap.Modal(document.getElementById('registerModal'));
        modal.show();

        // Aggiungi event listener per il form
        document.getElementById('registerForm').addEventListener('submit', this.handleRegister.bind(this));
    },

    /**
     * Mostra recupero password
     */
    showForgotPassword() {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="modal fade" id="forgotPasswordModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-key me-2"></i>
                                Recupera Password
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Inserisci la tua email per ricevere le istruzioni per reimpostare la password.</p>
                            <form id="forgotPasswordForm">
                                <div class="mb-3">
                                    <label for="forgotEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="forgotEmail" required>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-paper-plane me-2"></i>
                                        Invia Email
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
        modal.show();
    },

    // ==================== GESTORI EVENTI ====================

    /**
     * Gestisce il login
     */
    handleLogin(event) {
        event.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        console.log('Login attempt:', { email, rememberMe });

        // Simula login (da sostituire con vera chiamata API)
        this.simulateLogin(email, password, rememberMe);
    },

    /**
     * Gestisce la registrazione
     */
    handleRegister(event) {
        event.preventDefault();

        const formData = {
            nome: document.getElementById('registerNome').value,
            cognome: document.getElementById('registerCognome').value,
            email: document.getElementById('registerEmail').value,
            password: document.getElementById('registerPassword').value,
            passwordConfirm: document.getElementById('registerPasswordConfirm').value
        };

        // Validazione password
        if (formData.password !== formData.passwordConfirm) {
            this.showError('Le password non coincidono');
            return;
        }

        console.log('Register attempt:', formData);

        // Simula registrazione
        this.simulateRegister(formData);
    },

    // ==================== SIMULAZIONI (DA SOSTITUIRE CON API VERE) ====================

    /**
     * Simula login (da sostituire con vera API)
     */
    simulateLogin(email, password, rememberMe) {
        // Mostra loading
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Accesso in corso...';
        submitBtn.disabled = true;

        setTimeout(() => {
            // Simula successo
            this.setAuthState({
                isAuthenticated: true,
                user: {
                    id: '1',
                    email: email,
                    nome: 'Usuario',
                    cognome: 'Demo',
                    firstName: 'Usuario',
                    lastName: 'Demo',
                    avatar: null,
                    role: 'user',
                    permissions: ['view_spaces', 'book_spaces']
                },
                token: 'demo_token_' + Date.now()
            });

            // Chiudi modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (modal) modal.hide();

            // Mostra successo
            this.showSuccess('Accesso effettuato con successo!');

            // Ripristina button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

        }, 1500);
    },

    /**
     * Simula registrazione
     */
    simulateRegister(formData) {
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Registrazione...';
        submitBtn.disabled = true;

        setTimeout(() => {
            // Chiudi modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            if (modal) modal.hide();

            // Mostra successo e passa al login
            this.showSuccess('Registrazione completata! Ora puoi accedere.');

            setTimeout(() => {
                this.showLogin();
            }, 2000);

            // Ripristina button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

        }, 1500);
    },

    // ==================== GESTIONE STATO ====================

    /**
     * Imposta stato autenticazione
     */
    setAuthState(authData) {
        this.state.isAuthenticated = authData.isAuthenticated;
        this.state.currentUser = authData.user;
        this.state.token = authData.token;

        // Salva in localStorage se necessario
        if (authData.isAuthenticated) {
            this.saveStoredState();

            // Setup auth header nell'API
            if (window.API) {
                window.API.setAuthHeader(authData.token);
            }
        } else {
            this.clearStoredState();

            // Rimuovi auth header
            if (window.API) {
                window.API.setAuthHeader(null);
            }
        }

        // Trigger evento
        this.triggerAuthEvent('auth:state:changed', authData);

        // Aggiorna UI
        this.updateAuthUI();
    },

    /**
     * Aggiorna UI in base allo stato auth
     */
    updateAuthUI() {
        // Aggiorna bottoni auth in navbar
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');

        if (this.state.isAuthenticated && this.state.currentUser) {
            // Nascondi bottoni login/register
            if (authButtons) authButtons.classList.add('d-none');

            // Mostra menu utente
            if (userMenu) {
                userMenu.classList.remove('d-none');

                // Aggiorna nome utente
                const userName = document.getElementById('user-name');
                const userFullName = document.getElementById('user-full-name');

                if (userName) {
                    userName.textContent = this.state.currentUser.firstName || this.state.currentUser.nome;
                }

                if (userFullName) {
                    userFullName.textContent = `${this.state.currentUser.firstName || this.state.currentUser.nome} ${this.state.currentUser.lastName || this.state.currentUser.cognome}`;
                }
            }
        } else {
            // Mostra bottoni login/register
            if (authButtons) authButtons.classList.remove('d-none');

            // Nascondi menu utente
            if (userMenu) userMenu.classList.add('d-none');
        }
    },

    /**
     * Logout utente
     */
    logout() {
        this.setAuthState({
            isAuthenticated: false,
            user: null,
            token: null
        });

        this.showSuccess('Logout effettuato con successo');

        // Reindirizza alla home
        if (window.App?.navigation?.showSection) {
            window.App.navigation.showSection('home');
        }
    },

    // ==================== UTILITY E HELPER ====================

    /**
     * Verifica token esistente
     */
    async verifyToken() {
        if (!this.state.token || !window.API) return false;

        try {
            // Simula verifica token
            // In un'app reale, questa sarebbe una chiamata API
            console.log('Verifying existing token...');
            return true;
        } catch (error) {
            console.error('Token verification failed:', error);
            this.logout();
            return false;
        }
    },

    /**
     * Gestisce cambiamenti di autenticazione
     */
    handleAuthChange(event) {
        console.log('Auth state changed:', event.detail);

        // Aggiorna UI
        this.updateAuthUI();

        // Altre azioni necessarie
    },

    /**
     * Pausa refresh token (quando pagina nascosta)
     */
    pauseTokenRefresh() {
        if (this.state.sessionTimeout) {
            clearTimeout(this.state.sessionTimeout);
        }
    },

    /**
     * Riprendi refresh token (quando pagina visibile)
     */
    resumeTokenRefresh() {
        if (this.state.isAuthenticated && this.state.token) {
            this.setupTokenRefresh();
        }
    },

    /**
     * Setup refresh automatico token
     */
    setupTokenRefresh() {
        // Implementazione per refresh automatico token
        console.log('Token refresh setup (placeholder)');
    },

    /**
     * Trigger evento auth
     */
    triggerAuthEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    },

    /**
     * Mostra messaggio di successo
     */
    showSuccess(message) {
        if (window.Utils?.notifications?.show) {
            Utils.notifications.show(message, 'success');
        } else {
            // Fallback
            console.log('✅', message);
            alert(message);
        }
    },

    /**
     * Mostra messaggio di errore
     */
    showError(message) {
        if (window.Utils?.notifications?.show) {
            Utils.notifications.show(message, 'error');
        } else {
            // Fallback
            console.error('❌', message);
            alert(message);
        }
    },

    // ==================== METODI PUBBLICI ====================

    /**
     * Controlla se utente è autenticato
     */
    isAuthenticated() {
        return this.state.isAuthenticated && this.state.token && this.state.currentUser;
    },

    /**
     * Ottieni utente corrente
     */
    getCurrentUser() {
        return this.state.currentUser;
    },

    /**
     * Ottieni token corrente
     */
    getToken() {
        return this.state.token;
    },

    /**
     * Controlla se utente ha ruolo specifico
     */
    hasRole(role) {
        return this.state.currentUser && this.state.currentUser.role === role;
    },

    /**
     * Controlla se utente ha permesso specifico
     */
    hasPermission(permission) {
        return this.state.currentUser &&
            this.state.currentUser.permissions &&
            this.state.currentUser.permissions.includes(permission);
    },

    /**
     * Ottieni informazioni stato auth
     */
    getAuthInfo() {
        return {
            isAuthenticated: this.state.isAuthenticated,
            user: this.state.currentUser,
            hasToken: !!this.state.token,
            initialized: this.state.initialized
        };
    }
};