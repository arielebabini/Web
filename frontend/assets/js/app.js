/**
 * CoWorkSpace - Versione Stabile e Unificata
 * Risolve i problemi di login multiplo, logout e conflitti di inizializzazione.
 */

console.log('🚀 Loading CoWorkSpace Frontend...');

// ===== CONFIGURAZIONE API =====
const API_CONFIG = {
    baseURL: 'http://localhost:3000/api',
    timeout: 10000,
};

// ===== CLASSE API CLIENT =====
class APIClient {
    constructor(config) {
        this.config = config;
        this.token = null; // Inizia sempre pulito
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.config.baseURL}${endpoint}`;
        const headers = { 'Content-Type': 'application/json', ...options.headers };
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
            return response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            return { success: false, message: 'Errore di connessione.' };
        }
    }

    // Metodi specifici (login, register, etc.)
    async login(credentials) { return this.request('/auth/login', { method: 'POST', body: credentials }); }
    async register(userData) { return this.request('/auth/register', { method: 'POST', body: userData }); }
    async getProfile() { return this.request('/users/profile'); }
}

// ===== STATO GLOBALE DELL'APPLICAZIONE =====
const AppState = {
    currentUser: null,
    isAuthenticated: false,
    api: new APIClient(API_CONFIG),
};

// ===== CLASSE PRINCIPALE DELL'APP =====
class CoWorkSpaceApp {
    constructor() {
        this.state = AppState;
        console.log('🏗️ CoWorkSpaceApp constructor called');
    }

    async init() {
        console.log('🚀 App init: Setting up base listeners and components...');
        this.setupGlobalListeners();
        this.initializeComponents();
    }

    async initializeAuth() {
        console.log('🔍 Initializing authentication...');
        const token = localStorage.getItem('auth_token');
        const userJson = localStorage.getItem('currentUser');

        if (token && userJson) {
            try {
                this.state.api.setToken(token);
                this.state.currentUser = JSON.parse(userJson);
                this.state.isAuthenticated = true;
                console.log(`✅ Auth state restored for ${this.state.currentUser.email}`);

                // Opzionale ma consigliato: verifica il token con il server
                const profileCheck = await this.state.api.getProfile();
                if (!profileCheck.success) {
                    console.warn('⚠️ Token validation failed. Logging out.');
                    this.logout(false); // Fai il logout senza reindirizzare
                }
            } catch (e) {
                console.error('Corrupted user data in localStorage. Clearing session.');
                this.logout(false);
            }
        } else {
            console.log('👤 No user session found. Starting as guest.');
        }
        this.updateAuthUI();
    }

    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userInitial = document.getElementById('userInitial');
        const userFullName = document.getElementById('userFullName');

        if (this.state.isAuthenticated && this.state.currentUser) {
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';

            const firstName = this.state.currentUser.firstName || 'U';
            const lastName = this.state.currentUser.lastName || '';
            if (userInitial) userInitial.textContent = firstName.charAt(0).toUpperCase();
            if (userFullName) userFullName.textContent = `${firstName} ${lastName}`.trim();
        } else {
            if (authButtons) authButtons.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    // Funzione di logout interna alla classe
    logout(redirect = true) {
        console.log('🧹 Clearing all session data...');
        this.state.currentUser = null;
        this.state.isAuthenticated = false;
        this.state.api.setToken(null); // Questo rimuove anche da localStorage

        // Pulizia forzata di tutte le chiavi conosciute
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        localStorage.removeItem('refresh_token');

        console.log('✅ Session cleared.');
        this.updateAuthUI();

        if (redirect) {
            window.location.href = '/index.html';
        }
    }

    // Gestione form e altri componenti
    setupGlobalListeners() {
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'loginForm') {
                e.preventDefault();
                // Gestisci login
            }
        });
    }

    initializeComponents() {
        // Inizializza tooltip etc.
    }
}

// ===== FUNZIONI GLOBALI E AVVIO =====

// Funzione globale di logout che chiama il metodo della classe
function logout() {
    if (window.coworkspaceApp) {
        window.coworkspaceApp.logout();
    }
}

// L'UNICO PUNTO DI AVVIO PER TUTTA L'APPLICAZIONE
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOMContentLoaded: Starting CoWorkSpace App...');

    // Crea l'istanza globale
    window.coworkspaceApp = new CoWorkSpaceApp();

    // GESTIONE DEL REDIRECT DI GOOGLE
    const params = new URLSearchParams(window.location.search);
    if (params.has('login_success') && params.get('login_success') === 'true') {
        console.log('✨ Google OAuth redirect detected. Processing...');
        const token = params.get('token');
        const userJson = params.get('user');

        if (token && userJson) {
            try {
                // Salva i nuovi dati, sovrascrivendo quelli vecchi
                localStorage.setItem('auth_token', token);
                localStorage.setItem('currentUser', decodeURIComponent(userJson));
                console.log('✅ New Google user data saved to localStorage.');

                // Pulisci l'URL per le sessioni future
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
                console.error("Error processing Google login data:", e);
            }
        }
    }

    // Inizializza i componenti base
    await window.coworkspaceApp.init();

    // Esegui la verifica dell'autenticazione come ultimo passo
    // Leggerà i dati corretti (o del vecchio utente, o quelli appena salvati da Google)
    await window.coworkspaceApp.initializeAuth();

    console.log('✅ App ready and UI synchronized.');
});