/**
 * CoWorkSpace - Dashboard Manager
 * Dashboard amministrativo per gestione sistema
 */

window.Dashboard = {
    /**
     * Stato del modulo
     */
    state: {
        initialized: false,
        loading: false,
        isAdmin: false,
        stats: {
            users: 0,
            spaces: 0,
            bookings: 0,
            revenue: 0
        },
        analytics: {
            daily: [],
            monthly: [],
            yearly: []
        }
    },

    /**
     * Configurazione
     */
    config: {
        endpoints: {
            stats: '/api/admin/stats',
            analytics: '/api/admin/analytics',
            users: '/api/admin/users',
            spaces: '/api/admin/spaces',
            bookings: '/api/admin/bookings',
            reports: '/api/admin/reports'
        },
        refreshInterval: 60000 // 1 minuto
    },

    /**
     * Inizializza il modulo
     */
    async init() {
        try {
            console.log('📊 Initializing Dashboard Manager...');

            // Verifica dipendenze
            if (!window.API || !window.Utils || !window.Auth) {
                throw new Error('Required dependencies not available');
            }

            // Verifica permessi admin
            if (!this.checkAdminPermissions()) {
                console.warn('User does not have admin permissions');
                return false;
            }

            this.state.isAdmin = true;

            // Setup event listeners
            this.setupEventListeners();

            // Carica dati iniziali
            await this.loadDashboardData();

            // Setup auto-refresh
            this.setupAutoRefresh();

            this.state.initialized = true;
            console.log('✅ Dashboard Manager initialized');

            return true;

        } catch (error) {
            console.error('❌ Failed to initialize Dashboard Manager:', error);
            return false;
        }
    },

    /**
     * Verifica permessi amministratore
     */
    checkAdminPermissions() {
        if (!window.Auth?.isAuthenticated()) {
            return false;
        }

        const user = window.Auth?.getCurrentUser();
        return user && (user.role === 'admin' || user.isAdmin === true);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listener per cambio auth
        document.addEventListener('auth:login', () => {
            if (this.checkAdminPermissions()) {
                this.loadDashboardData();
            }
        });

        document.addEventListener('auth:logout', () => {
            this.clearDashboardData();
        });

        // Listener per sezione dashboard
        document.addEventListener('navigation:sectionChanged', (e) => {
            if (e.detail.section === 'dashboard') {
                this.handleDashboardSection(e.detail.subsection);
            }
        });
    },

    /**
     * Carica dati dashboard
     */
    async loadDashboardData() {
        if (!this.state.isAdmin) return;

        try {
            this.state.loading = true;

            // Carica statistiche
            await this.loadStats();

            // Carica analytics
            await this.loadAnalytics();

            this.triggerEvent('dashboard:dataLoaded');

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            window.Utils?.notifications?.show('Errore nel caricamento dati dashboard', 'error');
        } finally {
            this.state.loading = false;
        }
    },

    /**
     * Carica statistiche
     */
    async loadStats() {
        try {
            const response = await window.API.get(this.config.endpoints.stats);

            if (response.success) {
                this.state.stats = { ...this.state.stats, ...response.data };
                this.triggerEvent('dashboard:statsLoaded');
            }

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    },

    /**
     * Carica analytics
     */
    async loadAnalytics() {
        try {
            const response = await window.API.get(this.config.endpoints.analytics);

            if (response.success) {
                this.state.analytics = { ...this.state.analytics, ...response.data };
                this.triggerEvent('dashboard:analyticsLoaded');
            }

        } catch (error) {
            console.error('Error loading dashboard analytics:', error);
        }
    },

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            if (this.state.isAdmin && !document.hidden) {
                this.loadStats();
            }
        }, this.config.refreshInterval);
    },

    /**
     * Gestisce sezione dashboard
     */
    handleDashboardSection(subsection = 'overview') {
        if (!this.state.isAdmin) {
            this.showAccessDenied();
            return;
        }

        const container = document.getElementById('content-container');
        if (!container) return;

        switch (subsection) {
            case 'overview':
                this.renderOverview(container);
                break;
            case 'users':
                this.renderUsersManagement(container);
                break;
            case 'spaces':
                this.renderSpacesManagement(container);
                break;
            case 'bookings':
                this.renderBookingsManagement(container);
                break;
            case 'analytics':
                this.renderAnalytics(container);
                break;
            case 'settings':
                this.renderSystemSettings(container);
                break;
            default:
                this.renderOverview(container);
        }
    },

    /**
     * Mostra accesso negato
     */
    showAccessDenied() {
        const container = document.getElementById('content-container');
        if (container) {
            container.innerHTML = `
                <div class="access-denied">
                    <div class="text-center">
                        <i class="fas fa-lock fa-3x text-warning mb-3"></i>
                        <h3>Accesso Negato</h3>
                        <p>Non hai i permessi necessari per accedere a questa sezione.</p>
                        <button class="btn btn-primary" onclick="Navigation.showSection('home')">
                            <i class="fas fa-home"></i> Torna alla Home
                        </button>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Renderizza overview dashboard
     */
    renderOverview(container) {
        const overviewHTML = `
            <div class="dashboard-overview">
                <div class="dashboard-header">
                    <h2><i class="fas fa-tachometer-alt"></i> Dashboard Amministratore</h2>
                    <p>Panoramica generale del sistema</p>
                    <div class="header-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="Dashboard.refreshData()">
                            <i class="fas fa-sync"></i> Aggiorna
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="Dashboard.exportReport()">
                            <i class="fas fa-download"></i> Esporta Report
                        </button>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="row">
                        <div class="col-md-3">
                            <div class="stat-card stat-users">
                                <div class="stat-icon">
                                    <i class="fas fa-users"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number">${this.state.stats.users || 0}</div>
                                    <div class="stat-label">Utenti Registrati</div>
                                    <div class="stat-change positive">+12% questo mese</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card stat-spaces">
                                <div class="stat-icon">
                                    <i class="fas fa-building"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number">${this.state.stats.spaces || 0}</div>
                                    <div class="stat-label">Spazi Attivi</div>
                                    <div class="stat-change positive">+5% questo mese</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card stat-bookings">
                                <div class="stat-icon">
                                    <i class="fas fa-calendar-check"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number">${this.state.stats.bookings || 0}</div>
                                    <div class="stat-label">Prenotazioni Totali</div>
                                    <div class="stat-change positive">+18% questo mese</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card stat-revenue">
                                <div class="stat-icon">
                                    <i class="fas fa-euro-sign"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-number">€${this.formatNumber(this.state.stats.revenue || 0)}</div>
                                    <div class="stat-label">Fatturato Mensile</div>
                                    <div class="stat-change positive">+25% questo mese</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-sections">
                    <div class="row">
                        <div class="col-md-8">
                            <div class="chart-section">
                                <div class="section-header">
                                    <h5>Prenotazioni negli Ultimi 30 Giorni</h5>
                                    <div class="chart-controls">
                                        <select class="form-select form-select-sm">
                                            <option>Ultimi 7 giorni</option>
                                            <option selected>Ultimi 30 giorni</option>
                                            <option>Ultimi 90 giorni</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="chart-container">
                                    <canvas id="bookings-chart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="quick-actions">
                                <h5>Azioni Rapide</h5>
                                <div class="action-buttons">
                                    <button class="btn btn-outline-primary btn-block" onclick="Navigation.showSection('dashboard', 'users')">
                                        <i class="fas fa-user-plus"></i> Gestisci Utenti
                                    </button>
                                    <button class="btn btn-outline-primary btn-block" onclick="Navigation.showSection('dashboard', 'spaces')">
                                        <i class="fas fa-plus-circle"></i> Aggiungi Spazio
                                    </button>
                                    <button class="btn btn-outline-primary btn-block" onclick="Navigation.showSection('dashboard', 'analytics')">
                                        <i class="fas fa-chart-line"></i> Visualizza Analytics
                                    </button>
                                    <button class="btn btn-outline-primary btn-block" onclick="Dashboard.showSystemStatus()">
                                        <i class="fas fa-server"></i> Stato Sistema
                                    </button>
                                </div>
                            </div>

                            <div class="recent-activity mt-4">
                                <h5>Attività Recenti</h5>
                                <div class="activity-list">
                                    <div class="activity-item">
                                        <i class="fas fa-user-plus text-success"></i>
                                        <div>
                                            <strong>Nuovo utente registrato</strong><br>
                                            <small class="text-muted">2 minuti fa</small>
                                        </div>
                                    </div>
                                    <div class="activity-item">
                                        <i class="fas fa-calendar-check text-primary"></i>
                                        <div>
                                            <strong>Nuova prenotazione</strong><br>
                                            <small class="text-muted">15 minuti fa</small>
                                        </div>
                                    </div>
                                    <div class="activity-item">
                                        <i class="fas fa-building text-warning"></i>
                                        <div>
                                            <strong>Spazio aggiornato</strong><br>
                                            <small class="text-muted">1 ora fa</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = overviewHTML;
        this.initializeCharts();
    },

    /**
     * Renderizza gestione utenti
     */
    renderUsersManagement(container) {
        const usersHTML = `
            <div class="users-management">
                <div class="section-header">
                    <h3><i class="fas fa-users"></i> Gestione Utenti</h3>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="Dashboard.showAddUserModal()">
                            <i class="fas fa-user-plus"></i> Aggiungi Utente
                        </button>
                        <button class="btn btn-outline-secondary" onclick="Dashboard.exportUsers()">
                            <i class="fas fa-download"></i> Esporta
                        </button>
                    </div>
                </div>

                <div class="users-filters mb-3">
                    <div class="row">
                        <div class="col-md-3">
                            <input type="text" class="form-control" placeholder="Cerca utenti..." id="users-search">
                        </div>
                        <div class="col-md-2">
                            <select class="form-select" id="users-role-filter">
                                <option value="">Tutti i ruoli</option>
                                <option value="user">Utente</option>
                                <option value="admin">Amministratore</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <select class="form-select" id="users-status-filter">
                                <option value="">Tutti gli stati</option>
                                <option value="active">Attivo</option>
                                <option value="suspended">Sospeso</option>
                                <option value="pending">In attesa</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="users-table">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Ruolo</th>
                                    <th>Stato</th>
                                    <th>Registrazione</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody id="users-table-body">
                                <tr>
                                    <td colspan="7" class="text-center">
                                        <i class="fas fa-spinner fa-spin"></i> Caricamento utenti...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="pagination-container">
                    <!-- Pagination will be inserted here -->
                </div>
            </div>
        `;

        container.innerHTML = usersHTML;
        this.loadUsersData();
        this.setupUsersListeners();
    },

    /**
     * Renderizza gestione spazi
     */
    renderSpacesManagement(container) {
        const spacesHTML = `
            <div class="spaces-management">
                <div class="section-header">
                    <h3><i class="fas fa-building"></i> Gestione Spazi</h3>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="Dashboard.showAddSpaceModal()">
                            <i class="fas fa-plus"></i> Aggiungi Spazio
                        </button>
                        <button class="btn btn-outline-secondary" onclick="Dashboard.exportSpaces()">
                            <i class="fas fa-download"></i> Esporta
                        </button>
                    </div>
                </div>

                <div class="spaces-stats mb-4">
                    <div class="row">
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-number">0</div>
                                <div class="stat-label">Spazi Totali</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-number">0</div>
                                <div class="stat-label">Spazi Attivi</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-number">0</div>
                                <div class="stat-label">In Revisione</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="stat-number">0%</div>
                                <div class="stat-label">Tasso Occupazione</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="spaces-grid" id="admin-spaces-grid">
                    <div class="text-center">
                        <i class="fas fa-spinner fa-spin"></i> Caricamento spazi...
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = spacesHTML;
        this.loadSpacesData();
    },

    /**
     * Renderizza gestione prenotazioni
     */
    renderBookingsManagement(container) {
        const bookingsHTML = `
            <div class="bookings-management">
                <div class="section-header">
                    <h3><i class="fas fa-calendar-alt"></i> Gestione Prenotazioni</h3>
                    <div class="header-actions">
                        <button class="btn btn-outline-secondary" onclick="Dashboard.exportBookings()">
                            <i class="fas fa-download"></i> Esporta
                        </button>
                    </div>
                </div>

                <div class="bookings-filters mb-3">
                    <div class="row">
                        <div class="col-md-2">
                            <select class="form-select" id="booking-status-filter">
                                <option value="">Tutti gli stati</option>
                                <option value="confirmed">Confermate</option>
                                <option value="pending">In attesa</option>
                                <option value="cancelled">Cancellate</option>
                                <option value="completed">Completate</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <input type="date" class="form-control" id="booking-date-from" placeholder="Data da">
                        </div>
                        <div class="col-md-3">
                            <input type="date" class="form-control" id="booking-date-to" placeholder="Data a">
                        </div>
                        <div class="col-md-3">
                            <input type="text" class="form-control" id="booking-search" placeholder="Cerca...">
                        </div>
                        <div class="col-md-1">
                            <button class="btn btn-primary" onclick="Dashboard.filterBookings()">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="bookings-table">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Utente</th>
                                    <th>Spazio</th>
                                    <th>Data</th>
                                    <th>Orario</th>
                                    <th>Stato</th>
                                    <th>Importo</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody id="bookings-table-body">
                                <tr>
                                    <td colspan="8" class="text-center">
                                        <i class="fas fa-spinner fa-spin"></i> Caricamento prenotazioni...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = bookingsHTML;
        this.loadBookingsData();
        this.setupBookingsListeners();
    },

    /**
     * Renderizza analytics
     */
    renderAnalytics(container) {
        const analyticsHTML = `
            <div class="analytics-dashboard">
                <div class="section-header">
                    <h3><i class="fas fa-chart-line"></i> Analytics</h3>
                    <div class="header-actions">
                        <select class="form-select form-select-sm" id="analytics-period">
                            <option value="7">Ultimi 7 giorni</option>
                            <option value="30" selected>Ultimi 30 giorni</option>
                            <option value="90">Ultimi 90 giorni</option>
                            <option value="365">Ultimo anno</option>
                        </select>
                    </div>
                </div>

                <div class="analytics-charts">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="chart-card">
                                <h5>Prenotazioni nel Tempo</h5>
                                <canvas id="bookings-trend-chart"></canvas>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="chart-card">
                                <h5>Fatturato nel Tempo</h5>
                                <canvas id="revenue-chart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-4">
                        <div class="col-md-6">
                            <div class="chart-card">
                                <h5>Spazi Più Popolari</h5>
                                <canvas id="popular-spaces-chart"></canvas>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="chart-card">
                                <h5>Distribuzione Utenti</h5>
                                <canvas id="users-distribution-chart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = analyticsHTML;
        this.initializeAnalyticsCharts();
        this.setupAnalyticsListeners();
    },

    /**
     * Carica dati utenti
     */
    async loadUsersData() {
        try {
            const response = await window.API.get(this.config.endpoints.users);

            if (response.success) {
                this.renderUsersTable(response.data);
            }

        } catch (error) {
            console.error('Error loading users data:', error);
            document.getElementById('users-table-body').innerHTML = `
                <tr><td colspan="7" class="text-center text-danger">Errore nel caricamento</td></tr>
            `;
        }
    },

    /**
     * Renderizza tabella utenti
     */
    renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" class="text-center">Nessun utente trovato</td></tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-${user.role === 'admin' ? 'danger' : 'primary'}">${user.role}</span></td>
                <td><span class="badge bg-${this.getStatusColor(user.status)}">${user.status}</span></td>
                <td>${Utils.formatDate(user.createdAt)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="Dashboard.editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="Dashboard.toggleUserStatus('${user.id}')">
                            <i class="fas fa-ban"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="Dashboard.deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    /**
     * Setup listeners utenti
     */
    setupUsersListeners() {
        // Search
        const searchInput = document.getElementById('users-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => {
                this.filterUsers();
            }, 300));
        }

        // Filters
        ['users-role-filter', 'users-status-filter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.filterUsers();
                });
            }
        });
    },

    /**
     * Setup listeners prenotazioni
     */
    setupBookingsListeners() {
        // Date filters
        ['booking-date-from', 'booking-date-to'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.filterBookings();
                });
            }
        });

        // Status filter
        const statusFilter = document.getElementById('booking-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterBookings();
            });
        }
    },

    /**
     * Setup listeners analytics
     */
    setupAnalyticsListeners() {
        const periodSelect = document.getElementById('analytics-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', () => {
                this.updateAnalyticsPeriod(periodSelect.value);
            });
        }
    },

    /**
     * Inizializza grafici
     */
    initializeCharts() {
        // Implementa inizializzazione grafici con Chart.js o simile
        // Placeholder per ora
        console.log('Initializing charts...');
    },

    /**
     * Inizializza grafici analytics
     */
    initializeAnalyticsCharts() {
        // Implementa grafici analytics
        console.log('Initializing analytics charts...');
    },

    /**
     * Filtra utenti
     */
    filterUsers() {
        // Implementa filtro utenti
        console.log('Filtering users...');
    },

    /**
     * Filtra prenotazioni
     */
    filterBookings() {
        // Implementa filtro prenotazioni
        console.log('Filtering bookings...');
    },

    /**
     * Refresh dati
     */
    async refreshData() {
        await this.loadDashboardData();
        window.Utils?.notifications?.show('Dati aggiornati', 'success');
    },

    /**
     * Ottieni colore status
     */
    getStatusColor(status) {
        const colors = {
            active: 'success',
            suspended: 'warning',
            pending: 'secondary',
            deleted: 'danger'
        };
        return colors[status] || 'secondary';
    },

    /**
     * Formatta numero
     */
    formatNumber(num) {
        return new Intl.NumberFormat('it-IT').format(num);
    },

    /**
     * Pulisci dati dashboard
     */
    clearDashboardData() {
        this.state.stats = { users: 0, spaces: 0, bookings: 0, revenue: 0 };
        this.state.analytics = { daily: [], monthly: [], yearly: [] };
        this.state.isAdmin = false;
    },

    /**
     * Trigger evento custom
     */
    triggerEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...data, dashboard: this }
        });
        document.dispatchEvent(event);
    }
};

// Auto-inizializzazione se DOM pronto e dipendenze disponibili
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.API && window.Utils && window.Auth) {
            window.Dashboard.init();
        }
    });
} else if (window.API && window.Utils && window.Auth) {
    window.Dashboard.init();
}