/**
 * CoWorkSpace - Navigation Manager
 * Gestione navigazione e routing dell'applicazione
 */

window.Navigation = {
    /**
     * Stato della navigazione
     */
    state: {
        currentSection: 'home',
        previousSection: null,
        isNavigating: false
    },

    /**
     * Configurazione sezioni
     */
    sections: {
        home: {
            title: 'Home',
            template: 'home.html',
            requiresAuth: false
        },
        spazi: {
            title: 'Spazi',
            template: 'spaces.html',
            requiresAuth: false
        },
        spaces: {
            title: 'Spazi',
            template: 'spaces.html',
            requiresAuth: false
        },
        'chi-siamo': {
            title: 'Chi Siamo',
            template: 'about.html',
            requiresAuth: false
        },
        about: {
            title: 'Chi Siamo',
            template: 'about.html',
            requiresAuth: false
        },
        supporto: {
            title: 'Supporto',
            template: 'support.html',
            requiresAuth: false
        },
        support: {
            title: 'Supporto',
            template: 'support.html',
            requiresAuth: false
        },
        login: {
            title: 'Accedi',
            template: null,
            requiresAuth: false
        },
        register: {
            title: 'Registrati',
            template: null,
            requiresAuth: false
        },
        bookings: {
            title: 'Prenotazioni',
            template: 'bookings.html',
            requiresAuth: true
        },
        profile: {
            title: 'Profilo',
            template: 'profile.html',
            requiresAuth: true
        },
        dashboard: {
            title: 'Dashboard',
            template: 'dashboard.html',
            requiresAuth: true,
            requiresAdmin: true
        }
    },

    /**
     * Container principale
     */
    contentContainer: null,

    /**
     * Inizializza il Navigation Manager
     */
    async init() {
        try {
            console.log('🧭 Initializing Navigation Manager...');

            // Trova il content container
            this.contentContainer = document.getElementById('content-container');

            if (!this.contentContainer) {
                console.error('Content container not found');
                return false;
            }

            // Setup event listeners
            this.setupEventListeners();

            // Carica navbar se non presente
            await this.loadNavbar();

            console.log('✅ Navigation Manager initialized');
            return true;

        } catch (error) {
            console.error('Error initializing Navigation Manager:', error);
            return false;
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Gestione link navbar
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[data-section]');
            if (link) {
                event.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
            }
        });

        // Gestione back/forward browser
        window.addEventListener('popstate', this.handlePopState.bind(this));
    },

    /**
     * Carica la navbar se non presente
     */
    async loadNavbar() {
        const navbar = document.getElementById('navbar-container');
        if (navbar && !navbar.innerHTML.trim()) {
            try {
                const response = await fetch('./components/navbar.html');
                if (response.ok) {
                    const html = await response.text();
                    navbar.innerHTML = html;
                }
            } catch (error) {
                console.warn('Could not load navbar:', error);
            }
        }
    },

    /**
     * Mostra una sezione specifica
     * @param {string} sectionName - Nome della sezione
     */
    showSection(sectionName = 'home') {
        try {
            console.log(`📱 Showing section: ${sectionName}`);

            if (this.state.isNavigating) {
                console.log('Navigation in progress, skipping');
                return;
            }

            this.state.isNavigating = true;
            this.state.previousSection = this.state.currentSection;
            this.state.currentSection = sectionName.toLowerCase();

            // Nascondi tutte le sezioni attive
            this.hideAllSections();

            // Carica il contenuto della sezione
            switch (this.state.currentSection) {
                case 'home':
                    this.loadHomeSection();
                    break;
                case 'spazi':
                case 'spaces':
                    this.loadSpacesSection();
                    break;
                case 'chi-siamo':
                case 'about':
                    this.loadAboutSection();
                    break;
                case 'supporto':
                case 'support':
                    this.loadSupportSection();
                    break;
                case 'login':
                    this.loadLoginSection();
                    break;
                case 'register':
                    this.loadRegisterSection();
                    break;
                case 'bookings':
                    this.loadBookingsSection();
                    break;
                case 'profile':
                    this.loadProfileSection();
                    break;
                case 'dashboard':
                    this.loadDashboardSection();
                    break;
                default:
                    console.warn(`Unknown section: ${sectionName}, loading home`);
                    this.loadHomeSection();
                    this.state.currentSection = 'home';
            }

            // Aggiorna navigazione attiva
            this.updateActiveNavigation(this.state.currentSection);

            // Aggiorna URL se necessario
            this.updateURL(this.state.currentSection);

            this.state.isNavigating = false;

        } catch (error) {
            console.error('Error showing section:', error);
            Utils?.error?.handle(error, 'Navigation.showSection');
            // Fallback alla home in caso di errore
            this.loadHomeSection();
            this.state.currentSection = 'home';
            this.state.isNavigating = false;
        }
    },

    /**
     * Nascondi tutte le sezioni
     */
    hideAllSections() {
        if (this.contentContainer) {
            this.contentContainer.innerHTML = '';
        }
    },

    /**
     * Carica sezione home
     */
    loadHomeSection() {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
            <div class="hero-section">
                <div class="container">
                    <div class="row align-items-center min-vh-75">
                        <div class="col-lg-6">
                            <div class="hero-content">
                                <div class="badge bg-primary-soft mb-3">
                                    ⭐ Piattaforma #1 per Coworking in Italia
                                </div>
                                <h1 class="display-4 fw-bold mb-4">
                                    Trova il tuo 
                                    <span class="text-gradient">spazio ideale</span>
                                    per lavorare
                                </h1>
                                <p class="lead mb-4 text-muted">
                                    Prenota spazi di coworking professionali in tutta Italia. 
                                    Postazioni flessibili, sale riunioni e uffici privati per 
                                    massimizzare la tua produttività.
                                </p>
                                <div class="hero-actions">
                                    <button class="btn btn-primary btn-lg me-3" onclick="App.navigation.showSection('spazi')">
                                        <i class="fas fa-search me-2"></i>
                                        Cerca Spazi
                                    </button>
                                    <button class="btn btn-outline-primary btn-lg" onclick="App.navigation.showSection('chi-siamo')">
                                        Scopri di più
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="hero-image text-center">
                                <div class="workspace-search-card">
                                    <h5 class="mb-3">🔍 Cerca Spazi</h5>
                                    <div class="search-form">
                                        <div class="row g-3">
                                            <div class="col-12">
                                                <label class="form-label">Città</label>
                                                <select class="form-select">
                                                    <option>Seleziona città</option>
                                                    <option>Milano</option>
                                                    <option>Roma</option>
                                                    <option>Torino</option>
                                                    <option>Bologna</option>
                                                    <option>Firenze</option>
                                                    <option>Napoli</option>
                                                </select>
                                            </div>
                                            <div class="col-6">
                                                <label class="form-label">Tipo di Spazio</label>
                                                <select class="form-select">
                                                    <option>Tutti i tipi</option>
                                                    <option>Hot Desk</option>
                                                    <option>Uffici Privati</option>
                                                    <option>Sale Riunioni</option>
                                                    <option>Spazi Eventi</option>
                                                </select>
                                            </div>
                                            <div class="col-6">
                                                <label class="form-label">Persone</label>
                                                <select class="form-select">
                                                    <option>Qualsiasi</option>
                                                    <option>1 persona</option>
                                                    <option>2-5 persone</option>
                                                    <option>6-10 persone</option>
                                                    <option>10+ persone</option>
                                                </select>
                                            </div>
                                            <div class="col-12">
                                                <label class="form-label">Data</label>
                                                <input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                                            </div>
                                            <div class="col-12">
                                                <button class="btn btn-primary w-100" onclick="App.navigation.showSection('spazi')">
                                                    🔍 Cerca Spazi Disponibili
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Carica sezione spazi
     */
    loadSpacesSection() {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-12">
                        <div class="page-header mb-4">
                            <h1 class="h2">Spazi Disponibili</h1>
                            <p class="text-muted">Trova il workspace perfetto per le tue esigenze</p>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-lg-3">
                        <div class="filters-sidebar">
                            <h5>Filtri</h5>
                            <div class="filter-group">
                                <label class="form-label">Città</label>
                                <select class="form-select">
                                    <option>Tutte le città</option>
                                    <option>Milano</option>
                                    <option>Roma</option>
                                    <option>Torino</option>
                                    <option>Bologna</option>
                                    <option>Firenze</option>
                                    <option>Napoli</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label class="form-label">Tipo di Spazio</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="hotdesk">
                                    <label class="form-check-label" for="hotdesk">Hot Desk</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="private">
                                    <label class="form-check-label" for="private">Uffici Privati</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="meeting">
                                    <label class="form-check-label" for="meeting">Sale Riunioni</label>
                                </div>
                            </div>
                            <div class="filter-group">
                                <label class="form-label">Prezzo (€/giorno)</label>
                                <div class="row g-2">
                                    <div class="col-6">
                                        <input type="number" class="form-control" placeholder="Min" min="0">
                                    </div>
                                    <div class="col-6">
                                        <input type="number" class="form-control" placeholder="Max" min="0">
                                    </div>
                                </div>
                            </div>
                            <div class="filter-group">
                                <button class="btn btn-primary w-100">Applica Filtri</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-lg-9">
                        <div class="spaces-grid">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Gli spazi verranno caricati una volta risolti i problemi di connessione API.
                                Nel frattempo puoi esplorare le altre sezioni del sito.
                            </div>
                            
                            <!-- Demo spaces mentre l'API non funziona -->
                            <div class="row g-4">
                                <div class="col-md-6 col-lg-4">
                                    <div class="card space-card h-100">
                                        <div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                                            <i class="fas fa-image fa-3x text-muted"></i>
                                        </div>
                                        <div class="card-body">
                                            <h5 class="card-title">CoWork Milano Centro</h5>
                                            <p class="card-text">Spazio moderno nel cuore di Milano, ideale per professionisti e startup.</p>
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="text-primary fw-bold">€35/giorno</span>
                                                <small class="text-muted">Milano</small>
                                            </div>
                                        </div>
                                        <div class="card-footer">
                                            <button class="btn btn-primary btn-sm w-100">Prenota Ora</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-6 col-lg-4">
                                    <div class="card space-card h-100">
                                        <div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 200px;">
                                            <i class="fas fa-image fa-3x text-muted"></i>
                                        </div>
                                        <div class="card-body">
                                            <h5 class="card-title">Roma Business Hub</h5>
                                            <p class="card-text">Uffici privati e sale riunioni in zona EUR, perfetto per meeting importanti.</p>
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="text-primary fw-bold">€45/giorno</span>
                                                <small class="text-muted">Roma</small>
                                            </div>
                                        </div>
                                        <div class="card-footer">
                                            <button class="btn btn-primary btn-sm w-100">Prenota Ora</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Carica sezione chi siamo
     */
    loadAboutSection() {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
            <div class="container mt-4">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div class="text-center mb-5">
                            <h1 class="display-4 mb-4">Chi Siamo</h1>
                            <p class="lead">La piattaforma leader in Italia per la prenotazione di spazi di coworking professionali.</p>
                        </div>
                        
                        <div class="row g-4 mb-5">
                            <div class="col-md-6">
                                <div class="feature-card">
                                    <i class="fas fa-building fa-3x text-primary mb-3"></i>
                                    <h4>Spazi Moderni</h4>
                                    <p>Trova il workspace perfetto per la tua produttività in ambienti moderni e stimolanti con tutte le dotazioni necessarie.</p>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="feature-card">
                                    <i class="fas fa-users fa-3x text-primary mb-3"></i>
                                    <h4>Community</h4>
                                    <p>Connettiti con una community di professionisti e imprenditori di talento, favorendo networking e collaborazioni.</p>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="feature-card">
                                    <i class="fas fa-calendar fa-3x text-primary mb-3"></i>
                                    <h4>Flessibilità</h4>
                                    <p>Prenota quando e dove vuoi, con opzioni flessibili adatte alle tue esigenze lavorative e ai tuoi orari.</p>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="feature-card">
                                    <i class="fas fa-shield-alt fa-3x text-primary mb-3"></i>
                                    <h4>Sicurezza</h4>
                                    <p>Tutti i nostri spazi sono verificati e garantiscono massima sicurezza, igiene e conformità alle normative vigenti.</p>
                                </div>
                            </div>
                        </div>

                        <div class="text-center">
                            <h3 class="mb-4">La Nostra Mission</h3>
                            <p class="lead mb-4">
                                Crediamo che il futuro del lavoro sia flessibile, collaborativo e orientato al benessere. 
                                La nostra missione è connettere professionisti e aziende con gli spazi più adatti alle loro esigenze, 
                                creando un ecosistema dinamico che favorisce produttività, innovazione e crescita.
                            </p>
                            <button class="btn btn-primary btn-lg" onclick="App.navigation.showSection('spazi')">
                                <i class="fas fa-search me-2"></i>
                                Esplora i Nostri Spazi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Carica sezione supporto
     */
    loadSupportSection() {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
            <div class="container mt-4">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div class="text-center mb-5">
                            <h1 class="display-4 mb-4">Supporto</h1>
                            <p class="lead">Siamo qui per aiutarti. Contattaci per qualsiasi domanda o assistenza.</p>
                        </div>
                        
                        <div class="row g-4 mb-5">
                            <div class="col-md-6">
                                <div class="card h-100">
                                    <div class="card-body text-center">
                                        <i class="fas fa-envelope fa-3x text-primary mb-3"></i>
                                        <h5>Email</h5>
                                        <p class="text-muted">Scrivici per assistenza tecnica o informazioni generali</p>
                                        <a href="mailto:supporto@coworkspace.it" class="btn btn-outline-primary">
                                            supporto@coworkspace.it
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card h-100">
                                    <div class="card-body text-center">
                                        <i class="fas fa-phone fa-3x text-primary mb-3"></i>
                                        <h5>Telefono</h5>
                                        <p class="text-muted">Chiamaci dal lunedì al venerdì, 9:00-18:00</p>
                                        <a href="tel:+390212345678" class="btn btn-outline-primary">
                                            +39 02 1234 5678
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card h-100">
                                    <div class="card-body text-center">
                                        <i class="fas fa-comments fa-3x text-primary mb-3"></i>
                                        <h5>Chat Live</h5>
                                        <p class="text-muted">Assistenza in tempo reale durante gli orari di ufficio</p>
                                        <button class="btn btn-outline-primary" onclick="alert('Chat live disponibile a breve!')">
                                            Avvia Chat
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card h-100">
                                    <div class="card-body text-center">
                                        <i class="fas fa-question-circle fa-3x text-primary mb-3"></i>
                                        <h5>FAQ</h5>
                                        <p class="text-muted">Trova risposte alle domande più frequenti</p>
                                        <button class="btn btn-outline-primary" onclick="alert('Sezione FAQ in arrivo!')">
                                            Consulta FAQ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Modulo di Contatto -->
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-paper-plane me-2"></i>
                                    Inviaci un Messaggio
                                </h5>
                            </div>
                            <div class="card-body">
                                <form id="contact-form">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label for="contact-name" class="form-label">Nome *</label>
                                            <input type="text" class="form-control" id="contact-name" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="contact-email" class="form-label">Email *</label>
                                            <input type="email" class="form-control" id="contact-email" required>
                                        </div>
                                        <div class="col-12">
                                            <label for="contact-subject" class="form-label">Oggetto *</label>
                                            <select class="form-select" id="contact-subject" required>
                                                <option value="">Seleziona un oggetto</option>
                                                <option value="info">Informazioni generali</option>
                                                <option value="booking">Supporto prenotazioni</option>
                                                <option value="technical">Problemi tecnici</option>
                                                <option value="partnership">Partnership</option>
                                                <option value="other">Altro</option>
                                            </select>
                                        </div>
                                        <div class="col-12">
                                            <label for="contact-message" class="form-label">Messaggio *</label>
                                            <textarea class="form-control" id="contact-message" rows="5" required 
                                                    placeholder="Descrivi la tua richiesta o domanda..."></textarea>
                                        </div>
                                        <div class="col-12">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="contact-privacy" required>
                                                <label class="form-check-label" for="contact-privacy">
                                                    Accetto il trattamento dei dati personali secondo la 
                                                    <a href="#" target="_blank">Privacy Policy</a> *
                                                </label>
                                            </div>
                                        </div>
                                        <div class="col-12">
                                            <button type="submit" class="btn btn-primary">
                                                <i class="fas fa-paper-plane me-2"></i>
                                                Invia Messaggio
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Aggiungi event listener per il form
        const form = document.getElementById('contact-form');
        if (form) {
            form.addEventListener('submit', this.handleContactForm.bind(this));
        }
    },

    /**
     * Carica sezione login
     */
    loadLoginSection() {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
            <div class="container mt-4">
                <div class="row justify-content-center">
                    <div class="col-md-6 col-lg-4">
                        <div class="card">
                            <div class="card-body">
                                <h3 class="card-title text-center mb-4">
                                    <i class="fas fa-sign-in-alt me-2"></i>
                                    Accedi
                                </h3>
                                <form id="login-form">
                                    <div class="mb-3">
                                        <label for="email" class="form-label">Email</label>
                                        <input type="email" class="form-control" id="email" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="password" class="form-label">Password</label>
                                        <input type="password" class="form-control" id="password" required>
                                    </div>
                                    <div class="form-check mb-3">
                                        <input class="form-check-input" type="checkbox" id="remember">
                                        <label class="form-check-label" for="remember">
                                            Ricordami
                                        </label>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">
                                        <i class="fas fa-sign-in-alt me-2"></i>
                                        Accedi
                                    </button>
                                </form>
                                <div class="text-center mt-3">
                                    <p>Non hai un account? 
                                        <a href="#" onclick="App.navigation.showSection('register')">Registrati</a>
                                    </p>
                                    <a href="#" onclick="alert('Funzione di recupero password in arrivo!')">
                                        Hai dimenticato la password?
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Carica sezione registrazione
     */
    loadRegisterSection() {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
            <div class="container mt-4">
                <div class="row justify-content-center">
                    <div class="col-md-8 col-lg-6">
                        <div class="card">
                            <div class="card-body">
                                <h3 class="card-title text-center mb-4">
                                    <i class="fas fa-user-plus me-2"></i>
                                    Registrati
                                </h3>
                                <form id="register-form">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label for="nome" class="form-label">Nome *</label>
                                            <input type="text" class="form-control" id="nome" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="cognome" class="form-label">Cognome *</label>
                                            <input type="text" class="form-control" id="cognome" required>
                                        </div>
                                        <div class="col-12">
                                            <label for="email-reg" class="form-label">Email *</label>
                                            <input type="email" class="form-control" id="email-reg" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="password-reg" class="form-label">Password *</label>
                                            <input type="password" class="form-control" id="password-reg" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="password-confirm" class="form-label">Conferma Password *</label>
                                            <input type="password" class="form-control" id="password-confirm" required>
                                        </div>
                                        <div class="col-12">
                                            <label for="phone" class="form-label">Telefono</label>
                                            <input type="tel" class="form-control" id="phone">
                                        </div>
                                        <div class="col-12">
                                            <label for="company" class="form-label">Azienda</label>
                                            <input type="text" class="form-control" id="company" placeholder="Opzionale">
                                        </div>
                                        <div class="col-12">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="terms" required>
                                                <label class="form-check-label" for="terms">
                                                    Accetto i <a href="#" target="_blank">Termini di Servizio</a> 
                                                    e la <a href="#" target="_blank">Privacy Policy</a> *
                                                </label>
                                            </div>
                                        </div>
                                        <div class="col-12">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="newsletter">
                                                <label class="form-check-label" for="newsletter">
                                                    Voglio ricevere aggiornamenti e offerte speciali via email
                                                </label>
                                            </div>
                                        </div>
                                        <div class="col-12">
                                            <button type="submit" class="btn btn-primary w-100">
                                                <i class="fas fa-user-plus me-2"></i>
                                                Registrati
                                            </button>
                                        </div>
                                    </div>
                                </form>
                                <div class="text-center mt-3">
                                    <p>Hai già un account? 
                                        <a href="#" onclick="App.navigation.showSection('login')">Accedi</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Carica sezione prenotazioni (richiede autenticazione)
     */
    loadBookingsSection() {
        if (!this.contentContainer) return;

        // Controlla autenticazione
        if (!this.checkAuth()) {
            this.showAuthRequired();
            return;
        }

        this.contentContainer.innerHTML = `
            <div class="container mt-4">
                <div class="page-header mb-4">
                    <h1 class="h2">Le Mie Prenotazioni</h1>
                    <p class="text-muted">Gestisci le tue prenotazioni attive e passate</p>
                </div>
                
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Le prenotazioni verranno mostrate qui una volta implementato il sistema di autenticazione completo.
                </div>
            </div>
        `;
    },

    /**
     * Carica sezione profilo (richiede autenticazione)
     */
    loadProfileSection() {
        if (!this.contentContainer) return;

        // Controlla autenticazione
        if (!this.checkAuth()) {
            this.showAuthRequired();
            return;
        }

        this.contentContainer.innerHTML = `
            <div class="container mt-4">
                <div class="page-header mb-4">
                    <h1 class="h2">Il Tuo Profilo</h1>
                    <p class="text-muted">Gestisci le informazioni del tuo account</p>
                </div>
                
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Il profilo utente verrà mostrato qui una volta implementato il sistema di autenticazione completo.
                </div>
            </div>
        `;
    },

    /**
     * Carica sezione dashboard (richiede autenticazione admin)
     */
    loadDashboardSection() {
        if (!this.contentContainer) return;

        // Controlla autenticazione e permessi admin
        if (!this.checkAuth() || !this.checkAdmin()) {
            this.showAuthRequired('Accesso riservato agli amministratori');
            return;
        }

        this.contentContainer.innerHTML = `
            <div class="container mt-4">
                <div class="page-header mb-4">
                    <h1 class="h2">Dashboard Admin</h1>
                    <p class="text-muted">Pannello di controllo amministrativo</p>
                </div>
                
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    La dashboard admin verrà implementata nelle prossime versioni.
                </div>
            </div>
        `;
    },

    /**
     * Controlla se l'utente è autenticato
     */
    checkAuth() {
        return window.Auth?.state?.isAuthenticated || false;
    },

    /**
     * Controlla se l'utente è admin
     */
    checkAdmin() {
        return window.Auth?.state?.user?.isAdmin || false;
    },

    /**
     * Mostra messaggio per autenticazione richiesta
     */
    showAuthRequired(message = 'Devi effettuare l\'accesso per visualizzare questa sezione') {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
            <div class="container mt-4">
                <div class="row justify-content-center">
                    <div class="col-md-6">
                        <div class="text-center">
                            <i class="fas fa-lock fa-4x text-muted mb-4"></i>
                            <h3>Accesso Richiesto</h3>
                            <p class="lead mb-4">${message}</p>
                            <div>
                                <button class="btn btn-primary me-3" onclick="App.navigation.showSection('login')">
                                    <i class="fas fa-sign-in-alt me-2"></i>
                                    Accedi
                                </button>
                                <button class="btn btn-outline-primary" onclick="App.navigation.showSection('register')">
                                    <i class="fas fa-user-plus me-2"></i>
                                    Registrati
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Aggiorna navigazione attiva
     */
    updateActiveNavigation(sectionName) {
        // Rimuovi classe active da tutti i link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));

        // Aggiungi classe active al link corrente
        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    },

    /**
     * Aggiorna URL
     */
    updateURL(sectionName) {
        if (history.pushState) {
            const url = sectionName === 'home' ? '/' : `/#${sectionName}`;
            history.pushState({ section: sectionName }, '', url);
        }
    },

    /**
     * Gestisci evento popstate del browser
     */
    handlePopState(event) {
        const section = event.state?.section || this.getCurrentSectionFromURL();
        this.showSection(section);
    },

    /**
     * Ottieni sezione corrente dall'URL
     */
    getCurrentSectionFromURL() {
        const hash = window.location.hash.replace('#', '');
        return hash || 'home';
    },

    /**
     * Carica rotta iniziale
     */
    loadInitialRoute() {
        const section = this.getCurrentSectionFromURL();
        this.showSection(section);
    },

    /**
     * Gestisci form di contatto
     */
    handleContactForm(event) {
        event.preventDefault();

        // Simula invio form
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Invio in corso...';
        submitBtn.disabled = true;

        setTimeout(() => {
            alert('Messaggio inviato con successo! Ti risponderemo al più presto.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            // Reset form
            event.target.reset();
        }, 2000);
    }
};