/**
 * CoWorkSpace - Main Application JavaScript
 */

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
    }
};

// ===== INIZIALIZZAZIONE APP =====
class CoWorkSpaceApp {
    constructor() {
        this.state = AppState;
        this.init();
    }

    init() {
        console.log('CoWorkSpace App inizializzato');

        // Controlla autenticazione
        this.checkAuth();

        // Setup event listeners globali
        this.setupGlobalListeners();

        // Inizializza componenti
        this.initializeComponents();

        // Setup scroll handler
        this.setupScrollHandler();
    }

    checkAuth() {
        const savedUser = localStorage.getItem('coworkspace_user');
        if (savedUser) {
            try {
                this.state.currentUser = JSON.parse(savedUser);
                this.state.isAuthenticated = true;
                this.updateAuthUI();
            } catch (e) {
                localStorage.removeItem('coworkspace_user');
            }
        }
    }

    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (this.state.isAuthenticated && this.state.currentUser) {
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (userName) userName.textContent = `${this.state.currentUser.name} ${this.state.currentUser.surname}`;
        } else {
            if (authButtons) authButtons.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    setupGlobalListeners() {
        // Gestione form di login
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'loginForm') {
                e.preventDefault();
                this.handleLogin(e.target);
            } else if (e.target.id === 'registerForm') {
                e.preventDefault();
                this.handleRegister(e.target);
            }
        });

        // Gestione click sui filtri rapidi
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-filter-btn')) {
                this.handleQuickFilter(e.target);
            }
        });
    }

    handleLogin(form) {
        const email = form.querySelector('#loginEmail').value;
        const password = form.querySelector('#loginPassword').value;

        if (!email || !password) {
            showNotification('Inserisci email e password', 'warning');
            return;
        }

        // Simulazione login
        this.state.currentUser = {
            id: Date.now(),
            name: "Mario",
            surname: "Rossi",
            email: email,
            accountType: email.includes('manager') ? 'manager' : 'client'
        };
        this.state.isAuthenticated = true;

        if (form.querySelector('#rememberMe')?.checked) {
            localStorage.setItem('coworkspace_user', JSON.stringify(this.state.currentUser));
        }

        // Chiudi modal
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) loginModal.hide();

        this.updateAuthUI();
        showNotification('Login effettuato con successo', 'success');

        // Redirect se manager
        if (this.state.currentUser.accountType === 'manager') {
            window.location.href = 'dashboard.html';
        }
    }

    handleRegister(form) {
        const name = form.querySelector('#registerName').value;
        const surname = form.querySelector('#registerSurname').value;
        const email = form.querySelector('#registerEmail').value;
        const password = form.querySelector('#registerPassword').value;
        const confirmPassword = form.querySelector('#confirmPassword').value;
        const accountType = form.querySelector('#registerAccountType').value;

        if (!name || !surname || !email || !password || !accountType) {
            showNotification('Compila tutti i campi obbligatori', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Le password non coincidono', 'error');
            return;
        }

        if (!form.querySelector('#acceptTerms').checked) {
            showNotification('Devi accettare i termini e condizioni', 'warning');
            return;
        }

        this.state.currentUser = {
            id: Date.now(),
            name: name,
            surname: surname,
            email: email,
            accountType: accountType
        };
        this.state.isAuthenticated = true;

        localStorage.setItem('coworkspace_user', JSON.stringify(this.state.currentUser));

        const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        if (registerModal) registerModal.hide();

        this.updateAuthUI();
        showNotification('Registrazione completata con successo', 'success');
    }

    handleQuickFilter(button) {
        const filter = button.getAttribute('data-filter');
        button.classList.toggle('active');

        // Applica filtro
        if (typeof applyFilter === 'function') {
            applyFilter(filter, button.classList.contains('active'));
        }
    }

    initializeComponents() {
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
    }

    setupScrollHandler() {
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
}

// ===== FUNZIONI GLOBALI =====

// Logout
function logout() {
    AppState.currentUser = null;
    AppState.isAuthenticated = false;
    localStorage.removeItem('coworkspace_user');

    const app = new CoWorkSpaceApp();
    app.updateAuthUI();

    showNotification('Logout effettuato con successo', 'success');
    window.location.href = 'index.html';
}

// Mostra modal login
function showLogin() {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
}

// Mostra modal registrazione
function showRegister() {
    const modal = new bootstrap.Modal(document.getElementById('registerModal'));
    modal.show();
}

// Switch tra login e registrazione
function switchToRegister() {
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    if (loginModal) loginModal.hide();
    setTimeout(() => {
        showRegister();
    }, 300);
}

function switchToLogin() {
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

// ===== INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', function() {
    // Crea istanza dell'app
    window.coworkspaceApp = new CoWorkSpaceApp();

    // Mostra cookie banner dopo 2 secondi
    setTimeout(showCookieBanner, 2000);
});

// Export per moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CoWorkSpaceApp,
        AppState,
        logout,
        showLogin,
        showRegister
    };
}