/**
 * CoWorkSpace - Main Application
 * Versione semplificata per funzionamento immediato
 */

// ===== VARIABILI GLOBALI =====
let currentUser = null;
let isAuthenticated = false;

// ===== FUNZIONI PRINCIPALI =====

/**
 * Mostra una sezione specifica
 */
function showSection(sectionName) {
    console.log('Navigazione a:', sectionName);

    // Per ora mostra un alert con informazioni
    const messages = {
        'home': 'Sei già nella home page!',
        'spaces': 'Sezione Spazi sarà implementata - qui vedrai tutti gli spazi disponibili',
        'about': 'Sezione Chi Siamo sarà implementata - storia e valori dell\'azienda',
        'support': 'Centro Assistenza sarà implementato - FAQ e supporto clienti'
    };

    alert(messages[sectionName] || 'Sezione in sviluppo: ' + sectionName);
}

/**
 * Mostra modal di login
 */
function showLogin() {
    // Crea e mostra un modal di login semplificato
    const loginHTML = `
        <div class="modal fade show" id="loginModal" style="display: block; background: rgba(0,0,0,0.5);">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-sign-in-alt text-primary"></i> Accedi
                        </h5>
                        <button type="button" class="btn-close" onclick="closeModal('loginModal')">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="loginForm">
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" id="loginEmail" placeholder="la-tua-email@example.com" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Password</label>
                                <input type="password" class="form-control" id="loginPassword" placeholder="Password" required>
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="rememberMe">
                                <label class="form-check-label" for="rememberMe">Ricordami</label>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="fas fa-sign-in-alt"></i> Accedi
                            </button>
                        </form>
                        <div class="text-center mt-3">
                            <a href="#" class="text-primary">Password dimenticata?</a>
                        </div>
                        <hr>
                        <div class="text-center">
                            <p class="mb-0">Non hai un account? 
                                <a href="#" onclick="switchToRegister()" class="text-primary">Registrati ora</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', loginHTML);

    // Setup form handler
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

/**
 * Mostra modal di registrazione
 */
function showRegister() {
    const registerHTML = `
        <div class="modal fade show" id="registerModal" style="display: block; background: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-user-plus text-primary"></i> Registrati
                        </h5>
                        <button type="button" class="btn-close" onclick="closeModal('registerModal')">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="registerForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Nome</label>
                                    <input type="text" class="form-control" id="registerName" placeholder="Il tuo nome" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Cognome</label>
                                    <input type="text" class="form-control" id="registerSurname" placeholder="Il tuo cognome" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" id="registerEmail" placeholder="la-tua-email@example.com" required>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Password</label>
                                    <input type="password" class="form-control" id="registerPassword" placeholder="Password sicura" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Conferma Password</label>
                                    <input type="password" class="form-control" id="confirmPassword" placeholder="Ripeti password" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Tipo di Account</label>
                                <select class="form-control" id="registerAccountType" required>
                                    <option value="">Seleziona tipo</option>
                                    <option value="client">Cliente - Prenoto spazi per lavorare</option>
                                    <option value="manager">Gestore - Offro spazi in affitto</option>
                                </select>
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" id="acceptTerms" required>
                                <label class="form-check-label" for="acceptTerms">
                                    Accetto i <a href="#" class="text-primary">termini e condizioni</a>
                                </label>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="fas fa-user-plus"></i> Registrati
                            </button>
                        </form>
                        <hr>
                        <div class="text-center">
                            <p class="mb-0">Hai già un account? 
                                <a href="#" onclick="switchToLogin()" class="text-primary">Accedi ora</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', registerHTML);

    // Setup form handler
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

/**
 * Gestisce il login
 */
function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Inserisci email e password', 'warning');
        return;
    }

    // Simula login
    currentUser = {
        id: 1,
        name: 'Mario',
        surname: 'Rossi',
        email: email,
        accountType: email.includes('manager') ? 'manager' : 'client'
    };

    isAuthenticated = true;

    // Salva nei cookie se richiesto
    if (document.getElementById('rememberMe').checked) {
        localStorage.setItem('coworkspace_user', JSON.stringify(currentUser));
    }

    closeModal('loginModal');
    updateAuthUI();
    showNotification('Login effettuato con successo!', 'success');
}

