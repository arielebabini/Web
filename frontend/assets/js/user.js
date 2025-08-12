/**
 * CoWorkSpace - User Manager
 * Gestione profilo utente e preferenze
 */

window.User = {
    /**
     * Stato del modulo
     */
    state: {
        initialized: false,
        loading: false,
        profile: null,
        settings: {
            theme: 'auto',
            language: 'it',
            notifications: {
                email: true,
                push: false,
                sms: false
            },
            privacy: {
                showProfile: true,
                showBookings: false,
                allowAnalytics: true
            }
        },
        bookings: [],
        favorites: [],
        reviews: []
    },

    /**
     * Configurazione
     */
    config: {
        endpoints: {
            profile: '/api/users/profile',
            settings: '/api/users/settings',
            bookings: '/api/users/bookings',
            favorites: '/api/users/favorites',
            reviews: '/api/users/reviews',
            avatar: '/api/users/avatar'
        },
        avatarMaxSize: 2 * 1024 * 1024, // 2MB
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp']
    },

    /**
     * Templates HTML
     */
    templates: {
        profileForm: `
            <form id="profile-form" class="profile-form">
                <div class="row">
                    <div class="col-md-4 text-center">
                        <div class="avatar-section">
                            <div class="avatar-container">
                                <img src="{avatarUrl}" alt="Avatar" id="user-avatar" class="user-avatar">
                                <div class="avatar-overlay">
                                    <button type="button" class="btn btn-sm btn-light" onclick="User.changeAvatar()">
                                        <i class="fas fa-camera"></i>
                                    </button>
                                </div>
                            </div>
                            <input type="file" id="avatar-input" accept="image/*" style="display: none;">
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="row">
                            <div class="col-md-6">
                                <label for="first-name" class="form-label">Nome *</label>
                                <input type="text" id="first-name" class="form-control" value="{firstName}" required>
                            </div>
                            <div class="col-md-6">
                                <label for="last-name" class="form-label">Cognome *</label>
                                <input type="text" id="last-name" class="form-control" value="{lastName}" required>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-md-12">
                                <label for="email" class="form-label">Email *</label>
                                <input type="email" id="email" class="form-control" value="{email}" required>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-md-6">
                                <label for="phone" class="form-label">Telefono</label>
                                <input type="tel" id="phone" class="form-control" value="{phone}">
                            </div>
                            <div class="col-md-6">
                                <label for="company" class="form-label">Azienda</label>
                                <input type="text" id="company" class="form-control" value="{company}">
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-md-12">
                                <label for="bio" class="form-label">Bio</label>
                                <textarea id="bio" class="form-control" rows="3" placeholder="Parlaci di te...">{bio}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="form-actions mt-4">
                    <button type="button" class="btn btn-secondary" onclick="User.resetProfileForm()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salva Modifiche
                    </button>
                </div>
            </form>
        `,

        settingsForm: `
            <form id="settings-form" class="settings-form">
                <div class="settings-section">
                    <h5><i class="fas fa-palette"></i> Aspetto</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <label for="theme-select" class="form-label">Tema</label>
                            <select id="theme-select" class="form-select">
                                <option value="auto">Automatico</option>
                                <option value="light">Chiaro</option>
                                <option value="dark">Scuro</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label for="language-select" class="form-label">Lingua</label>
                            <select id="language-select" class="form-select">
                                <option value="it">Italiano</option>
                                <option value="en">English</option>
                                <option value="es">Español</option>
                                <option value="fr">Français</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="settings-section mt-4">
                    <h5><i class="fas fa-bell"></i> Notifiche</h5>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="email-notifications">
                        <label class="form-check-label" for="email-notifications">
                            Notifiche Email
                        </label>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="push-notifications">
                        <label class="form-check-label" for="push-notifications">
                            Notifiche Push
                        </label>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="sms-notifications">
                        <label class="form-check-label" for="sms-notifications">
                            Notifiche SMS
                        </label>
                    </div>
                </div>

                <div class="settings-section mt-4">
                    <h5><i class="fas fa-shield-alt"></i> Privacy</h5>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="show-profile">
                        <label class="form-check-label" for="show-profile">
                            Profilo pubblico
                        </label>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="show-bookings">
                        <label class="form-check-label" for="show-bookings">
                            Mostra prenotazioni
                        </label>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="allow-analytics">
                        <label class="form-check-label" for="allow-analytics">
                            Consenti analytics
                        </label>
                    </div>
                </div>

                <div class="form-actions mt-4">
                    <button type="button" class="btn btn-secondary" onclick="User.resetSettingsForm()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salva Impostazioni
                    </button>
                </div>
            </form>
        `,

        bookingsList: `
            <div class="bookings-list">
                <div class="bookings-filters mb-3">
                    <div class="row">
                        <div class="col-md-4">
                            <select id="booking-status-filter" class="form-select">
                                <option value="">Tutti gli stati</option>
                                <option value="confirmed">Confermate</option>
                                <option value="pending">In attesa</option>
                                <option value="cancelled">Cancellate</option>
                                <option value="completed">Completate</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <input type="date" id="booking-date-filter" class="form-control" placeholder="Data">
                        </div>
                        <div class="col-md-4">
                            <button class="btn btn-outline-secondary" onclick="User.exportBookings()">
                                <i class="fas fa-download"></i> Esporta
                            </button>
                        </div>
                    </div>
                </div>
                <div id="user-bookings-container">
                    {bookingsHTML}
                </div>
            </div>
        `
    },

    /**
     * Inizializza il modulo
     */
    async init() {
        try {
            console.log('👤 Initializing User Manager...');

            // Verifica dipendenze
            if (!window.API || !window.Utils) {
                throw new Error('Required dependencies not available');
            }

            // Setup event listeners
            this.setupEventListeners();

            // Carica impostazioni salvate
            this.loadStoredSettings();

            this.state.initialized = true;
            console.log('✅ User Manager initialized');

            return true;

        } catch (error) {
            console.error('❌ Failed to initialize User Manager:', error);
            return false;
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listener per login
        document.addEventListener('auth:login', (e) => {
            this.handleUserLogin(e.detail.user);
        });

        // Listener per logout
        document.addEventListener('auth:logout', () => {
            this.handleUserLogout();
        });

        // Listener per sezione profilo
        document.addEventListener('navigation:sectionChanged', (e) => {
            if (e.detail.section === 'profile') {
                this.handleProfileSection(e.detail.subsection);
            }
        });

        // Listener per cambio tema
        document.addEventListener('change', (e) => {
            if (e.target.id === 'theme-select') {
                this.applyTheme(e.target.value);
            }
        });
    },

    /**
     * Gestisce login utente
     */
    async handleUserLogin(user) {
        try {
            this.state.profile = user;
            await this.loadUserData();
            this.triggerEvent('user:dataLoaded');
        } catch (error) {
            console.error('Error handling user login:', error);
        }
    },

    /**
     * Gestisce logout utente
     */
    handleUserLogout() {
        this.state.profile = null;
        this.state.bookings = [];
        this.state.favorites = [];
        this.state.reviews = [];
        this.triggerEvent('user:dataCleared');
    },

    /**
     * Carica dati utente
     */
    async loadUserData() {
        if (!window.Auth?.isAuthenticated()) return;

        try {
            this.state.loading = true;

            // Carica profilo completo
            await this.loadProfile();

            // Carica impostazioni
            await this.loadSettings();

            // Carica prenotazioni
            await this.loadUserBookings();

            // Carica preferiti
            await this.loadUserFavorites();

            // Carica recensioni
            await this.loadUserReviews();

        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            this.state.loading = false;
        }
    },

    /**
     * Carica profilo utente
     */
    async loadProfile() {
        try {
            const response = await window.API.get(this.config.endpoints.profile);

            if (response.success) {
                this.state.profile = { ...this.state.profile, ...response.data };
                this.triggerEvent('profile:loaded');
            }

        } catch (error) {
            console.error('Error loading profile:', error);
        }
    },

    /**
     * Carica impostazioni utente
     */
    async loadSettings() {
        try {
            const response = await window.API.get(this.config.endpoints.settings);

            if (response.success) {
                this.state.settings = { ...this.state.settings, ...response.data };
                this.applySettings();
                this.triggerEvent('settings:loaded');
            }

        } catch (error) {
            console.error('Error loading settings:', error);
        }
    },

    /**
     * Carica prenotazioni utente
     */
    async loadUserBookings() {
        try {
            const response = await window.API.get(this.config.endpoints.bookings);

            if (response.success) {
                this.state.bookings = response.data || [];
                this.triggerEvent('bookings:loaded');
            }

        } catch (error) {
            console.error('Error loading user bookings:', error);
        }
    },

    /**
     * Carica preferiti utente
     */
    async loadUserFavorites() {
        try {
            const response = await window.API.get(this.config.endpoints.favorites);

            if (response.success) {
                this.state.favorites = response.data || [];
                this.triggerEvent('favorites:loaded');
            }

        } catch (error) {
            console.error('Error loading user favorites:', error);
        }
    },

    /**
     * Carica recensioni utente
     */
    async loadUserReviews() {
        try {
            const response = await window.API.get(this.config.endpoints.reviews);

            if (response.success) {
                this.state.reviews = response.data || [];
                this.triggerEvent('reviews:loaded');
            }

        } catch (error) {
            console.error('Error loading user reviews:', error);
        }
    },

    /**
     * Carica impostazioni salvate localmente
     */
    loadStoredSettings() {
        try {
            const stored = localStorage.getItem('coworkspace_user_settings');
            if (stored) {
                const settings = JSON.parse(stored);
                this.state.settings = { ...this.state.settings, ...settings };
                this.applySettings();
            }
        } catch (error) {
            console.error('Error loading stored settings:', error);
        }
    },

    /**
     * Applica impostazioni
     */
    applySettings() {
        // Applica tema
        this.applyTheme(this.state.settings.theme);

        // Applica lingua
        this.applyLanguage(this.state.settings.language);

        // Trigger evento
        this.triggerEvent('settings:applied');
    },

    /**
     * Applica tema
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.state.settings.theme = theme;
        this.saveSettingsLocally();
    },

    /**
     * Applica lingua
     */
    applyLanguage(language) {
        document.documentElement.setAttribute('lang', language);
        this.state.settings.language = language;
        this.saveSettingsLocally();
    },

    /**
     * Salva impostazioni localmente
     */
    saveSettingsLocally() {
        try {
            localStorage.setItem('coworkspace_user_settings', JSON.stringify(this.state.settings));
        } catch (error) {
            console.error('Error saving settings locally:', error);
        }
    },

    /**
     * Gestisce sezione profilo
     */
    handleProfileSection(subsection = 'profile') {
        const container = document.getElementById('content-container');
        if (!container) return;

        switch (subsection) {
            case 'profile':
                this.renderProfileForm(container);
                break;
            case 'settings':
                this.renderSettingsForm(container);
                break;
            case 'bookings':
                this.renderBookingsList(container);
                break;
            case 'favorites':
                this.renderFavoritesList(container);
                break;
            default:
                this.renderProfileDashboard(container);
        }
    },

    /**
     * Renderizza dashboard profilo
     */
    renderProfileDashboard(container) {
        if (!this.state.profile) {
            container.innerHTML = `
                <div class="text-center">
                    <h3>Accedi al tuo Profilo</h3>
                    <p>Effettua il login per accedere al tuo profilo</p>
                    <button class="btn btn-primary" onclick="Auth.showLoginModal()">
                        <i class="fas fa-sign-in-alt"></i> Accedi
                    </button>
                </div>
            `;
            return;
        }

        const dashboardHTML = `
            <div class="profile-dashboard">
                <div class="profile-header">
                    <div class="profile-avatar">
                        <img src="${this.state.profile.avatar || '/assets/images/default-avatar.jpg'}" 
                             alt="Avatar" class="user-avatar">
                    </div>
                    <div class="profile-info">
                        <h2>${this.state.profile.firstName} ${this.state.profile.lastName}</h2>
                        <p class="text-muted">${this.state.profile.email}</p>
                        ${this.state.profile.company ? `<p><i class="fas fa-building"></i> ${this.state.profile.company}</p>` : ''}
                    </div>
                    <div class="profile-actions">
                        <button class="btn btn-outline-primary" onclick="Navigation.showSection('profile', 'profile')">
                            <i class="fas fa-edit"></i> Modifica Profilo
                        </button>
                    </div>
                </div>

                <div class="profile-stats">
                    <div class="row">
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-number">${this.state.bookings.length}</div>
                                <div class="stat-label">Prenotazioni</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-number">${this.state.favorites.length}</div>
                                <div class="stat-label">Preferiti</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-number">${this.state.reviews.length}</div>
                                <div class="stat-label">Recensioni</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-number">${this.getUpcomingBookings().length}</div>
                                <div class="stat-label">Prossime</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="profile-sections">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="section-card" onclick="Navigation.showSection('profile', 'bookings')">
                                <i class="fas fa-calendar-alt"></i>
                                <h5>Le mie Prenotazioni</h5>
                                <p>Gestisci le tue prenotazioni</p>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="section-card" onclick="Navigation.showSection('profile', 'favorites')">
                                <i class="fas fa-heart"></i>
                                <h5>Spazi Preferiti</h5>
                                <p>I tuoi spazi salvati</p>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="section-card" onclick="Navigation.showSection('profile', 'settings')">
                                <i class="fas fa-cog"></i>
                                <h5>Impostazioni</h5>
                                <p>Personalizza l'esperienza</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = dashboardHTML;
    },

    /**
     * Renderizza form profilo
     */
    renderProfileForm(container) {
        if (!this.state.profile) {
            this.renderProfileDashboard(container);
            return;
        }

        let form = this.templates.profileForm;

        // Sostituzioni
        form = form.replace(/{avatarUrl}/g, this.state.profile.avatar || '/assets/images/default-avatar.jpg');
        form = form.replace(/{firstName}/g, this.state.profile.firstName || '');
        form = form.replace(/{lastName}/g, this.state.profile.lastName || '');
        form = form.replace(/{email}/g, this.state.profile.email || '');
        form = form.replace(/{phone}/g, this.state.profile.phone || '');
        form = form.replace(/{company}/g, this.state.profile.company || '');
        form = form.replace(/{bio}/g, this.state.profile.bio || '');

        const profileHTML = `
            <div class="profile-form-container">
                <div class="section-header">
                    <h3><i class="fas fa-user"></i> Modifica Profilo</h3>
                    <p>Aggiorna le tue informazioni personali</p>
                </div>
                ${form}
            </div>
        `;

        container.innerHTML = profileHTML;
        this.setupProfileFormListeners();
    },

    /**
     * Setup listeners form profilo
     */
    setupProfileFormListeners() {
        const form = document.getElementById('profile-form');
        if (!form) return;

        // Submit form
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProfileSubmit();
        });

        // Avatar input
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                this.handleAvatarChange(e);
            });
        }
    },

    /**
     * Gestisce submit profilo
     */
    async handleProfileSubmit() {
        try {
            const formData = this.gatherProfileFormData();

            // Validazione
            if (!formData.firstName || !formData.lastName || !formData.email) {
                window.Utils?.notifications?.show('Compila tutti i campi obbligatori', 'error');
                return;
            }

            this.state.loading = true;

            const response = await window.API.put(this.config.endpoints.profile, formData);

            if (response.success) {
                this.state.profile = { ...this.state.profile, ...response.data };
                window.Utils?.notifications?.show('Profilo aggiornato con successo', 'success');
                this.triggerEvent('profile:updated');
            } else {
                throw new Error(response.message || 'Errore nell\'aggiornamento del profilo');
            }

        } catch (error) {
            console.error('Error updating profile:', error);
            window.Utils?.notifications?.show(error.message, 'error');
        } finally {
            this.state.loading = false;
        }
    },

    /**
     * Raccoglie dati form profilo
     */
    gatherProfileFormData() {
        return {
            firstName: document.getElementById('first-name')?.value || '',
            lastName: document.getElementById('last-name')?.value || '',
            email: document.getElementById('email')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            company: document.getElementById('company')?.value || '',
            bio: document.getElementById('bio')?.value || ''
        };
    },

    /**
     * Reset form profilo
     */
    resetProfileForm() {
        const form = document.getElementById('profile-form');
        if (form && this.state.profile) {
            // Ripristina valori originali
            document.getElementById('first-name').value = this.state.profile.firstName || '';
            document.getElementById('last-name').value = this.state.profile.lastName || '';
            document.getElementById('email').value = this.state.profile.email || '';
            document.getElementById('phone').value = this.state.profile.phone || '';
            document.getElementById('company').value = this.state.profile.company || '';
            document.getElementById('bio').value = this.state.profile.bio || '';
        }
    },

    /**
     * Cambia avatar
     */
    changeAvatar() {
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.click();
        }
    },

    /**
     * Gestisce cambio avatar
     */
    async handleAvatarChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validazione file
        if (!this.config.allowedImageTypes.includes(file.type)) {
            window.Utils?.notifications?.show('Formato immagine non supportato', 'error');
            return;
        }

        if (file.size > this.config.avatarMaxSize) {
            window.Utils?.notifications?.show('Immagine troppo grande (max 2MB)', 'error');
            return;
        }

        try {
            // Preview immediato
            const reader = new FileReader();
            reader.onload = (e) => {
                const avatar = document.getElementById('user-avatar');
                if (avatar) {
                    avatar.src = e.target.result;
                }
            };
            reader.readAsDataURL(file);

            // Upload al server
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await window.API.post(this.config.endpoints.avatar, formData);

            if (response.success) {
                this.state.profile.avatar = response.data.avatarUrl;
                window.Utils?.notifications?.show('Avatar aggiornato', 'success');
                this.triggerEvent('avatar:updated');
            } else {
                throw new Error(response.message || 'Errore nell\'upload dell\'avatar');
            }

        } catch (error) {
            console.error('Error uploading avatar:', error);
            window.Utils?.notifications?.show(error.message, 'error');

            // Ripristina avatar precedente
            const avatar = document.getElementById('user-avatar');
            if (avatar) {
                avatar.src = this.state.profile.avatar || '/assets/images/default-avatar.jpg';
            }
        }
    },

    /**
     * Renderizza form impostazioni
     */
    renderSettingsForm(container) {
        const settingsHTML = `
            <div class="settings-form-container">
                <div class="section-header">
                    <h3><i class="fas fa-cog"></i> Impostazioni</h3>
                    <p>Personalizza la tua esperienza</p>
                </div>
                ${this.templates.settingsForm}
            </div>
        `;

        container.innerHTML = settingsHTML;
        this.populateSettingsForm();
        this.setupSettingsFormListeners();
    },

    /**
     * Popola form impostazioni
     */
    populateSettingsForm() {
        // Tema
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = this.state.settings.theme;
        }

        // Lingua
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.value = this.state.settings.language;
        }

        // Notifiche
        document.getElementById('email-notifications').checked = this.state.settings.notifications.email;
        document.getElementById('push-notifications').checked = this.state.settings.notifications.push;
        document.getElementById('sms-notifications').checked = this.state.settings.notifications.sms;

        // Privacy
        document.getElementById('show-profile').checked = this.state.settings.privacy.showProfile;
        document.getElementById('show-bookings').checked = this.state.settings.privacy.showBookings;
        document.getElementById('allow-analytics').checked = this.state.settings.privacy.allowAnalytics;
    },

    /**
     * Setup listeners form impostazioni
     */
    setupSettingsFormListeners() {
        const form = document.getElementById('settings-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSettingsSubmit();
        });

        // Listener per tema
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
            });
        }
    },

    /**
     * Gestisce submit impostazioni
     */
    async handleSettingsSubmit() {
        try {
            const settingsData = this.gatherSettingsFormData();

            this.state.loading = true;

            // Aggiorna stato locale
            this.state.settings = { ...this.state.settings, ...settingsData };

            // Applica impostazioni
            this.applySettings();

            // Salva sul server se autenticato
            if (window.Auth?.isAuthenticated()) {
                const response = await window.API.put(this.config.endpoints.settings, settingsData);

                if (!response.success) {
                    throw new Error(response.message || 'Errore nel salvataggio impostazioni');
                }
            }

            window.Utils?.notifications?.show('Impostazioni salvate', 'success');
            this.triggerEvent('settings:updated');

        } catch (error) {
            console.error('Error saving settings:', error);
            window.Utils?.notifications?.show(error.message, 'error');
        } finally {
            this.state.loading = false;
        }
    },

    /**
     * Raccoglie dati form impostazioni
     */
    gatherSettingsFormData() {
        return {
            theme: document.getElementById('theme-select')?.value || 'auto',
            language: document.getElementById('language-select')?.value || 'it',
            notifications: {
                email: document.getElementById('email-notifications')?.checked || false,
                push: document.getElementById('push-notifications')?.checked || false,
                sms: document.getElementById('sms-notifications')?.checked || false
            },
            privacy: {
                showProfile: document.getElementById('show-profile')?.checked || false,
                showBookings: document.getElementById('show-bookings')?.checked || false,
                allowAnalytics: document.getElementById('allow-analytics')?.checked || false
            }
        };
    },

    /**
     * Reset form impostazioni
     */
    resetSettingsForm() {
        this.populateSettingsForm();
    },

    /**
     * Renderizza lista prenotazioni
     */
    renderBookingsList(container) {
        const bookingsHTML = this.buildBookingsHTML();

        let list = this.templates.bookingsList;
        list = list.replace(/{bookingsHTML}/g, bookingsHTML);

        const bookingsContainer = `
            <div class="bookings-container">
                <div class="section-header">
                    <h3><i class="fas fa-calendar-alt"></i> Le mie Prenotazioni</h3>
                    <p>Gestisci e monitora le tue prenotazioni</p>
                </div>
                ${list}
            </div>
        `;

        container.innerHTML = bookingsContainer;
        this.setupBookingsListeners();
    },

    /**
     * Costruisce HTML prenotazioni
     */
    buildBookingsHTML() {
        if (this.state.bookings.length === 0) {
            return `
                <div class="no-bookings">
                    <i class="fas fa-calendar-times fa-3x text-muted"></i>
                    <h4>Nessuna prenotazione</h4>
                    <p>Non hai ancora effettuato prenotazioni</p>
                    <button class="btn btn-primary" onclick="Navigation.showSection('spaces')">
                        <i class="fas fa-search"></i> Cerca Spazi
                    </button>
                </div>
            `;
        }

        return this.state.bookings.map(booking => `
            <div class="booking-item" data-booking-id="${booking.id}">
                <div class="booking-status status-${booking.status}">
                    ${this.getStatusLabel(booking.status)}
                </div>
                <div class="booking-content">
                    <h5>${booking.spaceName}</h5>
                    <div class="booking-details">
                        <span><i class="fas fa-calendar"></i> ${Utils.formatDate(booking.date)}</span>
                        <span><i class="fas fa-clock"></i> ${booking.startTime} - ${booking.endTime}</span>
                        <span><i class="fas fa-users"></i> ${booking.guests} persone</span>
                        <span><i class="fas fa-euro-sign"></i> €${booking.totalPrice}</span>
                    </div>
                </div>
                <div class="booking-actions">
                    ${this.buildBookingActions(booking)}
                </div>
            </div>
        `).join('');
    },

    /**
     * Costruisce azioni prenotazione
     */
    buildBookingActions(booking) {
        let actions = '';

        if (booking.status === 'confirmed' && this.canCancelBooking(booking)) {
            actions += `
                <button class="btn btn-sm btn-outline-danger" onclick="User.cancelBooking('${booking.id}')">
                    <i class="fas fa-times"></i> Cancella
                </button>
            `;
        }

        if (booking.status === 'completed' && !booking.hasReview) {
            actions += `
                <button class="btn btn-sm btn-outline-primary" onclick="User.reviewBooking('${booking.id}')">
                    <i class="fas fa-star"></i> Recensisci
                </button>
            `;
        }

        actions += `
            <button class="btn btn-sm btn-outline-secondary" onclick="User.viewBookingDetails('${booking.id}')">
                <i class="fas fa-eye"></i> Dettagli
            </button>
        `;

        return actions;
    },

    /**
     * Setup listeners lista prenotazioni
     */
    setupBookingsListeners() {
        // Filtro status
        const statusFilter = document.getElementById('booking-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterBookings();
            });
        }

        // Filtro data
        const dateFilter = document.getElementById('booking-date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.filterBookings();
            });
        }
    },

    /**
     * Filtra prenotazioni
     */
    filterBookings() {
        const statusFilter = document.getElementById('booking-status-filter')?.value || '';
        const dateFilter = document.getElementById('booking-date-filter')?.value || '';

        let filtered = [...this.state.bookings];

        if (statusFilter) {
            filtered = filtered.filter(booking => booking.status === statusFilter);
        }

        if (dateFilter) {
            filtered = filtered.filter(booking => booking.date === dateFilter);
        }

        // Aggiorna HTML
        const container = document.getElementById('user-bookings-container');
        if (container) {
            const originalBookings = this.state.bookings;
            this.state.bookings = filtered;
            container.innerHTML = this.buildBookingsHTML();
            this.state.bookings = originalBookings;
        }
    },

    /**
     * Renderizza lista preferiti
     */
    renderFavoritesList(container) {
        // Implementazione simile alle prenotazioni
        const favoritesHTML = `
            <div class="favorites-container">
                <div class="section-header">
                    <h3><i class="fas fa-heart"></i> Spazi Preferiti</h3>
                    <p>I tuoi spazi salvati</p>
                </div>
                <div id="favorites-grid" class="favorites-grid">
                    ${this.buildFavoritesHTML()}
                </div>
            </div>
        `;

        container.innerHTML = favoritesHTML;
    },

    /**
     * Costruisce HTML preferiti
     */
    buildFavoritesHTML() {
        if (this.state.favorites.length === 0) {
            return `
                <div class="no-favorites">
                    <i class="fas fa-heart-broken fa-3x text-muted"></i>
                    <h4>Nessun preferito</h4>
                    <p>Non hai ancora salvato spazi preferiti</p>
                    <button class="btn btn-primary" onclick="Navigation.showSection('spaces')">
                        <i class="fas fa-search"></i> Esplora Spazi
                    </button>
                </div>
            `;
        }

        // Se abbiamo i dati completi degli spazi preferiti
        if (window.Spaces && this.state.favorites.length > 0) {
            return this.state.favorites.map(favoriteId => {
                const space = window.Spaces.state.spaces.find(s => s.id === favoriteId);
                if (space) {
                    return window.Spaces.buildSpaceCard(space);
                }
                return '';
            }).join('');
        }

        return '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Caricamento...</div>';
    },

    /**
     * Ottieni prenotazioni prossime
     */
    getUpcomingBookings() {
        const now = new Date();
        return this.state.bookings.filter(booking => {
            const bookingDate = new Date(`${booking.date}T${booking.startTime}`);
            return bookingDate > now && booking.status === 'confirmed';
        });
    },

    /**
     * Ottieni etichetta status
     */
    getStatusLabel(status) {
        const labels = {
            pending: 'In Attesa',
            confirmed: 'Confermata',
            cancelled: 'Cancellata',
            completed: 'Completata'
        };
        return labels[status] || status;
    },

    /**
     * Controlla se può cancellare prenotazione
     */
    canCancelBooking(booking) {
        const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
        const now = new Date();
        const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
        return hoursUntilBooking > 24; // 24 ore di anticipo
    },

    /**
     * Cancella prenotazione
     */
    async cancelBooking(bookingId) {
        if (window.Bookings?.cancelBooking) {
            await window.Bookings.cancelBooking(bookingId);
            await this.loadUserBookings(); // Ricarica lista
            this.refreshBookingsList();
        }
    },

    /**
     * Esporta prenotazioni
     */
    exportBookings() {
        if (window.Bookings?.exportBookings) {
            window.Bookings.exportBookings('csv');
        }
    },

    /**
     * Refresh lista prenotazioni
     */
    refreshBookingsList() {
        const container = document.getElementById('user-bookings-container');
        if (container) {
            container.innerHTML = this.buildBookingsHTML();
        }
    },

    /**
     * Refresh dati utente
     */
    async refreshUserData() {
        if (window.Auth?.isAuthenticated() && this.state.initialized) {
            await this.loadUserData();
        }
    },

    /**
     * Trigger evento custom
     */
    triggerEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...data, user: this }
        });
        document.dispatchEvent(event);
    },

    /**
     * Ottieni informazioni utente
     */
    getUserInfo() {
        return {
            profile: this.state.profile,
            settings: this.state.settings,
            stats: {
                bookings: this.state.bookings.length,
                favorites: this.state.favorites.length,
                reviews: this.state.reviews.length,
                upcoming: this.getUpcomingBookings().length
            }
        };
    }
};

// Auto-inizializzazione se DOM pronto e dipendenze disponibili
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.API && window.Utils) {
            window.User.init();
        }
    });
} else if (window.API && window.Utils) {
    window.User.init();
}