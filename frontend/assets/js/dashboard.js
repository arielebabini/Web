/**
 * CoWorkSpace - Dashboard Amministrativa
 * Gestisce pannello admin, analytics, utenti e spazi
 */

window.Dashboard = {
    // ==================== STATO INTERNO ====================
    state: {
        isAdmin: false,
        stats: {
            users: 0,
            spaces: 0,
            bookings: 0,
            revenue: 0,
            growth: {
                users: 0,
                bookings: 0,
                revenue: 0
            }
        },
        analytics: {
            daily: [],
            weekly: [],
            monthly: []
        },
        users: [],
        spaces: [],
        bookings: [],
        currentView: 'overview',
        filters: {
            dateRange: 'month',
            status: 'all',
            search: ''
        },
        isLoading: false,
        charts: new Map()
    },

    // ==================== INIZIALIZZAZIONE ====================
    async init() {
        console.log('📊 Dashboard module initializing...');

        this.setupEventListeners();

        // Verifica permessi admin
        await this.checkAdminPermissions();

        // Listener per cambio sezione
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.section === 'dashboard') {
                this.handleDashboardSection();
            }
        });

        console.log('✅ Dashboard module initialized');
    },

    // ==================== VERIFICA PERMESSI ====================
    async checkAdminPermissions() {
        try {
            if (!window.Auth.isAuthenticated()) {
                this.state.isAdmin = false;
                return;
            }

            const user = window.Auth.getCurrentUser();

            // Verifica ruolo admin
            if (user && (user.role === 'admin' || user.role === 'super_admin')) {
                this.state.isAdmin = true;
                console.log('✅ Admin permissions confirmed');
            } else {
                this.state.isAdmin = false;
                console.log('❌ Admin permissions denied');
            }
        } catch (error) {
            console.error('❌ Error checking admin permissions:', error);
            this.state.isAdmin = false;
        }
    },

    // ==================== GESTIONE SEZIONE DASHBOARD ====================
    async handleDashboardSection() {
        const container = document.getElementById('dashboard-container');
        if (!container) return;

        if (!window.Auth.isAuthenticated()) {
            this.showLoginPrompt(container);
            return;
        }

        if (!this.state.isAdmin) {
            this.showAccessDenied(container);
            return;
        }

        await this.loadDashboardData();
        this.renderDashboard(container);
    },

    showLoginPrompt(container) {
        container.innerHTML = `
            <div class="dashboard-login-prompt">
                <div class="text-center">
                    <i class="fas fa-sign-in-alt fa-3x text-muted mb-3"></i>
                    <h3>Accesso Richiesto</h3>
                    <p class="text-muted">Effettua il login per accedere alla dashboard</p>
                    <button class="btn btn-primary" onclick="Auth.showLoginModal()">
                        <i class="fas fa-sign-in-alt"></i> Accedi
                    </button>
                </div>
            </div>
        `;
    },

    showAccessDenied(container) {
        container.innerHTML = `
            <div class="dashboard-access-denied">
                <div class="text-center">
                    <i class="fas fa-ban fa-3x text-danger mb-3"></i>
                    <h3>Accesso Negato</h3>
                    <p class="text-muted">Non hai i permessi necessari per accedere alla dashboard amministrativa</p>
                    <button class="btn btn-outline-primary" onclick="Navigation.showSection('home')">
                        <i class="fas fa-home"></i> Torna alla Home
                    </button>
                </div>
            </div>
        `;
    },

    // ==================== CARICAMENTO DATI ====================
    async loadDashboardData() {
        if (this.state.isLoading) return;

        this.state.isLoading = true;

        try {
            console.log('📡 Loading dashboard data...');

            // Carica statistiche generali
            await this.loadGeneralStats();

            // Carica analytics
            await this.loadAnalytics();

            // Carica dati per gestione
            await this.loadManagementData();

            console.log('✅ Dashboard data loaded');
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.loadMockDashboardData();
        } finally {
            this.state.isLoading = false;
        }
    },

    async loadGeneralStats() {
        try {
            const response = await window.api.getDashboardAnalytics({
                dateRange: this.state.filters.dateRange
            });

            if (response.success) {
                this.state.stats = response.data.stats;
            }
        } catch (error) {
            console.error('❌ Error loading general stats:', error);
        }
    },

    async loadAnalytics() {
        try {
            const [revenue, bookings, users] = await Promise.all([
                window.api.getRevenueAnalytics({ range: this.state.filters.dateRange }),
                window.api.getBookingAnalytics({ range: this.state.filters.dateRange }),
                window.api.getUserAnalytics({ range: this.state.filters.dateRange })
            ]);

            this.state.analytics = {
                revenue: revenue.success ? revenue.data : [],
                bookings: bookings.success ? bookings.data : [],
                users: users.success ? users.data : []
            };
        } catch (error) {
            console.error('❌ Error loading analytics:', error);
        }
    },

    async loadManagementData() {
        try {
            const [usersResponse, spacesResponse, bookingsResponse] = await Promise.all([
                window.api.getUsers({ limit: 100 }),
                window.api.getSpaces({ limit: 100 }),
                window.api.getBookings({ limit: 100 })
            ]);

            this.state.users = usersResponse.success ? usersResponse.data.users : [];
            this.state.spaces = spacesResponse.success ? spacesResponse.data.spaces : [];
            this.state.bookings = bookingsResponse.success ? bookingsResponse.data.bookings : [];
        } catch (error) {
            console.error('❌ Error loading management data:', error);
        }
    },

    // ==================== RENDERING DASHBOARD ====================
    renderDashboard(container) {
        const dashboardHTML = `
            <div class="admin-dashboard">
                ${this.buildDashboardHeader()}
                
                <div class="dashboard-content">
                    <div class="dashboard-sidebar">
                        ${this.buildSidebar()}
                    </div>
                    
                    <div class="dashboard-main">
                        <div id="dashboard-main-content">
                            ${this.buildMainContent()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = dashboardHTML;
        this.attachDashboardEvents();
        this.initializeCharts();
    },

    buildDashboardHeader() {
        return `
            <div class="dashboard-header">
                <div class="container-fluid">
                    <div class="row align-items-center">
                        <div class="col">
                            <h1 class="dashboard-title">
                                <i class="fas fa-tachometer-alt"></i> Dashboard Amministrativa
                            </h1>
                            <p class="dashboard-subtitle">Panoramica generale del sistema</p>
                        </div>
                        <div class="col-auto">
                            <div class="dashboard-controls">
                                <select class="form-select form-select-sm" onchange="Dashboard.changeDateRange(this.value)">
                                    <option value="week" ${this.state.filters.dateRange === 'week' ? 'selected' : ''}>Ultima settimana</option>
                                    <option value="month" ${this.state.filters.dateRange === 'month' ? 'selected' : ''}>Ultimo mese</option>
                                    <option value="quarter" ${this.state.filters.dateRange === 'quarter' ? 'selected' : ''}>Ultimo trimestre</option>
                                    <option value="year" ${this.state.filters.dateRange === 'year' ? 'selected' : ''}>Ultimo anno</option>
                                </select>
                                <button class="btn btn-sm btn-outline-primary ms-2" onclick="Dashboard.refreshData()">
                                    <i class="fas fa-sync-alt"></i> Aggiorna
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    buildSidebar() {
        const menuItems = [
            { id: 'overview', icon: 'fas fa-chart-line', title: 'Panoramica', badge: null },
            { id: 'analytics', icon: 'fas fa-chart-bar', title: 'Analytics', badge: null },
            { id: 'users', icon: 'fas fa-users', title: 'Utenti', badge: this.state.users.length },
            { id: 'spaces', icon: 'fas fa-building', title: 'Spazi', badge: this.state.spaces.length },
            { id: 'bookings', icon: 'fas fa-calendar-alt', title: 'Prenotazioni', badge: this.state.bookings.length },
            { id: 'payments', icon: 'fas fa-credit-card', title: 'Pagamenti', badge: null },
            { id: 'reports', icon: 'fas fa-file-alt', title: 'Report', badge: null },
            { id: 'settings', icon: 'fas fa-cog', title: 'Impostazioni', badge: null }
        ];

        return `
            <div class="sidebar-menu">
                <nav class="nav nav-pills flex-column">
                    ${menuItems.map(item => `
                        <button class="nav-link ${this.state.currentView === item.id ? 'active' : ''}" 
                                data-view="${item.id}" onclick="Dashboard.switchView('${item.id}')">
                            <i class="${item.icon}"></i>
                            <span class="nav-text">${item.title}</span>
                            ${item.badge !== null ? `<span class="badge bg-primary">${item.badge}</span>` : ''}
                        </button>
                    `).join('')}
                </nav>
            </div>
        `;
    },

    buildMainContent() {
        switch (this.state.currentView) {
            case 'overview':
                return this.buildOverviewContent();
            case 'analytics':
                return this.buildAnalyticsContent();
            case 'users':
                return this.buildUsersContent();
            case 'spaces':
                return this.buildSpacesContent();
            case 'bookings':
                return this.buildBookingsContent();
            case 'payments':
                return this.buildPaymentsContent();
            case 'reports':
                return this.buildReportsContent();
            case 'settings':
                return this.buildSettingsContent();
            default:
                return this.buildOverviewContent();
        }
    },

    // ==================== CONTENUTO PANORAMICA ====================
    buildOverviewContent() {
        return `
            <div class="overview-content">
                <div class="stats-grid">
                    ${this.buildStatsCards()}
                </div>
                
                <div class="row mt-4">
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-chart-line"></i> Trend Prenotazioni</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="bookings-trend-chart" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-chart-pie"></i> Spazi Più Popolari</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="popular-spaces-chart" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-4">
                    <div class="col-lg-6">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-clock"></i> Prenotazioni Recenti</h5>
                            </div>
                            <div class="card-body">
                                ${this.buildRecentBookings()}
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-user-plus"></i> Nuovi Utenti</h5>
                            </div>
                            <div class="card-body">
                                ${this.buildNewUsers()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    buildStatsCards() {
        const stats = [
            {
                title: 'Utenti Totali',
                value: this.formatNumber(this.state.stats.users),
                icon: 'fas fa-users',
                color: 'primary',
                growth: this.state.stats.growth.users,
                subtitle: 'utenti registrati'
            },
            {
                title: 'Spazi Attivi',
                value: this.formatNumber(this.state.stats.spaces),
                icon: 'fas fa-building',
                color: 'success',
                growth: null,
                subtitle: 'spazi disponibili'
            },
            {
                title: 'Prenotazioni',
                value: this.formatNumber(this.state.stats.bookings),
                icon: 'fas fa-calendar-check',
                color: 'info',
                growth: this.state.stats.growth.bookings,
                subtitle: 'questo mese'
            },
            {
                title: 'Fatturato',
                value: window.Components.formatCurrency(this.state.stats.revenue),
                icon: 'fas fa-euro-sign',
                color: 'warning',
                growth: this.state.stats.growth.revenue,
                subtitle: 'questo mese'
            }
        ];

        return stats.map(stat => `
            <div class="stat-card stat-card-${stat.color}">
                <div class="stat-card-body">
                    <div class="stat-card-content">
                        <div class="stat-value">${stat.value}</div>
                        <div class="stat-title">${stat.title}</div>
                        <div class="stat-subtitle">${stat.subtitle}</div>
                    </div>
                    <div class="stat-card-icon">
                        <i class="${stat.icon}"></i>
                    </div>
                </div>
                ${stat.growth !== null ? `
                    <div class="stat-card-footer">
                        <span class="stat-growth ${stat.growth >= 0 ? 'positive' : 'negative'}">
                            <i class="fas fa-arrow-${stat.growth >= 0 ? 'up' : 'down'}"></i>
                            ${Math.abs(stat.growth)}%
                        </span>
                        <span class="stat-period">vs periodo precedente</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    },

    buildRecentBookings() {
        const recentBookings = this.state.bookings
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        if (recentBookings.length === 0) {
            return '<p class="text-muted">Nessuna prenotazione recente</p>';
        }

        return `
            <div class="recent-bookings-list">
                ${recentBookings.map(booking => `
                    <div class="recent-booking-item">
                        <div class="booking-avatar">
                            <img src="${booking.userAvatar || '/assets/images/default-avatar.png'}" 
                                 alt="${booking.userName}" class="avatar-sm">
                        </div>
                        <div class="booking-details">
                            <div class="booking-user">${booking.userName}</div>
                            <div class="booking-space">${booking.spaceName}</div>
                            <div class="booking-date">${window.Components.formatDate(booking.date)}</div>
                        </div>
                        <div class="booking-status">
                            <span class="badge ${this.getBookingStatusClass(booking.status)}">
                                ${this.getBookingStatusText(booking.status)}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    buildNewUsers() {
        const newUsers = this.state.users
            .filter(user => {
                const userDate = new Date(user.createdAt);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return userDate > weekAgo;
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        if (newUsers.length === 0) {
            return '<p class="text-muted">Nessun nuovo utente questa settimana</p>';
        }

        return `
            <div class="new-users-list">
                ${newUsers.map(user => `
                    <div class="new-user-item">
                        <div class="user-avatar">
                            <img src="${user.avatar || '/assets/images/default-avatar.png'}" 
                                 alt="${user.firstName} ${user.lastName}" class="avatar-sm">
                        </div>
                        <div class="user-details">
                            <div class="user-name">${user.firstName} ${user.lastName}</div>
                            <div class="user-email">${user.email}</div>
                            <div class="user-date">${window.Components.formatDate(user.createdAt)}</div>
                        </div>
                        <div class="user-actions">
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="Dashboard.viewUserDetail('${user.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ==================== CONTENUTO ANALYTICS ====================
    buildAnalyticsContent() {
        return `
            <div class="analytics-content">
                <div class="analytics-header">
                    <h3>Analytics Avanzate</h3>
                    <div class="analytics-controls">
                        <div class="btn-group" role="group">
                            <input type="radio" class="btn-check" name="analytics-period" id="period-week" value="week">
                            <label class="btn btn-outline-primary" for="period-week">Settimana</label>
                            
                            <input type="radio" class="btn-check" name="analytics-period" id="period-month" value="month" checked>
                            <label class="btn btn-outline-primary" for="period-month">Mese</label>
                            
                            <input type="radio" class="btn-check" name="analytics-period" id="period-quarter" value="quarter">
                            <label class="btn btn-outline-primary" for="period-quarter">Trimestre</label>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-lg-12">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-chart-area"></i> Trend Fatturato</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="revenue-chart" height="400"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-4">
                    <div class="col-lg-6">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-chart-bar"></i> Prenotazioni per Tipo Spazio</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="bookings-by-type-chart" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-clock"></i> Orari di Picco</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="peak-hours-chart" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ==================== CONTENUTO UTENTI ====================
    buildUsersContent() {
        return `
            <div class="users-management">
                <div class="users-header">
                    <h3>Gestione Utenti</h3>
                    <div class="users-actions">
                        <button class="btn btn-primary" onclick="Dashboard.showAddUserModal()">
                            <i class="fas fa-user-plus"></i> Aggiungi Utente
                        </button>
                        <button class="btn btn-outline-secondary" onclick="Dashboard.exportUsers()">
                            <i class="fas fa-download"></i> Esporta
                        </button>
                    </div>
                </div>
                
                <div class="users-filters">
                    <div class="row">
                        <div class="col-md-3">
                            <select class="form-select" onchange="Dashboard.filterUsers('role', this.value)">
                                <option value="">Tutti i ruoli</option>
                                <option value="user">Utente</option>
                                <option value="admin">Admin</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" onchange="Dashboard.filterUsers('status', this.value)">
                                <option value="">Tutti gli stati</option>
                                <option value="active">Attivo</option>
                                <option value="inactive">Inattivo</option>
                                <option value="suspended">Sospeso</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="Cerca utenti..." 
                                   onkeyup="Dashboard.searchUsers(this.value)">
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-outline-primary w-100" onclick="Dashboard.resetUserFilters()">
                                <i class="fas fa-undo"></i> Reset
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="users-table-container">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Utente</th>
                                    <th>Email</th>
                                    <th>Ruolo</th>
                                    <th>Stato</th>
                                    <th>Registrato</th>
                                    <th>Prenotazioni</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody id="users-table-body">
                                ${this.buildUsersTable()}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="users-pagination">
                    ${this.buildPagination('users')}
                </div>
            </div>
        `;
    },

    buildUsersTable() {
        if (this.state.users.length === 0) {
            return `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-users fa-2x mb-2"></i>
                        <p>Nessun utente trovato</p>
                    </td>
                </tr>
            `;
        }

        return this.state.users.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <img src="${user.avatar || '/assets/images/default-avatar.png'}" 
                             alt="${user.firstName} ${user.lastName}" class="avatar-sm me-2">
                        <div>
                            <div class="user-name">${user.firstName} ${user.lastName}</div>
                            ${user.company ? `<small class="text-muted">${user.company}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${this.getUserRoleBadgeClass(user.role)}">
                        ${this.getUserRoleText(user.role)}
                    </span>
                </td>
                <td>
                    <span class="badge ${this.getUserStatusBadgeClass(user.status)}">
                        ${this.getUserStatusText(user.status)}
                    </span>
                </td>
                <td>${window.Components.formatDate(user.createdAt)}</td>
                <td>
                    <span class="badge bg-info">${user.bookingsCount || 0}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="Dashboard.viewUserDetail('${user.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="Dashboard.editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="Dashboard.deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // ==================== CONTENUTI AGGIUNTIVI ====================
    buildSpacesContent() {
        return `
            <div class="spaces-management">
                <div class="section-header">
                    <h3>Gestione Spazi</h3>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="Dashboard.showAddSpaceModal()">
                            <i class="fas fa-plus"></i> Aggiungi Spazio
                        </button>
                    </div>
                </div>
                <div class="spaces-grid">
                    <p class="text-muted">Gestione spazi in sviluppo...</p>
                </div>
            </div>
        `;
    },

    buildBookingsContent() {
        return `
            <div class="bookings-management">
                <div class="section-header">
                    <h3>Gestione Prenotazioni</h3>
                </div>
                <div class="bookings-table">
                    <p class="text-muted">Gestione prenotazioni in sviluppo...</p>
                </div>
            </div>
        `;
    },

    buildPaymentsContent() {
        return `
            <div class="payments-management">
                <div class="section-header">
                    <h3>Gestione Pagamenti</h3>
                </div>
                <div class="payments-table">
                    <p class="text-muted">Gestione pagamenti in sviluppo...</p>
                </div>
            </div>
        `;
    },

    buildReportsContent() {
        return `
            <div class="reports-management">
                <div class="section-header">
                    <h3>Report e Statistiche</h3>
                </div>
                <div class="reports-grid">
                    <p class="text-muted">Sistema report in sviluppo...</p>
                </div>
            </div>
        `;
    },

    buildSettingsContent() {
        return `
            <div class="settings-management">
                <div class="section-header">
                    <h3>Impostazioni Sistema</h3>
                </div>
                <div class="settings-form">
                    <p class="text-muted">Impostazioni sistema in sviluppo...</p>
                </div>
            </div>
        `;
    },

    // ==================== UTILITY METHODS ====================
    switchView(view) {
        this.state.currentView = view;

        // Aggiorna sidebar
        document.querySelectorAll('.sidebar-menu .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Aggiorna contenuto
        const container = document.getElementById('dashboard-main-content');
        if (container) {
            container.innerHTML = this.buildMainContent();
            this.initializeCharts();
        }
    },

    async changeDateRange(range) {
        this.state.filters.dateRange = range;
        await this.loadDashboardData();
        this.renderDashboard(document.getElementById('dashboard-container'));
    },

    async refreshData() {
        const refreshBtn = document.querySelector('.dashboard-controls .btn');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aggiornamento...';
            refreshBtn.disabled = true;
        }

        await this.loadDashboardData();
        this.renderDashboard(document.getElementById('dashboard-container'));

        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Aggiorna';
            refreshBtn.disabled = false;
        }
    },

    // ==================== FORMATTAZIONE DATI ====================
    formatNumber(num) {
        return new Intl.NumberFormat('it-IT').format(num);
    },

    getBookingStatusClass(status) {
        const classes = {
            'confirmed': 'bg-success',
            'pending': 'bg-warning',
            'cancelled': 'bg-danger',
            'completed': 'bg-info'
        };
        return classes[status] || 'bg-secondary';
    },

    getBookingStatusText(status) {
        const texts = {
            'confirmed': 'Confermata',
            'pending': 'In attesa',
            'cancelled': 'Cancellata',
            'completed': 'Completata'
        };
        return texts[status] || status;
    },

    getUserRoleBadgeClass(role) {
        const classes = {
            'user': 'bg-primary',
            'admin': 'bg-success',
            'super_admin': 'bg-danger'
        };
        return classes[role] || 'bg-secondary';
    },

    getUserRoleText(role) {
        const texts = {
            'user': 'Utente',
            'admin': 'Admin',
            'super_admin': 'Super Admin'
        };
        return texts[role] || role;
    },

    getUserStatusBadgeClass(status) {
        const classes = {
            'active': 'bg-success',
            'inactive': 'bg-secondary',
            'suspended': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    },

    getUserStatusText(status) {
        const texts = {
            'active': 'Attivo',
            'inactive': 'Inattivo',
            'suspended': 'Sospeso'
        };
        return texts[status] || status;
    },

    // ==================== CHARTS ====================
    initializeCharts() {
        // Inizializza grafici se Chart.js è disponibile
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js non disponibile');
            return;
        }

        setTimeout(() => {
            this.createBookingsTrendChart();
            this.createRevenueChart();
            this.createPopularSpacesChart();
        }, 100);
    },

    createBookingsTrendChart() {
        const canvas = document.getElementById('bookings-trend-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
                datasets: [{
                    label: 'Prenotazioni',
                    data: [12, 19, 15, 25, 22, 30],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        this.state.charts.set('bookings-trend', chart);
    },

    createRevenueChart() {
        const canvas = document.getElementById('revenue-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
                datasets: [{
                    label: 'Fatturato (€)',
                    data: [1500, 2300, 1800, 3200, 2800, 3800],
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '€' + value;
                            }
                        }
                    }
                }
            }
        });

        this.state.charts.set('revenue', chart);
    },

    createPopularSpacesChart() {
        const canvas = document.getElementById('popular-spaces-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Postazioni', 'Sale Riunioni', 'Uffici', 'Spazi Eventi'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        this.state.charts.set('popular-spaces', chart);
    },

    // ==================== GESTIONE MODALI ====================
    showAddUserModal() {
        const modal = window.Components.createModal({
            title: 'Aggiungi Nuovo Utente',
            size: 'modal-lg',
            body: this.buildAddUserForm(),
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                <button type="button" class="btn btn-primary" onclick="Dashboard.saveNewUser()">
                    <i class="fas fa-save"></i> Salva Utente
                </button>
            `
        });

        modal.show();
    },

    buildAddUserForm() {
        return `
            <form id="add-user-form">
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="userFirstName" class="form-label">Nome *</label>
                            <input type="text" class="form-control" id="userFirstName" name="firstName" required>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="userLastName" class="form-label">Cognome *</label>
                            <input type="text" class="form-control" id="userLastName" name="lastName" required>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-8">
                        <div class="mb-3">
                            <label for="userEmail" class="form-label">Email *</label>
                            <input type="email" class="form-control" id="userEmail" name="email" required>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3">
                            <label for="userRole" class="form-label">Ruolo *</label>
                            <select class="form-select" id="userRole" name="role" required>
                                <option value="user">Utente</option>
                                <option value="admin">Admin</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="userPhone" class="form-label">Telefono</label>
                            <input type="tel" class="form-control" id="userPhone" name="phone">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label for="userCompany" class="form-label">Azienda</label>
                            <input type="text" class="form-control" id="userCompany" name="company">
                        </div>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label for="userPassword" class="form-label">Password Temporanea *</label>
                    <input type="password" class="form-control" id="userPassword" name="password" required>
                    <div class="form-text">L'utente dovrà cambiare la password al primo accesso</div>
                </div>
                
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="sendWelcomeEmail" name="sendWelcomeEmail" checked>
                    <label class="form-check-label" for="sendWelcomeEmail">
                        Invia email di benvenuto
                    </label>
                </div>
            </form>
        `;
    },

    async saveNewUser() {
        const formData = window.Components.serializeForm('add-user-form');

        // Validazione
        const validation = window.Components.validateForm('add-user-form', {
            firstName: { required: true },
            lastName: { required: true },
            email: { required: true, email: true },
            role: { required: true },
            password: { required: true, minLength: 8 }
        });

        if (!validation.isValid) {
            return;
        }

        try {
            const response = await window.api.createUser(formData);

            if (response.success) {
                // Chiudi modal
                const modal = bootstrap.Modal.getInstance(document.querySelector('.modal.show'));
                modal?.hide();

                // Aggiorna lista utenti
                await this.loadManagementData();
                this.switchView('users');

                window.Components.showNotification({
                    message: 'Utente creato con successo!',
                    type: 'success'
                });
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('❌ Error creating user:', error);
            window.Components.showNotification({
                message: 'Errore nella creazione utente: ' + error.message,
                type: 'error'
            });
        }
    },

    // ==================== AZIONI UTENTI ====================
    async viewUserDetail(userId) {
        try {
            const response = await window.api.getUser(userId);

            if (response.success) {
                this.showUserDetailModal(response.data);
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('❌ Error loading user details:', error);
            window.Components.showNotification({
                message: 'Errore nel caricamento dettagli utente',
                type: 'error'
            });
        }
    },

    showUserDetailModal(user) {
        const modal = window.Components.createModal({
            title: `Dettagli Utente - ${user.firstName} ${user.lastName}`,
            size: 'modal-lg',
            body: this.buildUserDetailContent(user),
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                <button type="button" class="btn btn-warning" onclick="Dashboard.editUser('${user.id}')">
                    <i class="fas fa-edit"></i> Modifica
                </button>
                ${user.status === 'active' ? `
                    <button type="button" class="btn btn-danger" onclick="Dashboard.suspendUser('${user.id}')">
                        <i class="fas fa-ban"></i> Sospendi
                    </button>
                ` : `
                    <button type="button" class="btn btn-success" onclick="Dashboard.activateUser('${user.id}')">
                        <i class="fas fa-check"></i> Attiva
                    </button>
                `}
            `
        });

        modal.show();
    },

    buildUserDetailContent(user) {
        return `
            <div class="user-detail-content">
                <div class="row">
                    <div class="col-md-3 text-center">
                        <img src="${user.avatar || '/assets/images/default-avatar.png'}" 
                             alt="${user.firstName} ${user.lastName}" class="img-fluid rounded-circle mb-3" 
                             style="max-width: 120px;">
                        <h5>${user.firstName} ${user.lastName}</h5>
                        <span class="badge ${this.getUserRoleBadgeClass(user.role)} mb-2">
                            ${this.getUserRoleText(user.role)}
                        </span>
                        <br>
                        <span class="badge ${this.getUserStatusBadgeClass(user.status)}">
                            ${this.getUserStatusText(user.status)}
                        </span>
                    </div>
                    
                    <div class="col-md-9">
                        <div class="user-info-grid">
                            <div class="info-section">
                                <h6>Informazioni Personali</h6>
                                <div class="row">
                                    <div class="col-sm-6">
                                        <div class="info-item">
                                            <label>Email:</label>
                                            <span>${user.email}</span>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="info-item">
                                            <label>Telefono:</label>
                                            <span>${user.phone || 'Non specificato'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-sm-6">
                                        <div class="info-item">
                                            <label>Azienda:</label>
                                            <span>${user.company || 'Non specificata'}</span>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="info-item">
                                            <label>Posizione:</label>
                                            <span>${user.position || 'Non specificata'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="info-section">
                                <h6>Statistiche Account</h6>
                                <div class="row">
                                    <div class="col-sm-4">
                                        <div class="stat-item">
                                            <div class="stat-value">${user.bookingsCount || 0}</div>
                                            <div class="stat-label">Prenotazioni</div>
                                        </div>
                                    </div>
                                    <div class="col-sm-4">
                                        <div class="stat-item">
                                            <div class="stat-value">${window.Components.formatCurrency(user.totalSpent || 0)}</div>
                                            <div class="stat-label">Speso</div>
                                        </div>
                                    </div>
                                    <div class="col-sm-4">
                                        <div class="stat-item">
                                            <div class="stat-value">${user.favoritesCount || 0}</div>
                                            <div class="stat-label">Preferiti</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="info-section">
                                <h6>Informazioni Account</h6>
                                <div class="row">
                                    <div class="col-sm-6">
                                        <div class="info-item">
                                            <label>Registrato il:</label>
                                            <span>${window.Components.formatDate(user.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="info-item">
                                            <label>Ultimo accesso:</label>
                                            <span>${user.lastLoginAt ? window.Components.formatDate(user.lastLoginAt) : 'Mai'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-sm-6">
                                        <div class="info-item">
                                            <label>Email verificata:</label>
                                            <span class="badge ${user.emailVerified ? 'bg-success' : 'bg-warning'}">
                                                ${user.emailVerified ? 'Sì' : 'No'}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="info-item">
                                            <label>2FA Attivo:</label>
                                            <span class="badge ${user.twoFactorEnabled ? 'bg-success' : 'bg-secondary'}">
                                                ${user.twoFactorEnabled ? 'Sì' : 'No'}
                                            </span>
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

    // ==================== FILTRI E RICERCA ====================
    filterUsers(filterType, value) {
        console.log(`Filtering users by ${filterType}: ${value}`);
        // Implementa filtro utenti
    },

    searchUsers(query) {
        console.log(`Searching users: ${query}`);
        // Implementa ricerca utenti
    },

    resetUserFilters() {
        console.log('Resetting user filters');
        // Reset filtri utenti
    },

    exportUsers() {
        console.log('Exporting users data');
        window.Components.showNotification({
            message: 'Export utenti avviato',
            type: 'info'
        });
    },

    editUser(userId) {
        console.log(`Editing user: ${userId}`);
        // Implementa modifica utente
    },

    deleteUser(userId) {
        console.log(`Deleting user: ${userId}`);
        // Implementa cancellazione utente
    },

    suspendUser(userId) {
        console.log(`Suspending user: ${userId}`);
        // Implementa sospensione utente
    },

    activateUser(userId) {
        console.log(`Activating user: ${userId}`);
        // Implementa attivazione utente
    },

    showAddSpaceModal() {
        console.log('Show add space modal');
        // Implementa modal aggiunta spazio
    },

    // ==================== PAGINAZIONE ====================
    buildPagination(type) {
        // Placeholder per paginazione
        return `
            <nav aria-label="Paginazione ${type}">
                <ul class="pagination justify-content-center">
                    <li class="page-item disabled">
                        <span class="page-link">Precedente</span>
                    </li>
                    <li class="page-item active">
                        <span class="page-link">1</span>
                    </li>
                    <li class="page-item">
                        <a class="page-link" href="#">2</a>
                    </li>
                    <li class="page-item">
                        <a class="page-link" href="#">3</a>
                    </li>
                    <li class="page-item">
                        <a class="page-link" href="#">Successivo</a>
                    </li>
                </ul>
            </nav>
        `;
    },

    // ==================== EVENTI ====================
    setupEventListeners() {
        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'add-user-form') {
                e.preventDefault();
                this.saveNewUser();
            }
        });

        // Analytics period change
        document.addEventListener('change', (e) => {
            if (e.target.name === 'analytics-period') {
                this.updateAnalyticsPeriod(e.target.value);
            }
        });
    },

    attachDashboardEvents() {
        console.log('📎 Attaching dashboard events...');
    },

    updateAnalyticsPeriod(period) {
        console.log(`Updating analytics period: ${period}`);
        // Aggiorna grafici con nuovo periodo
    },

    // ==================== MOCK DATA ====================
    loadMockDashboardData() {
        console.log('📊 Loading mock dashboard data...');

        this.state.stats = {
            users: 1247,
            spaces: 89,
            bookings: 456,
            revenue: 15680,
            growth: {
                users: 12.5,
                bookings: 8.3,
                revenue: 15.7
            }
        };

        this.state.users = [
            {
                id: '1',
                firstName: 'Mario',
                lastName: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user',
                status: 'active',
                phone: '+39 123 456 7890',
                company: 'Tech Solutions',
                position: 'Developer',
                bookingsCount: 12,
                totalSpent: 850,
                favoritesCount: 5,
                emailVerified: true,
                twoFactorEnabled: false,
                createdAt: '2024-01-15T10:30:00Z',
                lastLoginAt: '2025-08-15T09:15:00Z'
            },
            {
                id: '2',
                firstName: 'Anna',
                lastName: 'Bianchi',
                email: 'anna.bianchi@example.com',
                role: 'admin',
                status: 'active',
                phone: '+39 987 654 3210',
                company: 'Design Studio',
                position: 'Art Director',
                bookingsCount: 8,
                totalSpent: 620,
                favoritesCount: 3,
                emailVerified: true,
                twoFactorEnabled: true,
                createdAt: '2024-02-20T14:20:00Z',
                lastLoginAt: '2025-08-14T16:45:00Z'
            }
        ];

        this.state.bookings = [
            {
                id: 'BK001',
                userName: 'Mario Rossi',
                spaceName: 'Spazio Creativo Milano',
                date: '2025-08-20',
                status: 'confirmed',
                createdAt: '2025-08-15T10:30:00Z'
            },
            {
                id: 'BK002',
                userName: 'Anna Bianchi',
                spaceName: 'Meeting Room Executive',
                date: '2025-08-22',
                status: 'pending',
                createdAt: '2025-08-15T14:20:00Z'
            }
        ];

        this.state.spaces = [
            {
                id: '1',
                name: 'Spazio Creativo Milano',
                type: 'desk',
                status: 'active',
                bookingsCount: 25
            },
            {
                id: '2',
                name: 'Meeting Room Executive',
                type: 'meeting-room',
                status: 'active',
                bookingsCount: 18
            }
        ];
    },

    // ==================== CLEANUP ====================
    cleanup() {
        // Pulisci grafici
        this.state.charts.forEach((chart) => {
            chart.destroy();
        });
        this.state.charts.clear();

        console.log('🧹 Dashboard cleaned up');
    }
};

// ==================== AUTO-INIZIALIZZAZIONE ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.api && window.Auth && window.Components) {
            window.Dashboard.init();
        }
    });
} else if (window.api && window.Auth && window.Components) {
    window.Dashboard.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    window.Dashboard.cleanup();
});