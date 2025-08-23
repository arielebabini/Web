/**
 * CoWorkSpace - Componenti UI Riutilizzabili
 * Gestisce modali, notifiche, tooltip e altri componenti UI
 */

window.Components = {
    // ==================== STATO INTERNO ====================
    state: {
        modals: new Map(),
        notifications: [],
        tooltips: new Map(),
        overlays: new Map(),
        carousels: new Map()
    },

    // ==================== INIZIALIZZAZIONE ====================
    init() {
        console.log('🧩 Components module initializing...');

        this.initializeBootstrapComponents();
        this.setupGlobalEventListeners();
        this.createNotificationContainer();
        this.initializeTooltips();

        console.log('✅ Components module initialized');
    },

    initializeBootstrapComponents() {
        // Inizializza componenti Bootstrap se presenti
        if (typeof bootstrap !== 'undefined') {
            // Tooltips
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });

            // Popovers
            const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
            popoverTriggerList.map(function (popoverTriggerEl) {
                return new bootstrap.Popover(popoverTriggerEl);
            });
        }
    },

    // ==================== SISTEMA MODALI ====================
    createModal(config = {}) {
        const {
            id = 'modal-' + Date.now(),
            title = 'Modal',
            body = '',
            footer = '',
            size = '', // '', 'modal-sm', 'modal-lg', 'modal-xl'
            backdrop = true,
            keyboard = true,
            centered = false,
            scrollable = false,
            onShow = null,
            onHide = null,
            onShown = null,
            onHidden = null
        } = config;

        const modalHTML = `
            <div class="modal fade" id="${id}" tabindex="-1" 
                 data-bs-backdrop="${backdrop}" data-bs-keyboard="${keyboard}">
                <div class="modal-dialog ${size} ${centered ? 'modal-dialog-centered' : ''} ${scrollable ? 'modal-dialog-scrollable' : ''}">
                    <div class="modal-content">
                        ${title ? `
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                        ` : ''}
                        
                        <div class="modal-body">
                            ${body}
                        </div>
                        
                        ${footer ? `
                            <div class="modal-footer">
                                ${footer}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Crea elemento modal
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        const modal = modalElement.firstElementChild;

        document.body.appendChild(modal);

        // Inizializza Bootstrap modal
        const bsModal = new bootstrap.Modal(modal);

        // Setup event listeners
        if (onShow) modal.addEventListener('show.bs.modal', onShow);
        if (onHide) modal.addEventListener('hide.bs.modal', onHide);
        if (onShown) modal.addEventListener('shown.bs.modal', onShown);
        if (onHidden) modal.addEventListener('hidden.bs.modal', onHidden);

        // Auto-cleanup
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
            this.state.modals.delete(id);
        });

        // Memorizza riferimento
        this.state.modals.set(id, {
            element: modal,
            instance: bsModal,
            config
        });

        return {
            id,
            element: modal,
            instance: bsModal,
            show: () => bsModal.show(),
            hide: () => bsModal.hide(),
            toggle: () => bsModal.toggle(),
            updateBody: (newBody) => {
                const bodyEl = modal.querySelector('.modal-body');
                if (bodyEl) bodyEl.innerHTML = newBody;
            },
            updateTitle: (newTitle) => {
                const titleEl = modal.querySelector('.modal-title');
                if (titleEl) titleEl.textContent = newTitle;
            }
        };
    },

    // ==================== MODALI PREDEFINITI ====================
    showConfirmModal(options = {}) {
        const {
            title = 'Conferma',
            message = 'Sei sicuro?',
            confirmText = 'Conferma',
            cancelText = 'Annulla',
            confirmClass = 'btn-primary',
            cancelClass = 'btn-secondary',
            onConfirm = () => {},
            onCancel = () => {}
        } = options;

        const footer = `
            <button type="button" class="btn ${cancelClass}" data-bs-dismiss="modal">
                ${cancelText}
            </button>
            <button type="button" class="btn ${confirmClass}" id="confirm-action">
                ${confirmText}
            </button>
        `;

        const modal = this.createModal({
            title,
            body: `<p>${message}</p>`,
            footer,
            size: 'modal-sm',
            centered: true
        });

        // Setup confirm action
        const confirmBtn = modal.element.querySelector('#confirm-action');
        confirmBtn.addEventListener('click', () => {
            onConfirm();
            modal.hide();
        });

        // Setup cancel action
        modal.element.addEventListener('hidden.bs.modal', () => {
            onCancel();
        });

        modal.show();
        return modal;
    },

    showAlertModal(options = {}) {
        const {
            title = 'Avviso',
            message = '',
            type = 'info', // 'success', 'warning', 'danger', 'info'
            buttonText = 'OK',
            onClose = () => {}
        } = options;

        const iconClasses = {
            success: 'fas fa-check-circle text-success',
            warning: 'fas fa-exclamation-triangle text-warning',
            danger: 'fas fa-times-circle text-danger',
            info: 'fas fa-info-circle text-info'
        };

        const body = `
            <div class="text-center">
                <i class="${iconClasses[type]} fa-3x mb-3"></i>
                <p>${message}</p>
            </div>
        `;

        const footer = `
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                ${buttonText}
            </button>
        `;

        const modal = this.createModal({
            title,
            body,
            footer,
            size: 'modal-sm',
            centered: true,
            onHidden: onClose
        });

        modal.show();
        return modal;
    },

    showLoadingModal(options = {}) {
        const {
            title = 'Caricamento...',
            message = 'Attendere prego...'
        } = options;

        const body = `
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p>${message}</p>
            </div>
        `;

        const modal = this.createModal({
            title,
            body,
            backdrop: 'static',
            keyboard: false,
            centered: true
        });

        modal.show();
        return modal;
    },

    // ==================== SISTEMA NOTIFICHE ====================
    createNotificationContainer() {
        if (document.getElementById('notifications-container')) return;

        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';
        container.innerHTML = '';

        document.body.appendChild(container);
    },

    showNotification(options = {}) {
        if (typeof options === 'string') {
            options = { message: options };
        }

        const {
            message = '',
            type = 'info', // 'success', 'warning', 'danger', 'info'
            duration = 5000,
            title = '',
            actions = [],
            position = 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
            dismissible = true,
            showProgress = true
        } = options;

        const id = 'notification-' + Date.now();

        const iconClasses = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            danger: 'fas fa-times-circle',
            info: 'fas fa-info-circle'
        };

        const notificationHTML = `
            <div class="notification notification-${type} ${position}" id="${id}">
                <div class="notification-content">
                    <div class="notification-header">
                        <div class="notification-icon">
                            <i class="${iconClasses[type]}"></i>
                        </div>
                        <div class="notification-text">
                            ${title ? `<div class="notification-title">${title}</div>` : ''}
                            <div class="notification-message">${message}</div>
                        </div>
                        ${dismissible ? `
                            <button class="notification-close" onclick="Components.dismissNotification('${id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                    
                    ${actions.length > 0 ? `
                        <div class="notification-actions">
                            ${actions.map(action => `
                                <button class="btn btn-sm btn-outline-${type}" 
                                        onclick="${action.onclick}">
                                    ${action.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${showProgress && duration > 0 ? `
                        <div class="notification-progress">
                            <div class="notification-progress-bar"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        const container = document.getElementById('notifications-container');
        if (!container) {
            this.createNotificationContainer();
        }

        const notificationElement = document.createElement('div');
        notificationElement.innerHTML = notificationHTML;
        const notification = notificationElement.firstElementChild;

        container.appendChild(notification);

        // Animazione entrata
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Progress bar animation
        if (showProgress && duration > 0) {
            const progressBar = notification.querySelector('.notification-progress-bar');
            if (progressBar) {
                progressBar.style.animationDuration = `${duration}ms`;
            }
        }

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => {
                this.dismissNotification(id);
            }, duration);
        }

        // Memorizza notifica
        this.state.notifications.push({
            id,
            element: notification,
            options
        });

        return {
            id,
            element: notification,
            dismiss: () => this.dismissNotification(id)
        };
    },

    dismissNotification(id) {
        const notification = document.getElementById(id);
        if (!notification) return;

        notification.classList.add('hide');

        setTimeout(() => {
            notification.remove();
            this.state.notifications = this.state.notifications.filter(n => n.id !== id);
        }, 300);
    },

    dismissAllNotifications() {
        this.state.notifications.forEach(notification => {
            this.dismissNotification(notification.id);
        });
    },

    // ==================== TOOLTIPS PERSONALIZZATI ====================
    initializeTooltips() {
        // Rileva tutti gli elementi con data-tooltip
        document.addEventListener('mouseover', (e) => {
            if (e.target.hasAttribute('data-tooltip')) {
                this.showTooltip(e.target);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.hasAttribute('data-tooltip')) {
                this.hideTooltip(e.target);
            }
        });
    },

    showTooltip(element) {
        const text = element.getAttribute('data-tooltip');
        const position = element.getAttribute('data-tooltip-position') || 'top';

        if (!text) return;

        const id = 'tooltip-' + Date.now();
        const tooltip = document.createElement('div');
        tooltip.id = id;
        tooltip.className = `custom-tooltip tooltip-${position}`;
        tooltip.textContent = text;

        document.body.appendChild(tooltip);

        // Posiziona tooltip
        this.positionTooltip(tooltip, element, position);

        // Memorizza riferimento
        this.state.tooltips.set(element, { id, element: tooltip });

        // Mostra tooltip
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 50);
    },

    hideTooltip(element) {
        const tooltipData = this.state.tooltips.get(element);
        if (!tooltipData) return;

        const tooltip = tooltipData.element;
        tooltip.classList.remove('show');

        setTimeout(() => {
            tooltip.remove();
            this.state.tooltips.delete(element);
        }, 200);
    },

    positionTooltip(tooltip, target, position) {
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top, left;

        switch (position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - 10;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = targetRect.bottom + 10;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - 10;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + 10;
                break;
            default:
                top = targetRect.top - tooltipRect.height - 10;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        }

        tooltip.style.top = Math.max(0, top) + 'px';
        tooltip.style.left = Math.max(0, left) + 'px';
    },

    // ==================== OVERLAY E BACKDROP ====================
    createOverlay(options = {}) {
        const {
            id = 'overlay-' + Date.now(),
            content = '',
            closable = true,
            className = '',
            onShow = null,
            onHide = null,
            zIndex = 1050
        } = options;

        const overlayHTML = `
            <div class="custom-overlay ${className}" id="${id}" style="z-index: ${zIndex}">
                <div class="overlay-backdrop" ${closable ? `onclick="Components.hideOverlay('${id}')"` : ''}></div>
                <div class="overlay-content">
                    ${closable ? `
                        <button class="overlay-close" onclick="Components.hideOverlay('${id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    ${content}
                </div>
            </div>
        `;

        const overlayElement = document.createElement('div');
        overlayElement.innerHTML = overlayHTML;
        const overlay = overlayElement.firstElementChild;

        document.body.appendChild(overlay);

        // Memorizza overlay
        this.state.overlays.set(id, {
            element: overlay,
            options
        });

        // Mostra overlay
        setTimeout(() => {
            overlay.classList.add('show');
            if (onShow) onShow(overlay);
        }, 50);

        return {
            id,
            element: overlay,
            hide: () => this.hideOverlay(id),
            updateContent: (newContent) => {
                const contentEl = overlay.querySelector('.overlay-content');
                if (contentEl) {
                    const closeBtn = contentEl.querySelector('.overlay-close');
                    contentEl.innerHTML = newContent;
                    if (closable && closeBtn) {
                        contentEl.appendChild(closeBtn);
                    }
                }
            }
        };
    },

    hideOverlay(id) {
        const overlayData = this.state.overlays.get(id);
        if (!overlayData) return;

        const overlay = overlayData.element;
        const { onHide } = overlayData.options;

        overlay.classList.remove('show');

        setTimeout(() => {
            overlay.remove();
            this.state.overlays.delete(id);
            if (onHide) onHide();
        }, 300);
    },

    // ==================== FORM UTILITIES ====================
    validateForm(formId, rules = {}) {
        const form = document.getElementById(formId);
        if (!form) return false;

        let isValid = true;
        const errors = {};

        // Rimuovi errori precedenti
        form.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
        });
        form.querySelectorAll('.invalid-feedback').forEach(feedback => {
            feedback.remove();
        });

        // Valida ogni campo
        Object.entries(rules).forEach(([fieldName, fieldRules]) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            const value = field.value.trim();
            let fieldError = null;

            // Required
            if (fieldRules.required && !value) {
                fieldError = fieldRules.requiredMessage || `${fieldName} è obbligatorio`;
            }

            // Min length
            if (!fieldError && fieldRules.minLength && value.length < fieldRules.minLength) {
                fieldError = fieldRules.minLengthMessage || `Minimo ${fieldRules.minLength} caratteri`;
            }

            // Max length
            if (!fieldError && fieldRules.maxLength && value.length > fieldRules.maxLength) {
                fieldError = fieldRules.maxLengthMessage || `Massimo ${fieldRules.maxLength} caratteri`;
            }

            // Pattern
            if (!fieldError && fieldRules.pattern && !fieldRules.pattern.test(value)) {
                fieldError = fieldRules.patternMessage || 'Formato non valido';
            }

            // Email
            if (!fieldError && fieldRules.email) {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(value)) {
                    fieldError = 'Inserisci un email valida';
                }
            }

            // Custom validator
            if (!fieldError && fieldRules.validator) {
                const customResult = fieldRules.validator(value);
                if (customResult !== true) {
                    fieldError = customResult;
                }
            }

            if (fieldError) {
                isValid = false;
                errors[fieldName] = fieldError;

                // Aggiungi classe errore
                field.classList.add('is-invalid');

                // Aggiungi messaggio errore
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = fieldError;
                field.parentNode.appendChild(feedback);
            }
        });

        return { isValid, errors };
    },

    serializeForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            // Gestisci checkbox multipli
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }

        return data;
    },

    resetForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.reset();

        // Rimuovi classi di validazione
        form.querySelectorAll('.is-invalid, .is-valid').forEach(field => {
            field.classList.remove('is-invalid', 'is-valid');
        });

        // Rimuovi messaggi di feedback
        form.querySelectorAll('.invalid-feedback, .valid-feedback').forEach(feedback => {
            feedback.remove();
        });
    },

    // ==================== DATA FORMATTING ====================
    formatCurrency(amount, currency = 'EUR', locale = 'it-IT') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        const formatOptions = { ...defaultOptions, ...options };

        if (typeof date === 'string') {
            date = new Date(date);
        }

        return date.toLocaleDateString('it-IT', formatOptions);
    },

    formatTime(time, options = {}) {
        const defaultOptions = {
            hour: '2-digit',
            minute: '2-digit'
        };

        const formatOptions = { ...defaultOptions, ...options };

        if (typeof time === 'string') {
            time = new Date(`1970-01-01T${time}`);
        }

        return time.toLocaleTimeString('it-IT', formatOptions);
    },

    formatNumber(number, decimals = 0) {
        return new Intl.NumberFormat('it-IT', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    },

    // ==================== LOADING STATES ====================
    showLoadingState(container, message = 'Caricamento...') {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <div class="loading-message">${message}</div>
            </div>
        `;
    },

    showErrorState(container, message = 'Si è verificato un errore', retry = null) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle text-warning fa-3x"></i>
                </div>
                <div class="error-message">
                    <h5>Oops!</h5>
                    <p>${message}</p>
                </div>
                ${retry ? `
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="${retry}">
                            <i class="fas fa-redo"></i> Riprova
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    showEmptyState(container, options = {}) {
        const {
            icon = 'fas fa-box-open',
            title = 'Nessun elemento',
            message = 'Non ci sono elementi da visualizzare',
            action = null
        } = options;

        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="${icon} text-muted fa-3x"></i>
                </div>
                <div class="empty-content">
                    <h5>${title}</h5>
                    <p class="text-muted">${message}</p>
                </div>
                ${action ? `
                    <div class="empty-actions">
                        <button class="btn btn-primary" onclick="${action.onclick}">
                            ${action.icon ? `<i class="${action.icon}"></i> ` : ''}${action.text}
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // ==================== LOCAL STORAGE HELPERS ====================
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Errore salvataggio localStorage:', error);
            return false;
        }
    },

    loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Errore caricamento localStorage:', error);
            return defaultValue;
        }
    },

    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Errore rimozione localStorage:', error);
            return false;
        }
    },

    // ==================== UTILITY FUNCTIONS ====================
    setupGlobalEventListeners() {
        // Gestisce escape key per chiudere modali/overlay
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Chiudi ultimo overlay aperto
                const overlayIds = Array.from(this.state.overlays.keys());
                if (overlayIds.length > 0) {
                    const lastOverlay = overlayIds[overlayIds.length - 1];
                    this.hideOverlay(lastOverlay);
                }
            }
        });

        // Gestisce click fuori dai dropdown personalizzati
        document.addEventListener('click', (e) => {
            this.handleOutsideClick(e);
        });

        // Gestisce resize finestra
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleWindowResize();
            }, 250);
        });
    },

    handleOutsideClick(e) {
        // Chiudi dropdown aperti se click esterno
        const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
        openDropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target) && !dropdown.previousElementSibling?.contains(e.target)) {
                const bsDropdown = bootstrap.Dropdown.getInstance(dropdown.previousElementSibling);
                if (bsDropdown) bsDropdown.hide();
            }
        });
    },

    handleWindowResize() {
        // Riposiziona tooltip attivi
        this.state.tooltips.forEach((tooltipData, element) => {
            const position = element.getAttribute('data-tooltip-position') || 'top';
            this.positionTooltip(tooltipData.element, element, position);
        });
    },

    // ==================== DEBOUNCE E THROTTLE ====================
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // ==================== COPY TO CLIPBOARD ====================
    async copyToClipboard(text, showNotification = true) {
        try {
            await navigator.clipboard.writeText(text);

            if (showNotification) {
                this.showNotification({
                    message: 'Copiato negli appunti!',
                    type: 'success',
                    duration: 2000
                });
            }

            return true;
        } catch (error) {
            console.error('Errore copia clipboard:', error);

            // Fallback per browser più vecchi
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful && showNotification) {
                    this.showNotification({
                        message: 'Copiato negli appunti!',
                        type: 'success',
                        duration: 2000
                    });
                }

                return successful;
            } catch (fallbackError) {
                document.body.removeChild(textArea);

                if (showNotification) {
                    this.showNotification({
                        message: 'Impossibile copiare negli appunti',
                        type: 'error'
                    });
                }

                return false;
            }
        }
    },

    // ==================== SCROLL UTILITIES ====================
    smoothScrollTo(target, options = {}) {
        const {
            offset = 0,
            behavior = 'smooth'
        } = options;

        let element;
        if (typeof target === 'string') {
            element = document.querySelector(target);
        } else {
            element = target;
        }

        if (!element) return;

        const targetPosition = element.offsetTop - offset;

        window.scrollTo({
            top: targetPosition,
            behavior
        });
    },

    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    // ==================== CLEANUP ====================
    cleanup() {
        // Pulisci tutti i modali
        this.state.modals.forEach((modal, id) => {
            modal.instance.dispose();
            modal.element.remove();
        });
        this.state.modals.clear();

        // Pulisci tutte le notifiche
        this.dismissAllNotifications();

        // Pulisci tutti gli overlay
        this.state.overlays.forEach((overlay, id) => {
            overlay.element.remove();
        });
        this.state.overlays.clear();

        // Pulisci tooltip
        this.state.tooltips.forEach((tooltip) => {
            tooltip.element.remove();
        });
        this.state.tooltips.clear();

        console.log('🧹 Components cleaned up');
    }
};

// ==================== AUTO-INIZIALIZZAZIONE ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Components.init();
    });
} else {
    window.Components.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    window.Components.cleanup();
});