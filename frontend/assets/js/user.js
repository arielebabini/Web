/**
 * CoWorkSpace - Gestione Utenti
 * Gestisce profilo utente, impostazioni, prenotazioni e favoriti
 * @version 1.0.0
 * @author CoWorkSpace Team
 */

window.User = {
    // ==================== STATO INTERNO ====================
    state: {
        currentUser: null,
        userBookings: [],
        favorites: [],
        settings: {
            notifications: true,
            emailUpdates: true,
            language: 'it',
            timezone: 'Europe/Rome'
        },
        isLoading: false,
        editMode: false,
        avatar: null,
        activeSession: null
    },

    // ==================== INIZIALIZZAZIONE ====================
    async init() {
        console.log('👤 User module initializing...');

        this.setupEventListeners();
        this.loadUserSettings();
        this.initializeUser();

        // Carica dati utente se autenticato
        if (window.auth && window.auth.isAuthenticated()) {
            await this.loadUserProfile();
        }

        // Listener per cambio autenticazione
        document.addEventListener('authStateChanged', (e) => {
            if (e.detail.isAuthenticated) {
                this.loadUserProfile();
            } else {
                this.clearUserData();
            }
        });

        // Listener per cambio sezione
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.section === 'profile') {
                this.handleProfileSection();
            }
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'currentUser' || event.key === 'authToken') {
                this.initializeUser();
            }
        });

        console.log('✅ User module initialized');

        setTimeout(() => {
            if (window.User && window.User.updateAuthUI) {
                window.User.updateAuthUI();
            }
        }, 100);
    },

    // ==================== CARICAMENTO PROFILO ====================
    async loadUserProfile() {
        if (this.state.isLoading) return;

        // Per chiamare il nuovo endpoint, abbiamo bisogno dell'email dell'utente loggato.
        // Assicuriamoci che sia presente nello stato dopo il login.
        const loggedInUser = this.getCurrentUser();
        if (!loggedInUser || !loggedInUser.email) {
            console.error("Impossibile caricare il profilo: email dell'utente non disponibile.");
            // Potresti voler mostrare un errore o fare un logout forzato qui.
            this.logout();
            return;
        }

        this.state.isLoading = true;

        try {
            console.log(`📡 Loading user profile via email: ${loggedInUser.email}`);

            // Qui assumiamo che tu abbia una funzione `api.getUserByEmail` che chiama
            // il nuovo endpoint GET /api/users/by-email?email=...
            const response = await window.api.getUserByEmail(loggedInUser.email);

            if (response.success) {
                // I nomi dei campi dal DB (first_name) sono diversi da quelli usati nel frontend (firstName)
                // Eseguiamo una mappatura per garantire la compatibilità
                const userData = response.user;
                this.state.currentUser = {
                    id: userData.id,
                    firstName: userData.first_name, // Mappatura
                    lastName: userData.last_name,   // Mappatura
                    email: userData.email,
                    phone: userData.phone,
                    company: userData.company,
                    role: userData.role,
                    status: userData.status,
                    createdAt: userData.created_at,
                    lastLogin: userData.updated_at // o un campo specifico se lo hai
                    // Aggiungi altri campi se necessario
                };

                // Salva l'utente aggiornato e completo nel localStorage
                localStorage.setItem('currentUser', JSON.stringify(this.state.currentUser));

                this.updateProfileUI();
                await Promise.all([
                    this.loadUserBookings(),
                ]);
                console.log('✅ User profile loaded successfully via email');
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('❌ Error loading user profile by email:', error);
            // In caso di errore, puoi decidere se caricare dati mock o mostrare un messaggio
            this.showNotification('Errore nel caricamento del profilo.', 'error');
            this.clearUserData();
        } finally {
            this.state.isLoading = false;
        }
    },

    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');

        if (this.isAuthenticated()) {
            // L'utente è loggato
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';

            // Popola il menu utente
            const user = this.getCurrentUser();
            const userFullName = document.getElementById('userFullName');
            const userEmail = document.getElementById('userEmail');
            const userInitial = document.getElementById('userInitial');
            const managerMenuItem = document.getElementById('managerMenuItem');
            const adminMenuItem = document.getElementById('adminMenuItem');

            if (userFullName) {
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                userFullName.textContent = fullName || 'Utente';
            }
            if (userEmail) userEmail.textContent = user.email || '';
            if (userInitial) {
                const name = user.firstName || user.email || 'U';
                userInitial.textContent = name.charAt(0).toUpperCase();
            }

            // Mostra/nascondi link pannelli admin/manager
            if(managerMenuItem) managerMenuItem.style.display = user.role === 'manager' ? 'block' : 'none';
            if(adminMenuItem) adminMenuItem.style.display = user.role === 'admin' ? 'block' : 'none';

        } else {
            // L'utente NON è loggato
            if (authButtons) authButtons.style.display = 'flex'; // o 'block'
            if (userMenu) userMenu.style.display = 'none';
        }
    },

    populateProfileModal() {
        // Se lo stato è vuoto, proviamo a caricarlo
        if (!this.state.currentUser) {
            console.log("Tentativo di caricamento utente da localStorage...");
            try {
                // Prova prima la chiave corretta 'currentUser'
                let savedUserJson = localStorage.getItem('currentUser');

                // Fallback: Prova la chiave 'user' (singolare)
                if (!savedUserJson) {
                    console.warn("Chiave 'currentUser' non trovata. Tento con 'user'...");
                    savedUserJson = localStorage.getItem('user');
                }

                if (savedUserJson) {
                    this.state.currentUser = JSON.parse(savedUserJson);
                    console.log('✅ Utente caricato con successo da localStorage.', this.state.currentUser);
                }
            } catch (error) {
                console.error('❌ Errore critico nel parsing dell\'utente da localStorage:', error);
                this.state.currentUser = null;
            }
        }

        // Controllo finale: se ancora non c'è un utente, è un problema.
        if (!this.state.currentUser) {
            console.error('ERRORE FINALE: Impossibile popolare il modal, nessun dato utente valido trovato.');
            alert('Devi effettuare il login per vedere il tuo profilo.');
            // Forza la chiusura del modal se è aperto
            const profileModalEl = document.getElementById('profileModal');
            if (profileModalEl) {
                const modalInstance = bootstrap.Modal.getInstance(profileModalEl);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            return;
        }

        // Se tutto è andato bene, popola il modal
        const user = this.state.currentUser;
        document.getElementById('profileName').textContent = user.firstName || user.first_name || '-';
        document.getElementById('profileSurname').textContent = user.lastName || user.last_name || '-';
        document.getElementById('profileEmail').textContent = user.email || '-';
        document.getElementById('profilePhone').textContent = user.phone || '-';
        document.getElementById('profileCompany').textContent = user.company || '-';
    },

    // Metodo per ottenere l'utente corrente
    getCurrentUser() {
        return this.state.currentUser;
    },

    // Metodo per ottenere il token di autenticazione
    getAuthToken() {
        return localStorage.getItem('authToken') || null;
    },

    // Metodo per verificare se l'utente è autenticato
    isAuthenticated() {
        return this.state.currentUser !== null && this.getAuthToken() !== null;
    },

    // Metodo per inizializzare l'utente dal localStorage
    initializeUser() {
        try {
            const savedUser = localStorage.getItem('currentUser');
            const token = localStorage.getItem('authToken');

            if (savedUser && token) {
                this.state.currentUser = JSON.parse(savedUser);
                console.log('✅ Utente inizializzato da localStorage.');
            } else {
                this.state.currentUser = null;
            }
        } catch (error) {
            console.error('Errore inizializzazione utente, pulizia localStorage.', error);
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            this.state.currentUser = null;
        }

        // Aggiorna l'interfaccia DOPO aver tentato di caricare l'utente
        this.updateAuthUI();
    },

    /**
     * Gestisce il salvataggio dei dati utente dopo un login riuscito.
     * QUESTA FUNZIONE DEVE ESSERE CHIAMATA QUANDO IL LOGIN VA A BUON FINE.
     * @param {object} userData - I dati dell'utente ricevuti dal server.
     * @param {string} token - Il token di autenticazione.
     */
    login(userData, token) {
        console.log("🚀 Esecuzione di User.login con:", userData);

        // Mappatura per coerenza (backend usa snake_case, frontend usa camelCase)
        const mappedUser = {
            id: userData.id,
            firstName: userData.first_name,
            lastName: userData.last_name,
            email: userData.email,
            phone: userData.phone,
            company: userData.company,
            role: userData.role
            // ...Aggiungi altri campi se necessario
        };

        // 1. Aggiorna lo stato interno
        this.state.currentUser = mappedUser;
        this.state.activeSession = true;

        // 2. Salva in localStorage usando la CHIAVE CORRETTA
        localStorage.setItem('currentUser', JSON.stringify(mappedUser));
        localStorage.setItem('authToken', token);

        console.log("✅ Dati utente e token salvati in localStorage.");

        // 3. Aggiorna l'interfaccia utente
        this.updateAuthUI();

        // 4. Emetti un evento per notificare le altre parti dell'app
        document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: mappedUser }));
    },

    // Metodo per il logout
    logout() {
        // Pulisci lo stato
        this.state.currentUser = null;

        // Pulisci localStorage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');

        // Emetti evento di logout (opzionale, ma buona pratica)
        document.dispatchEvent(new CustomEvent('userLoggedOut'));

        // Aggiorna l'UI per mostrare i pulsanti di login/registrazione
        this.updateAuthUI();

        // Reindirizza alla home o aggiorna la sezione
        if (window.Navigation && window.Navigation.showSection) {
            window.Navigation.showSection('home');
        }
        console.log('🔒 Utente disconnesso.');
    },

    // ==================== GESTIONE SEZIONE PROFILO ====================
    async handleProfileSection() {
        const container = document.getElementById('profile-container');
        if (!container) return;

        if (!window.auth || !window.auth.isAuthenticated()) {
            this.showLoginPrompt(container);
            return;
        }

        this.renderProfilePage(container);
    },

    renderProfilePage(container) {
        const profileHTML = `
            <div class="user-profile">
                ${this.buildProfileHeader()}
                
                <div class="profile-content">
                    <div class="row">
                        <div class="col-lg-4">
                            ${this.buildProfileSidebar()}
                        </div>
                        <div class="col-lg-8">
                            <div id="profile-main-content">
                                ${this.buildProfileOverview()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = profileHTML;
        this.attachProfileEvents();
    },

    buildProfileHeader() {
        const user = this.state.currentUser;
        if (!user) {
            return '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Caricamento profilo...</div>';
        }

        return `
            <div class="profile-header">
                <div class="container">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="profile-avatar">
                                <img src="${user.avatar || '/assets/images/default-avatar.png'}" 
                                     alt="${user.firstName} ${user.lastName}" 
                                     class="avatar-img"
                                     onerror="this.src='/assets/images/default-avatar.png'">
                                <div class="avatar-overlay" onclick="User.showAvatarUpload()">
                                    <i class="fas fa-camera"></i>
                                </div>
                            </div>
                        </div>
                        <div class="col">
                            <div class="profile-info">
                                <h1 class="profile-name">${this.formatUserName(user)}</h1>
                                <p class="profile-email">${user.email}</p>
                                <div class="profile-badges">
                                    <span class="badge bg-primary">
                                        <i class="fas fa-star"></i> ${this.getUserLevel(user)}
                                    </span>
                                    ${user.verified ? '<span class="badge bg-success"><i class="fas fa-check"></i> Verificato</span>' : ''}
                                    ${user.role === 'admin' ? '<span class="badge bg-danger"><i class="fas fa-crown"></i> Admin</span>' : ''}
                                </div>
                            </div>
                        </div>
                        <div class="col-auto">
                            <div class="profile-actions">
                                <button class="btn btn-outline-primary" onclick="User.toggleEditMode()">
                                    <i class="fas ${this.state.editMode ? 'fa-times' : 'fa-edit'}"></i> 
                                    ${this.state.editMode ? 'Annulla' : 'Modifica Profilo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    buildProfileSidebar() {
        const stats = this.calculateUserStats();

        return `
            <div class="profile-sidebar">
                <div class="sidebar-navigation">
                    <div class="nav nav-pills flex-column" role="tablist">
                        <button class="nav-link active" data-section="overview" onclick="User.showProfileSection('overview')">
                            <i class="fas fa-user"></i> Panoramica
                        </button>
                        <button class="nav-link" data-section="bookings" onclick="User.showProfileSection('bookings')">
                            <i class="fas fa-calendar-alt"></i> Prenotazioni
                            <span class="badge bg-primary">${this.state.userBookings.length}</span>
                        </button>
                        <button class="nav-link" data-section="favorites" onclick="User.showProfileSection('favorites')">
                            <i class="fas fa-heart"></i> Preferiti
                            <span class="badge bg-danger">${this.state.favorites.length}</span>
                        </button>
                        <button class="nav-link" data-section="settings" onclick="User.showProfileSection('settings')">
                            <i class="fas fa-cog"></i> Impostazioni
                        </button>
                        <button class="nav-link" data-section="security" onclick="User.showProfileSection('security')">
                            <i class="fas fa-shield-alt"></i> Sicurezza
                        </button>
                        <button class="nav-link" data-section="billing" onclick="User.showProfileSection('billing')">
                            <i class="fas fa-credit-card"></i> Fatturazione
                        </button>
                    </div>
                </div>
                
                <div class="sidebar-stats mt-4">
                    <h6>Statistiche</h6>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-number">${stats.totalBookings}</div>
                            <div class="stat-label">Prenotazioni</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.totalFavorites}</div>
                            <div class="stat-label">Preferiti</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.totalSpent}</div>
                            <div class="stat-label">Speso</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.memberSince}</div>
                            <div class="stat-label">Membro da</div>
                        </div>
                    </div>
                </div>

                <div class="sidebar-quick-actions mt-4">
                    <h6>Azioni Rapide</h6>
                    <div class="quick-actions">
                        <button class="btn btn-sm btn-outline-primary w-100 mb-2" onclick="Navigation.showSection('spaces')">
                            <i class="fas fa-plus"></i> Nuova Prenotazione
                        </button>
                        <button class="btn btn-sm btn-outline-success w-100 mb-2" onclick="User.exportUserData()">
                            <i class="fas fa-download"></i> Esporta Dati
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // ==================== SEZIONI PROFILO ====================
    buildProfileOverview() {
        return `
            <div class="profile-overview">
                <div class="section-header">
                    <h3>Informazioni Personali</h3>
                    ${this.state.editMode ? '<p class="text-muted">Modifica le tue informazioni personali</p>' : ''}
                </div>
                
                ${this.state.editMode ? this.buildEditForm() : this.buildInfoDisplay()}
                
                <div class="recent-activity mt-5">
                    <h4>Attività Recente</h4>
                    ${this.buildRecentActivity()}
                </div>
            </div>
        `;
    },

    buildInfoDisplay() {
        const user = this.state.currentUser;
        if (!user) return '<div class="text-center">Dati utente non disponibili</div>';

        return `
            <div class="info-display">
                <div class="row">
                    <div class="col-md-6">
                        <div class="info-group">
                            <label>Nome</label>
                            <div class="info-value">${user.firstName || 'Non specificato'}</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="info-group">
                            <label>Cognome</label>
                            <div class="info-value">${user.lastName || 'Non specificato'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="info-group">
                            <label>Email</label>
                            <div class="info-value">
                                ${user.email}
                                ${user.verified ? '<i class="fas fa-check-circle text-success ms-2" title="Email verificata"></i>' : '<i class="fas fa-exclamation-triangle text-warning ms-2" title="Email non verificata"></i>'}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="info-group">
                            <label>Telefono</label>
                            <div class="info-value">${user.phone || 'Non specificato'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="info-group">
                            <label>Azienda</label>
                            <div class="info-value">${user.company || 'Non specificata'}</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="info-group">
                            <label>Posizione</label>
                            <div class="info-value">${user.position || 'Non specificata'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="info-group">
                            <label>Membro dal</label>
                            <div class="info-value">${this.formatDate(user.createdAt)}</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="info-group">
                            <label>Ultimo accesso</label>
                            <div class="info-value">${this.formatDate(user.lastLogin || new Date())}</div>
                        </div>
                    </div>
                </div>
                
                ${user.bio ? `
                    <div class="info-group">
                        <label>Bio</label>
                        <div class="info-value bio-text">${user.bio}</div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    buildEditForm() {
        const user = this.state.currentUser;
        if (!user) return '<div class="text-center">Errore nel caricamento dati utente</div>';

        return `
            <form id="profile-edit-form" class="edit-form">
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="firstName" class="form-label">Nome *</label>
                            <input type="text" class="form-control" id="firstName" name="firstName" 
                                   value="${user.firstName || ''}" required maxlength="50">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="lastName" class="form-label">Cognome *</label>
                            <input type="text" class="form-control" id="lastName" name="lastName" 
                                   value="${user.lastName || ''}" required maxlength="50">
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="email" class="form-label">Email *</label>
                            <input type="email" class="form-control" id="email" name="email" 
                                   value="${user.email}" required readonly>
                            <small class="form-text text-muted">
                                <i class="fas fa-info-circle"></i> Per cambiare email, contatta il supporto
                            </small>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="phone" class="form-label">Telefono</label>
                            <input type="tel" class="form-control" id="phone" name="phone" 
                                   value="${user.phone || ''}" pattern="[+]?[0-9\\s\\-()]{8,20}">
                            <small class="form-text text-muted">Formato: +39 123 456 7890</small>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="company" class="form-label">Azienda</label>
                            <input type="text" class="form-control" id="company" name="company" 
                                   value="${user.company || ''}" maxlength="100">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="position" class="form-label">Posizione</label>
                            <input type="text" class="form-control" id="position" name="position" 
                                   value="${user.position || ''}" maxlength="100">
                        </div>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label for="bio" class="form-label">Bio</label>
                    <textarea class="form-control" id="bio" name="bio" rows="4" 
                              maxlength="500" placeholder="Racconta qualcosa di te...">${user.bio || ''}</textarea>
                    <small class="form-text text-muted">
                        <span id="bio-counter">0</span>/500 caratteri
                    </small>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary" id="save-profile-btn">
                        <i class="fas fa-save"></i> Salva Modifiche
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="User.toggleEditMode()">
                        <i class="fas fa-times"></i> Annulla
                    </button>
                </div>
            </form>
        `;
    },

    buildRecentActivity() {
        const recentBookings = this.state.userBookings
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        if (recentBookings.length === 0) {
            return `
                <div class="empty-activity">
                    <div class="empty-state">
                        <i class="fas fa-history fa-2x text-muted"></i>
                        <h5 class="mt-3">Nessuna attività recente</h5>
                        <p class="text-muted">Le tue prenotazioni appariranno qui</p>
                        <button class="btn btn-primary mt-2" onclick="Navigation.showSection('spaces')">
                            <i class="fas fa-plus"></i> Prima Prenotazione
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="activity-list">
                ${recentBookings.map(booking => `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fas fa-calendar-${this.getActivityIcon(booking.status)} text-${this.getStatusColor(booking.status)}"></i>
                        </div>
                        <div class="activity-content">
                            <div class="activity-title">${booking.spaceName}</div>
                            <div class="activity-subtitle">
                                ${this.formatDate(booking.date)} • ${booking.startTime} - ${booking.endTime}
                            </div>
                            <div class="activity-meta">
                                <small class="text-muted">${this.formatDate(booking.createdAt, true)}</small>
                            </div>
                        </div>
                        <div class="activity-status">
                            <span class="badge bg-${this.getStatusColor(booking.status)}">
                                ${this.getBookingStatusText(booking.status)}
                            </span>
                        </div>
                    </div>
                `).join('')}
                
                <div class="activity-footer">
                    <button class="btn btn-outline-primary btn-sm" onclick="User.showProfileSection('bookings')">
                        <i class="fas fa-eye"></i> Visualizza Tutte
                    </button>
                </div>
            </div>
        `;
    },

    // ==================== SEZIONE PRENOTAZIONI ====================
    buildBookingsSection() {
        return `
            <div class="profile-bookings">
                <div class="section-header">
                    <h3>Le Mie Prenotazioni</h3>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="Navigation.showSection('spaces')">
                            <i class="fas fa-plus"></i> Nuova Prenotazione
                        </button>
                    </div>
                </div>
                
                <div class="bookings-filters mb-4">
                    <div class="row">
                        <div class="col-md-3">
                            <select class="form-select" id="booking-status-filter" onchange="User.filterBookings()">
                                <option value="">Tutti gli stati</option>
                                <option value="confirmed">Confermate</option>
                                <option value="pending">In attesa</option>
                                <option value="cancelled">Cancellate</option>
                                <option value="completed">Completate</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" id="booking-date-filter" onchange="User.filterBookings()">
                                <option value="">Tutte le date</option>
                                <option value="upcoming">Prossime</option>
                                <option value="past">Passate</option>
                                <option value="today">Oggi</option>
                                <option value="this-week">Questa settimana</option>
                                <option value="this-month">Questo mese</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <input type="text" class="form-control" id="booking-search" 
                                   placeholder="Cerca per nome spazio..." 
                                   onkeyup="User.searchBookings(this.value)">
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-outline-secondary w-100" onclick="User.exportBookings()">
                                <i class="fas fa-download"></i> Esporta
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="bookings-grid" id="user-bookings-grid">
                    ${this.buildUserBookingsGrid()}
                </div>
            </div>
        `;
    },

    buildUserBookingsGrid() {
        if (this.state.userBookings.length === 0) {
            return `
                <div class="no-bookings">
                    <div class="empty-state">
                        <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                        <h4>Nessuna prenotazione</h4>
                        <p class="text-muted">Non hai ancora effettuato prenotazioni</p>
                        <button class="btn btn-primary" onclick="Navigation.showSection('spaces')">
                            <i class="fas fa-search"></i> Esplora Spazi
                        </button>
                    </div>
                </div>
            `;
        }

        return this.state.userBookings.map(booking => this.buildBookingCard(booking)).join('');
    },

    buildBookingCard(booking) {
        const statusClass = this.getStatusColor(booking.status);
        const statusText = this.getBookingStatusText(booking.status);
        const canCancel = this.canCancelBooking(booking);
        const isUpcoming = this.isUpcomingBooking(booking);

        return `
            <div class="booking-card border-start border-${statusClass} border-3">
                <div class="booking-card-header">
                    <div class="booking-space-info">
                        <h5 class="booking-space-name">${booking.spaceName}</h5>
                        <p class="booking-space-address text-muted">
                            <i class="fas fa-map-marker-alt"></i> ${booking.spaceAddress}
                        </p>
                    </div>
                    <div class="booking-status">
                        <span class="status-badge badge bg-${statusClass}">${statusText}</span>
                        ${isUpcoming ? '<span class="upcoming-badge badge bg-info">Prossima</span>' : ''}
                    </div>
                </div>
                
                <div class="booking-card-body">
                    <div class="booking-details">
                        <div class="detail-row">
                            <div class="detail-item">
                                <i class="fas fa-calendar text-primary"></i>
                                <span>${this.formatDate(booking.date)}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-clock text-primary"></i>
                                <span>${booking.startTime} - ${booking.endTime}</span>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-item">
                                <i class="fas fa-stopwatch text-primary"></i>
                                <span>${booking.duration} ${booking.duration === 1 ? 'ora' : 'ore'}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-euro-sign text-primary"></i>
                                <span>${this.formatCurrency(booking.totalPrice)}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${booking.notes ? `
                        <div class="booking-notes mt-2">
                            <small class="text-muted">
                                <i class="fas fa-comment"></i> ${booking.notes}
                            </small>
                        </div>
                    ` : ''}
                </div>
                
                <div class="booking-card-footer">
                    <div class="booking-actions">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="User.showBookingDetail('${booking.id}')">
                            <i class="fas fa-eye"></i> Dettagli
                        </button>
                        
                        ${booking.status === 'confirmed' ? `
                            <button class="btn btn-sm btn-outline-info" 
                                    onclick="User.downloadBookingPDF('${booking.id}')">
                                <i class="fas fa-download"></i> PDF
                            </button>
                        ` : ''}
                        
                        ${canCancel ? `
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="User.cancelBooking('${booking.id}')">
                                <i class="fas fa-times"></i> Cancella
                            </button>
                        ` : ''}
                        
                        ${booking.status === 'completed' && !booking.reviewed ? `
                            <button class="btn btn-sm btn-outline-warning" 
                                    onclick="User.showReviewModal('${booking.id}')">
                                <i class="fas fa-star"></i> Recensisci
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="booking-meta">
                        <small class="text-muted">
                            <i class="fas fa-calendar-plus"></i> Prenotata il ${this.formatDate(booking.createdAt, true)}
                        </small>
                    </div>
                </div>
            </div>
        `;
    },

    // ==================== UTILITY METHODS ====================
    formatUserName(user) {
        if (!user) return 'Nome non disponibile';
        return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Nome non specificato';
    },

    formatDate(dateString, includeTime = false) {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Data non valida';

            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                ...(includeTime && { hour: '2-digit', minute: '2-digit' })
            };

            return new Intl.DateTimeFormat('it-IT', options).format(date);
        } catch (error) {
            return 'Data non valida';
        }
    },

    formatCurrency(amount) {
        if (typeof amount !== 'number') return '€0,00';

        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    },

    getUserLevel(user) {
        const bookingCount = this.state.userBookings.length;
        const totalSpent = this.calculateTotalSpent(true);

        if (bookingCount >= 50 || totalSpent >= 2000) return 'Premium';
        if (bookingCount >= 20 || totalSpent >= 1000) return 'Gold';
        if (bookingCount >= 5 || totalSpent >= 300) return 'Silver';
        return 'Base';
    },

    calculateUserStats() {
        const totalSpent = this.calculateTotalSpent(true);
        const memberSince = this.state.currentUser?.createdAt ?
            this.getMembershipDuration(this.state.currentUser.createdAt) : 'N/A';

        return {
            totalBookings: this.state.userBookings.length,
            totalFavorites: this.state.favorites.length,
            totalSpent: this.formatCurrency(totalSpent),
            memberSince: memberSince
        };
    },

    calculateTotalSpent(returnNumber = false) {
        const total = this.state.userBookings
            .filter(booking => ['completed', 'confirmed'].includes(booking.status))
            .reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);

        return returnNumber ? total : this.formatCurrency(total);
    },

    getBookingStatusText(status) {
        const statusMap = {
            'confirmed': 'Confermata',
            'pending': 'In attesa',
            'cancelled': 'Cancellata',
            'completed': 'Completata'
        };
        return statusMap[status] || status;
    },

    getStatusColor(status) {
        const colorMap = {
            'confirmed': 'success',
            'pending': 'warning',
            'cancelled': 'danger',
            'completed': 'primary'
        };
        return colorMap[status] || 'secondary';
    },

    getActivityIcon(status) {
        const iconMap = {
            'confirmed': 'check',
            'pending': 'clock',
            'cancelled': 'times',
            'completed': 'check-circle'
        };
        return iconMap[status] || 'calendar';
    },

    getMembershipDuration(createdAt) {
        if (!createdAt) return 'N/A';

        const created = new Date(createdAt);
        const now = new Date();
        const diffInMonths = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());

        if (diffInMonths < 1) return 'Questo mese';
        if (diffInMonths < 12) return `${diffInMonths} mesi`;

        const years = Math.floor(diffInMonths / 12);
        const remainingMonths = diffInMonths % 12;

        if (remainingMonths === 0) return `${years} ${years === 1 ? 'anno' : 'anni'}`;
        return `${years} ${years === 1 ? 'anno' : 'anni'} e ${remainingMonths} mesi`;
    },

    canCancelBooking(booking) {
        if (!booking || booking.status !== 'confirmed') return false;

        try {
            const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
            const now = new Date();
            const hoursDiff = (bookingDateTime - now) / (1000 * 60 * 60);

            return hoursDiff > 2; // Cancellabile fino a 2 ore prima
        } catch (error) {
            return false;
        }
    },

    isUpcomingBooking(booking) {
        if (!booking) return false;

        try {
            const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
            const now = new Date();
            const daysDiff = (bookingDateTime - now) / (1000 * 60 * 60 * 24);

            return daysDiff >= 0 && daysDiff <= 7; // Prossimi 7 giorni
        } catch (error) {
            return false;
        }
    },

    // ==================== AZIONI PRINCIPALI ====================
    showProfileSection(section) {
        // Aggiorna navigazione sidebar
        document.querySelectorAll('.sidebar-navigation .nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Mostra contenuto sezione
        const container = document.getElementById('profile-main-content');
        if (!container) return;

        let content = '';
        switch (section) {
            case 'overview':
                content = this.buildProfileOverview();
                break;
            case 'bookings':
                content = this.buildBookingsSection();
                break;
            case 'favorites':
                content = this.buildFavoritesSection();
                break;
            case 'settings':
                content = this.buildSettingsSection();
                break;
            case 'security':
                content = this.buildSecuritySection();
                break;
            case 'billing':
                content = this.buildBillingSection();
                break;
            default:
                content = this.buildProfileOverview();
        }

        container.innerHTML = content;
        this.attachSectionEvents(section);
    },

    toggleEditMode() {
        this.state.editMode = !this.state.editMode;
        this.showProfileSection('overview');
    },

    // ==================== UTILITY UI ====================
    showNotification(message, type = 'info') {
        if (window.Components && window.Components.showNotification) {
            window.Components.showNotification({ message, type });
        } else {
            // Fallback per notifica semplice
            alert(message);
        }
    },

    updateProfileUI() {
        // Aggiorna elementi UI che mostrano info utente
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');

        if (this.state.currentUser) {
            userNameElements.forEach(el => {
                el.textContent = this.formatUserName(this.state.currentUser);
            });

            userEmailElements.forEach(el => {
                el.textContent = this.state.currentUser.email;
            });
        }
    },

    showLoginPrompt(container) {
        container.innerHTML = `
            <div class="login-prompt">
                <div class="text-center py-5">
                    <i class="fas fa-user-circle fa-4x text-muted mb-4"></i>
                    <h3>Accesso Richiesto</h3>
                    <p class="text-muted">Effettua l'accesso per visualizzare il tuo profilo</p>
                    <button class="btn btn-primary" onclick="window.Auth.showLoginModal()">
                        <i class="fas fa-sign-in-alt"></i> Accedi
                    </button>
                </div>
            </div>
        `;
    },

    // ==================== SEZIONI AGGIUNTIVE (PLACEHOLDER) ====================
    buildFavoritesSection() {
        return `
            <div class="profile-favorites">
                <div class="section-header">
                    <h3>Spazi Preferiti</h3>
                    <p class="text-muted">I tuoi spazi salvati per prenotazioni future</p>
                </div>
                
                <div class="favorites-grid" id="user-favorites-grid">
                    <div class="no-favorites">
                        <div class="empty-state">
                            <i class="fas fa-heart-broken fa-3x text-muted mb-3"></i>
                            <h4>Nessun preferito</h4>
                            <p class="text-muted">Non hai ancora salvato spazi preferiti</p>
                            <button class="btn btn-primary" onclick="Navigation.showSection('spaces')">
                                <i class="fas fa-search"></i> Esplora Spazi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    buildSettingsSection() {
        return `
            <div class="profile-settings">
                <div class="section-header">
                    <h3>Impostazioni Account</h3>
                    <p class="text-muted">Personalizza la tua esperienza CoWorkSpace</p>
                </div>
                
                <div class="settings-content">
                    <p class="text-muted">Sezione impostazioni in sviluppo...</p>
                </div>
            </div>
        `;
    },

    buildSecuritySection() {
        return `
            <div class="profile-security">
                <div class="section-header">
                    <h3>Sicurezza Account</h3>
                    <p class="text-muted">Gestisci password e sicurezza del tuo account</p>
                </div>
                
                <div class="security-content">
                    <p class="text-muted">Sezione sicurezza in sviluppo...</p>
                </div>
            </div>
        `;
    },

    buildBillingSection() {
        return `
            <div class="profile-billing">
                <div class="section-header">
                    <h3>Fatturazione e Pagamenti</h3>
                    <p class="text-muted">Gestisci i tuoi metodi di pagamento e visualizza la cronologia</p>
                </div>

                <div class="billing-content">
                    <p class="text-muted">Sezione fatturazione in sviluppo...</p>
                </div>
            </div>
        `;
    },

    // ==================== FILTRI E RICERCA ====================
    filterBookings() {
        const statusFilter = document.getElementById('booking-status-filter')?.value || '';
        const dateFilter = document.getElementById('booking-date-filter')?.value || '';
        const searchTerm = document.getElementById('booking-search')?.value.toLowerCase() || '';

        let filteredBookings = [...this.state.userBookings];

        // Filtro per stato
        if (statusFilter) {
            filteredBookings = filteredBookings.filter(booking => booking.status === statusFilter);
        }

        // Filtro per data
        if (dateFilter) {
            const now = new Date();
            filteredBookings = filteredBookings.filter(booking => {
                const bookingDate = new Date(booking.date);

                switch (dateFilter) {
                    case 'upcoming':
                        return bookingDate >= now;
                    case 'past':
                        return bookingDate < now;
                    case 'today':
                        return bookingDate.toDateString() === now.toDateString();
                    case 'this-week':
                        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                        const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
                        return bookingDate >= weekStart && bookingDate <= weekEnd;
                    case 'this-month':
                        return bookingDate.getMonth() === now.getMonth() &&
                            bookingDate.getFullYear() === now.getFullYear();
                    default:
                        return true;
                }
            });
        }

        // Filtro per ricerca
        if (searchTerm) {
            filteredBookings = filteredBookings.filter(booking =>
                booking.spaceName.toLowerCase().includes(searchTerm) ||
                booking.spaceAddress.toLowerCase().includes(searchTerm)
            );
        }

        // Aggiorna UI con risultati filtrati
        this.updateBookingsGrid(filteredBookings);
    },

    searchBookings(searchTerm) {
        // Implementa ricerca in tempo reale
        this.filterBookings();
    },

    updateBookingsGrid(bookings) {
        const container = document.getElementById('user-bookings-grid');
        if (!container) return;

        if (bookings.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <div class="empty-state">
                        <i class="fas fa-search fa-2x text-muted mb-3"></i>
                        <h5>Nessun risultato</h5>
                        <p class="text-muted">Modifica i filtri per vedere più risultati</p>
                        <button class="btn btn-outline-primary" onclick="User.clearFilters()">
                            <i class="fas fa-times"></i> Cancella Filtri
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = bookings.map(booking => this.buildBookingCard(booking)).join('');
        }
    },

    clearFilters() {
        // Resetta tutti i filtri
        const statusFilter = document.getElementById('booking-status-filter');
        const dateFilter = document.getElementById('booking-date-filter');
        const searchInput = document.getElementById('booking-search');

        if (statusFilter) statusFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        if (searchInput) searchInput.value = '';

        // Ricarica tutte le prenotazioni
        this.updateBookingsGrid(this.state.userBookings);
    },

    // ==================== AZIONI UTENTE (PLACEHOLDER) ====================
    async showBookingDetail(bookingId) {
        console.log('Show booking detail:', bookingId);
        this.showNotification('Funzione in sviluppo', 'info');
    },

    async downloadBookingPDF(bookingId) {
        console.log('Download PDF for booking:', bookingId);
        this.showNotification('Download PDF iniziato...', 'info');
    },

    async showReviewModal(bookingId) {
        console.log('Show review modal for booking:', bookingId);
        this.showNotification('Funzione recensioni in sviluppo', 'info');
    },

    async cancelBooking(bookingId) {
        if (!confirm('Sei sicuro di voler cancellare questa prenotazione?')) {
            return;
        }
        console.log('Cancel booking:', bookingId);
        this.showNotification('Cancellazione in corso...', 'info');
    },

    async exportBookings() {
        console.log('Export bookings');
        this.showNotification('Export in sviluppo...', 'info');
    },

    async exportUserData() {
        console.log('Export user data');
        this.showNotification('Export dati in sviluppo...', 'info');
    },

    async showAvatarUpload() {
        console.log('Show avatar upload');
        this.showNotification('Upload avatar in sviluppo...', 'info');
    },

    // ==================== GESTIONE DATI LOCALI ====================
    saveUserSettings() {
        try {
            localStorage.setItem('coworkspace_user_settings', JSON.stringify(this.state.settings));
        } catch (error) {
            console.error('Error saving user settings:', error);
        }
    },

    loadUserSettings() {
        try {
            const saved = localStorage.getItem('coworkspace_user_settings');
            if (saved) {
                this.state.settings = { ...this.state.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Error loading user settings:', error);
        }
    },

    clearUserData() {
        this.state.currentUser = null;
        this.state.userBookings = [];
        this.state.favorites = [];
        this.state.editMode = false;
        this.state.isLoading = false;
    },

    // ==================== EVENTI ====================
    setupEventListeners() {
        // Form submission per profilo
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'profile-edit-form') {
                e.preventDefault();
                console.log('Profile form submitted');
                this.showNotification('Salvataggio in sviluppo...', 'info');
            }
        });
    },

    attachProfileEvents() {
        console.log('📎 Attaching profile events...');
    },

    attachSectionEvents(section) {
        console.log(`📎 Attaching events for section: ${section}`);
    },

    // ==================== MOCK DATA ====================
    loadMockUserData() {
        console.log('📊 Loading mock user data...');

        this.state.currentUser = {
            id: 'user_' + Date.now(),
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario.rossi@example.com',
            phone: '+39 123 456 7890',
            company: 'Tech Solutions SRL',
            position: 'Full Stack Developer',
            bio: 'Sviluppatore web appassionato di tecnologie moderne e metodologie agili.',
            avatar: null,
            verified: true,
            twoFactorEnabled: false,
            role: 'user',
            lastLogin: new Date(Date.now() - 3600000).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 180).toISOString()
        };

        this.state.userBookings = [
            {
                id: 'BK001',
                spaceId: 'space_1',
                spaceName: 'Spazio Creativo Milano Centro',
                spaceAddress: 'Via Torino 40, Milano',
                date: '2025-08-20',
                startTime: '09:00',
                endTime: '17:00',
                duration: 8,
                totalPrice: 120.00,
                status: 'confirmed',
                notes: 'Prenotazione per sessione di lavoro intensiva',
                reviewed: false,
                createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
            },
            {
                id: 'BK002',
                spaceId: 'space_2',
                spaceName: 'Open Space Tech Hub',
                spaceAddress: 'Corso Buenos Aires 15, Milano',
                date: '2025-08-15',
                startTime: '14:00',
                endTime: '18:00',
                duration: 4,
                totalPrice: 60.00,
                status: 'completed',
                notes: 'Meeting con cliente importante',
                reviewed: true,
                createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
            }
        ];

        this.state.favorites = [];
    },

    async loadUserBookings() {
        try {
            console.log('📅 Loading user bookings...');
            console.log(`✅ Loaded ${this.state.userBookings.length} bookings`);
        } catch (error) {
            console.error('❌ Error loading user bookings:', error);
            this.showNotification('Errore nel caricamento delle prenotazioni', 'warning');
        }
    },
};

// ==================== AUTO-INIZIALIZZAZIONE ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.api && window.auth && window.Components) {
            window.User.init();
        } else {
            console.warn('⚠️ User module: Missing dependencies (api, Auth, Components)');
            // Retry dopo un breve delay
            setTimeout(() => {
                if (window.api && window.auth && window.Components) {
                    window.User.init();
                }
            }, 1000);
        }
    });
} else if (window.api && window.auth && window.Components) {
    window.User.init();
} else {
    console.warn('⚠️ User module: Missing dependencies, will retry...');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.User && window.User.init) {
            window.User.init();
        }
    });
} else {
    // Il DOM è già caricato
    if (window.User && window.User.init) {
        window.User.init();
    }
}