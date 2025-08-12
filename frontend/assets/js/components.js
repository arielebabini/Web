/**
 * CoWorkSpace - Components Manager
 * Gestione componenti UI riutilizzabili
 */

window.Components = {
    /**
     * Stato del modulo
     */
    state: {
        initialized: false,
        loading: false,
        loadedComponents: new Map(),
        cache: new Map()
    },

    /**
     * Configurazione
     */
    config: {
        componentsPath: './components/',
        cacheTimeout: 300000, // 5 minuti
        components: {
            navbar: 'navbar.html',
            footer: 'footer.html',
            loading: 'loading.html',
            cookieBanner: 'cookie-banner.html',
            notification: 'notification.html'
        }
    },

    /**
     * Templates componenti
     */
    templates: {
        footer: `
            <footer class="footer">
                <div class="container">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="footer-section">
                                <h5><i class="fas fa-building"></i> CoWorkSpace</h5>
                                <p>La piattaforma per trovare il tuo spazio di lavoro ideale.</p>
                                <div class="social-links">
                                    <a href="#" class="social-link"><i class="fab fa-facebook"></i></a>
                                    <a href="#" class="social-link"><i class="fab fa-twitter"></i></a>
                                    <a href="#" class="social-link"><i class="fab fa-instagram"></i></a>
                                    <a href="#" class="social-link"><i class="fab fa-linkedin"></i></a>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="footer-section">
                                <h6>Esplora</h6>
                                <ul class="footer-links">
                                    <li><a href="#" onclick="Navigation.showSection('spaces')">Spazi</a></li>
                                    <li><a href="#" onclick="Navigation.showSection('about')">Chi Siamo</a></li>
                                    <li><a href="#" onclick="Navigation.showSection('support')">Supporto</a></li>
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="footer-section">
                                <h6>Account</h6>
                                <ul class="footer-links">
                                    <li><a href="#" onclick="Navigation.showSection('profile')">Profilo</a></li>
                                    <li><a href="#" onclick="Navigation.showSection('profile', 'bookings')">Prenotazioni</a></li>
                                    <li><a href="#" onclick="Navigation.showSection('profile', 'settings')">Impostazioni</a></li>
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="footer-section">
                                <h6>Legale</h6>
                                <ul class="footer-links">
                                    <li><a href="#" onclick="Components.showPrivacyModal()">Privacy</a></li>
                                    <li><a href="#" onclick="Components.showTermsModal()">Termini</a></li>
                                    <li><a href="#" onclick="Components.showCookieModal()">Cookie</a></li>
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="footer-section">
                                <h6>Aiuto</h6>
                                <ul class="footer-links">
                                    <li><a href="#" onclick="Components.showContactModal()">Contatti</a></li>
                                    <li><a href="#" onclick="Components.showFaqModal()">FAQ</a></li>
                                    <li><a href="#" onclick="Navigation.showSection('support')">Supporto</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <hr class="footer-divider">
                    <div class="footer-bottom">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <p>&copy; 2025 CoWorkSpace. Tutti i diritti riservati.</p>
                            </div>
                            <div class="col-md-6 text-end">
                                <div class="footer-actions">
                                    <button class="btn-theme-toggle" onclick="Components.toggleTheme()" title="Cambia tema">
                                        <i class="fas fa-moon" id="theme-icon"></i>
                                    </button>
                                    <button class="btn-scroll-top" onclick="Components.scrollToTop()" title="Torna su">
                                        <i class="fas fa-chevron-up"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        `,

        loading: `
            <div class="loading-overlay" id="loading-overlay">
                <div class="loading-content">
                    <div class="loading-spinner">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <div class="loading-text">Caricamento...</div>
                </div>
            </div>
        `,

        cookieBanner: `
            <div class="cookie-banner" id="cookie-banner" style="display: none;">
                <div class="container">
                    <div class="cookie-content">
                        <div class="cookie-text">
                            <p><strong>🍪 Utilizziamo i cookie</strong></p>
                            <p>Questo sito utilizza cookie per migliorare la tua esperienza. Continuando a navigare accetti l'uso dei cookie.</p>
                        </div>
                        <div class="cookie-actions">
                            <button class="btn btn-outline-light btn-sm" onclick="Components.showCookieModal()">
                                Dettagli
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="Components.acceptEssentialCookies()">
                                Solo Essenziali
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="Components.acceptAllCookies()">
                                Accetta Tutti
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `,

        notification: `
            <div class="notification {type}" id="notification-{id}">
                <div class="notification-content">
                    <div class="notification-icon">
                        <i class="fas {icon}"></i>
                    </div>
                    <div class="notification-message">
                        {message}
                    </div>
                    <button class="notification-close" onclick="Components.closeNotification('{id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `,

        modal: `
            <div class="modal fade" id="dynamic-modal" tabindex="-1">
                <div class="modal-dialog {size}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            {content}
                        </div>
                        {footer}
                    </div>
                </div>
            </div>
        `
    },

    /**
     * Inizializza il modulo
     */
    async init() {
        try {
            console.log('🧩 Initializing Components Manager...');

            // Carica componenti base
            await this.loadBaseComponents();

            // Setup event listeners globali
            this.setupGlobalListeners();

            // Inizializza componenti dinamici
            this.initializeDynamicComponents();

            this.state.initialized = true;
            console.log('✅ Components Manager initialized');

            return true;

        } catch (error) {
            console.error('❌ Failed to initialize Components Manager:', error);
            return false;
        }
    },

    /**
     * Carica componenti base
     */
    async loadBaseComponents() {
        try {
            // Carica navbar (se non già presente)
            await this.loadComponent('navbar', '#navbar-container');

            // Carica footer
            await this.loadComponent('footer', '#footer-container');

            // Inizializza loading overlay
            this.initializeLoadingOverlay();

            // Inizializza cookie banner
            this.initializeCookieBanner();

            // Inizializza notification container
            this.initializeNotificationContainer();

            console.log('Footer initialized');

        } catch (error) {
            console.error('Error loading base components:', error);
        }
    },

    /**
     * Carica singolo componente
     */
    async loadComponent(componentName, containerSelector) {
        try {
            const container = document.querySelector(containerSelector);
            if (!container) {
                console.warn(`Container ${containerSelector} not found for component ${componentName}`);
                return false;
            }

            // Controlla cache
            const cacheKey = `component_${componentName}`;
            if (this.state.cache.has(cacheKey)) {
                const cached = this.state.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
                    container.innerHTML = cached.content;
                    this.state.loadedComponents.set(componentName, container);
                    return true;
                }
            }

            let content = '';

            // Usa template se disponibile
            if (this.templates[componentName]) {
                content = this.templates[componentName];
            } else {
                // Carica da file se configurato
                const fileName = this.config.components[componentName];
                if (fileName) {
                    const response = await fetch(`${this.config.componentsPath}${fileName}`);
                    if (response.ok) {
                        content = await response.text();
                    } else {
                        throw new Error(`Failed to load component file: ${fileName}`);
                    }
                }
            }

            if (content) {
                // Sostituzioni dinamiche
                content = this.processComponentTemplate(content, componentName);

                // Inserisci nel container
                container.innerHTML = content;

                // Salva in cache
                this.state.cache.set(cacheKey, {
                    content: content,
                    timestamp: Date.now()
                });

                // Salva riferimento
                this.state.loadedComponents.set(componentName, container);

                // Setup event listeners specifici del componente
                this.setupComponentListeners(componentName, container);

                return true;
            }

            return false;

        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
            return false;
        }
    },

    /**
     * Processa template componente
     */
    processComponentTemplate(template, componentName) {
        // Sostituzioni globali
        template = template.replace(/{year}/g, new Date().getFullYear());
        template = template.replace(/{appName}/g, 'CoWorkSpace');

        return template;
    },

    /**
     * Setup event listeners per componente
     */
    setupComponentListeners(componentName, container) {
        switch (componentName) {
            case 'footer':
                this.setupFooterListeners(container);
                break;
            case 'navbar':
                this.setupNavbarListeners(container);
                break;
        }
    },

    /**
     * Setup listeners footer
     */
    setupFooterListeners(container) {
        // Theme toggle
        const themeToggle = container.querySelector('.btn-theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Scroll to top
        const scrollTop = container.querySelector('.btn-scroll-top');
        if (scrollTop) {
            scrollTop.addEventListener('click', () => {
                this.scrollToTop();
            });
        }

        // Social links
        const socialLinks = container.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // Implementa condivisione social se necessario
            });
        });
    },

    /**
     * Setup listeners navbar
     */
    setupNavbarListeners(container) {
        // Navigation links già gestiti da Navigation module
    },

    /**
     * Setup event listeners globali
     */
    setupGlobalListeners() {
        // Scroll per mostrare/nascondere scroll-to-top
        window.addEventListener('scroll', this.throttle(() => {
            this.handleScroll();
        }, 100));

        // Resize per layout responsive
        window.addEventListener('resize', this.throttle(() => {
            this.handleResize();
        }, 250));

        // Gestione visibilità per analytics
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    },

    /**
     * Inizializza componenti dinamici
     */
    initializeDynamicComponents() {
        // Back to top button
        this.createBackToTopButton();

        // Modal container
        this.createModalContainer();

        // Tooltip initialization
        this.initializeTooltips();
    },

    /**
     * Inizializza loading overlay
     */
    initializeLoadingOverlay() {
        const container = document.getElementById('loading-overlay-container');
        if (container) {
            container.innerHTML = this.templates.loading;
        }
    },

    /**
     * Inizializza cookie banner
     */
    initializeCookieBanner() {
        const container = document.getElementById('cookie-banner-container');
        if (container) {
            container.innerHTML = this.templates.cookieBanner;

            // Mostra banner se necessario
            this.checkCookieConsent();
        }
    },

    /**
     * Inizializza container notifiche
     */
    initializeNotificationContainer() {
        let container = document.getElementById('notification-container');

        if (!container) {
            // Crea container se non esiste
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(container);
            console.log('Notification container created');
        } else if (!container.innerHTML.trim()) {
            // Container già presente e vuoto, pronto per le notifiche
            console.log('Notification container found and ready');
        }
    },

    /**
     * Crea pulsante back to top
     */
    createBackToTopButton() {
        const existingBtn = document.getElementById('back-to-top');
        if (existingBtn) {
            existingBtn.addEventListener('click', () => {
                this.scrollToTop();
            });
        }
    },

    /**
     * Crea container modal
     */
    createModalContainer() {
        const container = document.getElementById('modal-container');
        if (container && !container.innerHTML.trim()) {
            // Container pronto per i modal dinamici
        }
    },

    /**
     * Inizializza tooltip
     */
    initializeTooltips() {
        // Inizializza tooltip Bootstrap se disponibile
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    },

    /**
     * Mostra loading overlay
     */
    showLoading(text = 'Caricamento...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            const textElement = overlay.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = text;
            }
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Nascondi loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    },

    /**
     * Mostra notifica
     */
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) {
            console.warn('Notification container not found');
            return;
        }

        const id = Date.now().toString();
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        let notification = this.templates.notification;
        notification = notification.replace(/{id}/g, id);
        notification = notification.replace(/{type}/g, type);
        notification = notification.replace(/{icon}/g, icons[type] || icons.info);
        notification = notification.replace(/{message}/g, message);

        container.insertAdjacentHTML('beforeend', notification);

        // Auto-remove dopo duration
        if (duration > 0) {
            setTimeout(() => {
                this.closeNotification(id);
            }, duration);
        }

        // Animazione di entrata
        const notificationEl = document.getElementById(`notification-${id}`);
        if (notificationEl) {
            setTimeout(() => {
                notificationEl.classList.add('show');
            }, 10);
        }
    },

    /**
     * Chiudi notifica
     */
    closeNotification(id) {
        const notification = document.getElementById(`notification-${id}`);
        if (notification) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    },

    /**
     * Mostra modal dinamico
     */
    showModal(options = {}) {
        const {
            title = 'Modal',
            content = '',
            size = 'modal-lg',
            footer = '',
            onShow = null,
            onHide = null
        } = options;

        // Crea modal
        let modal = this.templates.modal;
        modal = modal.replace(/{title}/g, title);
        modal = modal.replace(/{content}/g, content);
        modal = modal.replace(/{size}/g, size);
        modal = modal.replace(/{footer}/g, footer ? `<div class="modal-footer">${footer}</div>` : '');

        // Inserisci nel container
        const container = document.getElementById('modal-container');
        if (container) {
            container.innerHTML = modal;

            // Inizializza modal Bootstrap
            const modalElement = document.getElementById('dynamic-modal');
            if (modalElement && typeof bootstrap !== 'undefined') {
                const bsModal = new bootstrap.Modal(modalElement);

                // Event listeners
                if (onShow) {
                    modalElement.addEventListener('shown.bs.modal', onShow);
                }
                if (onHide) {
                    modalElement.addEventListener('hidden.bs.modal', onHide);
                }

                // Cleanup al close
                modalElement.addEventListener('hidden.bs.modal', () => {
                    container.innerHTML = '';
                });

                bsModal.show();
                return bsModal;
            }
        }

        return null;
    },

    /**
     * Nascondi modal
     */
    hideModal() {
        const modal = document.getElementById('dynamic-modal');
        if (modal && typeof bootstrap !== 'undefined') {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    },

    /**
     * Aggiorna modal
     */
    updateModal(options = {}) {
        const modal = document.getElementById('dynamic-modal');
        if (!modal) return;

        if (options.title) {
            const titleEl = modal.querySelector('.modal-title');
            if (titleEl) titleEl.textContent = options.title;
        }

        if (options.content) {
            const bodyEl = modal.querySelector('.modal-body');
            if (bodyEl) bodyEl.innerHTML = options.content;
        }

        if (options.footer) {
            let footerEl = modal.querySelector('.modal-footer');
            if (!footerEl) {
                footerEl = document.createElement('div');
                footerEl.className = 'modal-footer';
                modal.querySelector('.modal-content').appendChild(footerEl);
            }
            footerEl.innerHTML = options.footer;
        }
    },

    /**
     * Controlla consenso cookie
     */
    checkCookieConsent() {
        const consent = localStorage.getItem('coworkspace_cookie_consent');
        if (!consent) {
            setTimeout(() => {
                const banner = document.getElementById('cookie-banner');
                if (banner) {
                    banner.style.display = 'block';
                }
            }, 2000);
        }
    },

    /**
     * Accetta tutti i cookie
     */
    acceptAllCookies() {
        localStorage.setItem('coworkspace_cookie_consent', JSON.stringify({
            essential: true,
            analytics: true,
            marketing: true,
            timestamp: Date.now()
        }));

        this.hideCookieBanner();
        this.showNotification('Preferenze cookie salvate', 'success');
    },

    /**
     * Accetta solo cookie essenziali
     */
    acceptEssentialCookies() {
        localStorage.setItem('coworkspace_cookie_consent', JSON.stringify({
            essential: true,
            analytics: false,
            marketing: false,
            timestamp: Date.now()
        }));

        this.hideCookieBanner();
        this.showNotification('Solo cookie essenziali accettati', 'info');
    },

    /**
     * Nascondi banner cookie
     */
    hideCookieBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.style.display = 'none';
        }
    },

    /**
     * Toggle tema
     */
    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'auto';
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(current);
        const nextTheme = themes[(currentIndex + 1) % themes.length];

        document.documentElement.setAttribute('data-theme', nextTheme);

        // Aggiorna icona
        const icon = document.getElementById('theme-icon');
        if (icon) {
            const icons = {
                auto: 'fa-adjust',
                light: 'fa-sun',
                dark: 'fa-moon'
            };
            icon.className = `fas ${icons[nextTheme]}`;
        }

        // Salva preferenza
        if (window.User && window.User.state && window.User.state.settings) {
            window.User.state.settings.theme = nextTheme;
            if (window.User.saveSettingsLocally) {
                window.User.saveSettingsLocally();
            }
        }

        this.showNotification(`Tema cambiato: ${nextTheme}`, 'info', 2000);
    },

    /**
     * Scroll to top
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    },

    /**
     * Gestisce scroll
     */
    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Back to top button
        const backToTopBtn = document.getElementById('back-to-top');
        if (backToTopBtn) {
            if (scrollTop > 300) {
                backToTopBtn.classList.remove('d-none');
            } else {
                backToTopBtn.classList.add('d-none');
            }
        }

        // Navbar scroll effect
        const navbar = document.getElementById('main-navbar');
        if (navbar) {
            if (scrollTop > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    },

    /**
     * Gestisce resize
     */
    handleResize() {
        // Aggiorna layout componenti responsive
        const components = ['navbar', 'footer'];
        components.forEach(componentName => {
            const component = this.state.loadedComponents.get(componentName);
            if (component) {
                this.updateComponentLayout(componentName, component);
            }
        });
    },

    /**
     * Aggiorna layout componente
     */
    updateComponentLayout(componentName, component) {
        switch (componentName) {
            case 'navbar':
                // Chiudi menu mobile se aperto
                const collapse = component.querySelector('.navbar-collapse');
                if (collapse && collapse.classList.contains('show')) {
                    if (typeof bootstrap !== 'undefined') {
                        const bsCollapse = bootstrap.Collapse.getInstance(collapse);
                        if (bsCollapse) bsCollapse.hide();
                    }
                }
                break;
        }
    },

    /**
     * Gestisce cambio visibilità
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Pagina nascosta
        } else {
            // Pagina visibile - aggiorna componenti se necessario
        }
    },

    /**
     * Mostra modal privacy
     */
    showPrivacyModal() {
        this.showModal({
            title: 'Informativa Privacy',
            content: `
                <div class="privacy-content">
                    <h6>Raccolta Dati</h6>
                    <p>Raccogliamo solo i dati necessari per fornire i nostri servizi...</p>
                    
                    <h6>Utilizzo</h6>
                    <p>I tuoi dati vengono utilizzati per...</p>
                    
                    <h6>Condivisione</h6>
                    <p>Non condividiamo i tuoi dati con terze parti...</p>
                    
                    <h6>I tuoi Diritti</h6>
                    <p>Hai il diritto di accedere, modificare o eliminare i tuoi dati...</p>
                </div>
            `,
            size: 'modal-lg'
        });
    },

    /**
     * Mostra modal termini
     */
    showTermsModal() {
        this.showModal({
            title: 'Termini di Servizio',
            content: `
                <div class="terms-content">
                    <h6>1. Accettazione dei Termini</h6>
                    <p>Utilizzando questo servizio accetti questi termini...</p>
                    
                    <h6>2. Uso del Servizio</h6>
                    <p>Il servizio può essere utilizzato per...</p>
                    
                    <h6>3. Limitazioni</h6>
                    <p>È vietato utilizzare il servizio per...</p>
                    
                    <h6>4. Responsabilità</h6>
                    <p>L'utente è responsabile per...</p>
                </div>
            `,
            size: 'modal-lg'
        });
    },

    /**
     * Mostra modal cookie
     */
    showCookieModal() {
        this.showModal({
            title: 'Gestione Cookie',
            content: `
                <div class="cookie-settings">
                    <p>Personalizza le tue preferenze sui cookie:</p>
                    
                    <div class="cookie-category">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="essential-cookies" checked disabled>
                            <label class="form-check-label" for="essential-cookies">
                                <strong>Cookie Essenziali</strong><br>
                                <small>Necessari per il funzionamento del sito</small>
                            </label>
                        </div>
                    </div>
                    
                    <div class="cookie-category">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="analytics-cookies">
                            <label class="form-check-label" for="analytics-cookies">
                                <strong>Cookie Analytics</strong><br>
                                <small>Ci aiutano a migliorare il sito</small>
                            </label>
                        </div>
                    </div>
                    
                    <div class="cookie-category">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="marketing-cookies">
                            <label class="form-check-label" for="marketing-cookies">
                                <strong>Cookie Marketing</strong><br>
                                <small>Per contenuti personalizzati</small>
                            </label>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                <button type="button" class="btn btn-primary" onclick="Components.saveCookiePreferences()">Salva Preferenze</button>
            `
        });
    },

    /**
     * Salva preferenze cookie
     */
    saveCookiePreferences() {
        const essential = document.getElementById('essential-cookies')?.checked || false;
        const analytics = document.getElementById('analytics-cookies')?.checked || false;
        const marketing = document.getElementById('marketing-cookies')?.checked || false;

        localStorage.setItem('coworkspace_cookie_consent', JSON.stringify({
            essential,
            analytics,
            marketing,
            timestamp: Date.now()
        }));

        this.hideModal();
        this.hideCookieBanner();
        this.showNotification('Preferenze cookie aggiornate', 'success');
    },

    /**
     * Mostra modal contatti
     */
    showContactModal() {
        this.showModal({
            title: 'Contattaci',
            content: `
                <div class="contact-info">
                    <div class="contact-item">
                        <i class="fas fa-envelope"></i>
                        <div>
                            <strong>Email</strong><br>
                            <a href="mailto:info@coworkspace.com">info@coworkspace.com</a>
                        </div>
                    </div>
                    
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <div>
                            <strong>Telefono</strong><br>
                            <a href="tel:+390123456789">+39 012 345 6789</a>
                        </div>
                    </div>
                    
                    <div class="contact-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <div>
                            <strong>Indirizzo</strong><br>
                            Via Roma 123, Milano, Italia
                        </div>
                    </div>
                    
                    <div class="contact-form">
                        <h6>Invia un messaggio</h6>
                        <form id="contact-form">
                            <div class="mb-3">
                                <input type="text" class="form-control" placeholder="Nome" required>
                            </div>
                            <div class="mb-3">
                                <input type="email" class="form-control" placeholder="Email" required>
                            </div>
                            <div class="mb-3">
                                <textarea class="form-control" rows="3" placeholder="Messaggio" required></textarea>
                            </div>
                        </form>
                    </div>
                </div>
            `,
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                <button type="button" class="btn btn-primary" onclick="Components.sendContactMessage()">Invia Messaggio</button>
            `
        });
    },

    /**
     * Invia messaggio contatto
     */
    sendContactMessage() {
        this.showNotification('Messaggio inviato! Ti risponderemo presto.', 'success');
        this.hideModal();
    },

    /**
     * Mostra modal FAQ
     */
    showFaqModal() {
        this.showModal({
            title: 'Domande Frequenti',
            content: `
                <div class="faq-content">
                    <div class="faq-item">
                        <h6>Come posso prenotare uno spazio?</h6>
                        <p>Registrati, cerca gli spazi disponibili e clicca su "Prenota". Segui la procedura guidata per completare la prenotazione.</p>
                    </div>
                    
                    <div class="faq-item">
                        <h6>Posso cancellare una prenotazione?</h6>
                        <p>Sì, puoi cancellare gratuitamente fino a 24 ore prima dell'orario prenotato dalla sezione "Le mie Prenotazioni".</p>
                    </div>
                    
                    <div class="faq-item">
                        <h6>Come funziona il pagamento?</h6>
                        <p>Il pagamento avviene online al momento della prenotazione tramite carta di credito o PayPal in modo sicuro.</p>
                    </div>
                    
                    <div class="faq-item">
                        <h6>Gli spazi includono Wi-Fi?</h6>
                        <p>Tutti gli spazi includono Wi-Fi gratuito ad alta velocità. Altri servizi variano per spazio.</p>
                    </div>
                    
                    <div class="faq-item">
                        <h6>Posso portare ospiti?</h6>
                        <p>Dipende dallo spazio. Controlla la capacità massima e le regole specifiche di ogni spazio.</p>
                    </div>
                    
                    <div class="faq-item">
                        <h6>Come contatto l'assistenza?</h6>
                        <p>Puoi contattarci via email a support@coworkspace.com o tramite il modulo contatti.</p>
                    </div>
                </div>
            `,
            size: 'modal-lg'
        });
    },

    /**
     * Mostra confirm dialog
     */
    showConfirm(options = {}) {
        const {
            title = 'Conferma',
            message = 'Sei sicuro?',
            confirmText = 'Conferma',
            cancelText = 'Annulla',
            confirmClass = 'btn-danger',
            onConfirm = null,
            onCancel = null
        } = options;

        const footer = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="Components.handleConfirmCancel()">
                ${cancelText}
            </button>
            <button type="button" class="btn ${confirmClass}" onclick="Components.handleConfirmAction()">
                ${confirmText}
            </button>
        `;

        // Salva callbacks temporaneamente
        this._confirmCallbacks = { onConfirm, onCancel };

        return this.showModal({
            title: title,
            content: `<p>${message}</p>`,
            footer: footer,
            size: 'modal-sm'
        });
    },

    /**
     * Gestisce conferma dialog
     */
    handleConfirmAction() {
        if (this._confirmCallbacks?.onConfirm) {
            this._confirmCallbacks.onConfirm();
        }
        this.hideModal();
        this._confirmCallbacks = null;
    },

    /**
     * Gestisce cancellazione dialog
     */
    handleConfirmCancel() {
        if (this._confirmCallbacks?.onCancel) {
            this._confirmCallbacks.onCancel();
        }
        this.hideModal();
        this._confirmCallbacks = null;
    },

    /**
     * Crea progress bar
     */
    createProgressBar(container, options = {}) {
        const {
            value = 0,
            max = 100,
            animated = false,
            striped = false,
            color = 'primary',
            height = null,
            showLabel = false
        } = options;

        const progressHTML = `
            <div class="progress ${height ? `progress-${height}` : ''}" style="height: ${height || ''}">
                <div class="progress-bar ${animated ? 'progress-bar-animated' : ''} ${striped ? 'progress-bar-striped' : ''} bg-${color}"
                     role="progressbar" 
                     style="width: ${(value / max) * 100}%"
                     aria-valuenow="${value}" 
                     aria-valuemin="0" 
                     aria-valuemax="${max}">
                    ${showLabel ? `${Math.round((value / max) * 100)}%` : ''}
                </div>
            </div>
        `;

        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (container) {
            container.innerHTML = progressHTML;
            return container.querySelector('.progress-bar');
        }

        return null;
    },

    /**
     * Aggiorna progress bar
     */
    updateProgressBar(progressBar, value, max = 100) {
        if (progressBar) {
            const percentage = Math.round((value / max) * 100);
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', value);

            if (progressBar.textContent.includes('%')) {
                progressBar.textContent = `${percentage}%`;
            }
        }
    },

    /**
     * Crea spinner loading
     */
    createSpinner(container, options = {}) {
        const {
            size = 'md',
            color = 'primary',
            text = 'Caricamento...',
            centered = true
        } = options;

        const sizeClass = size === 'sm' ? 'spinner-border-sm' : '';
        const spinnerHTML = `
            <div class="spinner-container ${centered ? 'text-center' : ''}">
                <div class="spinner-border text-${color} ${sizeClass}" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                ${text ? `<div class="spinner-text mt-2">${text}</div>` : ''}
            </div>
        `;

        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (container) {
            container.innerHTML = spinnerHTML;
            return container.querySelector('.spinner-container');
        }

        return null;
    },

    /**
     * Rimuovi spinner
     */
    removeSpinner(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (container) {
            const spinner = container.querySelector('.spinner-container');
            if (spinner) {
                spinner.remove();
            }
        }
    },

    /**
     * Throttle helper
     */
    throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Debounce helper
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Refresh componente
     */
    async refreshComponent(componentName) {
        // Rimuovi dalla cache
        this.state.cache.delete(`component_${componentName}`);

        // Ricarica
        const container = this.state.loadedComponents.get(componentName);
        if (container) {
            const containerSelector = `#${container.id}`;
            await this.loadComponent(componentName, containerSelector);
        }
    },

    /**
     * Pulisci cache componenti
     */
    clearCache() {
        this.state.cache.clear();
        console.log('Components cache cleared');
    },

    /**
     * Pulisci tutte le notifiche
     */
    clearAllNotifications() {
        const container = document.getElementById('notification-container');
        if (container) {
            container.innerHTML = '';
        }
    },

    /**
     * Crea toast notification
     */
    createToast(message, type = 'info', duration = 5000) {
        // Alias per showNotification
        return this.showNotification(message, type, duration);
    },

    /**
     * Trigger evento custom
     */
    triggerEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...data, components: this }
        });
        document.dispatchEvent(event);
    },

    /**
     * Ottieni informazioni stato
     */
    getStatus() {
        return {
            initialized: this.state.initialized,
            loadedComponents: Array.from(this.state.loadedComponents.keys()),
            cacheSize: this.state.cache.size
        };
    },

    /**
     * Cleanup componenti
     */
    cleanup() {
        // Pulisci cache
        this.clearCache();

        // Rimuovi event listeners
        if (this.handleScroll) {
            window.removeEventListener('scroll', this.handleScroll);
        }
        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
        }

        // Reset stato
        this.state.loadedComponents.clear();
        this.state.initialized = false;

        console.log('Components cleaned up');
    }
};

// Auto-inizializzazione se DOM pronto e dipendenze disponibili
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.Utils) {
            window.Components.init();
        }
    });
} else if (window.Utils) {
    window.Components.init();
}