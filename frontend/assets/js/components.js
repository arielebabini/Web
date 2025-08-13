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
        notifications: [],
        modals: new Map(),
        tooltips: new Map()
    },

    /**
     * Configurazione
     */
    config: {
        notificationDuration: 5000,
        maxNotifications: 5,
        animationDuration: 300
    },

    /**
     * Inizializza il modulo Components
     */
    async init() {
        try {
            console.log('🧩 Initializing Components Manager...');

            // Carica componenti base
            await this.loadBaseComponents();

            // Setup event listeners globali
            this.setupGlobalListeners();

            // Inizializza tooltips Bootstrap se disponibile
            this.initializeTooltips();

            // Inizializza notification container
            this.initializeNotifications();

            this.state.initialized = true;
            console.log('✅ Components Manager initialized');

            return true;

        } catch (error) {
            console.error('Error initializing Components Manager:', error);
            return false;
        }
    },

    /**
     * Carica componenti base
     */
    async loadBaseComponents() {
        try {
            // Carica footer se non presente
            await this.loadFooter();

            // Carica cookie banner se necessario
            this.loadCookieBanner();

            // Carica back-to-top button
            this.loadBackToTop();

        } catch (error) {
            console.warn('Some components failed to load:', error);
        }
    },

    /**
     * Carica footer
     */
    async loadFooter() {
        const footerContainer = document.getElementById('footer-container');
        if (!footerContainer || footerContainer.innerHTML.trim()) return;

        try {
            const response = await fetch('./components/footer.html');
            if (response.ok) {
                const html = await response.text();
                footerContainer.innerHTML = html;
                console.log('Footer initialized');
            }
        } catch (error) {
            // Carica footer fallback
            footerContainer.innerHTML = this.getFallbackFooter();
            console.log('Footer initialized (fallback)');
        }
    },

    /**
     * Footer fallback
     */
    getFallbackFooter() {
        return `
            <footer class="footer bg-dark text-light py-5">
                <div class="container">
                    <div class="row">
                        <div class="col-md-4">
                            <h5>CoWorkSpace</h5>
                            <p class="text-muted">La piattaforma leader in Italia per la prenotazione di spazi di coworking professionali.</p>
                            <div class="social-links">
                                <a href="#" class="text-light me-3"><i class="fab fa-facebook"></i></a>
                                <a href="#" class="text-light me-3"><i class="fab fa-twitter"></i></a>
                                <a href="#" class="text-light me-3"><i class="fab fa-linkedin"></i></a>
                                <a href="#" class="text-light"><i class="fab fa-instagram"></i></a>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <h6>Esplora</h6>
                            <ul class="list-unstyled">
                                <li><a href="#" onclick="App.navigation.showSection('spazi')" class="text-muted">Spazi</a></li>
                                <li><a href="#" onclick="App.navigation.showSection('chi-siamo')" class="text-muted">Chi Siamo</a></li>
                                <li><a href="#" onclick="App.navigation.showSection('supporto')" class="text-muted">Supporto</a></li>
                            </ul>
                        </div>
                        <div class="col-md-2">
                            <h6>Servizi</h6>
                            <ul class="list-unstyled">
                                <li><span class="text-muted">Hot Desk</span></li>
                                <li><span class="text-muted">Uffici Privati</span></li>
                                <li><span class="text-muted">Sale Riunioni</span></li>
                                <li><span class="text-muted">Spazi Eventi</span></li>
                            </ul>
                        </div>
                        <div class="col-md-2">
                            <h6>Legale</h6>
                            <ul class="list-unstyled">
                                <li><a href="#" class="text-muted">Privacy Policy</a></li>
                                <li><a href="#" class="text-muted">Termini di Servizio</a></li>
                                <li><a href="#" class="text-muted">Cookie Policy</a></li>
                            </ul>
                        </div>
                        <div class="col-md-2">
                            <h6>Contatti</h6>
                            <ul class="list-unstyled">
                                <li><span class="text-muted">supporto@coworkspace.it</span></li>
                                <li><span class="text-muted">+39 02 1234 5678</span></li>
                            </ul>
                        </div>
                    </div>
                    <hr class="my-4">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <p class="mb-0 text-muted">© 2024 CoWorkSpace. Tutti i diritti riservati.</p>
                        </div>
                        <div class="col-md-6 text-md-end">
                            <p class="mb-0 text-muted">Made with ❤️ in Italy</p>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    },

    /**
     * Carica cookie banner
     */
    loadCookieBanner() {
        // Controlla se i cookie sono già stati accettati
        if (localStorage.getItem('cookies_accepted') === 'true') return;

        const bannerContainer = document.getElementById('cookie-banner-container');
        if (!bannerContainer) return;

        bannerContainer.innerHTML = `
            <div class="cookie-banner" id="cookie-banner">
                <div class="container">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <p class="mb-0">
                                <i class="fas fa-cookie-bite me-2"></i>
                                Utilizziamo cookie per migliorare la tua esperienza. Continuando accetti la nostra 
                                <a href="#" class="text-primary">Cookie Policy</a>.
                            </p>
                        </div>
                        <div class="col-md-4 text-md-end">
                            <button class="btn btn-sm btn-outline-light me-2" onclick="Components.rejectCookies()">
                                Rifiuta
                            </button>
                            <button class="btn btn-sm btn-light" onclick="Components.acceptCookies()">
                                Accetta
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Mostra il banner con animazione
        setTimeout(() => {
            const banner = document.getElementById('cookie-banner');
            if (banner) banner.classList.add('show');
        }, 1000);
    },

    /**
     * Accetta cookies
     */
    acceptCookies() {
        localStorage.setItem('cookies_accepted', 'true');
        this.hideCookieBanner();
        this.showNotification('Preferenze cookie salvate', 'success');
    },

    /**
     * Rifiuta cookies
     */
    rejectCookies() {
        localStorage.setItem('cookies_accepted', 'false');
        this.hideCookieBanner();
        this.showNotification('Utilizzeremo solo cookie essenziali', 'info');
    },

    /**
     * Nascondi cookie banner
     */
    hideCookieBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.classList.add('hiding');
            setTimeout(() => banner.remove(), 300);
        }
    },

    /**
     * Carica back-to-top button
     */
    loadBackToTop() {
        const backToTop = document.getElementById('back-to-top');
        if (backToTop) {
            backToTop.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    },

    /**
     * Setup event listeners globali
     */
    setupGlobalListeners() {
        // Gestione click per data attributes
        document.addEventListener('click', this.handleDataAttributes.bind(this));

        // Gestione form submissions
        document.addEventListener('submit', this.handleFormSubmissions.bind(this));

        // Gestione resize per componenti responsive
        window.addEventListener('resize', this.handleResize.bind(this));
    },

    /**
     * Gestisce attributi data-*
     */
    handleDataAttributes(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const data = target.dataset;

        switch (action) {
            case 'show-modal':
                event.preventDefault();
                this.showModal(data.modal, data);
                break;
            case 'hide-modal':
                event.preventDefault();
                this.hideModal(data.modal);
                break;
            case 'show-notification':
                event.preventDefault();
                this.showNotification(data.message, data.type || 'info');
                break;
            case 'confirm':
                event.preventDefault();
                this.showConfirmDialog(data.message, () => {
                    if (data.callback && window[data.callback]) {
                        window[data.callback](data);
                    }
                });
                break;
        }
    },

    /**
     * Gestisce submit form
     */
    handleFormSubmissions(event) {
        const form = event.target;
        if (!form.hasAttribute('data-ajax')) return;

        event.preventDefault();
        this.handleAjaxForm(form);
    },

    /**
     * Gestisce form AJAX
     */
    async handleAjaxForm(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;

        try {
            // Mostra loading
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Invio...';
            }

            const formData = new FormData(form);
            const action = form.getAttribute('action') || '#';
            const method = form.getAttribute('method') || 'POST';

            // Simula invio (sostituire con vera chiamata API)
            await new Promise(resolve => setTimeout(resolve, 1500));

            this.showNotification('Dati inviati con successo!', 'success');
            form.reset();

        } catch (error) {
            console.error('Form submission error:', error);
            this.showNotification('Errore nell\'invio dei dati', 'error');
        } finally {
            // Ripristina button
            if (submitBtn && originalText) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    },

    /**
     * Gestisce resize
     */
    handleResize() {
        // Aggiorna componenti responsive se necessario
        this.updateResponsiveComponents();
    },

    /**
     * Aggiorna componenti responsive
     */
    updateResponsiveComponents() {
        // Aggiorna altezza viewport per mobile
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    },

    // ==================== SISTEMA NOTIFICHE ====================

    /**
     * Inizializza container notifiche
     */
    initializeNotifications() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        console.log('Notification container found and ready');
    },

    /**
     * Mostra notifica
     */
    showNotification(message, type = 'info', duration = null) {
        const id = this.generateId();
        const notificationDuration = duration || this.config.notificationDuration;

        const notification = {
            id,
            message,
            type,
            timestamp: Date.now()
        };

        // Aggiungi alla lista
        this.state.notifications.push(notification);

        // Rimuovi notifiche eccedenti
        while (this.state.notifications.length > this.config.maxNotifications) {
            const oldest = this.state.notifications.shift();
            this.removeNotificationElement(oldest.id);
        }

        // Crea elemento DOM
        this.createNotificationElement(notification);

        // Auto-rimuovi dopo durata specificata
        setTimeout(() => {
            this.hideNotification(id);
        }, notificationDuration);

        return id;
    },

    /**
     * Crea elemento notifica
     */
    createNotificationElement(notification) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const element = document.createElement('div');
        element.id = `notification-${notification.id}`;
        element.className = `notification-item notification-${notification.type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        element.innerHTML = `
            <div class="notification-content">
                <i class="${icons[notification.type] || icons.info} me-2"></i>
                <span class="notification-message">${notification.message}</span>
                <button class="notification-close" onclick="Components.hideNotification('${notification.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.appendChild(element);

        // Animazione entrata
        setTimeout(() => element.classList.add('show'), 100);
    },

    /**
     * Nascondi notifica
     */
    hideNotification(id) {
        const element = document.getElementById(`notification-${id}`);
        if (!element) return;

        element.classList.add('hiding');
        setTimeout(() => {
            this.removeNotificationElement(id);
        }, this.config.animationDuration);

        // Rimuovi dalla lista
        this.state.notifications = this.state.notifications.filter(n => n.id !== id);
    },

    /**
     * Rimuovi elemento notifica
     */
    removeNotificationElement(id) {
        const element = document.getElementById(`notification-${id}`);
        if (element) element.remove();
    },

    /**
     * Pulisci tutte le notifiche
     */
    clearAllNotifications() {
        this.state.notifications.forEach(notification => {
            this.hideNotification(notification.id);
        });
        this.state.notifications = [];
    },

    // ==================== SISTEMA MODAL ====================

    /**
     * Mostra modal
     */
    showModal(modalId, options = {}) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            console.error('Modal container not found');
            return;
        }

        // Crea modal se non esiste
        if (!this.state.modals.has(modalId)) {
            this.createModal(modalId, options);
        }

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById(modalId));
        modal.show();

        this.state.modals.set(modalId, { modal, options });
    },

    /**
     * Nascondi modal
     */
    hideModal(modalId) {
        const modalData = this.state.modals.get(modalId);
        if (modalData) {
            modalData.modal.hide();
        }
    },

    /**
     * Crea modal generico
     */
    createModal(modalId, options) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${options.title || 'Modal'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${options.content || '<p>Contenuto modal</p>'}
                        </div>
                        ${options.footer ? `
                            <div class="modal-footer">
                                ${options.footer}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        modalContainer.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * Mostra dialog di conferma
     */
    showConfirmDialog(message, onConfirm, onCancel = null) {
        const modalId = `confirm-${this.generateId()}`;

        const options = {
            title: 'Conferma',
            content: `<p>${message}</p>`,
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    Annulla
                </button>
                <button type="button" class="btn btn-primary" id="confirm-btn-${modalId}">
                    Conferma
                </button>
            `
        };

        this.createModal(modalId, options);

        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        // Setup event listeners
        const confirmBtn = document.getElementById(`confirm-btn-${modalId}`);
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                modal.hide();
                if (onConfirm) onConfirm();
            });
        }

        // Cleanup on hide
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
            document.getElementById(modalId).remove();
            if (onCancel) onCancel();
        });
    },

    // ==================== SISTEMA TOOLTIP ====================

    /**
     * Inizializza tooltips Bootstrap
     */
    initializeTooltips() {
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl =>
                new bootstrap.Tooltip(tooltipTriggerEl)
            );
        }
    },

    /**
     * Aggiorna tooltips per nuovi elementi
     */
    updateTooltips() {
        this.initializeTooltips();
    },

    // ==================== LOADING STATES ====================

    /**
     * Mostra loading overlay
     */
    showLoading(message = 'Caricamento...') {
        const overlay = document.getElementById('loading-overlay-container');
        if (!overlay) return;

        overlay.innerHTML = `
            <div class="loading-overlay active">
                <div class="loading-content">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p>${message}</p>
                </div>
            </div>
        `;
    },

    /**
     * Nascondi loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay-container');
        if (overlay) {
            const loadingOverlay = overlay.querySelector('.loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('hiding');
                setTimeout(() => {
                    overlay.innerHTML = '';
                }, this.config.animationDuration);
            }
        }
    },

    // ==================== UTILITY ====================

    /**
     * Genera ID univoco
     */
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    /**
     * Debounce function
     */
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Controlla se elemento è visibile
     */
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Ottieni stato modulo
     */
    getState() {
        return {
            initialized: this.state.initialized,
            notificationsCount: this.state.notifications.length,
            modalsCount: this.state.modals.size,
            tooltipsCount: this.state.tooltips.size
        };
    }
};