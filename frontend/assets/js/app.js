/**
 * CoWorkSpace - Main Application
 * Orchestrazione e inizializzazione dell'applicazione
 */

window.App = {
    /**
     * Stato dell'applicazione
     */
    state: {
        initialized: false,
        loading: false,
        error: null,
        version: '1.0.0',
        startTime: null,
        modules: {}
    },

    /**
     * Riferimenti ai moduli
     */
    modules: {
        api: null,
        auth: null,
        navigation: null,
        spaces: null,
        bookings: null,
        dashboard: null,
        user: null,
        components: null,
        notifications: null,
        cookies: null
    },

    /**
     * Event listeners dell'app
     */
    listeners: [],

    /**
     * Configurazione inizializzazione moduli
     */
    moduleConfig: {
        // Moduli critici che devono essere caricati per primi
        critical: ['config', 'utils', 'api'],
        // Moduli core necessari per il funzionamento base
        core: ['auth', 'navigation', 'components'],
        // Moduli funzionali caricati dopo il core
        features: ['spaces', 'bookings', 'user', 'dashboard'],
        // Moduli opzionali caricati alla fine
        optional: ['notifications', 'cookies', 'analytics']
    },

    /**
     * Inizializza l'applicazione
     * @returns {Promise<boolean>}
     */
    async init() {
        try {
            console.log('🚀 Starting CoWorkSpace Application...');
            this.state.startTime = performance.now();
            this.state.loading = true;

            // Controlla prerequisiti
            if (!this.checkPrerequisites()) {
                throw new Error('Prerequisites check failed');
            }

            // Mostra loading iniziale
            this.showInitialLoading();

            // Inizializza moduli in sequenza
            await this.initializeModules();

            // Setup event listeners globali
            this.setupGlobalEventListeners();

            // Setup error handling globale
            this.setupErrorHandling();

            // Finalizza inizializzazione
            await this.finalizeInitialization();

            // Nascondi loading
            this.hideInitialLoading();

            // Marca come inizializzato
            this.state.initialized = true;
            this.state.loading = false;

            const loadTime = performance.now() - this.state.startTime;
            console.log(`✅ CoWorkSpace Application initialized successfully in ${Math.round(loadTime)}ms`);

            // Trigger evento custom
            this.triggerEvent('app:initialized');

            return true;

        } catch (error) {
            this.state.error = error;
            this.state.loading = false;

            console.error('❌ App initialization failed:', error);
            this.handleInitializationError(error);

            return false;
        }
    },

    /**
     * Controlla prerequisiti del sistema
     */
    checkPrerequisites() {
        const checks = [
            () => typeof window !== 'undefined',
            () => typeof document !== 'undefined',
            () => 'localStorage' in window,
            () => 'fetch' in window,
            () => 'Promise' in window,
            () => typeof window.CoWorkSpaceConfig === 'object',
            () => typeof window.Utils === 'object'
        ];

        const results = checks.map((check, index) => {
            try {
                const result = check();
                console.log(`✓ Prerequisite check ${index + 1}: ${result ? 'PASS' : 'FAIL'}`);
                return result;
            } catch (error) {
                console.error(`Prerequisite check ${index + 1} error:`, error);
                return false;
            }
        });

        return results.every(result => result === true);
    },

    /**
     * Inizializza moduli in sequenza
     */
    async initializeModules() {
        const moduleGroups = this.moduleConfig;
        const totalModules = Object.values(moduleGroups).flat().length;
        let completedModules = 0;

        // Funzione helper per aggiornare progresso
        const updateProgress = (moduleName) => {
            completedModules++;
            const percent = (completedModules / totalModules) * 100;
            this.updateLoadingProgress(percent, `Inizializzando ${moduleName}...`);
        };

        // Inizializza moduli critici
        for (const moduleName of moduleGroups.critical) {
            await this.initializeModule(moduleName);
            updateProgress(moduleName);
        }

        // Inizializza moduli core
        for (const moduleName of moduleGroups.core) {
            await this.initializeModule(moduleName);
            updateProgress(moduleName);
        }

        // Inizializza moduli features
        const featurePromises = moduleGroups.features.map(async (moduleName) => {
            await this.initializeModule(moduleName);
            updateProgress(moduleName);
        });
        await Promise.all(featurePromises);

        // Inizializza moduli opzionali (non bloccanti)
        moduleGroups.optional.forEach(async (moduleName) => {
            try {
                await this.initializeModule(moduleName);
                updateProgress(moduleName);
            } catch (error) {
                console.warn(`Optional module ${moduleName} failed to initialize:`, error);
                updateProgress(moduleName);
            }
        });
    },

    /**
     * Inizializza singolo modulo
     * @param {string} moduleName - Nome del modulo
     */
    async initializeModule(moduleName) {
        try {
            if (Utils?.debug?.log) {
                Utils.debug.log(`Initializing module: ${moduleName}`);
            } else {
                console.log(`[DEBUG] - "Initializing module: ${moduleName}"`);
            }

            const moduleMap = {
                config: () => window.CoWorkSpaceConfig,
                utils: () => window.Utils,
                api: () => window.API?.init?.(),
                auth: () => window.Auth?.init?.(),
                navigation: () => window.Navigation?.init?.(),
                spaces: () => window.Spaces?.init?.(),
                bookings: () => window.Bookings?.init?.(),
                user: () => window.User?.init?.(),
                dashboard: () => window.Dashboard?.init?.(),
                components: () => window.Components?.init?.(),
                notifications: () => window.Notifications?.init?.() || this.initializeNotifications(),
                cookies: () => window.Cookies?.init?.() || this.initializeCookies(),
                analytics: () => window.Analytics?.init?.() || this.initializeAnalytics()
            };

            const initFn = moduleMap[moduleName];
            if (!initFn) {
                console.warn(`Module ${moduleName} not found, skipping...`);
                return false;
            }

            const result = await initFn();

            if (result === false) {
                console.warn(`Module ${moduleName} initialization returned false`);
            }

            this.state.modules[moduleName] = result !== false;
            this.modules[moduleName] = window[this.getModuleGlobalName(moduleName)];

            return result !== false;

        } catch (error) {
            console.error(`Failed to initialize module ${moduleName}:`, error);
            this.state.modules[moduleName] = false;

            // Se è un modulo critico, rilancia l'errore
            if (this.moduleConfig.critical.includes(moduleName)) {
                throw error;
            }

            return false;
        }
    },

    /**
     * Inizializza sistema notifiche
     */
    initializeNotifications() {
        if (window.Components && window.Components.showNotification) {
            window.Utils = window.Utils || {};
            window.Utils.notifications = {
                show: (message, type, duration) => window.Components.showNotification(message, type, duration),
                clear: () => window.Components.clearAllNotifications?.()
            };
            return true;
        }
        return false;
    },

    /**
     * Inizializza gestione cookies
     */
    initializeCookies() {
        if (window.Components && window.Components.initializeCookieBanner) {
            window.Components.initializeCookieBanner();
            return true;
        }
        return false;
    },

    /**
     * Inizializza analytics
     */
    initializeAnalytics() {
        if (window.CoWorkSpaceConfig?.features?.enableAnalytics && window.CoWorkSpaceConfig?.analytics?.googleAnalytics) {
            // Google Analytics già caricato in index.html
            return true;
        }
        return false;
    },

    /**
     * Ottiene il nome globale del modulo
     */
    getModuleGlobalName(moduleName) {
        const nameMap = {
            config: 'CoWorkSpaceConfig',
            utils: 'Utils',
            api: 'API',
            auth: 'Auth',
            navigation: 'Navigation',
            spaces: 'Spaces',
            bookings: 'Bookings',
            user: 'User',
            dashboard: 'Dashboard',
            components: 'Components',
            notifications: 'Notifications',
            cookies: 'Cookies',
            analytics: 'Analytics'
        };
        return nameMap[moduleName] || moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    },

    /**
     * Setup event listeners globali
     */
    setupGlobalEventListeners() {
        // Gestione cambi di visibilità
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // Gestione resize finestra
        window.addEventListener('resize', this.handleWindowResize.bind(this));

        // Gestione back/forward browser
        window.addEventListener('popstate', this.handlePopState.bind(this));

        // Gestione focus/blur app
        window.addEventListener('focus', this.onAppFocus.bind(this));
        window.addEventListener('blur', this.onAppBlur.bind(this));

        // Gestione scroll
        window.addEventListener('scroll', this.handleScroll.bind(this));

        console.log('✅ Global event listeners setup complete');
    },

    /**
     * Setup error handling globale
     */
    setupErrorHandling() {
        // Gestione errori JavaScript
        window.addEventListener('error', (event) => {
            console.error('Global JavaScript error:', event.error);
            if (Utils?.error?.handle) {
                Utils.error.handle(event.error, 'Global');
            }
        });

        // Gestione promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (Utils?.error?.handle) {
                Utils.error.handle(event.reason, 'Promise');
            }
        });
    },

    /**
     * Finalizza inizializzazione
     */
    async finalizeInitialization() {
        // Performance timing
        if (typeof performance !== 'undefined' && performance.getEntriesByType) {
            const navTiming = performance.getEntriesByType('navigation')[0];
            if (navTiming) {
                console.log('Navigation timing:', navTiming);
            }
        }

        // Carica stato app salvato
        this.loadAppState();

        // Inizializza routing se Navigation è disponibile e ha il metodo
        if (this.modules.navigation && window.Navigation && window.Navigation.loadInitialRoute) {
            await window.Navigation.loadInitialRoute();
        } else if (this.modules.navigation && window.Navigation) {
            // Se Navigation non ha loadInitialRoute, mostra la home page
            console.log('Navigation module loaded, showing home section');
            if (window.Navigation.showSection) {
                window.Navigation.showSection('home');
            }
        }

        // Mostra contenuto iniziale
        this.showInitialContent();
    },

    /**
     * Mostra loading iniziale
     */
    showInitialLoading() {
        const loadingHTML = `
            <div id="app-loading" class="app-loading">
                <div class="loading-container">
                    <div class="loading-icon">
                        <i class="fas fa-building"></i>
                        <h2>CoWorkSpace</h2>
                    </div>
                    <div class="loading-progress">
                        <div class="progress-bar" style="width: 0%"></div>
                    </div>
                    <div class="loading-text">Inizializzando dashboard...</div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', loadingHTML);
    },

    /**
     * Aggiorna progresso loading
     */
    updateLoadingProgress(percent, text) {
        const progressBar = document.querySelector('#app-loading .progress-bar');
        const loadingText = document.querySelector('#app-loading .loading-text');

        if (progressBar) {
            progressBar.style.width = `${Math.min(percent, 100)}%`;
        }

        if (loadingText && text) {
            loadingText.textContent = text;
        }
    },

    /**
     * Nascondi loading iniziale
     */
    hideInitialLoading() {
        const loading = document.getElementById('app-loading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.remove();
            }, 300);
        }
    },

    /**
     * Mostra contenuto iniziale
     */
    showInitialContent() {
        // Rimuovi eventuali overlay di caricamento
        const existingOverlay = document.querySelector('.loading-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Mostra il contenuto principale
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.opacity = '1';
        }
    },

    /**
     * Gestisce errori di inizializzazione
     */
    handleInitializationError(error) {
        console.error('Initialization error:', error);

        // Nascondi loading
        this.hideInitialLoading();

        // Mostra messaggio di errore
        const errorHTML = `
            <div class="app-error">
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Errore di Caricamento</h3>
                    <p>Si è verificato un errore durante il caricamento dell'applicazione.</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Ricarica Pagina
                    </button>
                </div>
            </div>
        `;

        document.body.innerHTML = errorHTML;
    },

    /**
     * Gestisce cambio visibilità pagina
     */
    handleVisibilityChange() {
        if (document.hidden) {
            this.onAppBlur();
        } else {
            this.onAppFocus();
        }
    },

    /**
     * Gestisce focus app
     */
    onAppFocus() {
        // Aggiorna dati se necessario
        if (this.modules.user && window.User?.refreshUserData) {
            window.User.refreshUserData();
        }

        this.triggerEvent('app:focus');
    },

    /**
     * Gestisce blur app - VERSIONE CORRETTA
     */
    onAppBlur() {
        // Salva stato app con controllo sicurezza
        this.saveAppState();
        this.triggerEvent('app:blur');
    },

    /**
     * Salva stato applicazione - VERSIONE CORRETTA
     */
    saveAppState() {
        try {
            const appState = {
                timestamp: Date.now(),
                preferences: this.gatherAppPreferences(),
                version: this.state.version
            };

            // Salva usando Utils se disponibile
            if (Utils?.storage?.set) {
                Utils.storage.set('appState', appState);
            } else {
                // Fallback su localStorage
                localStorage.setItem('coworkspace_app_state', JSON.stringify(appState));
            }

            return true;
        } catch (error) {
            console.error('Error saving app state:', error);
            return false;
        }
    },

    /**
     * Raccoglie preferenze applicazione - VERSIONE CORRETTA
     */
    gatherAppPreferences() {
        const preferences = {
            theme: document.documentElement.getAttribute('data-theme') || 'auto',
            language: document.documentElement.getAttribute('lang') || 'it'
        };

        // Fix: Controlla se Navigation esiste e ha lo state prima di accedere
        if (window.Navigation && window.Navigation.state) {
            // Usa currentSection se disponibile, altrimenti currentPage
            if (window.Navigation.state.currentSection) {
                preferences.currentSection = window.Navigation.state.currentSection;
            } else if (window.Navigation.state.currentPage) {
                preferences.currentSection = window.Navigation.state.currentPage;
            }
        }

        // Aggiungi preferenze utente se disponibili
        if (window.User && window.User.state && window.User.state.settings) {
            preferences.userSettings = window.User.state.settings;
        }

        return preferences;
    },

    /**
     * Carica stato applicazione
     */
    loadAppState() {
        try {
            let saved;

            // Prova prima con Utils, poi fallback su localStorage
            if (Utils?.storage?.get) {
                saved = Utils.storage.get('appState');
            } else {
                const rawSaved = localStorage.getItem('coworkspace_app_state');
                saved = rawSaved ? JSON.parse(rawSaved) : null;
            }

            if (saved && saved.preferences) {
                // Ripristina tema
                if (saved.preferences.theme) {
                    document.documentElement.setAttribute('data-theme', saved.preferences.theme);
                }

                // Ripristina sezione se disponibile e Navigation è inizializzato
                if (saved.preferences.currentSection && this.modules.navigation) {
                    setTimeout(() => {
                        if (window.Navigation?.showSection) {
                            window.Navigation.showSection(saved.preferences.currentSection);
                        }
                    }, 100);
                }
            }

        } catch (error) {
            console.error('Error loading app state:', error);
        }
    },

    /**
     * Gestisce resize finestra
     */
    handleWindowResize() {
        // Throttle resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            this.triggerEvent('app:resize');

            // Aggiorna layout componenti se necessario
            if (this.modules.components && window.Components?.handleResize) {
                window.Components.handleResize();
            }
        }, 150);
    },

    /**
     * Gestisce navigazione browser
     */
    handlePopState(event) {
        if (this.modules.navigation && window.Navigation?.handlePopState) {
            window.Navigation.handlePopState(event);
        }
    },

    /**
     * Gestisce scroll
     */
    handleScroll() {
        // Throttle scroll events
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        this.scrollTimeout = setTimeout(() => {
            this.triggerEvent('app:scroll');
        }, 50);
    },

    /**
     * Trigger evento custom
     */
    triggerEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...data, app: this }
        });
        document.dispatchEvent(event);
    },

    /**
     * Ottieni informazioni app
     */
    getInfo() {
        return {
            version: this.state.version,
            initialized: this.state.initialized,
            loading: this.state.loading,
            error: this.state.error,
            modules: { ...this.state.modules },
            uptime: this.state.startTime ? performance.now() - this.state.startTime : 0
        };
    },

    /**
     * Restart applicazione
     */
    restart() {
        console.log('🔄 Restarting CoWorkSpace Application...');

        // Reset stato
        this.state.initialized = false;
        this.state.loading = false;
        this.state.error = null;

        // Re-inizializza
        return this.init();
    },

    /**
     * Shutdown applicazione
     */
    shutdown() {
        console.log('⏹️ Shutting down CoWorkSpace Application...');

        // Salva stato
        this.saveAppState();

        // Cleanup event listeners
        this.listeners.forEach(listener => {
            document.removeEventListener(listener.event, listener.handler);
        });

        // Reset stato
        this.state.initialized = false;

        this.triggerEvent('app:shutdown');
    }
};

// Auto-inizializzazione se DOM già pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
    });
} else {
    // DOM già pronto
    App.init();
}