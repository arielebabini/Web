/**
 * CoWorkSpace - Bookings Manager
 * Gestione prenotazioni spazi coworking
 */

window.Bookings = {
    /**
     * Stato del modulo
     */
    state: {
        initialized: false,
        loading: false,
        bookings: [],
        currentBooking: null,
        filters: {
            status: 'all',
            dateRange: null,
            space: null
        },
        cache: new Map()
    },

    /**
     * Configurazione
     */
    config: {
        maxAdvanceBookingDays: 90,
        minBookingDuration: 1, // ore
        maxBookingDuration: 24, // ore
        cancellationDeadline: 24, // ore prima
        endpoints: {
            bookings: '/api/bookings',
            create: '/api/bookings/create',
            update: '/api/bookings/update',
            cancel: '/api/bookings/cancel',
            availability: '/api/spaces/availability'
        }
    },

    /**
     * Templates HTML
     */
    templates: {
        bookingCard: `
            <div class="booking-card" data-booking-id="{id}">
                <div class="booking-header">
                    <div class="booking-status status-{status}">{statusText}</div>
                    <div class="booking-date">{date}</div>
                </div>
                <div class="booking-content">
                    <h5 class="booking-space">{spaceName}</h5>
                    <div class="booking-details">
                        <span class="booking-time">
                            <i class="fas fa-clock"></i> {startTime} - {endTime}
                        </span>
                        <span class="booking-duration">
                            <i class="fas fa-hourglass-half"></i> {duration}
                        </span>
                        <span class="booking-price">
                            <i class="fas fa-euro-sign"></i> {price}
                        </span>
                    </div>
                </div>
                <div class="booking-actions">
                    {actionButtons}
                </div>
            </div>
        `,

        bookingForm: `
            <form id="booking-form" class="booking-form">
                <div class="row">
                    <div class="col-md-6">
                        <label for="booking-date" class="form-label">Data</label>
                        <input type="date" id="booking-date" class="form-control" required>
                    </div>
                    <div class="col-md-3">
                        <label for="booking-start" class="form-label">Ora Inizio</label>
                        <select id="booking-start" class="form-select" required>
                            <option value="">Seleziona...</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label for="booking-end" class="form-label">Ora Fine</label>
                        <select id="booking-end" class="form-select" required>
                            <option value="">Seleziona...</option>
                        </select>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-6">
                        <label for="booking-guests" class="form-label">Numero Ospiti</label>
                        <select id="booking-guests" class="form-select" required>
                            <option value="">Seleziona...</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="booking-services" class="form-label">Servizi Aggiuntivi</label>
                        <div class="services-checkboxes">
                            <!-- Popolato dinamicamente -->
                        </div>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <label for="booking-notes" class="form-label">Note (opzionale)</label>
                        <textarea id="booking-notes" class="form-control" rows="3" 
                                  placeholder="Richieste speciali o note aggiuntive..."></textarea>
                    </div>
                </div>
                <div class="booking-summary mt-4">
                    <div class="summary-row">
                        <span>Prezzo base:</span>
                        <span id="base-price">€0.00</span>
                    </div>
                    <div class="summary-row">
                        <span>Servizi aggiuntivi:</span>
                        <span id="services-price">€0.00</span>
                    </div>
                    <div class="summary-row total">
                        <span><strong>Totale:</strong></span>
                        <span id="total-price"><strong>€0.00</strong></span>
                    </div>
                </div>
                <div class="form-actions mt-4">
                    <button type="button" class="btn btn-secondary" onclick="Utils.modal.hide()">
                        Annulla
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-calendar-check"></i> Conferma Prenotazione
                    </button>
                </div>
            </form>
        `
    },

    /**
     * Inizializza il modulo
     */
    async init() {
        try {
            console.log('📅 Initializing Bookings Manager...');

            // Verifica dipendenze
            if (!window.API || !window.Utils) {
                throw new Error('Required dependencies not available');
            }

            // Setup event listeners
            this.setupEventListeners();

            // Carica configurazione utente
            await this.loadUserBookings();

            this.state.initialized = true;
            console.log('✅ Bookings Manager initialized');

            return true;

        } catch (error) {
            console.error('❌ Failed to initialize Bookings Manager:', error);
            return false;
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listener per aggiornamenti auth
        document.addEventListener('auth:login', () => {
            this.loadUserBookings();
        });

        document.addEventListener('auth:logout', () => {
            this.clearBookings();
        });

        // Listener per refresh automatico
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.state.initialized) {
                this.refreshBookings();
            }
        });
    },

    /**
     * Carica prenotazioni utente
     */
    async loadUserBookings() {
        if (!window.Auth?.isAuthenticated()) {
            return;
        }

        try {
            this.state.loading = true;

            const response = await window.API.get(this.config.endpoints.bookings);

            if (response.success) {
                this.state.bookings = response.data || [];
                this.triggerEvent('bookings:loaded');
            }

        } catch (error) {
            console.error('Error loading user bookings:', error);
            window.Utils?.notifications?.show('Errore nel caricamento delle prenotazioni', 'error');
        } finally {
            this.state.loading = false;
        }
    },

    /**
     * Crea nuova prenotazione
     */
    async createBooking(bookingData) {
        try {
            // Validazione dati
            const validation = this.validateBookingData(bookingData);
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            this.state.loading = true;

            const response = await window.API.post(this.config.endpoints.create, bookingData);

            if (response.success) {
                // Aggiungi alla lista locale
                this.state.bookings.unshift(response.data);

                // Mostra conferma
                window.Utils?.notifications?.show('Prenotazione confermata!', 'success');

                // Trigger evento
                this.triggerEvent('booking:created', response.data);

                return response.data;
            } else {
                throw new Error(response.message || 'Errore nella creazione della prenotazione');
            }

        } catch (error) {
            console.error('Error creating booking:', error);
            window.Utils?.notifications?.show(error.message, 'error');
            throw error;
        } finally {
            this.state.loading = false;
        }
    },

    /**
     * Aggiorna prenotazione esistente
     */
    async updateBooking(bookingId, updateData) {
        try {
            this.state.loading = true;

            const response = await window.API.put(
                `${this.config.endpoints.update}/${bookingId}`,
                updateData
            );

            if (response.success) {
                // Aggiorna nella lista locale
                const index = this.state.bookings.findIndex(b => b.id === bookingId);
                if (index !== -1) {
                    this.state.bookings[index] = { ...this.state.bookings[index], ...response.data };
                }

                window.Utils?.notifications?.show('Prenotazione aggiornata', 'success');

                this.triggerEvent('booking:updated', response.data);

                return response.data;
            } else {
                throw new Error(response.message || 'Errore nell\'aggiornamento della prenotazione');
            }

        } catch (error) {
            console.error('Error updating booking:', error);
            window.Utils?.notifications?.show(error.message, 'error');
            throw error;
        } finally {
            this.state.loading = false;
        }
    },

    /**
     * Cancella prenotazione
     */
    async cancelBooking(bookingId, reason = '') {
        try {
            // Controlla se la cancellazione è ancora possibile
            const booking = this.getBookingById(bookingId);
            if (!booking) {
                throw new Error('Prenotazione non trovata');
            }

            if (!this.canCancelBooking(booking)) {
                throw new Error('Non è più possibile cancellare questa prenotazione');
            }

            this.state.loading = true;

            const response = await window.API.post(
                `${this.config.endpoints.cancel}/${bookingId}`,
                { reason }
            );

            if (response.success) {
                // Aggiorna status nella lista locale
                const index = this.state.bookings.findIndex(b => b.id === bookingId);
                if (index !== -1) {
                    this.state.bookings[index].status = 'cancelled';
                    this.state.bookings[index].cancelledAt = new Date().toISOString();
                    this.state.bookings[index].cancellationReason = reason;
                }

                window.Utils?.notifications?.show('Prenotazione cancellata', 'success');

                this.triggerEvent('booking:cancelled', booking);

                return true;
            } else {
                throw new Error(response.message || 'Errore nella cancellazione della prenotazione');
            }

        } catch (error) {
            console.error('Error cancelling booking:', error);
            window.Utils?.notifications?.show(error.message, 'error');
            throw error;
        } finally {
            this.state.loading = false;
        }
    },

    /**
     * Controlla disponibilità spazio
     */
    async checkAvailability(spaceId, date, startTime, endTime) {
        try {
            const cacheKey = `availability_${spaceId}_${date}_${startTime}_${endTime}`;

            // Controlla cache
            if (this.state.cache.has(cacheKey)) {
                const cached = this.state.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 300000) { // 5 minuti
                    return cached.data;
                }
            }

            const response = await window.API.get(this.config.endpoints.availability, {
                spaceId,
                date,
                startTime,
                endTime
            });

            if (response.success) {
                // Salva in cache
                this.state.cache.set(cacheKey, {
                    data: response.data,
                    timestamp: Date.now()
                });

                return response.data;
            } else {
                throw new Error(response.message || 'Errore nel controllo disponibilità');
            }

        } catch (error) {
            console.error('Error checking availability:', error);
            return { available: false, message: 'Errore nel controllo disponibilità' };
        }
    },

    /**
     * Valida dati prenotazione
     */
    validateBookingData(data) {
        // Data richiesta
        if (!data.date) {
            return { valid: false, message: 'Data richiesta' };
        }

        // Controlla che la data non sia nel passato
        const bookingDate = new Date(data.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (bookingDate < today) {
            return { valid: false, message: 'Non è possibile prenotare per date passate' };
        }

        // Controlla limite massimo anticipazione
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + this.config.maxAdvanceBookingDays);

        if (bookingDate > maxDate) {
            return { valid: false, message: `Non è possibile prenotare oltre ${this.config.maxAdvanceBookingDays} giorni` };
        }

        // Orario richiesto
        if (!data.startTime || !data.endTime) {
            return { valid: false, message: 'Orario di inizio e fine richiesti' };
        }

        // Controlla durata
        const start = new Date(`${data.date}T${data.startTime}`);
        const end = new Date(`${data.date}T${data.endTime}`);
        const duration = (end - start) / (1000 * 60 * 60); // ore

        if (duration < this.config.minBookingDuration) {
            return { valid: false, message: `Durata minima: ${this.config.minBookingDuration} ora/e` };
        }

        if (duration > this.config.maxBookingDuration) {
            return { valid: false, message: `Durata massima: ${this.config.maxBookingDuration} ore` };
        }

        // Spazio richiesto
        if (!data.spaceId) {
            return { valid: false, message: 'Spazio richiesto' };
        }

        // Numero ospiti
        if (!data.guests || data.guests < 1) {
            return { valid: false, message: 'Numero ospiti richiesto' };
        }

        return { valid: true };
    },

    /**
     * Controlla se una prenotazione può essere cancellata
     */
    canCancelBooking(booking) {
        if (booking.status === 'cancelled' || booking.status === 'completed') {
            return false;
        }

        const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
        const now = new Date();
        const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

        return hoursUntilBooking > this.config.cancellationDeadline;
    },

    /**
     * Ottieni prenotazione per ID
     */
    getBookingById(bookingId) {
        return this.state.bookings.find(booking => booking.id === bookingId);
    },

    /**
     * Filtra prenotazioni
     */
    getFilteredBookings() {
        let filtered = [...this.state.bookings];

        // Filtra per status
        if (this.state.filters.status !== 'all') {
            filtered = filtered.filter(booking => booking.status === this.state.filters.status);
        }

        // Filtra per range date
        if (this.state.filters.dateRange) {
            const { start, end } = this.state.filters.dateRange;
            filtered = filtered.filter(booking => {
                const bookingDate = new Date(booking.date);
                return bookingDate >= start && bookingDate <= end;
            });
        }

        // Filtra per spazio
        if (this.state.filters.space) {
            filtered = filtered.filter(booking => booking.spaceId === this.state.filters.space);
        }

        return filtered;
    },

    /**
     * Mostra modal prenotazione
     */
    showBookingModal(spaceId, spaceData = null) {
        const modalContent = this.buildBookingForm(spaceId, spaceData);

        window.Utils?.modal?.show({
            title: 'Nuova Prenotazione',
            content: modalContent,
            size: 'lg',
            onShow: () => {
                this.initializeBookingForm(spaceId, spaceData);
            }
        });
    },

    /**
     * Costruisce form prenotazione
     */
    buildBookingForm(spaceId, spaceData) {
        let form = this.templates.bookingForm;

        // Sostituzioni dinamiche se necessario
        if (spaceData) {
            form = form.replace('{spaceName}', spaceData.name);
        }

        return form;
    },

    /**
     * Inizializza form prenotazione
     */
    async initializeBookingForm(spaceId, spaceData) {
        try {
            // Popola le opzioni orario
            this.populateTimeOptions();

            // Popola numero ospiti basato sulla capacità dello spazio
            this.populateGuestOptions(spaceData?.capacity || 10);

            // Popola servizi aggiuntivi
            if (spaceData?.services) {
                this.populateServices(spaceData.services);
            }

            // Setup event listeners del form
            this.setupFormEventListeners(spaceId, spaceData);

            // Imposta data minima
            const dateInput = document.getElementById('booking-date');
            if (dateInput) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                dateInput.min = tomorrow.toISOString().split('T')[0];

                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() + this.config.maxAdvanceBookingDays);
                dateInput.max = maxDate.toISOString().split('T')[0];
            }

        } catch (error) {
            console.error('Error initializing booking form:', error);
        }
    },

    /**
     * Popola opzioni orario
     */
    populateTimeOptions() {
        const startSelect = document.getElementById('booking-start');
        const endSelect = document.getElementById('booking-end');

        if (!startSelect || !endSelect) return;

        // Orari dalle 8:00 alle 20:00
        for (let hour = 8; hour <= 20; hour++) {
            const time = `${hour.toString().padStart(2, '0')}:00`;
            const option = `<option value="${time}">${time}</option>`;
            startSelect.innerHTML += option;

            if (hour > 8) { // L'orario di fine inizia da 9:00
                endSelect.innerHTML += option;
            }
        }

        // Event listener per aggiornare orario fine
        startSelect.addEventListener('change', () => {
            const selectedHour = parseInt(startSelect.value.split(':')[0]);
            endSelect.innerHTML = '<option value="">Seleziona...</option>';

            for (let hour = selectedHour + 1; hour <= 21; hour++) {
                const time = `${hour.toString().padStart(2, '0')}:00`;
                endSelect.innerHTML += `<option value="${time}">${time}</option>`;
            }
        });
    },

    /**
     * Popola opzioni numero ospiti
     */
    populateGuestOptions(maxCapacity) {
        const guestSelect = document.getElementById('booking-guests');
        if (!guestSelect) return;

        for (let i = 1; i <= maxCapacity; i++) {
            guestSelect.innerHTML += `<option value="${i}">${i} ${i === 1 ? 'persona' : 'persone'}</option>`;
        }
    },

    /**
     * Popola servizi aggiuntivi
     */
    populateServices(services) {
        const container = document.querySelector('.services-checkboxes');
        if (!container || !services) return;

        services.forEach(service => {
            const checkbox = `
                <div class="form-check">
                    <input class="form-check-input service-checkbox" type="checkbox" 
                           value="${service.id}" id="service-${service.id}" 
                           data-price="${service.price}">
                    <label class="form-check-label" for="service-${service.id}">
                        ${service.name} (+€${service.price})
                    </label>
                </div>
            `;
            container.innerHTML += checkbox;
        });
    },

    /**
     * Setup event listeners del form
     */
    setupFormEventListeners(spaceId, spaceData) {
        const form = document.getElementById('booking-form');
        if (!form) return;

        // Submit form
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBookingSubmit(spaceId, spaceData);
        });

        // Aggiorna prezzo quando cambiano i valori
        const priceInputs = form.querySelectorAll('input, select');
        priceInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateBookingPrice(spaceData);
            });
        });

        // Controlla disponibilità quando cambiano data/orario
        const dateInput = document.getElementById('booking-date');
        const startInput = document.getElementById('booking-start');
        const endInput = document.getElementById('booking-end');

        const checkAvailabilityDebounced = Utils.debounce(() => {
            this.checkAndUpdateAvailability(spaceId);
        }, 500);

        [dateInput, startInput, endInput].forEach(input => {
            if (input) {
                input.addEventListener('change', checkAvailabilityDebounced);
            }
        });
    },

    /**
     * Aggiorna prezzo prenotazione
     */
    updateBookingPrice(spaceData) {
        if (!spaceData) return;

        const startTime = document.getElementById('booking-start')?.value;
        const endTime = document.getElementById('booking-end')?.value;

        if (!startTime || !endTime) return;

        // Calcola durata
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const duration = (end - start) / (1000 * 60 * 60);

        // Prezzo base
        const basePrice = (spaceData.hourlyRate || 0) * duration;

        // Servizi aggiuntivi
        const serviceCheckboxes = document.querySelectorAll('.service-checkbox:checked');
        let servicesPrice = 0;
        serviceCheckboxes.forEach(checkbox => {
            servicesPrice += parseFloat(checkbox.dataset.price || 0);
        });

        // Aggiorna UI
        document.getElementById('base-price').textContent = `€${basePrice.toFixed(2)}`;
        document.getElementById('services-price').textContent = `€${servicesPrice.toFixed(2)}`;
        document.getElementById('total-price').innerHTML = `<strong>€${(basePrice + servicesPrice).toFixed(2)}</strong>`;
    },

    /**
     * Controlla e aggiorna disponibilità
     */
    async checkAndUpdateAvailability(spaceId) {
        const date = document.getElementById('booking-date')?.value;
        const startTime = document.getElementById('booking-start')?.value;
        const endTime = document.getElementById('booking-end')?.value;

        if (!date || !startTime || !endTime) return;

        try {
            const availability = await this.checkAvailability(spaceId, date, startTime, endTime);

            // Aggiorna UI basandosi sulla disponibilità
            const submitBtn = document.querySelector('#booking-form button[type="submit"]');
            if (submitBtn) {
                if (availability.available) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Conferma Prenotazione';
                } else {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-times"></i> Non Disponibile';
                }
            }

        } catch (error) {
            console.error('Error checking availability:', error);
        }
    },

    /**
     * Gestisce submit del form
     */
    async handleBookingSubmit(spaceId, spaceData) {
        try {
            const formData = this.gatherFormData(spaceId);

            // Valida dati
            const validation = this.validateBookingData(formData);
            if (!validation.valid) {
                window.Utils?.notifications?.show(validation.message, 'error');
                return;
            }

            // Controlla disponibilità finale
            const availability = await this.checkAvailability(
                spaceId,
                formData.date,
                formData.startTime,
                formData.endTime
            );

            if (!availability.available) {
                window.Utils?.notifications?.show('Lo spazio non è più disponibile per l\'orario selezionato', 'error');
                return;
            }

            // Crea prenotazione
            const booking = await this.createBooking(formData);

            if (booking) {
                window.Utils?.modal?.hide();

                // Reindirizza alle prenotazioni o aggiorna la vista
                if (window.Navigation?.showSection) {
                    setTimeout(() => {
                        window.Navigation.showSection('profile', 'bookings');
                    }, 1000);
                }
            }

        } catch (error) {
            console.error('Error submitting booking:', error);
        }
    },

    /**
     * Raccoglie dati dal form
     */
    gatherFormData(spaceId) {
        const form = document.getElementById('booking-form');
        if (!form) return {};

        const data = {
            spaceId: spaceId,
            date: form.querySelector('#booking-date')?.value,
            startTime: form.querySelector('#booking-start')?.value,
            endTime: form.querySelector('#booking-end')?.value,
            guests: parseInt(form.querySelector('#booking-guests')?.value || '1'),
            notes: form.querySelector('#booking-notes')?.value || '',
            services: []
        };

        // Raccogli servizi selezionati
        const serviceCheckboxes = form.querySelectorAll('.service-checkbox:checked');
        serviceCheckboxes.forEach(checkbox => {
            data.services.push({
                id: checkbox.value,
                price: parseFloat(checkbox.dataset.price || 0)
            });
        });

        return data;
    },

    /**
     * Refresh prenotazioni
     */
    async refreshBookings() {
        if (this.state.loading) return;

        await this.loadUserBookings();
    },

    /**
     * Pulisci prenotazioni
     */
    clearBookings() {
        this.state.bookings = [];
        this.state.currentBooking = null;
        this.state.cache.clear();
    },

    /**
     * Imposta filtri
     */
    setFilters(filters) {
        this.state.filters = { ...this.state.filters, ...filters };
        this.triggerEvent('bookings:filtered');
    },

    /**
     * Reset filtri
     */
    resetFilters() {
        this.state.filters = {
            status: 'all',
            dateRange: null,
            space: null
        };
        this.triggerEvent('bookings:filtered');
    },

    /**
     * Trigger evento custom
     */
    triggerEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...data, bookings: this }
        });
        document.dispatchEvent(event);
    },

    /**
     * Ottieni statistiche prenotazioni
     */
    getBookingStats() {
        const bookings = this.state.bookings;

        return {
            total: bookings.length,
            active: bookings.filter(b => b.status === 'confirmed').length,
            completed: bookings.filter(b => b.status === 'completed').length,
            cancelled: bookings.filter(b => b.status === 'cancelled').length,
            upcoming: bookings.filter(b => {
                const bookingDate = new Date(`${b.date}T${b.startTime}`);
                return bookingDate > new Date() && b.status === 'confirmed';
            }).length
        };
    },

    /**
     * Esporta prenotazioni
     */
    exportBookings(format = 'json') {
        const bookings = this.getFilteredBookings();

        if (format === 'json') {
            const dataStr = JSON.stringify(bookings, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            Utils.download(blob, 'prenotazioni.json');
        } else if (format === 'csv') {
            const csv = this.convertToCSV(bookings);
            const blob = new Blob([csv], { type: 'text/csv' });
            Utils.download(blob, 'prenotazioni.csv');
        }
    },

    /**
     * Converte prenotazioni in CSV
     */
    convertToCSV(bookings) {
        const headers = ['ID', 'Data', 'Ora Inizio', 'Ora Fine', 'Spazio', 'Ospiti', 'Status', 'Prezzo'];
        const rows = bookings.map(booking => [
            booking.id,
            booking.date,
            booking.startTime,
            booking.endTime,
            booking.spaceName || '',
            booking.guests,
            booking.status,
            booking.totalPrice || ''
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
};

// Auto-inizializzazione se DOM pronto e dipendenze disponibili
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.API && window.Utils) {
            window.Bookings.init();
        }
    });
} else if (window.API && window.Utils) {
    window.Bookings.init();
}