/**
 * Gestisce la registrazione
 */
function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const surname = document.getElementById('registerSurname').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const accountType = document.getElementById('registerAccountType').value;

    if (!name || !surname || !email || !password || !accountType) {
        showNotification('Compila tutti i campi obbligatori', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Le password non coincidono', 'error');
        return;
    }

    if (!document.getElementById('acceptTerms').checked) {
        showNotification('Devi accettare i termini e condizioni', 'warning');
        return;
    }

    // Simula registrazione
    currentUser = {
        id: Date.now(),
        name: name,
        surname: surname,
        email: email,
        accountType: accountType
    };

    isAuthenticated = true;
    localStorage.setItem('coworkspace_user', JSON.stringify(currentUser));

    closeModal('registerModal');
    updateAuthUI();
    showNotification('Registrazione completata con successo!', 'success');
}

/**
 * Chiude un modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

/**
 * Switch tra login e register
 */
function switchToRegister() {
    closeModal('loginModal');
    setTimeout(() => showRegister(), 300);
}

function switchToLogin() {
    closeModal('registerModal');
    setTimeout(() => showLogin(), 300);
}

/**
 * Aggiorna UI di autenticazione
 */
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');

    if (isAuthenticated && currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'block';
        userName.textContent = currentUser.name + ' ' + currentUser.surname;
    } else {
        authButtons.style.display = 'block';
        userMenu.style.display = 'none';
    }
}

/**
 * Logout
 */
function logout() {
    currentUser = null;
    isAuthenticated = false;
    localStorage.removeItem('coworkspace_user');
    updateAuthUI();
    showNotification('Logout effettuato con successo', 'success');
}

/**
 * Mostra sezioni utente autenticato
 */
function showProfile() {
    if (!isAuthenticated) {
        showNotification('Devi effettuare il login per accedere al profilo', 'warning');
        showLogin();
        return;
    }
    alert('Sezione Profilo in sviluppo\n\nQui potrai:\n- Modificare i tuoi dati personali\n- Gestire le preferenze\n- Visualizzare la cronologia');
}

function showBookings() {
    if (!isAuthenticated) {
        showNotification('Devi effettuare il login per vedere le prenotazioni', 'warning');
        showLogin();
        return;
    }
    alert('Sezione Prenotazioni in sviluppo\n\nQui potrai:\n- Vedere le tue prenotazioni attive\n- Gestire prenotazioni future\n- Consultare lo storico');
}

function showDashboard() {
    if (!isAuthenticated) {
        showNotification('Devi effettuare il login per accedere alla dashboard', 'warning');
        showLogin();
        return;
    }

    if (currentUser.accountType !== 'manager') {
        showNotification('Solo i gestori possono accedere alla dashboard', 'warning');
        return;
    }

    alert('Dashboard Manager in sviluppo\n\nQui potrai:\n- Gestire i tuoi spazi\n- Vedere statistiche e analitiche\n- Gestire prenotazioni');
}

/**
 * Mostra notifiche
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer') || createNotificationContainer();

    const iconClass = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    }[type] || 'fas fa-info-circle';

    const colorClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';

    const notification = document.createElement('div');
    notification.className = `notification alert ${colorClass} alert-dismissible fade show`;
    notification.innerHTML = `
        <i class="${iconClass} me-2"></i>
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;

    container.appendChild(notification);

    // Auto-remove dopo 4 secondi
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

/**
 * Crea container per notifiche se non esiste
 */
function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

/**
 * Gestione cookie banner
 */
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

function showCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    if (!localStorage.getItem('cookiesAccepted') && banner) {
        banner.style.display = 'block';
    }
}

