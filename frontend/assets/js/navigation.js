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
    // In assets/js/navigation.js
    loadSpacesSection() {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
        <!-- Spaces Sub-Navigation Header - FISSO -->
        <div class="spaces-sub-header">
            <div class="spaces-nav-container">
                <h2 class="spaces-nav-title">
                    <i class="fas fa-building"></i>
                    Spazi di Coworking
                </h2>
                
                <ul class="spaces-nav-tabs">
                    <li class="spaces-nav-tab">
                        <a href="#" class="spaces-nav-link active" data-section="ricerca" onclick="showSpacesSection('ricerca')">
                            <i class="fas fa-search"></i>
                            Ricerca
                        </a>
                    </li>
                    <li class="spaces-nav-tab">
                        <a href="#" class="spaces-nav-link" data-section="mappa" onclick="showSpacesSection('mappa')">
                            <i class="fas fa-map-marked-alt"></i>
                            Mappa
                        </a>
                    </li>
                    <li class="spaces-nav-tab">
                        <a href="#" class="spaces-nav-link" data-section="filtri" onclick="showSpacesSection('filtri')">
                            <i class="fas fa-filter"></i>
                            Filtri
                            <span class="nav-badge">3</span>
                        </a>
                    </li>
                    <li class="spaces-nav-tab">
                        <a href="#" class="spaces-nav-link" data-section="preferiti" onclick="showSpacesSection('preferiti')">
                            <i class="fas fa-heart"></i>
                            Preferiti
                            <span class="nav-badge">5</span>
                        </a>
                    </li>
                </ul>
            </div>
        </div>

        <!-- Contenuto delle sezioni spazi -->
        <div class="spaces-content">
            <div class="container">
                <div id="spaces-sections-container">
                    <!-- Le sezioni verranno caricate qui -->
                </div>
            </div>
        </div>
    `;

        // Inizializza la prima sezione
        setTimeout(() => {
            showSpacesSection('ricerca');
        }, 100);
    },

    loadSpacesSection() {
        // Invece di caricare contenuto inline, reindirizza alla pagina dedicata
        window.location.href = 'spaces.html';
    },

    /**
     * Carica sezione chi siamo
     */
    loadAboutSection() {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
        <div class="container mt-4">
            <!-- Search and Filters Bar -->
            <div class="search-filters-bar">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="search-input-group">
                            <i class="fas fa-search"></i>
                            <input type="text" class="form-control" id="searchAbout"
                                   placeholder="Cerca informazioni su di noi, valori, team...">
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-outline-primary me-2" onclick="filterAboutContent('team')">
                            <i class="fas fa-users"></i> Team
                        </button>
                        <button class="btn btn-outline-primary" onclick="filterAboutContent('values')">
                            <i class="fas fa-heart"></i> Valori
                        </button>
                    </div>
                </div>
            </div>

            <div class="row justify-content-center">
                <div class="col-lg-10">
                    <div class="text-center mb-5">
                        <h1 class="display-4 mb-4">Chi Siamo</h1>
                        <p class="lead">Siamo il punto di riferimento per il coworking in Italia</p>
                    </div>

                    <!-- Story Section -->
                    <div class="about-section mb-5" data-category="story">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <h2 class="mb-4">La Nostra Storia</h2>
                                <p class="mb-4">
                                    Fondata nel 2020, CoWorkSpace nasce dall'idea di rivoluzionare il mondo del lavoro in Italia. 
                                    Abbiamo iniziato con un piccolo spazio a Milano e oggi gestiamo oltre 200 location in tutto il paese.
                                </p>
                                <p class="mb-4">
                                    La nostra vision è quella di creare un ecosistema dove professionisti, freelancer e aziende 
                                    possano trovare l'ambiente perfetto per sviluppare le proprie idee e far crescere il proprio business.
                                </p>
                            </div>
                            <div class="col-md-6">
                                <div class="about-image-container">
                                    <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=400&fit=crop&crop=center" 
                                         alt="Il nostro primo ufficio" class="img-fluid rounded shadow">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Features -->
                    <div class="features-section mb-5" data-category="features">
                        <div class="row">
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
                            <div class="col-md-6">
                                <div class="feature-card">
                                    <i class="fas fa-wifi fa-3x text-primary mb-3"></i>
                                    <h4>Tecnologia</h4>
                                    <p>Connessione ultra-veloce, sale attrezzate e tutti gli strumenti tecnologici necessari per il tuo lavoro.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Team Section -->
                    <div class="team-section mb-5" data-category="team">
                        <div class="text-center mb-5">
                            <h3 class="section-title">
                                <i class="fas fa-users text-primary me-2"></i>Il Nostro Team
                            </h3>
                            <p class="section-subtitle">Le persone che rendono possibile la nostra vision</p>
                        </div>
                        <div class="row">
                            <div class="col-lg-4 col-md-6 mb-4">
                                <div class="team-card text-center">
                                    <div class="team-avatar mb-3">
                                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" 
                                             alt="Marco Rossi" class="rounded-circle">
                                    </div>
                                    <h5>Marco Rossi</h5>
                                    <p class="text-primary">CEO & Founder</p>
                                    <p class="text-muted">Visionario del progetto, esperto in business development e innovazione.</p>
                                </div>
                            </div>
                            <div class="col-lg-4 col-md-6 mb-4">
                                <div class="team-card text-center">
                                    <div class="team-avatar mb-3">
                                        <img src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face" 
                                             alt="Sara Bianchi" class="rounded-circle">
                                    </div>
                                    <h5>Sara Bianchi</h5>
                                    <p class="text-primary">CTO</p>
                                    <p class="text-muted">Responsabile tecnologia e sviluppo della piattaforma digitale.</p>
                                </div>
                            </div>
                            <div class="col-lg-4 col-md-6 mb-4">
                                <div class="team-card text-center">
                                    <div class="team-avatar mb-3">
                                        <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" 
                                             alt="Luigi Verdi" class="rounded-circle">
                                    </div>
                                    <h5>Luigi Verdi</h5>
                                    <p class="text-primary">Head of Operations</p>
                                    <p class="text-muted">Gestisce le operazioni quotidiane e l'espansione della rete.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Values Section -->
                    <div class="values-section mt-5" data-category="values">
                        <div class="row">
                            <div class="col-12 text-center mb-5">
                                <h3 class="section-title">
                                    <i class="fas fa-heart text-danger me-2"></i>I Nostri Valori
                                </h3>
                                <p class="section-subtitle">I principi che guidano ogni nostra decisione</p>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-lg-3 col-md-6 mb-4">
                                <div class="value-card h-100 text-center">
                                    <i class="fas fa-handshake value-icon text-primary"></i>
                                    <h5 class="mt-3">Fiducia</h5>
                                    <p class="text-muted">
                                        Costruiamo relazioni basate sulla trasparenza, onestà e
                                        affidabilità con tutti i nostri partner e clienti.
                                    </p>
                                </div>
                            </div>
                            <div class="col-lg-3 col-md-6 mb-4">
                                <div class="value-card h-100 text-center">
                                    <i class="fas fa-lightbulb value-icon text-warning"></i>
                                    <h5 class="mt-3">Innovazione</h5>
                                    <p class="text-muted">
                                        Cerchiamo costantemente nuove soluzioni per migliorare
                                        l'esperienza di lavoro dei nostri utenti.
                                    </p>
                                </div>
                            </div>
                            <div class="col-lg-3 col-md-6 mb-4">
                                <div class="value-card h-100 text-center">
                                    <i class="fas fa-globe value-icon text-success"></i>
                                    <h5 class="mt-3">Sostenibilità</h5>
                                    <p class="text-muted">
                                        Ci impegniamo per un futuro sostenibile attraverso
                                        pratiche eco-friendly e responsabilità sociale.
                                    </p>
                                </div>
                            </div>
                            <div class="col-lg-3 col-md-6 mb-4">
                                <div class="value-card h-100 text-center">
                                    <i class="fas fa-trophy value-icon text-info"></i>
                                    <h5 class="mt-3">Eccellenza</h5>
                                    <p class="text-muted">
                                        Puntiamo sempre alla massima qualità in ogni servizio
                                        e in ogni interazione con i nostri clienti.
                                    </p>
                                </div>
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

        // Inizializza la funzionalità di ricerca
        this.initializeAboutSearch();
    },

    /**
     * Carica sezione supporto
     */
    loadSupportSection() {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = `
        <div class="container mt-4">
            <!-- Search and Filters Bar -->
            <div class="search-filters-bar">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="search-input-group">
                            <i class="fas fa-search"></i>
                            <input type="text" class="form-control" id="searchSupport"
                                   placeholder="Cerca nelle FAQ, guide, contatti...">
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-outline-primary me-2" onclick="filterSupportContent('faq')">
                            <i class="fas fa-question-circle"></i> FAQ
                        </button>
                        <button class="btn btn-outline-primary" onclick="filterSupportContent('contact')">
                            <i class="fas fa-phone"></i> Contatti
                        </button>
                    </div>
                </div>
            </div>

            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <div class="text-center mb-5">
                        <h1 class="display-4 mb-4">Centro Assistenza</h1>
                        <p class="lead">Siamo qui per aiutarti. Trova rapidamente le risposte che cerchi.</p>
                    </div>

                    <!-- Quick Actions -->
                    <div class="quick-actions mb-5" data-category="quick">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <div class="support-card h-100">
                                    <div class="support-icon">
                                        <i class="fas fa-comments text-primary"></i>
                                    </div>
                                    <h4>Chat dal Vivo</h4>
                                    <p class="text-muted">Parla direttamente con un nostro operatore. Disponibile 24/7.</p>
                                    <button class="btn btn-primary" onclick="startLiveChat()">
                                        <i class="fas fa-comment-dots me-2"></i>Avvia Chat
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-6 mb-3">
                                <div class="support-card h-100">
                                    <div class="support-icon">
                                        <i class="fas fa-phone text-success"></i>
                                    </div>
                                    <h4>Chiamaci</h4>
                                    <p class="text-muted">Supporto telefonico dal lunedì al venerdì, 9:00-18:00.</p>
                                    <a href="tel:+390123456789" class="btn btn-success">
                                        <i class="fas fa-phone me-2"></i>+39 012 345 6789
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- FAQ Section -->
                    <div class="faq-section mb-5" data-category="faq">
                        <h3 class="text-center mb-4">
                            <i class="fas fa-question-circle text-info me-2"></i>Domande Frequenti
                        </h3>
                        <div class="accordion" id="faqAccordion">
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">
                                        Come posso prenotare uno spazio?
                                    </button>
                                </h2>
                                <div id="faq1" class="accordion-collapse collapse show" data-bs-parent="#faqAccordion">
                                    <div class="accordion-body">
                                        Puoi prenotare uno spazio direttamente dalla nostra piattaforma. Cerca lo spazio che preferisci, 
                                        seleziona data e orario, e procedi con il pagamento. Riceverai immediatamente una conferma via email.
                                    </div>
                                </div>
                            </div>
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">
                                        Posso cancellare una prenotazione?
                                    </button>
                                </h2>
                                <div id="faq2" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                                    <div class="accordion-body">
                                        Sì, puoi cancellare gratuitamente fino a 24 ore prima dell'inizio della prenotazione. 
                                        Per cancellazioni tardive potrebbero applicarsi delle penali secondo i termini di servizio.
                                    </div>
                                </div>
                            </div>
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq3">
                                        Quali metodi di pagamento accettate?
                                    </button>
                                </h2>
                                <div id="faq3" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                                    <div class="accordion-body">
                                        Accettiamo tutte le principali carte di credito (Visa, Mastercard, American Express), 
                                        PayPal e bonifico bancario per prenotazioni aziendali.
                                    </div>
                                </div>
                            </div>
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq4">
                                        È possibile prenotare per più giorni?
                                    </button>
                                </h2>
                                <div id="faq4" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                                    <div class="accordion-body">
                                        Certamente! Offriamo tariffe scontate per prenotazioni di più giorni, settimane o mesi. 
                                        Contattaci per preventivi personalizzati per esigenze a lungo termine.
                                    </div>
                                </div>
                            </div>
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq5">
                                        Gli spazi includono WiFi e attrezzature?
                                    </button>
                                </h2>
                                <div id="faq5" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                                    <div class="accordion-body">
                                        Sì, tutti i nostri spazi includono WiFi ad alta velocità, postazioni di lavoro ergonomiche, 
                                        accesso a stampanti e altri servizi base. Molti includono anche caffè, tè e snack gratuiti.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Contact Section -->
                    <div class="contact-section mb-5" data-category="contact">
                        <h3 class="text-center mb-4">
                            <i class="fas fa-envelope text-primary me-2"></i>Altri Modi per Contattarci
                        </h3>
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <div class="contact-card text-center">
                                    <i class="fas fa-envelope fa-2x text-primary mb-3"></i>
                                    <h5>Email</h5>
                                    <p class="text-muted">Scrivi al nostro team di supporto</p>
                                    <a href="mailto:supporto@coworkspace.it" class="btn btn-outline-primary">
                                        supporto@coworkspace.it
                                    </a>
                                </div>
                            </div>
                            <div class="col-md-4 mb-3">
                                <div class="contact-card text-center">
                                    <i class="fas fa-map-marker-alt fa-2x text-success mb-3"></i>
                                    <h5>Sede Principale</h5>
                                    <p class="text-muted">Via Roma 123, 20121 Milano (MI)</p>
                                    <button class="btn btn-outline-success" onclick="openMap()">
                                        <i class="fas fa-directions me-2"></i>Indicazioni
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-4 mb-3">
                                <div class="contact-card text-center">
                                    <i class="fas fa-clock fa-2x text-info mb-3"></i>
                                    <h5>Orari Supporto</h5>
                                    <p class="text-muted">Lun-Ven: 9:00-18:00<br>Sab-Dom: 10:00-16:00</p>
                                    <span class="badge bg-success">Online Ora</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Feedback Form -->
                    <div class="feedback-section" data-category="feedback">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title text-center mb-4">
                                    <i class="fas fa-comment-dots text-warning me-2"></i>
                                    Non hai trovato quello che cercavi?
                                </h5>
                                <p class="text-center text-muted mb-4">
                                    Inviaci un messaggio e ti risponderemo il prima possibile.
                                </p>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Nome *</label>
                                        <input type="text" class="form-control" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Email *</label>
                                        <input type="email" class="form-control" required>
                                    </div>
                                    <div class="col-12 mb-3">
                                        <label class="form-label">Oggetto *</label>
                                        <select class="form-select">
                                            <option>Problema con prenotazione</option>
                                            <option>Domanda sui pagamenti</option>
                                            <option>Richiesta informazioni</option>
                                            <option>Segnalazione bug</option>
                                            <option>Feedback generale</option>
                                            <option>Altro</option>
                                        </select>
                                    </div>
                                    <div class="col-12 mb-3">
                                        <label class="form-label">Messaggio *</label>
                                        <textarea class="form-control" rows="4" placeholder="Descrivi il tuo problema o la tua domanda..."></textarea>
                                    </div>
                                    <div class="col-12 text-center">
                                        <button class="btn btn-primary btn-lg">
                                            <i class="fas fa-paper-plane me-2"></i>
                                            Invia Messaggio
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

        // Inizializza la funzionalità di ricerca
        this.initializeSupportSearch();
    },

    /**
     * Inizializza la ricerca nella sezione About
     */
    initializeAboutSearch() {
        const searchInput = document.getElementById('searchAbout');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterAboutSections(e.target.value.toLowerCase());
            });
        }
    },

    /**
     * Inizializza la ricerca nella sezione Support
     */
    initializeSupportSearch() {
        const searchInput = document.getElementById('searchSupport');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterSupportSections(e.target.value.toLowerCase());
            });
        }
    },

    /**
     * Filtra le sezioni About in base al termine di ricerca
     */
    filterAboutSections(searchTerm) {
        const sections = document.querySelectorAll('[data-category]');

        sections.forEach(section => {
            const text = section.textContent.toLowerCase();
            const isVisible = !searchTerm || text.includes(searchTerm);
            section.style.display = isVisible ? 'block' : 'none';
        });
    },

    /**
     * Filtra le sezioni Support in base al termine di ricerca
     */
    filterSupportSections(searchTerm) {
        const sections = document.querySelectorAll('[data-category]');

        sections.forEach(section => {
            const text = section.textContent.toLowerCase();
            const isVisible = !searchTerm || text.includes(searchTerm);
            section.style.display = isVisible ? 'block' : 'none';
        });
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