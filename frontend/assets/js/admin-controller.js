// ==========================================
// ADMIN DASHBOARD - BACKEND INTEGRATION
// File: admin-controller.js (VERSIONE CORRETTA)
// ==========================================

class AdminDashboardController {
    constructor() {
        this.api = new AdminAPI();
        this.currentUsersPage = 1;
        this.currentSpacesPage = 1;
        this.usersData = [];
        this.spacesData = [];

        this.initializeEventListeners();
        this.startPeriodicUpdates();
    }

    // ==================== INITIALIZATION ====================

    initializeEventListeners() {
        // Search input debouncing
        const userSearchInput = document.getElementById('userSearch');
        if (userSearchInput) {
            userSearchInput.addEventListener('input',
                AdminUtils.debounce(() => this.applyUserFilters(), 500)
            );
        }

        const spaceSearchInput = document.getElementById('spaceSearch');
        if (spaceSearchInput) {
            spaceSearchInput.addEventListener('input',
                AdminUtils.debounce(() => this.applySpaceFilters(), 500)
            );
        }

        // Form submissions
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUser();
            });
        }

        const spaceForm = document.getElementById('spaceForm');
        if (spaceForm) {
            spaceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSpace();
            });
        }

        // Filter change events
        ['roleFilter', 'statusFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.applyUserFilters());
            }
        });

        ['cityFilter', 'spaceTypeFilter', 'spaceStatusFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.applySpaceFilters());
            }
        });
    }

    startPeriodicUpdates() {
        // Refresh dashboard stats every 2 minutes
        setInterval(() => {
            if (this.getCurrentSection() === 'dashboard') {
                this.loadDashboardStats();
            }
        }, 120000);
    }

    getCurrentSection() {
        const sections = document.querySelectorAll('.admin-section');
        for (let section of sections) {
            if (section.style.display !== 'none') {
                return section.id.replace('Section', '');
            }
        }
        return 'dashboard';
    }

    // ==================== DASHBOARD STATS ====================

    async loadDashboardStats() {
        try {
            // Load multiple stats in parallel
            const [userStats, spaceStats, bookingStats, revenueData] = await Promise.all([
                this.api.getUserStats().catch(e => ({ totalUsers: 0, usersByRole: {} })),
                this.api.getSpaceStats().catch(e => ({ totalSpaces: 0, activeSpaces: 0 })),
                this.api.getBookingStats().catch(e => ({ totalBookings: 0, todayBookings: 0 })),
                this.api.getRevenueAnalytics('1m').catch(e => ({ monthlyRevenue: 0 }))
            ]);

            this.updateDashboardCards(userStats, spaceStats, bookingStats, revenueData);
            this.updateChartsData(userStats, bookingStats);

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showNotification('Errore nel caricamento delle statistiche', 'error');
        }
    }

    updateDashboardCards(userStats, spaceStats, bookingStats, revenueData) {
        // Update stat cards
        this.updateElement('totalUsers', userStats.totalUsers || 0);
        this.updateElement('activeSpaces', spaceStats.activeSpaces || 0);
        this.updateElement('totalBookings', bookingStats.totalBookings || 0);
        this.updateElement('monthlyRevenue', AdminUtils.formatCurrency(revenueData.monthlyRevenue || 0));

        // Update spaces section stats if visible
        this.updateElement('totalSpacesCount', spaceStats.totalSpaces || 0);
        this.updateElement('activeSpacesCount', spaceStats.activeSpaces || 0);
        this.updateElement('bookedSpacesCount', bookingStats.todayBookings || 0);
        this.updateElement('spacesRevenue', AdminUtils.formatCurrency(revenueData.monthlyRevenue || 0));
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateChartsData(userStats, bookingStats) {
        // Update users chart if exists
        if (window.usersChart && userStats.usersByRole) {
            const roles = ['client', 'manager', 'admin'];
            const data = roles.map(role => userStats.usersByRole[role] || 0);

            window.usersChart.data.datasets[0].data = data;
            window.usersChart.update();
        }

        // Update bookings chart with trend data
        if (window.bookingsChart && bookingStats.monthlyTrend) {
            window.bookingsChart.data.datasets[0].data = bookingStats.monthlyTrend;
            window.bookingsChart.update();
        }
    }

    // ==================== USER MANAGEMENT ====================

    async loadUsers(page = 1, filters = {}) {
        try {
            this.showTableLoading('usersTableBody', 6);

            const params = {
                page,
                limit: 10,
                sortBy: 'created_at',
                sortOrder: 'DESC',
                ...filters
            };

            const response = await this.api.getUsers(params);

            if (response.success) {
                this.usersData = response.users || response.data || [];
                this.currentUsersPage = response.currentPage || response.page || page;

                this.renderUsersTable(this.usersData);
                this.renderUsersPagination(
                    response.totalPages || Math.ceil((response.total || 0) / 10),
                    response.total || response.totalUsers || 0
                );
            } else {
                throw new Error(response.message || 'Errore nel caricamento utenti');
            }

        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Errore nel caricamento degli utenti', 'error');
            this.showTableError('usersTableBody', 6, 'Errore nel caricamento degli utenti');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');

        if (!users || users.length === 0) {
            tbody.innerHTML = this.getEmptyTableRow(6, 'Nessun utente trovato', 'users');
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar me-3">
                            <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                ${AdminUtils.getAvatarInitials(user.first_name || user.firstName, user.last_name || user.lastName)}
                            </div>
                        </div>
                        <div>
                            <div class="fw-semibold">${this.getUserFullName(user)}</div>
                            <small class="text-muted">ID: ${user.id}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div>${user.email}</div>
                    ${user.phone ? `<small class="text-muted">${user.phone}</small>` : ''}
                </td>
                <td>${AdminUtils.getRoleBadge(user.role)}</td>
                <td>${AdminUtils.getStatusBadge(user.status)}</td>
                <td>${AdminUtils.formatDate(user.created_at || user.createdAt, false)}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="adminController.editUser('${user.id}')" title="Modifica">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="adminController.viewUser('${user.id}')" title="Visualizza">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${user.role !== 'admin' ? `
                            <div class="dropdown">
                                <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" title="Più azioni">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="adminController.toggleUserStatus('${user.id}', '${user.status}')">
                                        <i class="fas fa-toggle-${user.status === 'active' ? 'off' : 'on'} me-2"></i>
                                        ${user.status === 'active' ? 'Sospendi' : 'Attiva'}
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="adminController.changeUserRole('${user.id}')">
                                        <i class="fas fa-user-tag me-2"></i>Cambia Ruolo
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="adminController.deleteUser('${user.id}')">
                                        <i class="fas fa-trash me-2"></i>Elimina
                                    </a></li>
                                </ul>
                            </div>
                        ` : `
                            <button class="btn btn-outline-secondary" disabled title="Admin non modificabile">
                                <i class="fas fa-lock"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderUsersPagination(totalPages, totalUsers) {
        const pagination = document.getElementById('usersPagination');
        const showing = document.getElementById('usersShowing');
        const total = document.getElementById('usersTotal');

        if (!pagination || !showing || !total) return;

        // Update counters
        const startItem = ((this.currentUsersPage - 1) * 10) + 1;
        const endItem = Math.min(this.currentUsersPage * 10, totalUsers);
        showing.textContent = `${startItem}-${endItem}`;
        total.textContent = AdminUtils.formatNumber(totalUsers);

        // Generate pagination
        pagination.innerHTML = this.generatePagination(this.currentUsersPage, totalPages, 'loadUsers');
    }

    async editUser(userId) {
        try {
            const user = this.usersData.find(u => u.id === userId);
            let userData = user;

            if (!user) {
                // Load user data from API if not in current dataset
                const response = await this.api.getUserById(userId);
                if (response.success) {
                    userData = response.user;
                } else {
                    throw new Error('Utente non trovato');
                }
            }

            this.populateUserModal(userData, false);
            new bootstrap.Modal(document.getElementById('userModal')).show();

        } catch (error) {
            console.error('Error editing user:', error);
            this.showNotification('Errore nel caricamento dei dati utente', 'error');
        }
    }

    async viewUser(userId) {
        try {
            const response = await this.api.getUserById(userId);
            if (response.success) {
                this.showUserDetailsModal(response.user);
            } else {
                throw new Error('Utente non trovato');
            }
        } catch (error) {
            console.error('Error viewing user:', error);
            this.showNotification('Errore nel caricamento dei dettagli utente', 'error');
        }
    }

    showUserDetailsModal(user) {
        // Simple implementation - you can enhance this
        const details = `
            Nome: ${this.getUserFullName(user)}
            Email: ${user.email}
            Telefono: ${user.phone || 'Non specificato'}
            Ruolo: ${user.role}
            Status: ${user.status}
            Registrato: ${AdminUtils.formatDate(user.created_at || user.createdAt, true)}
        `;
        alert(details);
    }

    async toggleUserStatus(userId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const action = newStatus === 'active' ? 'attivare' : 'sospendere';

        if (!confirm(`Confermi di voler ${action} questo utente?`)) {
            return;
        }

        try {
            const response = await this.api.updateUserStatus(userId, newStatus);

            if (response.success) {
                this.showNotification(`Utente ${action === 'attivare' ? 'attivato' : 'sospeso'} con successo`, 'success');
                this.loadUsers(this.currentUsersPage, this.getCurrentUserFilters());
            } else {
                throw new Error(response.message || 'Errore nell\'aggiornamento dello status');
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            this.showNotification('Errore nell\'aggiornamento dello status', 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Sei sicuro di voler eliminare questo utente? Questa azione non può essere annullata.')) {
            return;
        }

        try {
            const response = await this.api.deleteUser(userId);

            if (response.success) {
                this.showNotification('Utente eliminato con successo', 'success');
                this.loadUsers(this.currentUsersPage, this.getCurrentUserFilters());
            } else {
                throw new Error(response.message || 'Errore nell\'eliminazione dell\'utente');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showNotification('Errore nell\'eliminazione dell\'utente', 'error');
        }
    }

    async saveUser() {
        const form = document.getElementById('userForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const userId = document.getElementById('userId').value;
        const isEdit = !!userId;

        const userData = this.collectUserFormData();

        try {
            let response;
            if (isEdit) {
                response = await this.api.updateUser(userId, userData);
            } else {
                response = await this.api.createUser(userData);
            }

            if (response.success) {
                this.showNotification(`Utente ${isEdit ? 'aggiornato' : 'creato'} con successo`, 'success');
                bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
                this.loadUsers(this.currentUsersPage, this.getCurrentUserFilters());
            } else {
                throw new Error(response.message || 'Errore nel salvataggio dell\'utente');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            this.showNotification(error.message || 'Errore nel salvataggio dell\'utente', 'error');
        }
    }

    // ==================== SPACES MANAGEMENT ====================

    async loadSpaces(page = 1, filters = {}) {
        try {
            this.showTableLoading('spacesTableBody', 8);

            const params = {
                page,
                limit: 10,
                sortBy: 'created_at',
                sortOrder: 'DESC',
                ...filters
            };

            const response = await this.api.getSpaces(params);

            if (response.success) {
                this.spacesData = response.spaces || response.data || [];
                this.currentSpacesPage = response.currentPage || response.page || page;

                this.renderSpacesTable(this.spacesData);
                this.renderSpacesPagination(
                    response.totalPages || Math.ceil((response.total || 0) / 10),
                    response.total || response.totalSpaces || 0
                );
            } else {
                throw new Error(response.message || 'Errore nel caricamento spazi');
            }

        } catch (error) {
            console.error('Error loading spaces:', error);
            this.showNotification('Errore nel caricamento degli spazi', 'error');
            this.showTableError('spacesTableBody', 8, 'Errore nel caricamento degli spazi');
        }
    }

    renderSpacesTable(spaces) {
        const tbody = document.getElementById('spacesTableBody');

        if (!spaces || spaces.length === 0) {
            tbody.innerHTML = this.getEmptyTableRow(8, 'Nessuno spazio trovato', 'building');
            return;
        }

        tbody.innerHTML = spaces.map(space => `
            <tr>
                <td>
                    <div>
                        <div class="fw-semibold">${space.name}</div>
                        <small class="text-muted">${space.address || ''}</small>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-map-marker-alt text-muted me-2"></i>
                        ${space.city}
                    </div>
                </td>
                <td>
                    <span class="badge bg-light text-dark">${this.getSpaceTypeLabel(space.type)}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-users text-muted me-2"></i>
                        ${space.capacity} ${space.capacity === 1 ? 'posto' : 'posti'}
                    </div>
                </td>
                <td>
                    <strong>${AdminUtils.formatCurrency(space.price_per_hour || space.pricePerHour || 0)}</strong>
                    <small class="text-muted">/ora</small>
                </td>
                <td>${AdminUtils.getStatusBadge(space.status)}</td>
                <td>
                    <div class="text-center">
                        <span class="badge bg-info">${space.bookings_count || 0}</span>
                        <small class="d-block text-muted">questo mese</small>
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="adminController.editSpace('${space.id}')" title="Modifica">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="adminController.viewSpace('${space.id}')" title="Dettagli">
                            <i class="fas fa-eye"></i>
                        </button>
                        <div class="dropdown">
                            <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" title="Più azioni">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="adminController.toggleSpaceStatus('${space.id}', '${space.status}')">
                                    <i class="fas fa-toggle-${space.status === 'active' ? 'off' : 'on'} me-2"></i>
                                    ${space.status === 'active' ? 'Disattiva' : 'Attiva'}
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="adminController.viewSpaceBookings('${space.id}')">
                                    <i class="fas fa-calendar me-2"></i>Prenotazioni
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="adminController.deleteSpace('${space.id}')">
                                    <i class="fas fa-trash me-2"></i>Elimina
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderSpacesPagination(totalPages, totalSpaces) {
        const pagination = document.getElementById('spacesPagination');
        const showing = document.getElementById('spacesShowing');
        const total = document.getElementById('spacesTotal');

        if (!pagination || !showing || !total) return;

        // Update counters
        const startItem = ((this.currentSpacesPage - 1) * 10) + 1;
        const endItem = Math.min(this.currentSpacesPage * 10, totalSpaces);
        showing.textContent = `${startItem}-${endItem}`;
        total.textContent = AdminUtils.formatNumber(totalSpaces);

        // Generate pagination
        pagination.innerHTML = this.generatePagination(this.currentSpacesPage, totalPages, 'loadSpaces');
    }

    // Space management methods (to be implemented)
    async editSpace(spaceId) {
        console.log('Edit space:', spaceId);
        // Implementation needed
    }

    async viewSpace(spaceId) {
        console.log('View space:', spaceId);
        // Implementation needed
    }

    async toggleSpaceStatus(spaceId, currentStatus) {
        console.log('Toggle space status:', spaceId, currentStatus);
        // Implementation needed
    }

    async deleteSpace(spaceId) {
        console.log('Delete space:', spaceId);
        // Implementation needed
    }

    async viewSpaceBookings(spaceId) {
        console.log('View space bookings:', spaceId);
        // Implementation needed
    }

    // ==================== UTILITY METHODS ====================

    collectUserFormData() {
        const userData = {
            first_name: document.getElementById('firstName').value.trim(),
            last_name: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim() || null,
            role: document.getElementById('role').value,
            status: document.getElementById('status').value
        };

        // Add password only for new users
        const passwordField = document.getElementById('password');
        if (passwordField && passwordField.offsetParent !== null && passwordField.value) {
            userData.password = passwordField.value;
        }

        return userData;
    }

    populateUserModal(user, isNew = true) {
        document.getElementById('userModalTitle').textContent = isNew ? 'Nuovo Utente' : 'Modifica Utente';
        document.getElementById('userId').value = isNew ? '' : user.id;

        if (!isNew) {
            document.getElementById('firstName').value = user.first_name || user.firstName || '';
            document.getElementById('lastName').value = user.last_name || user.lastName || '';
            document.getElementById('email').value = user.email || '';
            document.getElementById('phone').value = user.phone || '';
            document.getElementById('role').value = user.role || 'client';
            document.getElementById('status').value = user.status || 'active';

            // Hide password field for editing
            const passwordSection = document.getElementById('passwordSection');
            if (passwordSection) {
                passwordSection.style.display = 'none';
                document.getElementById('password').required = false;
            }
        } else {
            document.getElementById('userForm').reset();

            // Show password field for new users
            const passwordSection = document.getElementById('passwordSection');
            if (passwordSection) {
                passwordSection.style.display = 'block';
                document.getElementById('password').required = true;
            }
        }
    }

    getUserFullName(user) {
        const firstName = user.first_name || user.firstName || '';
        const lastName = user.last_name || user.lastName || '';
        return (firstName + ' ' + lastName).trim() || 'Nome non disponibile';
    }

    getSpaceTypeLabel(type) {
        const typeLabels = {
            'desk': 'Scrivania',
            'private_desk': 'Scrivania Privata',
            'meeting_room': 'Sala Meeting',
            'private_office': 'Ufficio Privato',
            'phone_booth': 'Cabina Telefonica',
            'event_space': 'Spazio Eventi',
            'coworking': 'Coworking'
        };
        return typeLabels[type] || type;
    }

    getCurrentUserFilters() {
        return {
            search: document.getElementById('userSearch')?.value || '',
            role: document.getElementById('roleFilter')?.value || '',
            status: document.getElementById('statusFilter')?.value || ''
        };
    }

    getCurrentSpaceFilters() {
        return {
            search: document.getElementById('spaceSearch')?.value || '',
            city: document.getElementById('cityFilter')?.value || '',
            type: document.getElementById('spaceTypeFilter')?.value || '',
            status: document.getElementById('spaceStatusFilter')?.value || ''
        };
    }

    applyUserFilters() {
        const filters = this.getCurrentUserFilters();
        const activeFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value)
        );
        this.loadUsers(1, activeFilters);
    }

    applySpaceFilters() {
        const filters = this.getCurrentSpaceFilters();
        const activeFilters = Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value)
        );
        this.loadSpaces(1, activeFilters);
    }

    showTableLoading(tbodyId, colSpan) {
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${colSpan}" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Caricamento...</span>
                        </div>
                        <p class="mt-2 mb-0">Caricamento dati...</p>
                    </td>
                </tr>
            `;
        }
    }

    showTableError(tbodyId, colSpan, message) {
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${colSpan}" class="text-center py-4">
                        <i class="fas fa-exclamation-triangle text-warning fa-2x mb-3"></i>
                        <p class="mb-0">${message}</p>
                    </td>
                </tr>
            `;
        }
    }

    getEmptyTableRow(colSpan, message, icon = 'info-circle') {
        return `
            <tr>
                <td colspan="${colSpan}" class="text-center py-4">
                    <i class="fas fa-${icon} text-muted fa-2x mb-3"></i>
                    <p class="mb-0">${message}</p>
                </td>
            </tr>
        `;
    }

    generatePagination(currentPage, totalPages, onClickFunction) {
        if (totalPages <= 1) return '';

        let html = '';

        // Previous button
        html += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="${onClickFunction}(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="${onClickFunction}(1)">1</a></li>`;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="${onClickFunction}(${i})">${i}</a>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `<li class="page-item"><a class="page-link" href="#" onclick="${onClickFunction}(${totalPages})">${totalPages}</a></li>`;
        }

        // Next button
        html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="${onClickFunction}(${currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        return html;
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.admin-notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `admin-notification alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                <div>${message}</div>
            </div>
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('fade');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// ==================== GLOBAL FUNCTIONS ====================
// These functions are called from HTML onclick attributes

window.loadUsers = function(page = 1, filters = {}) {
    if (window.adminController) {
        window.adminController.loadUsers(page, filters);
    }
};

window.loadSpaces = function(page = 1, filters = {}) {
    if (window.adminController) {
        window.adminController.loadSpaces(page, filters);
    }
};

window.showAddUserModal = function() {
    if (window.adminController) {
        window.adminController.populateUserModal({}, true);
        new bootstrap.Modal(document.getElementById('userModal')).show();
    }
};

window.saveUser = function() {
    if (window.adminController) {
        window.adminController.saveUser();
    }
};

window.applyUserFilters = function() {
    if (window.adminController) {
        window.adminController.applyUserFilters();
    }
};

window.resetUserFilters = function() {
    // Clear all filter inputs
    ['userSearch', 'roleFilter', 'statusFilter'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    loadUsers(1);
};

window.applySpaceFilters = function() {
    if (window.adminController) {
        window.adminController.applySpaceFilters();
    }
};

window.resetSpaceFilters = function() {
    // Clear all filter inputs
    ['spaceSearch', 'cityFilter', 'spaceTypeFilter', 'spaceStatusFilter'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    loadSpaces(1);
};

// ==================== INITIALIZATION ====================

// Initialize admin controller when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the admin page
    if (document.getElementById('adminSidebar')) {
        // Initialize the admin controller
        window.adminController = new AdminDashboardController();

        // Load initial data
        window.adminController.loadDashboardStats();

        console.log('🚀 Admin Dashboard Controller initialized successfully');
    }
});

console.log('📋 Admin Integration Script loaded');