/**
 * Back to top
 */
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Gestione form di ricerca rapida
 */
function handleQuickSearch(e) {
    e.preventDefault();

    /**
     * Gestione form di ricerca rapida
     */
    function handleQuickSearch(e) {
        e.preventDefault();

        const city = document.getElementById('quickCity').value;
        const spaceType = document.getElementById('quickSpaceType').value;
        const date = document.getElementById('quickDate').value;
        const capacity = document.getElementById('quickCapacity').value;

        let searchResults = 'Ricerca completata!\n\n';

        if (city) searchResults += `🏙️ Città: ${city}\n`;
        if (spaceType) {
            const typeLabels = {
                'hot-desk': 'Hot Desk',
                'private-office': 'Ufficio Privato',
                'meeting-room': 'Sala Riunioni',
                'event-space': 'Spazio Eventi'
            };
            searchResults += `🏢 Tipo: ${typeLabels[spaceType]}\n`;
        }
        if (date) searchResults += `📅 Data: ${new Date(date).toLocaleDateString('it-IT')}\n`;
        if (capacity) searchResults += `👥 Persone: ${capacity}\n`;

        searchResults += '\n✨ Trovati 12 spazi disponibili!';
        searchResults += '\n\n💡 Tip: Questa è una demo. Nella versione completa vedrai i risultati reali con filtri, mappa e prenotazioni.';

        alert(searchResults);
        showNotification('Ricerca completata! Trovati 12 spazi disponibili', 'success');
    }

    /**
     * Gestione navbar mobile
     */
    function toggleNavbar() {
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse) {
            navbarCollapse.classList.toggle('show');
        }
    }

    /**
     * Gestione scroll per back to top
     */
    function handleScroll() {
        const backToTop = document.getElementById('backToTop');
        if (backToTop) {
            if (window.scrollY > 100) {
                backToTop.style.display = 'block';
            } else {
                backToTop.style.display = 'none';
            }
        }

        // Effetto navbar scroll
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }
        }
    }

    /**
     * Chiudi dropdown al click fuori
     */
    function handleClickOutside(e) {
        const dropdowns = document.querySelectorAll('.dropdown-menu.show');
        dropdowns.forEach(dropdown => {
            if (!dropdown.parentElement.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });

        // Chiudi navbar mobile se aperto
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
            if (!navbarCollapse.contains(e.target) && !e.target.classList.contains('navbar-toggler')) {
                navbarCollapse.classList.remove('show');
            }
        }
    }

    /**
     * Gestione dropdown
     */
    function toggleDropdown(e) {
        e.preventDefault();
        e.stopPropagation();

        const dropdown = e.target.closest('.dropdown');
        const menu = dropdown.querySelector('.dropdown-menu');

        // Chiudi tutti gli altri dropdown
        document.querySelectorAll('.dropdown-menu.show').forEach(otherMenu => {
            if (otherMenu !== menu) {
                otherMenu.classList.remove('show');
            }
        });

        // Toggle questo dropdown
        menu.classList.toggle('show');
    }

    /**
     * Carica utente salvato
     */
    function loadSavedUser() {
        const savedUser = localStorage.getItem('coworkspace_user');
        if (savedUser) {
            try {
                currentUser = JSON.parse(savedUser);
                isAuthenticated = true;
                updateAuthUI();
                console.log('Utente caricato:', currentUser.name);
            } catch (e) {
                console.error('Errore nel caricamento utente salvato');
                localStorage.removeItem('coworkspace_user');
            }
        }
    }

    /**
     * Imposta data minima per i campi data
     */
    function setupDateInputs() {
        const today = new Date().toISOString().split('T')[0];
        const dateInputs = document.querySelectorAll('input[type="date"]');

        dateInputs.forEach(input => {
            input.setAttribute('min', today);
            if (input.id === 'quickDate' && !input.value) {
                input.value = today;
            }
        });
    }

    /**
     * Setup animazioni scroll
     */
    function setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Osserva elementi con classe animate-on-scroll
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Setup lazy loading per immagini
     */
    function setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');

        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    /**
     * Gestione errori JavaScript
     */
    function setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('Errore JavaScript:', e.error);
            // In produzione, qui potresti inviare l'errore a un servizio di logging
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Promise rejection non gestita:', e.reason);
            e.preventDefault();
        });
    }

    /**
     * Performance monitoring
     */
    function setupPerformanceMonitoring() {
        // Misura tempo di caricamento
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`🚀 Applicazione caricata in ${Math.round(loadTime)}ms`);

            // Misura metriche Core Web Vitals se disponibili
            if ('web-vital' in window) {
                // Qui potresti integrare librerie come web-vitals
            }
        });
    }

    /**
     * Setup Service Worker (per futuro PWA)
     */
    function setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registrato:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registrazione fallita:', error);
                });
        }
    }

    /**
     * Debug helpers (solo in development)
     */
    function setupDebugHelpers() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Aggiungi helpers di debug
            window.coworkspace = {
                login: (type = 'client') => {
                    currentUser = {
                        id: 999,
                        name: 'Debug',
                        surname: 'User',
                        email: `debug-${type}@test.com`,
                        accountType: type
                    };
                    isAuthenticated = true;
                    updateAuthUI();
                    console.log('Debug login effettuato:', currentUser);
                },
                logout: () => {
                    logout();
                    console.log('Debug logout effettuato');
                },
                showNotification: (msg, type) => showNotification(msg, type),
                state: () => ({currentUser, isAuthenticated})
            };

            console.log('🔧 Debug helpers disponibili in window.coworkspace');
        }
    }

