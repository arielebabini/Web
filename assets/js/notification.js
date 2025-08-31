/**
 * CoWorkSpace - Sistema Notifiche Avanzato
 * Gestisce notifiche in-app, push notifications e real-time updates
 */

window.Notifications = {
    // ==================== STATO INTERNO ====================
    state: {
        notifications: [],
        unreadCount: 0,
        isInitialized: false,
        socket: null,
        settings: {
            enabled: true,
            desktop: true,
            email: true,
            push: false,
            sound: true,
            preview: true
        },
        queue: [],
        maxVisible: 5,
        defaultDuration: 5000
    },

    // ==================== INIZIALIZZAZIONE ====================
    async init() {
        console.log('🔔 Notifications module initializing...');

        this.loadSettings();
        this.createContainer();
        this.setupEventListeners();
        this.requestNotificationPermission();

        // Carica notifiche esistenti se utente autenticato
        if (window.Auth?.isAuthenticated()) {
            await this.loadUserNotifications();
            this.initializeRealTime();
        }

        // Listener per cambio autenticazione
        document.addEventListener('authStateChanged', (e) => {
            if (e.detail.isAuthenticated) {
                this.loadUserNotifications();
                this.initializeRealTime();
            } else {
                this.clearNotifications();
                this.disconnectRealTime();
            }
        });

        this.state.isInitialized = true;
        console.log('✅ Notifications module initialized');
    },

    // ==================== CONTAINER NOTIFICHE ====================
    createContainer() {
        // Rimuovi container esistente
        const existing = document.getElementById('notifications-container');
        if (existing) existing.remove();

        // Crea nuovo container
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';

        // Container per notifiche toast
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';

        container.appendChild(toastContainer);
        document.body.appendChild(container);

        // Crea anche dropdown per notifiche persistenti
        this.createNotificationDropdown();
    },

    createNotificationDropdown() {
        return;
    },

    // ==================== GESTIONE NOTIFICHE ====================
    show(options = {}) {
        if (typeof options === 'string') {
            options = { message: options };
        }

        const notification = this.createNotification(options);
        this.addToQueue(notification);
        this.processQueue();

        return notification;
    },

    createNotification(options) {
        const {
            id = 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            title = '',
            message = '',
            type = 'info', // 'success', 'warning', 'error', 'info'
            duration = this.state.defaultDuration,
            persistent = false,
            actions = [],
            icon = null,
            image = null,
            data = {},
            onclick = null,
            onclose = null,
            priority = 'normal', // 'low', 'normal', 'high', 'urgent'
            category = 'general',
            showInDropdown = true,
            playSound = this.state.settings.sound
        } = options;

        const notification = {
            id,
            title,
            message,
            type,
            duration,
            persistent,
            actions,
            icon: icon || this.getDefaultIcon(type),
            image,
            data,
            onclick,
            onclose,
            priority,
            category,
            showInDropdown,
            playSound,
            timestamp: new Date(),
            read: false,
            dismissed: false,
            element: null
        };

        // Aggiungi a lista notifiche se deve apparire nel dropdown
        if (showInDropdown) {
            this.state.notifications.unshift(notification);
            this.updateUnreadCount();
            this.updateDropdown();
        }

        return notification;
    },

    addToQueue(notification) {
        // Gestisci priorità
        if (notification.priority === 'urgent') {
            this.state.queue.unshift(notification);
        } else {
            this.state.queue.push(notification);
        }
    },

    processQueue() {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const visibleCount = container.children.length;

        // Mostra notifiche fino al limite
        while (this.state.queue.length > 0 && visibleCount < this.state.maxVisible) {
            const notification = this.state.queue.shift();
            this.displayToast(notification);
        }
    },

    displayToast(notification) {
        const toast = this.createToastElement(notification);
        notification.element = toast;

        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // Animazione entrata
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Riproduci suono se abilitato
        if (notification.playSound && this.state.settings.sound) {
            this.playNotificationSound(notification.type);
        }

        // Desktop notification se abilitato
        if (this.state.settings.desktop && 'Notification' in window) {
            this.showDesktopNotification(notification);
        }

        // Auto dismiss se non persistente
        if (!notification.persistent && notification.duration > 0) {
            setTimeout(() => {
                this.dismissToast(notification.id);
            }, notification.duration);
        }

        // Trigger evento personalizzato
        this.triggerNotificationEvent('shown', notification);
    },

    createToastElement(notification) {
        const toast = document.createElement('div');
        toast.id = notification.id;
        toast.className = `notification-toast toast-${notification.type} priority-${notification.priority}`;

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-header">
                    <div class="toast-icon">
                        <i class="${notification.icon}"></i>
                    </div>
                    <div class="toast-info">
                        ${notification.title ? `<div class="toast-title">${notification.title}</div>` : ''}
                        <div class="toast-message">${notification.message}</div>
                        <div class="toast-timestamp">${this.formatTimeAgo(notification.timestamp)}</div>
                    </div>
                    <button class="toast-close" onclick="Notifications.dismissToast('${notification.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                ${notification.image ? `
                    <div class="toast-image">
                        <img src="${notification.image}" alt="Notification image">
                    </div>
                ` : ''}
                
                ${notification.actions.length > 0 ? `
                    <div class="toast-actions">
                        ${notification.actions.map(action => `
                            <button class="btn btn-sm ${action.class || 'btn-outline-primary'}" 
                                    onclick="${action.onclick}">
                                ${action.icon ? `<i class="${action.icon}"></i> ` : ''}${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${notification.duration > 0 && !notification.persistent ? `
                    <div class="toast-progress">
                        <div class="toast-progress-bar" style="animation-duration: ${notification.duration}ms;"></div>
                    </div>
                ` : ''}
            </div>
        `;

        // Aggiungi evento click se specificato
        if (notification.onclick) {
            toast.addEventListener('click', (e) => {
                if (!e.target.closest('.toast-close, .toast-actions')) {
                    notification.onclick(notification);
                }
            });
            toast.style.cursor = 'pointer';
        }

        return toast;
    },

    dismissToast(notificationId) {
        const toast = document.getElementById(notificationId);
        if (!toast) return;

        const notification = this.state.notifications.find(n => n.id === notificationId);

        // Animazione uscita
        toast.classList.add('hiding');

        setTimeout(() => {
            toast.remove();

            // Marca come dismissa
            if (notification) {
                notification.dismissed = true;
                this.triggerNotificationEvent('dismissed', notification);

                if (notification.onclose) {
                    notification.onclose(notification);
                }
            }

            // Processa queue per eventuali notifiche in attesa
            this.processQueue();
        }, 300);
    },

    // ==================== DROPDOWN NOTIFICHE ====================
    updateDropdown() {
        const list = document.getElementById('notifications-list');
        if (!list) return;

        if (this.state.notifications.length === 0) {
            list.innerHTML = `
                <div class="text-center p-3 text-muted">
                    <i class="fas fa-bell-slash fa-2x mb-2"></i>
                    <p>Nessuna notifica</p>
                </div>
            `;
            return;
        }

        // Mostra solo le ultime 10 notifiche
        const recentNotifications = this.state.notifications.slice(0, 10);

        list.innerHTML = recentNotifications.map(notification => `
            <div class="dropdown-item notification-item ${notification.read ? 'read' : 'unread'}" 
                 data-notification-id="${notification.id}"
                 onclick="Notifications.handleDropdownClick('${notification.id}')">
                <div class="notification-content">
                    <div class="notification-header">
                        <div class="notification-icon">
                            <i class="${notification.icon} text-${this.getTypeColor(notification.type)}"></i>
                        </div>
                        <div class="notification-info">
                            ${notification.title ? `<div class="notification-title">${notification.title}</div>` : ''}
                            <div class="notification-message">${this.truncateText(notification.message, 60)}</div>
                        </div>
                        <div class="notification-meta">
                            <small class="text-muted">${this.formatTimeAgo(notification.timestamp)}</small>
                            ${!notification.read ? '<span class="unread-indicator"></span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        this.updateNotificationBadge();
    },

    updateNotificationBadge() {
        const badge = document.getElementById('notification-count');
        if (!badge) return;

        if (this.state.unreadCount > 0) {
            badge.textContent = this.state.unreadCount > 99 ? '99+' : this.state.unreadCount;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    },

    updateUnreadCount() {
        this.state.unreadCount = this.state.notifications.filter(n => !n.read).length;
        this.updateNotificationBadge();
    },

    markAsRead(notificationId) {
        const notification = this.state.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.updateUnreadCount();
            this.updateDropdown();

            // Invia al server se necessario
            this.syncNotificationStatus(notificationId, 'read');
        }
    },

    markAllAsRead() {
        this.state.notifications.forEach(notification => {
            if (!notification.read) {
                notification.read = true;
            }
        });

        this.updateUnreadCount();
        this.updateDropdown();

        // Invia al server
        this.syncAllNotificationsRead();

        window.Components?.showNotification({
            message: 'Tutte le notifiche sono state segnate come lette',
            type: 'success',
            duration: 2000
        });
    },

    handleDropdownClick(notificationId) {
        const notification = this.state.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // Marca come letta
        this.markAsRead(notificationId);

        // Esegui azione click se presente
        if (notification.onclick) {
            notification.onclick(notification);
        }

        // Chiudi dropdown
        const dropdown = bootstrap.Dropdown.getInstance(document.getElementById('notificationsDropdown'));
        if (dropdown) dropdown.hide();
    },

    // ==================== NOTIFICHE DESKTOP ====================
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('Browser non supporta notifiche desktop');
            return false;
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            this.state.settings.desktop = permission === 'granted';
            this.saveSettings();
            return permission === 'granted';
        }

        return Notification.permission === 'granted';
    },

    showDesktopNotification(notification) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const options = {
            body: notification.message,
            icon: notification.image || '/assets/images/logo-icon.png',
            badge: '/assets/images/logo-icon.png',
            tag: notification.id,
            requireInteraction: notification.persistent,
            silent: !notification.playSound,
            data: notification.data
        };

        if (notification.image) {
            options.image = notification.image;
        }

        if (notification.actions.length > 0) {
            options.actions = notification.actions.slice(0, 2).map(action => ({
                action: action.id || action.text.toLowerCase().replace(/\s+/g, '_'),
                title: action.text,
                icon: action.icon
            }));
        }

        const desktopNotif = new Notification(notification.title || 'CoWorkSpace', options);

        desktopNotif.onclick = () => {
            window.focus();
            if (notification.onclick) {
                notification.onclick(notification);
            }
            desktopNotif.close();
        };

        desktopNotif.onclose = () => {
            if (notification.onclose) {
                notification.onclose(notification);
            }
        };

        // Auto close dopo durata specificata
        if (notification.duration > 0 && !notification.persistent) {
            setTimeout(() => {
                desktopNotif.close();
            }, notification.duration);
        }
    },

    // ==================== SUONI NOTIFICA ====================
    playNotificationSound(type) {
        if (!this.state.settings.sound) return;

        const sounds = {
            success: '/assets/sounds/success.mp3',
            warning: '/assets/sounds/warning.mp3',
            error: '/assets/sounds/error.mp3',
            info: '/assets/sounds/info.mp3'
        };

        const soundFile = sounds[type] || sounds.info;

        try {
            const audio = new Audio(soundFile);
            audio.volume = 0.3;
            audio.play().catch(error => {
                console.warn('Impossibile riprodurre suono notifica:', error);
            });
        } catch (error) {
            console.warn('Errore riproduzione suono:', error);
        }
    },

    // ==================== REAL-TIME NOTIFICATIONS ====================
    initializeRealTime() {
        if (!window.Auth?.isAuthenticated()) return;

        try {
            // Simula connessione WebSocket per notifiche real-time
            console.log('🔗 Connecting to real-time notifications...');

            // In produzione: sostituire con vera connessione WebSocket
            this.simulateRealTimeConnection();

        } catch (error) {
            console.error('❌ Error initializing real-time notifications:', error);
        }
    },

    simulateRealTimeConnection() {
        // Simula eventi real-time per demo
        const events = [
            {
                delay: 10000,
                notification: {
                    title: 'Nuova prenotazione',
                    message: 'Mario Rossi ha prenotato lo Spazio Creativo Milano',
                    type: 'info',
                    category: 'booking',
                    actions: [
                        {
                            text: 'Visualizza',
                            onclick: () => window.Navigation?.showSection('dashboard')
                        }
                    ]
                }
            },
            {
                delay: 20000,
                notification: {
                    title: 'Pagamento ricevuto',
                    message: 'Pagamento di €150 completato con successo',
                    type: 'success',
                    category: 'payment'
                }
            }
        ];

        events.forEach(event => {
            setTimeout(() => {
                if (window.Auth?.isAuthenticated()) {
                    this.show(event.notification);
                }
            }, event.delay);
        });
    },

    disconnectRealTime() {
        if (this.state.socket) {
            this.state.socket.close();
            this.state.socket = null;
            console.log('🔌 Disconnected from real-time notifications');
        }
    },

    // ==================== CARICAMENTO NOTIFICHE ====================
    async loadUserNotifications() {
        try {
            console.log('📡 Loading user notifications...');

            // Simula chiamata API per notifiche utente
            const mockNotifications = this.generateMockNotifications();

            // In produzione: sostituire con vera chiamata API
            // const response = await window.api.getUserNotifications();
            // if (response.success) {
            //     this.state.notifications = response.data.notifications;
            // }

            this.state.notifications = mockNotifications;
            this.updateUnreadCount();
            this.updateDropdown();

            console.log(`✅ Loaded ${this.state.notifications.length} notifications`);
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
        }
    },

    generateMockNotifications() {
        const now = new Date();
        return [
            {
                id: 'notif-1',
                title: 'Prenotazione confermata',
                message: 'La tua prenotazione per domani è stata confermata',
                type: 'success',
                category: 'booking',
                timestamp: new Date(now - 1000 * 60 * 30), // 30 minuti fa
                read: false,
                icon: 'fas fa-check-circle'
            },
            {
                id: 'notif-2',
                title: 'Promemoria',
                message: 'La tua prenotazione inizia tra 1 ora',
                type: 'warning',
                category: 'reminder',
                timestamp: new Date(now - 1000 * 60 * 60 * 2), // 2 ore fa
                read: false,
                icon: 'fas fa-clock'
            },
            {
                id: 'notif-3',
                title: 'Nuovo spazio disponibile',
                message: 'È stato aggiunto un nuovo spazio nella tua zona',
                type: 'info',
                category: 'space',
                timestamp: new Date(now - 1000 * 60 * 60 * 5), // 5 ore fa
                read: true,
                icon: 'fas fa-building'
            },
            {
                id: 'notif-4',
                title: 'Pagamento completato',
                message: 'Il pagamento di €75 è stato elaborato con successo',
                type: 'success',
                category: 'payment',
                timestamp: new Date(now - 1000 * 60 * 60 * 24), // 1 giorno fa
                read: true,
                icon: 'fas fa-credit-card'
            }
        ];
    },

    // ==================== SINCRONIZZAZIONE ====================
    async syncNotificationStatus(notificationId, status) {
        try {
            // In produzione: invia stato al server
            console.log(`📤 Syncing notification ${notificationId} status: ${status}`);

            // const response = await window.api.updateNotificationStatus(notificationId, status);
            // return response.success;

            return true;
        } catch (error) {
            console.error('❌ Error syncing notification status:', error);
            return false;
        }
    },

    async syncAllNotificationsRead() {
        try {
            console.log('📤 Marking all notifications as read...');

            // In produzione: invia richiesta al server
            // const response = await window.api.markAllNotificationsRead();
            // return response.success;

            return true;
        } catch (error) {
            console.error('❌ Error marking all notifications as read:', error);
            return false;
        }
    },

    // ==================== UTILITY METHODS ====================
    getDefaultIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    },

    getTypeColor(type) {
        const colors = {
            success: 'success',
            warning: 'warning',
            error: 'danger',
            info: 'primary'
        };
        return colors[type] || colors.info;
    },

    formatTimeAgo(timestamp) {
        const now = new Date();
        const diff = now - new Date(timestamp);
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return 'Ora';
        if (minutes < 60) return `${minutes}m fa`;
        if (hours < 24) return `${hours}h fa`;
        if (days < 7) return `${days}g fa`;

        return new Date(timestamp).toLocaleDateString('it-IT');
    },

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // ==================== EVENTI PERSONALIZZATI ====================
    triggerNotificationEvent(eventType, notification) {
        const event = new CustomEvent(`notification${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, {
            detail: { notification, notifications: this }
        });
        document.dispatchEvent(event);
    },

    // ==================== IMPOSTAZIONI ====================
    updateSettings(newSettings) {
        this.state.settings = { ...this.state.settings, ...newSettings };
        this.saveSettings();

        // Richiedi permessi se necessario
        if (newSettings.desktop && Notification.permission === 'default') {
            this.requestNotificationPermission();
        }
    },

    saveSettings() {
        window.Components?.saveToStorage('coworkspace_notification_settings', this.state.settings);
    },

    loadSettings() {
        const saved = window.Components?.loadFromStorage('coworkspace_notification_settings');
        if (saved) {
            this.state.settings = { ...this.state.settings, ...saved };
        }
    },

    // ==================== METODI PUBBLICI ====================
    showAllNotifications() {
        // Implementa modal o pagina per tutte le notifiche
        console.log('📋 Opening all notifications view...');

        const modal = window.Components?.createModal({
            title: 'Tutte le Notifiche',
            size: 'modal-lg',
            body: this.buildAllNotificationsContent(),
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                <button type="button" class="btn btn-outline-danger" onclick="Notifications.clearAllNotifications()">
                    <i class="fas fa-trash"></i> Cancella Tutte
                </button>
            `
        });

        modal?.show();
    },

    buildAllNotificationsContent() {
        if (this.state.notifications.length === 0) {
            return `
                <div class="text-center p-4">
                    <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                    <h5>Nessuna notifica</h5>
                    <p class="text-muted">Non hai ancora ricevuto notifiche</p>
                </div>
            `;
        }

        return `
            <div class="all-notifications">
                <div class="notifications-filters mb-3">
                    <div class="btn-group btn-group-sm" role="group">
                        <input type="radio" class="btn-check" name="notif-filter" id="filter-all" value="all" checked>
                        <label class="btn btn-outline-primary" for="filter-all">Tutte</label>
                        
                        <input type="radio" class="btn-check" name="notif-filter" id="filter-unread" value="unread">
                        <label class="btn btn-outline-primary" for="filter-unread">Non lette</label>
                        
                        <input type="radio" class="btn-check" name="notif-filter" id="filter-booking" value="booking">
                        <label class="btn btn-outline-primary" for="filter-booking">Prenotazioni</label>
                        
                        <input type="radio" class="btn-check" name="notif-filter" id="filter-payment" value="payment">
                        <label class="btn btn-outline-primary" for="filter-payment">Pagamenti</label>
                    </div>
                </div>
                
                <div class="notifications-list-full">
                    ${this.state.notifications.map(notification => `
                        <div class="notification-item-full ${notification.read ? 'read' : 'unread'}" 
                             data-category="${notification.category}">
                            <div class="notification-icon">
                                <i class="${notification.icon} text-${this.getTypeColor(notification.type)}"></i>
                            </div>
                            <div class="notification-content">
                                <div class="notification-header">
                                    <h6 class="notification-title">${notification.title}</h6>
                                    <small class="text-muted">${this.formatTimeAgo(notification.timestamp)}</small>
                                </div>
                                <p class="notification-message">${notification.message}</p>
                                <div class="notification-meta">
                                    <span class="badge bg-${this.getTypeColor(notification.type)}">${notification.type}</span>
                                    <span class="badge bg-secondary">${notification.category}</span>
                                </div>
                            </div>
                            <div class="notification-actions">
                                ${!notification.read ? `
                                    <button class="btn btn-sm btn-outline-primary" 
                                            onclick="Notifications.markAsRead('${notification.id}')">
                                        <i class="fas fa-check"></i> Segna come letta
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-outline-danger" 
                                        onclick="Notifications.deleteNotification('${notification.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    deleteNotification(notificationId) {
        this.state.notifications = this.state.notifications.filter(n => n.id !== notificationId);
        this.updateUnreadCount();
        this.updateDropdown();

        // Aggiorna modal se aperto
        const modalContent = document.querySelector('.all-notifications');
        if (modalContent) {
            modalContent.outerHTML = this.buildAllNotificationsContent();
        }
    },

    clearAllNotifications() {
        const confirmed = confirm('Sei sicuro di voler cancellare tutte le notifiche?');
        if (!confirmed) return;

        this.state.notifications = [];
        this.updateUnreadCount();
        this.updateDropdown();

        // Chiudi modal
        const modal = bootstrap.Modal.getInstance(document.querySelector('.modal.show'));
        modal?.hide();

        window.Components?.showNotification({
            message: 'Tutte le notifiche sono state cancellate',
            type: 'success',
            duration: 2000
        });
    },

    clearNotifications() {
        this.state.notifications = [];
        this.state.unreadCount = 0;
        this.updateDropdown();
    },

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        // Gestisci filtri notifiche
        document.addEventListener('change', (e) => {
            if (e.target.name === 'notif-filter') {
                this.filterNotifications(e.target.value);
            }
        });

        // Gestisci click esterni per chiudere dropdown
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notifications-dropdown')) {
                // Aggiorna timestamp delle notifiche visibili
                this.updateTimestamps();
            }
        });

        // Aggiorna timestamp periodicamente
        setInterval(() => {
            this.updateTimestamps();
        }, 60000); // Ogni minuto
    },

    filterNotifications(filter) {
        const items = document.querySelectorAll('.notification-item-full');

        items.forEach(item => {
            const category = item.dataset.category;
            const isUnread = item.classList.contains('unread');

            let show = true;

            switch (filter) {
                case 'unread':
                    show = isUnread;
                    break;
                case 'booking':
                case 'payment':
                case 'space':
                case 'reminder':
                    show = category === filter;
                    break;
                default:
                    show = true;
            }

            item.style.display = show ? 'flex' : 'none';
        });
    },

    updateTimestamps() {
        const timestampElements = document.querySelectorAll('.toast-timestamp, .notification-meta small');
        timestampElements.forEach(element => {
            const notificationId = element.closest('[data-notification-id]')?.dataset.notificationId;
            if (notificationId) {
                const notification = this.state.notifications.find(n => n.id === notificationId);
                if (notification) {
                    element.textContent = this.formatTimeAgo(notification.timestamp);
                }
            }
        });
    },

    // ==================== CLEANUP ====================
    cleanup() {
        this.disconnectRealTime();
        this.clearNotifications();

        const container = document.getElementById('notifications-container');
        if (container) container.remove();

        console.log('🧹 Notifications cleaned up');
    }
};

// ==================== AUTO-INIZIALIZZAZIONE ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Notifications.init();
    });
} else {
    window.Notifications.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    window.Notifications.cleanup();
});

// Esponi alcune funzioni globalmente per compatibilità
window.notifications = {
    show: (options) => window.Notifications.show(options)
};