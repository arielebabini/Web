/**
 * CoWorkSpace - Booking Module
 * Gestione prenotazioni e calendario
 */

window.Bookings = {
    /**
     * Stato del modulo prenotazioni
     */
    state: {
        bookings: [],
        currentBooking: null,
        filters: {
            status: 'all', // 'all', 'upcoming', 'past', 'cancelled'
            sortBy: 'date-desc'
        },
        loading: false
    },

    /**
     * Dati mock delle prenotazioni
     */
    mockBookings: [
        {
            id: 1,
            userId: 1,
            spaceId: 1,
            spaceName: "Milano Business Hub",
            spaceAddress: "Via Brera 12, Milano",
            startDate: "2024-01-15",
            endDate: "2024-01-15",
            startTime: "09:00",
            endTime: "18:00",
            people: 8,
            totalPrice: 85,
            status: "confirmed",
            notes: "Riunione importante con clienti internazionali",
            createdAt: "2024-01-10T10:00:00Z",
            amenities: ["wifi", "projector", "coffee"]
        },
        {
            id: 2,
            userId: 1,
            spaceId: 2,
            spaceName: "Milano Creative Space",
            spaceAddress: "Via Navigli 45, Milano",
            startDate: "2024-01-20",
            endDate: "2024-01-22",
            startTime: "08:00",
            endTime: "20:00",
            people: 4,
            totalPrice: 135,
            status: "confirmed",
            notes: "Workshop di 3 giorni",
            createdAt: "2024-01-12T14:30:00Z",
            amenities: ["wifi", "coffee", "kitchen"]
        }
    ],

    /**
     * Inizializza il modulo prenotazioni
     */
    init() {
        console.log('📅 Initializing Bookings module...');

        this.state.bookings = [...this.mockBookings];
        this.setupEventListeners();

        console.log('✅ Bookings module initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Filtri prenotazioni
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-filter]')) {
                const filter = e.target.closest('[data-filter]').getAttribute('data-filter');
                this.setFilter('status', filter);
            }
        });

        // Ordinamento
        document.addEventListener('change', (e) => {
            if (e.target.id === 'sortBookings') {
                this.setFilter('sortBy', e.target.value);
            }
        });
    },

    /**
     * Mostra sezione prenotazioni
     */
    showBookings() {
        // Controlla autenticazione
        if (!window.Auth?.isAuthenticated()) {
            if (window.Notifications) {
                window.Notifications.show('Devi effettuare il login per vedere le prenotazioni', 'warning');
            }
            window.Auth?.showLoginModal();
            return;
        }

        this.loadBookingsSection();

        if (window.Navigation) {
            window.Navigation.showSection('bookings');
        }
    },

    /**
     * Carica la sezione prenotazioni
     */
    loadBookingsSection() {
        const bookingsHTML = `
            <section id="bookingsSection" class="section-padding">
                <div class="container">
                    <div class="bookings-header">
                        <h2><i class="fas fa-calendar-check text-primary"></i> Le Mie Prenotazioni</h2>
                        <p class="text-muted">Gestisci e monitora le tue prenotazioni</p>
                    </div>

                    <!-- Booking Filters -->
                    <div class="booking-filters">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <div class="btn-group" role="group">
                                    <button type="button" class="btn btn-outline-primary active" data-filter="all">
                                        Tutte
                                    </button>
                                    <button type="button" class="btn btn-outline-primary" data-filter="upcoming">
                                        Prossime
                                    </button>
                                    <button type="button" class="btn btn-outline-primary" data-filter="past">
                                        Passate
                                    </button>
                                    <button type="button" class="btn btn-outline-primary" data-filter="cancelled">
                                        Cancellate
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-6 text-end">
                                <select class="form-select d-inline-block w-auto" id="sortBookings">
                                    <option value="date-desc">Data: Più Recente</option>
                                    <option value="date-asc">Data: Meno Recente</option>
                                    <option value="price-high">Prezzo: Alto → Basso</option>
                                    <option value="price-low">Prezzo: Basso → Alto</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div id="bookingsContainer" class="bookings-grid">
                        <!-- Bookings will be loaded here -->
                    </div>
                </div>
            </section>
        `;

        const dynamicContent = document.getElementById('dynamicContent');
        if (dynamicContent) {
            dynamicContent.innerHTML = bookingsHTML;
        }

        this.renderBookings();
    },

    /**
     * Renderizza le prenotazioni
     */
    renderBookings() {
        const container = document.getElementById('bookingsContainer');
        if (!container) return;

        const currentUser = window.Auth?.getCurrentUser();
        if (!currentUser) return;

        // Filtra prenotazioni dell'utente corrente
        let userBookings = this.state.bookings.filter(booking => booking.userId === currentUser.id);

        // Applica filtri
        userBookings = this.applyFilters(userBookings);

        if (userBookings.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h4>Nessuna prenotazione trovata</h4>
                    <p class="text-muted">Non hai ancora effettuato nessuna prenotazione</p>
                    <button class="btn btn-primary" onclick="window.Navigation?.showSection('spaces')">
                        <i class="fas fa-search"></i> Esplora Spazi
                    </button>
                </div>
            `;
            return;
        }

        const bookingsHTML = userBookings.map(booking => this.createBookingCard(booking)).join('');
        container.innerHTML = `<div class="row">${bookingsHTML}</div>`;
    },

    /**
     * Crea una card per la prenotazione
     */
    createBookingCard(booking) {
        const statusClass = this.getStatusClass(booking.status);
        const statusLabel = this.getStatusLabel(booking.status);
        const isUpcoming = new Date(booking.startDate) > new Date();
        const isPast = new Date(booking.endDate) < new Date();

        return `
            <div class="col-md-6 mb-4">
                <div class="card booking-card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">${booking.spaceName}</h6>
                        <span class="badge bg-${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="card-body">
                        <div class="booking-info mb-3">
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">Data</small>
                                    <div class="fw-bold">${this.formatDate(booking.startDate)}</div>
                                    ${booking.startDate !== booking.endDate ?
            `<div class="text-muted">fino al ${this.formatDate(booking.endDate)}</div>` : ''
        }
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Orario</small>
                                    <div class="fw-bold">${booking.startTime} - ${booking.endTime}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="booking-details mb-3">
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">Persone</small>
                                    <div><i class="fas fa-users text-primary"></i> ${booking.people}</div>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Prezzo Totale</small>
                                    <div class="fw-bold text-success">€${booking.totalPrice}</div>
                                </div>
                            </div>
                        </div>

                        <div class="booking-location mb-3">
                            <small class="text-muted">Posizione</small>
                            <div><i class="fas fa-map-marker-alt text-primary"></i> ${booking.spaceAddress}</div>
                        </div>

                        ${booking.amenities ? `
                            <div class="booking-amenities mb-3">
                                <small class="text-muted d-block mb-1">Servizi inclusi</small>
                                <div class="amenities-list">
                                    ${booking.amenities.map(amenity =>
            `<span class="badge bg-light text-dark me-1">${this.getAmenityLabel(amenity)}</span>`
        ).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${booking.notes ? `
                            <div class="booking-notes mb-3">
                                <small class="text-muted">Note</small>
                                <div class="text-muted">${booking.notes}</div>
                            </div>
                        ` : ''}

                        <div class="booking-actions">
                            <div class="row">
                                <div class="col-6">
                                    <button class="btn btn-outline-primary btn-sm w-100" 
                                            onclick="window.Bookings.showBookingDetail(${booking.id})">
                                        <i class="fas fa-eye"></i> Dettagli
                                    </button>
                                </div>
                                <div class="col-6">
                                    ${isUpcoming && booking.status === 'confirmed' ? `
                                        <button class="btn btn-outline-danger btn-sm w-100" 
                                                onclick="window.Bookings.cancelBooking(${booking.id})">
                                            <i class="fas fa-times"></i> Cancella
                                        </button>
                                    ` : isPast ? `
                                        <button class="btn btn-outline-success btn-sm w-100" 
                                                onclick="window.Bookings.leaveReview(${booking.id})">
                                            <i class="fas fa-star"></i> Recensione
                                        </button>
                                    ` : `
                                        <button class="btn btn-secondary btn-sm w-100" disabled>
                                            <i class="fas fa-ban"></i> Non disponibile
                                        </button>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer text-muted">
                        <small>
                            <i class="fas fa-clock"></i> 
                            Prenotato il ${this.formatDateTime(booking.createdAt)}
                        </small>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Applica filtri alle prenotazioni
     */
    applyFilters(bookings) {
        let filtered = [...bookings];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filtro per status
        switch (this.state.filters.status) {
            case 'upcoming':
                filtered = filtered.filter(booking =>
                    new Date(booking.startDate) >= today && booking.status === 'confirmed'
                );
                break;
            case 'past':
                filtered = filtered.filter(booking =>
                    new Date(booking.endDate) < today
                );
                break;
            case 'cancelled':
                filtered = filtered.filter(booking => booking.status === 'cancelled');
                break;
            default: // 'all'
                // Nessun filtro
                break;
        }

        // Ordinamento
        switch (this.state.filters.sortBy) {
            case 'date-asc':
                filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                break;
            case 'price-high':
                filtered.sort((a, b) => b.totalPrice - a.totalPrice);
                break;
            case 'price-low':
                filtered.sort((a, b) => a.totalPrice - b.totalPrice);
                break;
            default: // 'date-desc'
                filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
                break;
        }

        return filtered;
    },

    /**
     * Imposta filtro
     */
    setFilter(filterType, value) {
        this.state.filters[filterType] = value;

        // Aggiorna UI filtri
        if (filterType === 'status') {
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.querySelector(`[data-filter="${value}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
        }

        this.renderBookings();
    },

    /**
     * Mostra dettagli prenotazione
     */
    showBookingDetail(bookingId) {
        const booking = this.state.bookings.find(b => b.id === bookingId);
        if (!booking) {
            if (window.Notifications) {
                window.Notifications.show('Prenotazione non trovata', 'error');
            }
            return;
        }

        this.showBookingModal(booking);
    },

    /**
     * Mostra modal dettagli prenotazione
     */
    showBookingModal(booking) {
        const statusClass = this.getStatusClass(booking.status);
        const statusLabel = this.getStatusLabel(booking.status);

        const modalHTML = `
            <div class="modal fade" id="bookingDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-calendar-check text-primary"></i>
                                Dettagli Prenotazione #${booking.id}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="booking-status mb-4">
                                <span class="badge bg-${statusClass} fs-6">${statusLabel}</span>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-4">
                                    <h6><i class="fas fa-building text-primary"></i> Spazio</h6>
                                    <div class="space-info">
                                        <h5>${booking.spaceName}</h5>
                                        <p class="text-muted mb-2">
                                            <i class="fas fa-map-marker-alt"></i> ${booking.spaceAddress}
                                        </p>
                                        <div class="space-details">
                                            <span class="badge bg-light text-dark">
                                                <i class="fas fa-users"></i> ${booking.people} persone
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="col-md-6 mb-4">
                                    <h6><i class="fas fa-calendar text-primary"></i> Date e Orari</h6>
                                    <div class="datetime-info">
                                        <div class="mb-2">
                                            <strong>Data inizio:</strong> ${this.formatDate(booking.startDate)}
                                        </div>
                                        <div class="mb-2">
                                            <strong>Data fine:</strong> ${this.formatDate(booking.endDate)}
                                        </div>
                                        <div class="mb-2">
                                            <strong>Orario:</strong> ${booking.startTime} - ${booking.endTime}
                                        </div>
                                        <div class="text-muted">
                                            Durata: ${this.calculateDuration(booking)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            ${booking.amenities && booking.amenities.length > 0 ? `
                                <div class="row">
                                    <div class="col-12 mb-4">
                                        <h6><i class="fas fa-list-check text-primary"></i> Servizi Inclusi</h6>
                                        <div class="amenities-grid">
                                            ${booking.amenities.map(amenity => `
                                                <div class="amenity-item">
                                                    <i class="fas fa-check text-success"></i>
                                                    <span>${this.getAmenityLabel(amenity)}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${booking.notes ? `
                                <div class="row">
                                    <div class="col-12 mb-4">
                                        <h6><i class="fas fa-sticky-note text-primary"></i> Note</h6>
                                        <div class="alert alert-light">
                                            ${booking.notes}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <h6><i class="fas fa-euro-sign text-primary"></i> Dettagli Pagamento</h6>
                                    <div class="payment-summary">
                                        <div class="d-flex justify-content-between mb-2">
                                            <span>Prezzo totale:</span>
                                            <strong class="text-success">€${booking.totalPrice}</strong>
                                        </div>
                                        <div class="text-muted">
                                            <small>IVA inclusa • Pagamento confermato</small>
                                        </div>
                                    </div>
                                </div>

                                <div class="col-md-6 mb-3">
                                    <h6><i class="fas fa-info-circle text-primary"></i> Info Prenotazione</h6>
                                    <div class="booking-meta">
                                        <div class="mb-1">
                                            <small class="text-muted">ID Prenotazione:</small>
                                            <span class="fw-bold">#${booking.id}</span>
                                        </div>
                                        <div class="mb-1">
                                            <small class="text-muted">Data prenotazione:</small>
                                            <span>${this.formatDateTime(booking.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i> Chiudi
                            </button>
                            ${this.isUpcoming(booking) && booking.status === 'confirmed' ? `
                                <button type="button" class="btn btn-outline-danger" 
                                        onclick="window.Bookings.cancelBooking(${booking.id})">
                                    <i class="fas fa-ban"></i> Cancella Prenotazione
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-primary" onclick="window.print()">
                                <i class="fas fa-print"></i> Stampa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Rimuovi modal esistente
        const existingModal = document.getElementById('bookingDetailModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Inserisci nuovo modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Mostra modal
        const modal = new bootstrap.Modal(document.getElementById('bookingDetailModal'));
        modal.show();
    },

    /**
     * Cancella prenotazione
     */
    cancelBooking(bookingId) {
        const booking = this.state.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        if (!confirm(`Sei sicuro di voler cancellare la prenotazione per "${booking.spaceName}"?`)) {
            return;
        }

        // Aggiorna status
        booking.status = 'cancelled';

        // Chiudi modal se aperto
        const modal = document.getElementById('bookingDetailModal');
        if (modal) {
            bootstrap.Modal.getInstance(modal)?.hide();
        }

        // Ricarica vista
        this.renderBookings();

        if (window.Notifications) {
            window.Notifications.show('Prenotazione cancellata con successo', 'success');
        }
    },

    /**
     * Lascia recensione
     */
    leaveReview(bookingId) {
        if (window.Notifications) {
            window.Notifications.show('Funzione recensioni in arrivo!', 'info');
        }
    },

    /**
     * Crea nuova prenotazione
     */
    createBooking(bookingData) {
        const newBooking = {
            id: Date.now(),
            userId: window.Auth?.getCurrentUser()?.id || 1,
            ...bookingData,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };

        this.state.bookings.push(newBooking);

        if (window.Notifications) {
            window.Notifications.show('Prenotazione effettuata con successo!', 'success');
        }

        return newBooking;
    },

    /**
     * Utility functions
     */
    getStatusClass(status) {
        const statusClasses = {
            'confirmed': 'success',
            'pending': 'warning',
            'cancelled': 'danger',
            'completed': 'primary'
        };
        return statusClasses[status] || 'secondary';
    },

    getStatusLabel(status) {
        const statusLabels = {
            'confirmed': 'Confermata',
            'pending': 'In Attesa',
            'cancelled': 'Cancellata',
            'completed': 'Completata'
        };
        return statusLabels[status] || status;
    },

    getAmenityLabel(amenity) {
        const labels = {
            'wifi': 'WiFi',
            'parking': 'Parcheggio',
            'coffee': 'Caffè',
            'printer': 'Stampante',
            'projector': 'Proiettore',
            'kitchen': 'Cucina'
        };
        return labels[amenity] || amenity;
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    calculateDuration(booking) {
        const start = new Date(`${booking.startDate} ${booking.startTime}`);
        const end = new Date(`${booking.endDate} ${booking.endTime}`);
        const diffMs = end - start;
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));

        if (diffHours < 24) {
            return `${diffHours} ore`;
        } else {
            const days = Math.floor(diffHours / 24);
            const hours = diffHours % 24;
            return hours > 0 ? `${days} giorni e ${hours} ore` : `${days} giorni`;
        }
    },

    isUpcoming(booking) {
        return new Date(booking.startDate) > new Date();
    }
};

// Auto-inizializzazione quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.Bookings) window.Bookings.init();
    });
} else {
    if (window.Bookings) window.Bookings.init();
}