// ===== INIZIALIZZAZIONE APPLICAZIONE =====

    /**
     * Inizializzazione principale
     */
    function initializeApp() {
        console.log('🚀 Inizializzazione CoWorkSpace...');

        try {
            // Setup base
            loadSavedUser();
            setupDateInputs();
            setupErrorHandling();
            setupPerformanceMonitoring();

            // Setup form di ricerca
            const quickSearchForm = document.getElementById('quickSearchForm');
            if (quickSearchForm) {
                quickSearchForm.addEventListener('submit', handleQuickSearch);
            }

            // Setup event listeners
            window.addEventListener('scroll', handleScroll);
            document.addEventListener('click', handleClickOutside);

            // Setup dropdown user menu
            const dropdownToggle = document.querySelector('.dropdown-toggle');
            if (dropdownToggle) {
                dropdownToggle.addEventListener('click', toggleDropdown);
            }

            // Setup animazioni e lazy loading
            if (window.IntersectionObserver) {
                setupScrollAnimations();
                setupLazyLoading();
            }

            // Setup debug helpers in development
            setupDebugHelpers();

            // Setup Service Worker per PWA (futuro)
            // setupServiceWorker();

            // Mostra cookie banner dopo delay
            setTimeout(showCookieBanner, 2000);

            // Update UI iniziale
            updateAuthUI();

            console.log('✅ CoWorkSpace inizializzato con successo!');

            // Mostra messaggio di benvenuto
            setTimeout(() => {
                showNotification('Benvenuto in CoWorkSpace! 🎉', 'success');
            }, 1000);

        } catch (error) {
            console.error('❌ Errore durante l\'inizializzazione:', error);
            showNotification('Errore durante il caricamento dell\'applicazione', 'error');
        }
    }

// ===== EVENT LISTENERS GLOBALI =====

// Inizializzazione al caricamento DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

// Cleanup alla chiusura pagina
    window.addEventListener('beforeunload', () => {
        console.log('👋 Chiusura CoWorkSpace...');
    });

// Gestione visibilità pagina
    document.addEventListener('visibilitychange', () => {
        if (document.hisdden) {
            console.log('📱 App nascosta');
        } else {
            console.log('📱 App visibile');
        }
    });

// Export per uso in console (development)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            showSection,
            showLogin,
            showRegister,
            logout,
            showNotification
        };
    }
}