/**
 * CoWorkSpace - Notifications Manager
 * Gestione notifiche e messaggi in-app
 */

window.Notifications = {
    /**
     * Stato del modulo
     */
    state: {
        initialized: false,
        notifications: [],
        permission: 'default',
        activeNotifications: new Map(),
        maxNotifications: 5,
        defaultDuration: 5000
    },

    /**
     * Configurazione notifiche
     */
    config: {
        position: 'top-right',
        animation: 'slide',
        sound: false,
        vibrate: false,
        persist: false
    },

    /**
     * Tipi di notifica
     */
    types: {
        success: {
            icon: 'fa-check-circle',
            class: 'notification-success',
            title: 'Successo'
        },
        error: {
            icon: 'fa-exclamation-circle',
            class: 'notification-error',
            title: 'Errore'
        },
        warning: {
            icon: 'fa-exclamation-triangle',
            class: 'notification-warning',
            title: 'Attenzione'
        },
        info: {
            icon: 'fa-info-circle',
            class: 'notification-info',
            title: 'Informazione'
        }
    },

    /**
     * Inizializza il modulo
     */
    async init() {
        try {
            console.log('🔔 Initializing Notifications Manager...');

            // Check browser support
            this.checkBrowserSupport();

            // Request permission for browser notifications
            await this.requestPermission();

            // Setup notification container
            this.setupNotificationContainer();

            // Setup event listeners
            this.setupEventListeners();

            // Load user preferences
            this.loadUserPreferences();

            this.state.initialized = true;
            console.log('✅ Notifications Manager initialized');

            return true;

        } catch (error) {
            console.error('❌ Failed to initialize Notifications Manager:', error);
            return false;
        }
    },

    /**
     * Verifica supporto browser
     */
    checkBrowserSupport() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return false;
        }
        return true;
    },

    /**
     * Richiede permesso per notifiche browser
     */
    async requestPermission() {
        if (!this.checkBrowserSupport()) return;

        try {
            const permission = await Notification.requestPermission();
            this.state.permission = permission;
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    },

    /**
     * Setup container notifiche
     */
    setupNotificationContainer() {
        let container = document.getElementById('notification-container');

        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = `notification-container notification-${this.config.position}`;
            document.body.appendChild(container);
        }

        this.container = container;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for custom notification events
        document.addEventListener('app:notification', (e) => {
            this.show(e.detail.message, e.detail.type, e.detail.options);
        });

        // Listen for visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateNotificationBadge();
            }
        });

        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.show('Connessione ripristinata', 'success');
        });

        window.addEventListener('offline', () => {
            this.show('Connessione persa', 'warning');
        });
    },

    /**
     * Carica preferenze utente
     */
    loadUserPreferences() {
        const preferences = localStorage.getItem('notification_preferences');
        if (preferences) {
            try {
                const prefs = JSON.parse(preferences);
                Object.assign(this.config, prefs);
            } catch (error) {
                console.error('Error loading notification preferences:', error);
            }
        }
    },

    /**
     * Salva preferenze utente
     */
    saveUserPreferences() {
        localStorage.setItem('notification_preferences', JSON.stringify(this.config));
    },

    /**
     * Mostra notifica
     * @param {string} message - Messaggio da mostrare
     * @param {string} type - Tipo di notifica (success, error, warning, info)
     * @param {Object} options - Opzioni aggiuntive
     */
    show(message, type = 'info', options = {}) {
        if (!this.state.initialized && !this.container) {
            this.setupNotificationContainer();
        }

        const id = this.generateId();
        const notification = {
            id,
            message,
            type,
            timestamp: Date.now(),
            ...options
        };

        // Add to state
        this.state.notifications.push(notification);
        this.state.activeNotifications.set(id, notification);

        // Create and show notification
        this.createNotificationElement(notification);

        // Show browser notification if enabled
        if (options.browser && this.state.permission === 'granted') {
            this.showBrowserNotification(notification);
        }

        // Auto-dismiss if not persistent
        if (!options.persist) {
            const duration = options.duration || this.state.defaultDuration;
            setTimeout(() => this.dismiss(id), duration);
        }

        // Limit active notifications
        this.limitActiveNotifications();

        return id;
    },

    /**
     * Crea elemento notifica
     */
    createNotificationElement(notification) {
        const typeConfig = this.types[notification.type] || this.types.info;

        const element = document.createElement('div');
        element.className = `notification ${typeConfig.class} notification-enter`;
        element.id = `notification-${notification.id}`;
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas ${typeConfig.icon}"></i>
                </div>
                <div class="notification-body">
                    ${notification.title ? `<div class="notification-title">${notification.title}</div>` : ''}
                    <div class="notification-message">${notification.message}</div>
                    ${notification.actions ? this.renderActions(notification.actions) : ''}
                </div>
                <button class="notification-close" onclick="Notifications.dismiss('${notification.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${notification.progress ? this.renderProgress(notification.progress) : ''}
        `;

        // Add to container
        if (this.config.position.includes('bottom')) {
            this.container.appendChild(element);
        } else {
            this.container.prepend(element);
        }

        // Trigger animation
        requestAnimationFrame(() => {
            element.classList.remove('notification-enter');
            element.classList.add('notification-enter-active');
        });

        // Play sound if enabled
        if (this.config.sound && notification.sound !== false) {
            this.playSound(notification.type);
        }

        // Vibrate if enabled
        if (this.config.vibrate && notification.vibrate !== false) {
            this.vibrate(notification.type);
        }
    },

    /**
     * Renderizza azioni notifica
     */
    renderActions(actions) {
        return `
            <div class="notification-actions">
                ${actions.map(action => `
                    <button class="notification-action" onclick="${action.callback}">
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    },

    /**
     * Renderizza progress bar
     */
    renderProgress(progress) {
        return `
            <div class="notification-progress">
                <div class="notification-progress-bar" style="width: ${progress}%"></div>
            </div>
        `;
    },

    /**
     * Mostra notifica browser
     */
    showBrowserNotification(notification) {
        if (!this.checkBrowserSupport() || this.state.permission !== 'granted') {
            return;
        }

        const typeConfig = this.types[notification.type] || this.types.info;

        const browserNotification = new Notification(
            notification.title || typeConfig.title,
            {
                body: notification.message,
                icon: notification.icon || '/assets/images/logo.png',
                badge: '/assets/images/badge.png',
                tag: notification.id,
                requireInteraction: notification.persist || false,
                silent: !this.config.sound,
                data: notification
            }
        );

        browserNotification.onclick = () => {
            window.focus();
            if (notification.onClick) {
                notification.onClick();
            }
            browserNotification.close();
        };
    },

    /**
     * Chiude notifica
     * @param {string} id - ID notifica
     */
    dismiss(id) {
        const element = document.getElementById(`notification-${id}`);
        if (!element) return;

        // Add exit animation
        element.classList.add('notification-exit-active');

        // Remove after animation
        setTimeout(() => {
            element.remove();
            this.state.activeNotifications.delete(id);
        }, 300);
    },

    /**
     * Chiude tutte le notifiche
     */
    dismissAll() {
        this.state.activeNotifications.forEach((_, id) => {
            this.dismiss(id);
        });
    },

    /**
     * Aggiorna notifica esistente
     */
    update(id, updates) {
        const notification = this.state.activeNotifications.get(id);
        if (!notification) return;

        Object.assign(notification, updates);

        const element = document.getElementById(`notification-${id}`);
        if (element && updates.message) {
            const messageEl = element.querySelector('.notification-message');
            if (messageEl) {
                messageEl.textContent = updates.message;
            }
        }

        if (element && updates.progress !== undefined) {
            let progressBar = element.querySelector('.notification-progress-bar');
            if (!progressBar) {
                const progressContainer = document.createElement('div');
                progressContainer.className = 'notification-progress';
                progressContainer.innerHTML = `<div class="notification-progress-bar"></div>`;
                element.appendChild(progressContainer);
                progressBar = progressContainer.querySelector('.notification-progress-bar');
            }
            progressBar.style.width = `${updates.progress}%`;
        }
    },

    /**
     * Limita numero notifiche attive
     */
    limitActiveNotifications() {
        const active = Array.from(this.state.activeNotifications.keys());
        if (active.length > this.state.maxNotifications) {
            const toRemove = active.slice(0, active.length - this.state.maxNotifications);
            toRemove.forEach(id => this.dismiss(id));
        }
    },

    /**
     * Genera ID univoco
     */
    generateId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Riproduce suono notifica
     */
    playSound(type) {
        try {
            const audio = new Audio(`/assets/sounds/${type}.mp3`);
            audio.volume = 0.5;
            audio.play().catch(e => console.debug('Could not play notification sound:', e));
        } catch (error) {
            console.debug('Error playing notification sound:', error);
        }
    },

    /**
     * Vibrazione dispositivo
     */
    vibrate(type) {
        if (!('vibrate' in navigator)) return;

        const patterns = {
            success: [100],
            error: [100, 50, 100],
            warning: [200],
            info: [50, 50]
        };

        navigator.vibrate(patterns[type] || patterns.info);
    },

    /**
     * Aggiorna badge notifiche
     */
    updateNotificationBadge() {
        const unreadCount = this.state.notifications.filter(n => !n.read).length;

        // Update badge in navbar
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = unreadCount || '';
            badge.style.display = unreadCount ? 'block' : 'none';
        }

        // Update favicon badge
        this.updateFaviconBadge(unreadCount);
    },

    /**
     * Aggiorna badge favicon
     */
    updateFaviconBadge(count) {
        // Implementation for favicon badge
        // This would require a library like Favico.js
    },

    /**
     * Ottiene storico notifiche
     */
    getHistory(limit = 50) {
        return this.state.notifications
            .slice(-limit)
            .reverse();
    },

    /**
     * Pulisce storico notifiche
     */
    clearHistory() {
        this.state.notifications = [];
        this.dismissAll();
    },

    /**
     * Metodi di utilità per tipo
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    },

    error(message, options = {}) {
        return this.show(message, 'error', options);
    },

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    },

    info(message, options = {}) {
        return this.show(message, 'info', options);
    },

    /**
     * Mostra notifica di caricamento
     */
    loading(message = 'Caricamento in corso...', options = {}) {
        return this.show(message, 'info', {
            persist: true,
            progress: 0,
            ...options
        });
    },

    /**
     * Mostra notifica di conferma
     */
    confirm(message, onConfirm, onCancel) {
        return this.show(message, 'warning', {
            persist: true,
            actions: [
                {
                    label: 'Conferma',
                    callback: `Notifications.handleConfirm('${onConfirm}')`
                },
                {
                    label: 'Annulla',
                    callback: `Notifications.handleCancel('${onCancel}')`
                }
            ]
        });
    },

    /**
     * Gestisce conferma
     */
    handleConfirm(callback) {
        if (typeof window[callback] === 'function') {
            window[callback]();
        }
        this.dismissAll();
    },

    /**
     * Gestisce annullamento
     */
    handleCancel(callback) {
        if (typeof window[callback] === 'function') {
            window[callback]();
        }
        this.dismissAll();
    }
};

// Auto-inizializzazione se DOM pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Notifications.init();
    });
} else {
    window.Notifications.init();
}