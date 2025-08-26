// public/js/admin-dashboard-loader.js - Caricamento Dati Dashboard Admin
class AdminDashboardLoader {
    constructor() {
        this.isLoading = false;
        this.currentTimeRange = '30d';
        this.dashboardData = null;

        // Inizializza quando la pagina è pronta
        this.init();
    }

    /**
     * Inizializza il loader della dashboard
     */
    async init() {
        console.log('🎯 Initializing Admin Dashboard Loader...');

        // Carica i dati iniziali
        await this.loadDashboardData();

        // Setup event listeners
        this.setupEventListeners();

        // Auto-refresh ogni 5 minuti
        this.setupAutoRefresh();
    }

    /**
     * Carica i dati della dashboard dall'API
     */
    async loadDashboardData(timeRange = '30d') {
        if (this.isLoading) return;

        this.isLoading = true;
        this.currentTimeRange = timeRange;

        try {
            this.showLoading();

            console.log(`📊 Loading dashboard data for ${timeRange}...`);

            // Chiama l'API per i dati della dashboard admin
            const response = await fetch(`http://localhost:3000/api/analytics/dashboard/admin?timeRange=${timeRange}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                this.dashboardData = result.data;
                this.renderDashboard();
                console.log('✅ Dashboard data loaded successfully:', this.dashboardData);
            } else {
                throw new Error(result.message || 'Errore nel caricamento dei dati');
            }

        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.showError('Errore nel caricamento delle statistiche: ' + error.message);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Renderizza i dati nella dashboard
     */
    renderDashboard() {
        if (!this.dashboardData) return;

        const data = this.dashboardData;

        // Aggiorna le statistiche generali
        this.updateGeneralStats(data.general);

        // Aggiorna le statistiche di revenue
        this.updateRevenueStats(data.revenue);

        // Aggiorna la lista dei top spazi
        this.updateTopSpaces(data.topSpaces);

        // Aggiorna il periodo visualizzato
        this.updatePeriodInfo(data.period);
    }

    /**
     * Aggiorna le statistiche generali nel DOM
     */
    updateGeneralStats(general) {
        // Utenti
        this.updateStatCard('total-users', general.users.total);
        this.updateStatCard('new-users', general.users.new);

        // Spazi
        this.updateStatCard('total-spaces', general.spaces.total);

        // Prenotazioni
        this.updateStatCard('total-bookings', general.bookings.total);
        this.updateStatCard('confirmed-bookings', general.bookings.total);

        // Revenue
        this.updateStatCard('total-revenue', '€' + general.revenue.total.toFixed(2));
        this.updateStatCard('total-payments', general.revenue.payments);
        this.updateStatCard('average-transaction', '€' + general.revenue.averageTransaction.toFixed(2));
    }

    /**
     * Aggiorna le statistiche di revenue
     */
    updateRevenueStats(revenue) {
        // Totali e crescita
        const growthIcon = revenue.totals.growthRate >= 0 ? '📈' : '📉';
        const growthColor = revenue.totals.growthRate >= 0 ? 'text-success' : 'text-danger';

        this.updateStatCard('current-revenue', '€' + revenue.totals.current.toFixed(2));
        this.updateStatCard('previous-revenue', '€' + revenue.totals.previous.toFixed(2));

        const growthElement = document.getElementById('revenue-growth');
        if (growthElement) {
            growthElement.innerHTML = `
                <span class="${growthColor}">
                    ${growthIcon} ${Math.abs(revenue.totals.growthRate).toFixed(1)}%
                </span>
            `;
        }

        // Grafico revenue giornaliero (se presente)
        this.updateRevenueChart(revenue.dailyRevenue);
    }

    /**
     * Aggiorna la lista dei top spazi
     */
    updateTopSpaces(topSpaces) {
        const container = document.getElementById('top-spaces-list');
        if (!container || !topSpaces || topSpaces.length === 0) {
            if (container) {
                container.innerHTML = '<p class="text-muted">Nessun dato disponibile</p>';
            }
            return;
        }

        // ORDINA PER NUMERO TOTALE DI PRENOTAZIONI (decrescente)
        const sortedSpaces = [...topSpaces].sort((a, b) => b.bookings.total - a.bookings.total);

        const spacesHtml = sortedSpaces.map((space, index) => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <div class="d-flex align-items-center">
                <div class="badge bg-primary me-2">${index + 1}</div>
                <div>
                    <h6 class="mb-0">${space.name}</h6>
                    <small class="text-muted">${space.location}</small>
                </div>
            </div>
            <div class="text-end">
                <div class="fw-bold text-primary">${space.bookings.total} prenotazioni</div>
                <small class="text-muted">
                    €${space.revenue.toFixed(2)} • ${space.bookings.total} confermate
                </small>
            </div>
        </div>
    `).join('');

        container.innerHTML = spacesHtml;
    }

    /**
     * Aggiorna un singolo elemento statistico
     */
    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animazione del conteggio per i numeri
            if (typeof value === 'number' || (!isNaN(parseFloat(value)) && value.toString().indexOf('%') === -1)) {
                this.animateNumber(element, value);
            } else {
                element.textContent = value;
            }
        }
    }

    /**
     * Anima il conteggio dei numeri
     */
    animateNumber(element, targetValue) {
        const startValue = parseFloat(element.textContent) || 0;
        const target = parseFloat(targetValue) || 0;
        const duration = 1000; // 1 secondo
        const steps = 60;
        const stepValue = (target - startValue) / steps;
        const stepDuration = duration / steps;

        let currentStep = 0;
        const timer = setInterval(() => {
            currentStep++;
            const currentValue = startValue + (stepValue * currentStep);

            if (currentStep >= steps) {
                element.textContent = target.toFixed(target % 1 === 0 ? 0 : 2);
                clearInterval(timer);
            } else {
                element.textContent = currentValue.toFixed(target % 1 === 0 ? 0 : 2);
            }
        }, stepDuration);
    }

    /**
     * Aggiorna le informazioni sul periodo
     */
    updatePeriodInfo(period) {
        const element = document.getElementById('dashboard-period');
        if (element && period) {
            const startDate = new Date(period.startDate).toLocaleDateString('it-IT');
            const endDate = new Date(period.endDate).toLocaleDateString('it-IT');
            element.textContent = `Dal ${startDate} al ${endDate}`;
        }
    }

    /**
     * Aggiorna il grafico del revenue (placeholder per ora)
     */
    updateRevenueChart(dailyRevenue) {
        const chartContainer = document.getElementById('revenue-chart');
        if (!chartContainer || !dailyRevenue || dailyRevenue.length === 0) return;

        // Placeholder - qui si potrebbe integrare Chart.js o simili
        const chartHtml = `
            <div class="text-center p-3 bg-light rounded">
                <h6>Revenue degli ultimi ${dailyRevenue.length} giorni</h6>
                <div class="row">
                    ${dailyRevenue.slice(-7).map(day => `
                        <div class="col text-center">
                            <div class="small text-muted">
                                ${new Date(day.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                            </div>
                            <div class="fw-bold text-success">
                                €${day.revenue.toFixed(0)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        chartContainer.innerHTML = chartHtml;
    }

    /**
     * Setup degli event listeners
     */
    setupEventListeners() {
        // Filtro periodo tempo
        const timeRangeSelect = document.getElementById('timeRangeSelect');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.loadDashboardData(e.target.value);
            });
        }

        // Pulsante refresh
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadDashboardData(this.currentTimeRange);
            });
        }
    }

    /**
     * Setup auto-refresh ogni 5 minuti
     */
    setupAutoRefresh() {
        setInterval(() => {
            if (!this.isLoading && document.visibilityState === 'visible') {
                console.log('🔄 Auto-refreshing dashboard data...');
                this.loadDashboardData(this.currentTimeRange);
            }
        }, 5 * 60 * 1000); // 5 minuti
    }

    /**
     * Mostra loading spinner
     */
    showLoading() {
        /*const loadingOverlay = document.getElementById('dashboard-loading');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }

        // Disabilita controlli durante il caricamento
        const timeRangeSelect = document.getElementById('timeRangeSelect');
        if (timeRangeSelect) timeRangeSelect.disabled = true;

        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Caricamento...';
        }*/
        console.log('Show loading disabled for debugging');
    }

    /**
     * Nasconde loading spinner
     */
    hideLoading() {
        /*const loadingOverlay = document.getElementById('dashboard-loading');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }

        // Riabilita controlli
        const timeRangeSelect = document.getElementById('timeRangeSelect');
        if (timeRangeSelect) timeRangeSelect.disabled = false;

        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Aggiorna';
        }*/

        console.log('Hide loading disabled for debugging');
    }

    /**
     * Mostra messaggio di errore
     */
    showError(message) {
        const errorContainer = document.getElementById('dashboard-error');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            errorContainer.style.display = 'block';
        }
    }

    /**
     * Cambia il periodo di tempo
     */
    changeTimeRange(timeRange) {
        const timeRangeSelect = document.getElementById('timeRangeSelect');
        if (timeRangeSelect) {
            timeRangeSelect.value = timeRange;
        }
        this.loadDashboardData(timeRange);
    }
}

// Inizializza il loader quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aspetta che la dashboard admin sia visibile
    const checkDashboard = () => {
        const dashboardSection = document.getElementById('dashboardSection');
        if (dashboardSection && dashboardSection.style.display !== 'none') {
            window.adminDashboardLoader = new AdminDashboardLoader();
        } else {
            // Riprova tra 100ms se la dashboard non è ancora visibile
            setTimeout(checkDashboard, 100);
        }
    };

    checkDashboard();
});

// Esporta per uso globale
window.AdminDashboardLoader = AdminDashboardLoader;