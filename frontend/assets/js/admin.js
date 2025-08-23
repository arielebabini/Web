// ==============================================
// ADMIN API SERVICE
// Gestisce tutte le chiamate API per gli admin
// ==============================================

class AdminAPI {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('auth_token');
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get authorization headers
     */
    getHeaders(includeContentType = true) {
        const headers = {
            'Authorization': `Bearer ${this.token}`
        };

        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }

        return headers;
    }

    /**
     * Handle API response
     */
    async handleResponse(response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            return await this.handleResponse(response);
        } catch (error) {
            console.error(`API Error [${options.method || 'GET'}] ${endpoint}:`, error);
            throw error;
        }
    }

    // ==================== USERS MANAGEMENT ====================

    /**
     * Get all users with pagination and filters
     */
    async getUsers(params = {}) {
        const searchParams = new URLSearchParams({
            page: 1,
            limit: 10,
            ...params
        });

        return this.request(`/users?${searchParams}`);
    }

    /**
     * Get user by ID
     */
    async getUserById(userId) {
        return this.request(`/users/${userId}`);
    }

    /**
     * Create new user
     */
    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    /**
     * Update existing user
     */
    async updateUser(userId, userData) {
        return this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    /**
     * Update user role (admin only)
     */
    async updateUserRole(userId, role) {
        return this.request(`/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
    }

    /**
     * Update user status
     */
    async updateUserStatus(userId, status) {
        return this.request(`/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    /**
     * Delete user
     */
    async deleteUser(userId) {
        return this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get user statistics
     */
    async getUserStats() {
        return this.request('/users/stats');
    }

    // ==================== SPACES MANAGEMENT ====================

    /**
     * Get all spaces
     */
    async getSpaces(params = {}) {
        const searchParams = new URLSearchParams({
            page: 1,
            limit: 10,
            ...params
        });

        return this.request(`/spaces?${searchParams}`);
    }

    /**
     * Get space by ID
     */
    async getSpaceById(spaceId) {
        return this.request(`/spaces/${spaceId}`);
    }

    /**
     * Create new space
     */
    async createSpace(spaceData) {
        return this.request('/spaces', {
            method: 'POST',
            body: JSON.stringify(spaceData)
        });
    }

    /**
     * Update space
     */
    async updateSpace(spaceId, spaceData) {
        return this.request(`/spaces/${spaceId}`, {
            method: 'PUT',
            body: JSON.stringify(spaceData)
        });
    }

    /**
     * Delete space
     */
    async deleteSpace(spaceId) {
        return this.request(`/spaces/${spaceId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get space statistics
     */
    async getSpaceStats() {
        return this.request('/spaces/stats');
    }

    // ==================== BOOKINGS MANAGEMENT ====================

    /**
     * Get all bookings
     */
    async getBookings(params = {}) {
        const searchParams = new URLSearchParams({
            page: 1,
            limit: 10,
            ...params
        });

        return this.request(`/bookings?${searchParams}`);
    }

    /**
     * Get booking by ID
     */
    async getBookingById(bookingId) {
        return this.request(`/bookings/${bookingId}`);
    }

    /**
     * Update booking status
     */
    async updateBookingStatus(bookingId, status) {
        return this.request(`/bookings/${bookingId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    /**
     * Cancel booking
     */
    async cancelBooking(bookingId, reason = '') {
        return this.request(`/bookings/${bookingId}/cancel`, {
            method: 'PUT',
            body: JSON.stringify({ reason })
        });
    }

    /**
     * Get booking statistics
     */
    async getBookingStats() {
        return this.request('/bookings/stats');
    }

    // ==================== ANALYTICS ====================

    /**
     * Get dashboard analytics
     */
    async getDashboardAnalytics(period = '30d') {
        return this.request(`/analytics/dashboard?period=${period}`);
    }

    /**
     * Get revenue analytics
     */
    async getRevenueAnalytics(period = '12m') {
        return this.request(`/analytics/revenue?period=${period}`);
    }

    /**
     * Get user growth analytics
     */
    async getUserGrowthAnalytics(period = '12m') {
        return this.request(`/analytics/users?period=${period}`);
    }

    /**
     * Get booking trends
     */
    async getBookingTrends(period = '12m') {
        return this.request(`/analytics/bookings?period=${period}`);
    }

    /**
     * Get space utilization
     */
    async getSpaceUtilization(spaceId = null, period = '30d') {
        const params = { period };
        if (spaceId) params.spaceId = spaceId;

        const searchParams = new URLSearchParams(params);
        return this.request(`/analytics/utilization?${searchParams}`);
    }

    // ==================== SYSTEM SETTINGS ====================

    /**
     * Get system settings
     */
    async getSystemSettings() {
        return this.request('/system/settings');
    }

    /**
     * Update system settings
     */
    async updateSystemSettings(settings) {
        return this.request('/system/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    /**
     * Get system health
     */
    async getSystemHealth() {
        return this.request('/system/health');
    }

    /**
     * Get system logs
     */
    async getSystemLogs(params = {}) {
        const searchParams = new URLSearchParams({
            limit: 100,
            ...params
        });

        return this.request(`/system/logs?${searchParams}`);
    }

    // ==================== NOTIFICATIONS ====================

    /**
     * Send notification to user
     */
    async sendNotification(userId, notification) {
        return this.request(`/notifications/send/${userId}`, {
            method: 'POST',
            body: JSON.stringify(notification)
        });
    }

    /**
     * Send broadcast notification
     */
    async sendBroadcastNotification(notification) {
        return this.request('/notifications/broadcast', {
            method: 'POST',
            body: JSON.stringify(notification)
        });
    }

    /**
     * Get notification templates
     */
    async getNotificationTemplates() {
        return this.request('/notifications/templates');
    }

    // ==================== REPORTS ====================

    /**
     * Generate user report
     */
    async generateUserReport(params = {}) {
        return this.request('/reports/users', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }

    /**
     * Generate booking report
     */
    async generateBookingReport(params = {}) {
        return this.request('/reports/bookings', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }

    /**
     * Generate revenue report
     */
    async generateRevenueReport(params = {}) {
        return this.request('/reports/revenue', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }

    /**
     * Export data
     */
    async exportData(type, params = {}) {
        const response = await fetch(`${this.baseURL}/export/${type}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error(`Export failed: ${response.statusText}`);
        }

        return response.blob();
    }

    // ==================== ERROR HANDLING ====================

    /**
     * Handle API errors with user-friendly messages
     */
    static handleError(error) {
        console.error('Admin API Error:', error);

        // Map common errors to user-friendly messages
        const errorMessages = {
            'Network request failed': 'Errore di connessione. Verifica la tua connessione internet.',
            'Unauthorized': 'Sessione scaduta. Effettua nuovamente il login.',
            'Forbidden': 'Non hai i permessi necessari per questa operazione.',
            'Not Found': 'Risorsa non trovata.',
            'Internal Server Error': 'Errore interno del server. Riprova più tardi.'
        };

        const userMessage = errorMessages[error.message] || error.message || 'Errore sconosciuto';

        // Show notification (assuming showNotification function exists)
        if (typeof showNotification === 'function') {
            showNotification(userMessage, 'error');
        }

        return userMessage;
    }
}

// ==================== ADMIN UTILITIES ====================

class AdminUtils {

    /**
     * Format date for Italian locale
     */
    static formatDate(date, includeTime = false) {
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        };

        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }

        return new Date(date).toLocaleDateString('it-IT', options);
    }

    /**
     * Format currency
     */
    static formatCurrency(amount, currency = 'EUR') {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Format number with thousands separator
     */
    static formatNumber(number) {
        return new Intl.NumberFormat('it-IT').format(number);
    }

    /**
     * Get status badge HTML
     */
    static getStatusBadge(status) {
        const statusConfig = {
            active: { class: 'status-active', text: 'Attivo' },
            inactive: { class: 'status-inactive', text: 'Inattivo' },
            suspended: { class: 'status-suspended', text: 'Sospeso' },
            pending: { class: 'status-pending', text: 'In Attesa' }
        };

        const config = statusConfig[status] || { class: 'status-inactive', text: status };
        return `<span class="status-badge ${config.class}">${config.text}</span>`;
    }

    /**
     * Get role badge HTML
     */
    static getRoleBadge(role) {
        const roleConfig = {
            admin: { class: 'role-admin', text: 'Admin' },
            manager: { class: 'role-manager', text: 'Manager' },
            client: { class: 'role-client', text: 'Cliente' }
        };

        const config = roleConfig[role] || { class: 'role-client', text: role };
        return `<span class="role-badge ${config.class}">${config.text}</span>`;
    }

    /**
     * Debounce function for search inputs
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Generate avatar initials
     */
    static getAvatarInitials(firstName, lastName) {
        const first = firstName?.charAt(0)?.toUpperCase() || '';
        const last = lastName?.charAt(0)?.toUpperCase() || '';
        return (first + last) || 'U';
    }

    /**
     * Copy text to clipboard
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            if (typeof showNotification === 'function') {
                showNotification('Copiato negli appunti', 'success');
            }
            return true;
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            return false;
        }
    }

    /**
     * Download file from blob
     */
    static downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Generate CSV from data
     */
    static generateCSV(data, headers) {
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header =>
                `"${(row[header] || '').toString().replace(/"/g, '""')}"`
            ).join(','))
        ].join('\n');

        return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
}

// ==================== GLOBAL ADMIN INSTANCE ====================

// Create global admin API instance
window.AdminAPI = new AdminAPI();
window.AdminUtils = AdminUtils;

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdminAPI, AdminUtils };
}

console.log('🔧 Admin API Service loaded successfully');
