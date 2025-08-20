/**
 * CoWorkSpace - Sistema Prenotazioni
 * Gestisce creazione, modifica, cancellazione e pagamento prenotazioni
 */

window.Booking = {
    // ==================== STATO INTERNO ====================
    state: {
        bookings: [],
        selectedSpace: null,
        selectedDate: null,
        selectedTimeSlot: null,
        availableSlots: [],
        currentBooking: null,
        isLoading: false,
        step: 1, // Wizard steps: 1=spazio, 2=data/ora, 3=conferma, 4=pagamento
        bookingForm: {
            spaceId: null,
            date: null,
            startTime: null,
            endTime: null,
            duration: 1,
            totalPrice: 0,
            notes: '',
            paymentMethod: 'card'
        },
        paymentIntent: null,
        userBookings: []
    },

    // ==================== INIZIALIZZAZIONE ====================
    async init() {
        console.log('📅 Booking module initializing...');

        this.setupEventListeners();
        this.initDatePicker();

        // Carica prenotazioni utente se autenticato
        if (window.Auth.isAuthenticated()) {
            await this.loadUserBookings();
        }

        // Listener per cambio sezione
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail.section === 'bookings') {
                this.handleBookingSection(e.detail.params);
            }
        });

        console.log('✅ Booking module initialized');
    },

    // ==================== GESTIONE SEZIONE PRENOTAZIONI ====================
    async handleBookingSection(params = {}) {
        const container = document.getElementById('bookings-container');
        if (!container) return;

        // Se arriva con spaceId, inizia wizard di prenotazione
        if (params.spaceId) {
            await this.startBookingWizard(params.spaceId);
        } else {
            // Mostra lista prenotazioni esistenti
            await this.showBookingsList();
        }
    },

    // ==================== WIZARD PRENOTAZIONE ====================
    async startBookingWizard(spaceId) {
        this.resetBookingState();
        this.state.bookingForm.spaceId = spaceId;
        this.state.step = 1;

        try {
            // Carica dettagli spazio
            const response = await window.api.getSpace(spaceId);
            if (response.success) {
                this.state.selectedSpace = response.data;
                this.renderBookingWizard();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('❌ Error loading space for booking:', error);
            window.notifications?.show('Errore nel caricamento spazio', 'error');
        }
    },

    renderBookingWizard() {
        const container = document.getElementById('bookings-container');
        if (!container) return;

        const wizardHTML = `
            <div class="booking-wizard">
                <div class="booking-progress">
                    ${this.buildProgressSteps()}
                </div>
                
                <div class="booking-content">
                    ${this.buildWizardStep()}
                </div>
            </div>
        `;

        container.innerHTML = wizardHTML;
        this.attachBookingEvents();
    },

    buildProgressSteps() {
        const steps = [
            { step: 1, title: 'Spazio', icon: 'fas fa-building' },
            { step: 2, title: 'Data e Ora', icon: 'fas fa-calendar-alt' },
            { step: 3, title: 'Conferma', icon: 'fas fa-check-circle' },
            { step: 4, title: 'Pagamento', icon: 'fas fa-credit-card' }
        ];

        return `
            <div class="wizard-steps">
                ${steps.map(stepData => `
                    <div class="wizard-step ${this.state.step === stepData.step ? 'active' : ''} ${this.state.step > stepData.step ? 'completed' : ''}">
                        <div class="step-icon">
                            <i class="${stepData.icon}"></i>
                        </div>
                        <div class="step-title">${stepData.title}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    buildWizardStep() {
        switch (this.state.step) {
            case 1:
                return this.buildSpaceSelection();
            case 2:
                return this.buildDateTimeSelection();
            case 3:
                return this.buildBookingConfirmation();
            case 4:
                return this.buildPaymentStep();
            default:
                return '<div class="alert alert-danger">Errore nello step del wizard</div>';
        }
    },

    // ==================== STEP 1: SELEZIONE SPAZIO ====================
    buildSpaceSelection() {
        if (!this.state.selectedSpace) {
            return '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Caricamento...</div>';
        }

        const space = this.state.selectedSpace;

        return `
            <div class="booking-step-content">
                <div class="step-header">
                    <h3>Conferma Spazio Selezionato</h3>
                    <p>Verifica i dettagli dello spazio scelto</p>
                </div>
                
                <div class="selected-space-card">
                    <div class="row">
                        <div class="col-md-4">
                            <img src="${space.images?.[0] || '/assets/images/placeholder-space.jpg'}" 
                                 class="img-fluid rounded" alt="${space.name}">
                        </div>
                        <div class="col-md-8">
                            <h4>${space.name}</h4>
                            <p class="text-muted">${space.description}</p>
                            
                            <div class="space-details">
                                <div class="detail-item">
                                    <i class="fas fa-map-marker-alt text-primary"></i>
                                    <span>${space.address}</span>
                                </div>
                                <div class="detail-item">
                                    <i class="fas fa-users text-primary"></i>
                                    <span>Capacità: ${space.capacity} persone</span>
                                </div>
                                <div class="detail-item">
                                    <i class="fas fa-euro-sign text-primary"></i>
                                    <span>€${space.pricePerHour}/ora</span>
                                </div>
                            </div>
                            
                            <div class="space-amenities mt-3">
                                <h6>Servizi inclusi:</h6>
                                <div class="amenities-list">
                                    ${space.amenities.map(amenity =>
            `<span class="badge bg-light text-dark me-1">${amenity}</span>`
        ).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="step-actions">
                    <button class="btn btn-outline-secondary" onclick="Navigation.showSection('spaces')">
                        <i class="fas fa-arrow-left"></i> Cambia Spazio
                    </button>
                    <button class="btn btn-primary" onclick="Booking.nextStep()">
                        Continua <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    },

    // ==================== STEP 2: DATA E ORA ====================
    buildDateTimeSelection() {
        return `
            <div class="booking-step-content">
                <div class="step-header">
                    <h3>Seleziona Data e Orario</h3>
                    <p>Scegli quando utilizzare lo spazio</p>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="date-selection">
                            <h5>Data</h5>
                            <input type="date" id="booking-date" class="form-control" 
                                   min="${new Date().toISOString().split('T')[0]}"
                                   onchange="Booking.onDateChange(this.value)">
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="duration-selection">
                            <h5>Durata</h5>
                            <select id="booking-duration" class="form-select" onchange="Booking.onDurationChange(this.value)">
                                <option value="1">1 ora</option>
                                <option value="2">2 ore</option>
                                <option value="4">4 ore</option>
                                <option value="8">Giornata intera (8 ore)</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="time-slots-container mt-4" id="time-slots-container">
                    ${this.buildTimeSlotsPlaceholder()}
                </div>
                
                <div class="booking-summary mt-4" id="booking-summary" style="display: none;">
                    ${this.buildBookingSummary()}
                </div>
                
                <div class="step-actions">
                    <button class="btn btn-outline-secondary" onclick="Booking.previousStep()">
                        <i class="fas fa-arrow-left"></i> Indietro
                    </button>
                    <button class="btn btn-primary" id="continue-time-btn" onclick="Booking.nextStep()" disabled>
                        Continua <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    },

    buildTimeSlotsPlaceholder() {
        return `
            <div class="text-center text-muted">
                <i class="fas fa-calendar-day fa-2x mb-3"></i>
                <p>Seleziona una data per vedere gli orari disponibili</p>
            </div>
        `;
    },

    // ==================== STEP 3: CONFERMA PRENOTAZIONE ====================
    buildBookingConfirmation() {
        const space = this.state.selectedSpace;
        const form = this.state.bookingForm;

        return `
            <div class="booking-step-content">
                <div class="step-header">
                    <h3>Conferma Prenotazione</h3>
                    <p>Verifica tutti i dettagli prima di procedere</p>
                </div>
                
                <div class="booking-confirmation-card">
                    <div class="row">
                        <div class="col-md-8">
                            <div class="booking-details">
                                <h5><i class="fas fa-building text-primary"></i> ${space.name}</h5>
                                <p class="text-muted">${space.address}</p>
                                
                                <div class="booking-info">
                                    <div class="info-row">
                                        <span class="label">Data:</span>
                                        <span class="value">${this.formatDate(form.date)}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="label">Orario:</span>
                                        <span class="value">${form.startTime} - ${form.endTime}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="label">Durata:</span>
                                        <span class="value">${form.duration} ${form.duration === 1 ? 'ora' : 'ore'}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="label">Tipo spazio:</span>
                                        <span class="value">${this.formatSpaceType(space.type)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <div class="price-breakdown">
                                <h6>Riepilogo Costi</h6>
                                <div class="price-item">
                                    <span>€${space.pricePerHour}/ora × ${form.duration} ore</span>
                                    <span>€${(space.pricePerHour * form.duration).toFixed(2)}</span>
                                </div>
                                <div class="price-item">
                                    <span>Commissioni servizio</span>
                                    <span>€${(space.pricePerHour * form.duration * 0.05).toFixed(2)}</span>
                                </div>
                                <hr>
                                <div class="price-total">
                                    <strong>Totale: €${form.totalPrice.toFixed(2)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="additional-notes mt-3">
                        <label for="booking-notes" class="form-label">Note aggiuntive (opzionale)</label>
                        <textarea id="booking-notes" class="form-control" rows="3" 
                                  placeholder="Aggiungi eventuali richieste speciali..."
                                  onchange="Booking.updateNotes(this.value)"></textarea>
                    </div>
                </div>
                
                <div class="step-actions">
                    <button class="btn btn-outline-secondary" onclick="Booking.previousStep()">
                        <i class="fas fa-arrow-left"></i> Indietro
                    </button>
                    <button class="btn btn-primary" onclick="Booking.nextStep()">
                        Procedi al Pagamento <i class="fas fa-credit-card"></i>
                    </button>
                </div>
            </div>
        `;
    },

    // ==================== STEP 4: PAGAMENTO ====================
    buildPaymentStep() {
        return `
            <div class="booking-step-content">
                <div class="step-header">
                    <h3>Pagamento</h3>
                    <p>Completa la prenotazione con il pagamento</p>
                </div>
                
                <div class="row">
                    <div class="col-md-8">
                        <div class="payment-form">
                            <div class="payment-methods mb-4">
                                <h6>Metodo di Pagamento</h6>
                                <div class="payment-options">
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="paymentMethod" 
                                               id="payment-card" value="card" checked
                                               onchange="Booking.selectPaymentMethod('card')">
                                        <label class="form-check-label" for="payment-card">
                                            <i class="fas fa-credit-card"></i> Carta di Credito/Debito
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="paymentMethod" 
                                               id="payment-paypal" value="paypal"
                                               onchange="Booking.selectPaymentMethod('paypal')">
                                        <label class="form-check-label" for="payment-paypal">
                                            <i class="fab fa-paypal"></i> PayPal
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="payment-form-container">
                                ${this.buildCardPaymentForm()}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="payment-summary">
                            <h6>Riepilogo Ordine</h6>
                            <div class="summary-item">
                                <span>${this.state.selectedSpace.name}</span>
                                <span>€${this.state.bookingForm.totalPrice.toFixed(2)}</span>
                            </div>
                            <div class="summary-date">
                                ${this.formatDate(this.state.bookingForm.date)} | ${this.state.bookingForm.startTime}-${this.state.bookingForm.endTime}
                            </div>
                            <hr>
                            <div class="summary-total">
                                <strong>Totale: €${this.state.bookingForm.totalPrice.toFixed(2)}</strong>
                            </div>
                            
                            <div class="security-info mt-3">
                                <small class="text-muted">
                                    <i class="fas fa-lock"></i> Pagamento sicuro SSL
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="step-actions">
                    <button class="btn btn-outline-secondary" onclick="Booking.previousStep()">
                        <i class="fas fa-arrow-left"></i> Indietro
                    </button>
                    <button class="btn btn-success btn-lg" onclick="Booking.processPayment()" id="pay-button">
                        <i class="fas fa-credit-card"></i> Paga €${this.state.bookingForm.totalPrice.toFixed(2)}
                    </button>
                </div>
            </div>
        `;
    },

    buildCardPaymentForm() {
        return `
            <div class="card-payment-form">
                <div class="row">
                    <div class="col-12">
                        <div class="mb-3">
                            <label for="card-number" class="form-label">Numero Carta</label>
                            <input type="text" class="form-control" id="card-number" 
                                   placeholder="1234 5678 9012 3456" maxlength="19">
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <div class="mb-3">
                            <label for="card-expiry" class="form-label">Scadenza</label>
                            <input type="text" class="form-control" id="card-expiry" 
                                   placeholder="MM/AA" maxlength="5">
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="mb-3">
                            <label for="card-cvc" class="form-label">CVC</label>
                            <input type="text" class="form-control" id="card-cvc" 
                                   placeholder="123" maxlength="4">
                        </div>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label for="card-name" class="form-label">Nome Intestatario</label>
                    <input type="text" class="form-control" id="card-name" 
                           placeholder="Nome come appare sulla carta">
                </div>
            </div>
        `;
    },

    // ==================== GESTIONE EVENTI ====================
    async onDateChange(date) {
        this.state.bookingForm.date = date;
        await this.loadAvailableSlots(date);
    },

    onDurationChange(duration) {
        this.state.bookingForm.duration = parseInt(duration);
        this.calculatePrice();

        // Ricarica slot se data selezionata
        if (this.state.bookingForm.date) {
            this.loadAvailableSlots(this.state.bookingForm.date);
        }
    },

    async loadAvailableSlots(date) {
        const container = document.getElementById('time-slots-container');
        if (!container) return;

        try {
            container.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Caricamento orari...</div>';

            const response = await window.api.getSpaceAvailability(
                this.state.bookingForm.spaceId,
                { date, duration: this.state.bookingForm.duration }
            );

            if (response.success) {
                this.state.availableSlots = response.data.slots || [];
                container.innerHTML = this.buildTimeSlots();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('❌ Error loading availability:', error);
            container.innerHTML = this.buildMockTimeSlots();
        }
    },

    buildTimeSlots() {
        if (this.state.availableSlots.length === 0) {
            return `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    Nessun orario disponibile per la data selezionata
                </div>
            `;
        }

        return `
            <div class="time-slots">
                <h6>Orari Disponibili</h6>
                <div class="slots-grid">
                    ${this.state.availableSlots.map(slot => `
                        <button class="time-slot-btn ${slot.available ? 'available' : 'unavailable'}"
                                data-start="${slot.startTime}" data-end="${slot.endTime}"
                                onclick="Booking.selectTimeSlot('${slot.startTime}', '${slot.endTime}')"
                                ${!slot.available ? 'disabled' : ''}>
                            ${slot.startTime} - ${slot.endTime}
                            ${!slot.available ? '<small>Occupato</small>' : ''}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    buildMockTimeSlots() {
        // Fallback con orari mock
        const slots = [];
        for (let hour = 9; hour <= 18; hour++) {
            const startTime = `${hour.toString().padStart(2, '0')}:00`;
            const endTime = `${(hour + this.state.bookingForm.duration).toString().padStart(2, '0')}:00`;

            if (hour + this.state.bookingForm.duration <= 19) {
                slots.push({
                    startTime,
                    endTime,
                    available: Math.random() > 0.3 // 70% available
                });
            }
        }

        this.state.availableSlots = slots;
        return this.buildTimeSlots();
    },

    selectTimeSlot(startTime, endTime) {
        // Rimuovi selezione precedente
        document.querySelectorAll('.time-slot-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Seleziona nuovo slot
        const selectedBtn = document.querySelector(`[data-start="${startTime}"]`);
        selectedBtn?.classList.add('selected');

        // Aggiorna stato
        this.state.bookingForm.startTime = startTime;
        this.state.bookingForm.endTime = endTime;

        this.calculatePrice();
        this.showBookingSummary();

        // Abilita pulsante continua
        const continueBtn = document.getElementById('continue-time-btn');
        if (continueBtn) continueBtn.disabled = false;
    },

    calculatePrice() {
        if (!this.state.selectedSpace) return;

        const basePrice = this.state.selectedSpace.pricePerHour * this.state.bookingForm.duration;
        const serviceFeePer = 0.05; // 5% commissione
        const serviceFee = basePrice * serviceFeePer;

        this.state.bookingForm.totalPrice = basePrice + serviceFee;
    },

    showBookingSummary() {
        const summaryContainer = document.getElementById('booking-summary');
        if (summaryContainer) {
            summaryContainer.style.display = 'block';
            summaryContainer.innerHTML = this.buildBookingSummary();
        }
    },

    buildBookingSummary() {
        const form = this.state.bookingForm;

        return `
            <div class="booking-summary-card">
                <h6>Riepilogo Selezione</h6>
                <div class="summary-details">
                    <div class="summary-row">
                        <span>Data:</span>
                        <span>${this.formatDate(form.date)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Orario:</span>
                        <span>${form.startTime} - ${form.endTime}</span>
                    </div>
                    <div class="summary-row">
                        <span>Durata:</span>
                        <span>${form.duration} ${form.duration === 1 ? 'ora' : 'ore'}</span>
                    </div>
                    <div class="summary-row total">
                        <span><strong>Totale:</strong></span>
                        <span><strong>€${form.totalPrice.toFixed(2)}</strong></span>
                    </div>
                </div>
            </div>
        `;
    },

    // ==================== NAVIGAZIONE WIZARD ====================
    nextStep() {
        if (this.validateCurrentStep()) {
            this.state.step++;
            this.renderBookingWizard();
        }
    },

    previousStep() {
        if (this.state.step > 1) {
            this.state.step--;
            this.renderBookingWizard();
        }
    },

    validateCurrentStep() {
        switch (this.state.step) {
            case 1:
                return this.state.selectedSpace !== null;
            case 2:
                return this.state.bookingForm.date &&
                    this.state.bookingForm.startTime &&
                    this.state.bookingForm.endTime;
            case 3:
                return true;
            default:
                return false;
        }
    },

    // ==================== PAGAMENTO ====================
    async processPayment() {
        const payButton = document.getElementById('pay-button');
        if (!payButton) return;

        const originalText = payButton.innerHTML;
        payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Elaborazione...';
        payButton.disabled = true;

        try {
            // Crea payment intent
            const paymentResponse = await window.api.createPaymentIntent({
                spaceId: this.state.bookingForm.spaceId,
                date: this.state.bookingForm.date,
                startTime: this.state.bookingForm.startTime,
                endTime: this.state.bookingForm.endTime,
                duration: this.state.bookingForm.duration,
                totalPrice: this.state.bookingForm.totalPrice,
                notes: this.state.bookingForm.notes
            });

            if (!paymentResponse.success) {
                throw new Error(paymentResponse.message);
            }

            // Simula processo di pagamento
            await this.simulatePayment(paymentResponse.data);

        } catch (error) {
            console.error('❌ Payment error:', error);
            window.notifications?.show('Errore nel pagamento: ' + error.message, 'error');
            payButton.innerHTML = originalText;
            payButton.disabled = false;
        }
    },

    async simulatePayment(paymentData) {
        // Simula ritardo pagamento
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
            // Conferma pagamento
            const confirmResponse = await window.api.confirmPayment(
                paymentData.paymentIntentId,
                'pm_card_visa' // Mock payment method
            );

            if (confirmResponse.success) {
                this.showPaymentSuccess(confirmResponse.data);
            } else {
                throw new Error(confirmResponse.message);
            }
        } catch (error) {
            throw new Error('Errore nella conferma del pagamento');
        }
    },

    showPaymentSuccess(bookingData) {
        const container = document.getElementById('bookings-container');
        if (!container) return;

        container.innerHTML = `
            <div class="payment-success">
                <div class="success-icon">
                    <i class="fas fa-check-circle text-success"></i>
                </div>
                <h2>Prenotazione Confermata!</h2>
                <p class="lead">La tua prenotazione è stata completata con successo</p>
                
                <div class="booking-confirmation-details">
                    <div class="confirmation-card">
                        <h5>Codice Prenotazione: <strong>${bookingData.bookingId || 'BK' + Date.now()}</strong></h5>
                        
                        <div class="confirmed-details">
                            <div class="detail-row">
                                <span>Spazio:</span>
                                <span>${this.state.selectedSpace.name}</span>
                            </div>
                            <div class="detail-row">
                                <span>Data:</span>
                                <span>${this.formatDate(this.state.bookingForm.date)}</span>
                            </div>
                            <div class="detail-row">
                                <span>Orario:</span>
                                <span>${this.state.bookingForm.startTime} - ${this.state.bookingForm.endTime}</span>
                            </div>
                            <div class="detail-row">
                                <span>Importo Pagato:</span>
                                <span>€${this.state.bookingForm.totalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="success-actions">
                    <button class="btn btn-primary me-3" onclick="Booking.showUserBookings()">
                        <i class="fas fa-list"></i> Le Mie Prenotazioni
                    </button>
                    <button class="btn btn-outline-primary" onclick="Navigation.showSection('home')">
                        <i class="fas fa-home"></i> Torna alla Home
                    </button>
                </div>
            </div>
        `;

        // Aggiorna lista prenotazioni utente
        this.loadUserBookings();
    },

    // ==================== GESTIONE PRENOTAZIONI UTENTE ====================
    async loadUserBookings() {
        try {
            const response = await window.api.getUserBookings();

            if (response.success) {
                this.state.userBookings = response.data.bookings || response.data;
                console.log(`✅ Loaded ${this.state.userBookings.length} user bookings`);
            }
        } catch (error) {
            console.error('❌ Error loading user bookings:', error);
            this.loadMockUserBookings();
        }
    },

    async showBookingsList() {
        const container = document.getElementById('bookings-container');
        if (!container) return;

        container.innerHTML = `
            <div class="bookings-list">
                <div class="bookings-header">
                    <h3>Le Mie Prenotazioni</h3>
                    <button class="btn btn-primary" onclick="Navigation.showSection('spaces')">
                        <i class="fas fa-plus"></i> Nuova Prenotazione
                    </button>
                </div>
                
                <div class="bookings-filters">
                    <div class="row">
                        <div class="col-md-3">
                            <select class="form-select" onchange="Booking.filterBookings(this.value)">
                                <option value="">Tutti gli stati</option>
                                <option value="confirmed">Confermate</option>
                                <option value="pending">In attesa</option>
                                <option value="cancelled">Cancellate</option>
                                <option value="completed">Completate</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="bookings-content" id="bookings-content">
                    ${this.buildBookingsGrid()}
                </div>
            </div>
        `;
    },

    buildBookingsGrid() {
        if (this.state.userBookings.length === 0) {
            return `
                <div class="no-bookings">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h4>Nessuna prenotazione</h4>
                    <p>Non hai ancora effettuato prenotazioni</p>
                    <button class="btn btn-primary" onclick="Navigation.showSection('spaces')">
                        <i class="fas fa-search"></i> Esplora Spazi
                    </button>
                </div>
            `;
        }

        return `
            <div class="bookings-grid">
                ${this.state.userBookings.map(booking => this.buildBookingCard(booking)).join('')}
            </div>
        `;
    },

    buildBookingCard(booking) {
        const statusClass = this.getBookingStatusClass(booking.status);
        const statusText = this.getBookingStatusText(booking.status);

        return `
            <div class="booking-card">
                <div class="booking-card-header">
                    <div class="booking-info">
                        <h5>${booking.spaceName || 'Spazio'}</h5>
                        <p class="text-muted">${booking.spaceAddress || 'Indirizzo non disponibile'}</p>
                    </div>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="booking-card-body">
                    <div class="booking-details">
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span>${this.formatDate(booking.date)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>${booking.startTime} - ${booking.endTime}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-euro-sign"></i>
                            <span>€${booking.totalPrice?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="booking-card-actions">
                    ${this.buildBookingActions(booking)}
                </div>
            </div>
        `;
    },

    buildBookingActions(booking) {
        const actions = [];

        // Azioni basate sullo stato
        switch (booking.status) {
            case 'confirmed':
                if (this.canCancelBooking(booking)) {
                    actions.push(`
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="Booking.cancelBooking('${booking.id}')">
                            <i class="fas fa-times"></i> Cancella
                        </button>
                    `);
                }
                break;

            case 'pending':
                actions.push(`
                    <button class="btn btn-sm btn-outline-warning" 
                            onclick="Booking.showBookingDetail('${booking.id}')">
                        <i class="fas fa-clock"></i> In attesa pagamento
                    </button>
                `);
                break;
        }

        // Azioni sempre disponibili
        actions.push(`
            <button class="btn btn-sm btn-outline-primary" 
                    onclick="Booking.showBookingDetail('${booking.id}')">
                <i class="fas fa-eye"></i> Dettagli
            </button>
        `);

        return actions.join('');
    },

    // ==================== UTILITY METHODS ====================
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatSpaceType(type) {
        const types = {
            'desk': 'Postazione',
            'office': 'Ufficio',
            'meeting-room': 'Sala Riunioni',
            'event-space': 'Spazio Eventi',
            'workshop': 'Workshop'
        };
        return types[type] || type;
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

    canCancelBooking(booking) {
        const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
        const now = new Date();
        const hoursDiff = (bookingDateTime - now) / (1000 * 60 * 60);

        return hoursDiff > 2; // Cancellabile fino a 2 ore prima
    },

    // ==================== CANCELLAZIONE PRENOTAZIONE ====================
    async cancelBooking(bookingId) {
        const confirmed = confirm('Sei sicuro di voler cancellare questa prenotazione?');
        if (!confirmed) return;

        try {
            const response = await window.api.cancelBooking(bookingId, 'Cancellazione da utente');

            if (response.success) {
                window.notifications?.show('Prenotazione cancellata con successo', 'success');
                await this.loadUserBookings();
                this.showBookingsList();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('❌ Error cancelling booking:', error);
            window.notifications?.show('Errore nella cancellazione: ' + error.message, 'error');
        }
    },

    // ==================== DETTAGLI PRENOTAZIONE ====================
    async showBookingDetail(bookingId) {
        try {
            const response = await window.api.getBooking(bookingId);

            if (response.success) {
                this.openBookingDetailModal(response.data);
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('❌ Error loading booking details:', error);
            window.notifications?.show('Errore nel caricamento dettagli', 'error');
        }
    },

    openBookingDetailModal(booking) {
        const modalHTML = `
            <div class="modal fade" id="bookingDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Dettagli Prenotazione</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        
                        <div class="modal-body">
                            ${this.buildBookingDetailContent(booking)}
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                Chiudi
                            </button>
                            ${this.buildBookingDetailActions(booking)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        const modal = modalElement.firstElementChild;

        document.body.appendChild(modal);

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    },

    buildBookingDetailContent(booking) {
        return `
            <div class="booking-detail-content">
                <div class="row">
                    <div class="col-md-6">
                        <div class="booking-info-section">
                            <h6><i class="fas fa-building text-primary"></i> Informazioni Spazio</h6>
                            <div class="info-group">
                                <div class="info-item">
                                    <span class="label">Nome:</span>
                                    <span class="value">${booking.spaceName || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Indirizzo:</span>
                                    <span class="value">${booking.spaceAddress || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Tipo:</span>
                                    <span class="value">${this.formatSpaceType(booking.spaceType)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="booking-info-section">
                            <h6><i class="fas fa-calendar text-primary"></i> Dettagli Prenotazione</h6>
                            <div class="info-group">
                                <div class="info-item">
                                    <span class="label">Codice:</span>
                                    <span class="value">${booking.id}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Data:</span>
                                    <span class="value">${this.formatDate(booking.date)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Orario:</span>
                                    <span class="value">${booking.startTime} - ${booking.endTime}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Stato:</span>
                                    <span class="value">
                                        <span class="badge ${this.getBookingStatusClass(booking.status)}">
                                            ${this.getBookingStatusText(booking.status)}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="booking-info-section">
                            <h6><i class="fas fa-euro-sign text-primary"></i> Dettagli Pagamento</h6>
                            <div class="info-group">
                                <div class="info-item">
                                    <span class="label">Prezzo base:</span>
                                    <span class="value">€${(booking.totalPrice * 0.95).toFixed(2)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">Commissioni:</span>
                                    <span class="value">€${(booking.totalPrice * 0.05).toFixed(2)}</span>
                                </div>
                                <div class="info-item total">
                                    <span class="label"><strong>Totale:</strong></span>
                                    <span class="value"><strong>€${booking.totalPrice?.toFixed(2) || '0.00'}</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="booking-info-section">
                            <h6><i class="fas fa-info-circle text-primary"></i> Informazioni Aggiuntive</h6>
                            <div class="info-group">
                                <div class="info-item">
                                    <span class="label">Creata il:</span>
                                    <span class="value">${this.formatDate(booking.createdAt)}</span>
                                </div>
                                ${booking.notes ? `
                                    <div class="info-item">
                                        <span class="label">Note:</span>
                                        <span class="value">${booking.notes}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    buildBookingDetailActions(booking) {
        const actions = [];

        if (booking.status === 'confirmed' && this.canCancelBooking(booking)) {
            actions.push(`
                <button type="button" class="btn btn-danger" 
                        onclick="Booking.cancelBookingFromModal('${booking.id}')">
                    <i class="fas fa-times"></i> Cancella Prenotazione
                </button>
            `);
        }

        if (booking.status === 'confirmed') {
            actions.push(`
                <button type="button" class="btn btn-primary" 
                        onclick="Booking.downloadBookingPDF('${booking.id}')">
                    <i class="fas fa-download"></i> Scarica PDF
                </button>
            `);
        }

        return actions.join('');
    },

    async cancelBookingFromModal(bookingId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailModal'));
        modal?.hide();

        await this.cancelBooking(bookingId);
    },

    // ==================== FILTRI E RICERCA ====================
    filterBookings(status) {
        // Implementa filtro per stato prenotazioni
        console.log('Filtering bookings by status:', status);

        let filtered = [...this.state.userBookings];

        if (status) {
            filtered = filtered.filter(booking => booking.status === status);
        }

        // Aggiorna visualizzazione
        const content = document.getElementById('bookings-content');
        if (content) {
            this.state.userBookings = filtered;
            content.innerHTML = this.buildBookingsGrid();
            this.state.userBookings = this.state.userBookings; // Ripristina originale
        }
    },

    // ==================== EVENTI E LISTENERS ====================
    setupEventListeners() {
        // Format card number input
        document.addEventListener('input', (e) => {
            if (e.target.id === 'card-number') {
                this.formatCardNumber(e.target);
            }
            if (e.target.id === 'card-expiry') {
                this.formatCardExpiry(e.target);
            }
        });

        // Payment method selection
        document.addEventListener('change', (e) => {
            if (e.target.name === 'paymentMethod') {
                this.updatePaymentForm(e.target.value);
            }
        });
    },

    attachBookingEvents() {
        // Attach events to dynamically created elements
        console.log('📎 Attaching booking events...');
    },

    formatCardNumber(input) {
        let value = input.value.replace(/\s/g, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        input.value = formattedValue;
    },

    formatCardExpiry(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        input.value = value;
    },

    selectPaymentMethod(method) {
        this.state.bookingForm.paymentMethod = method;
        this.updatePaymentForm(method);
    },

    updatePaymentForm(method) {
        const container = document.getElementById('payment-form-container');
        if (!container) return;

        if (method === 'paypal') {
            container.innerHTML = `
                <div class="paypal-form">
                    <div class="alert alert-info">
                        <i class="fab fa-paypal"></i>
                        Sarai reindirizzato a PayPal per completare il pagamento
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = this.buildCardPaymentForm();
        }
    },

    updateNotes(notes) {
        this.state.bookingForm.notes = notes;
    },

    // ==================== UTILITY E HELPER ====================
    initDatePicker() {
        // Inizializza eventuali date picker personalizzati
        console.log('📅 Initializing date picker...');
    },

    resetBookingState() {
        this.state.selectedSpace = null;
        this.state.selectedDate = null;
        this.state.selectedTimeSlot = null;
        this.state.availableSlots = [];
        this.state.currentBooking = null;
        this.state.step = 1;
        this.state.paymentIntent = null;

        this.state.bookingForm = {
            spaceId: null,
            date: null,
            startTime: null,
            endTime: null,
            duration: 1,
            totalPrice: 0,
            notes: '',
            paymentMethod: 'card'
        };
    },

    showUserBookings() {
        window.Navigation.showSection('bookings');
    },

    showLoadingState() {
        const container = document.getElementById('bookings-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                    <p class="mt-3">Caricamento...</p>
                </div>
            `;
        }
    },

    showErrorState(message) {
        const container = document.getElementById('bookings-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger text-center">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <h5>Errore di caricamento</h5>
                    <p>${message}</p>
                    <button class="btn btn-outline-danger" onclick="Booking.loadUserBookings()">
                        <i class="fas fa-redo"></i> Riprova
                    </button>
                </div>
            `;
        }
    },

    // ==================== MOCK DATA FALLBACK ====================
    loadMockUserBookings() {
        console.log('📊 Loading mock user bookings...');

        this.state.userBookings = [
            {
                id: 'BK001',
                spaceId: '1',
                spaceName: 'Spazio Creativo Milano',
                spaceAddress: 'Via Torino 40, Milano',
                spaceType: 'desk',
                date: '2025-08-20',
                startTime: '09:00',
                endTime: '17:00',
                duration: 8,
                totalPrice: 120.00,
                status: 'confirmed',
                notes: 'Prenotazione per evento aziendale',
                createdAt: '2025-08-15T10:30:00Z'
            },
            {
                id: 'BK002',
                spaceId: '2',
                spaceName: 'Meeting Room Executive',
                spaceAddress: 'Via del Corso 100, Roma',
                spaceType: 'meeting-room',
                date: '2025-08-25',
                startTime: '14:00',
                endTime: '16:00',
                duration: 2,
                totalPrice: 100.00,
                status: 'pending',
                notes: '',
                createdAt: '2025-08-15T14:20:00Z'
            }
        ];
    },

    // ==================== DOWNLOAD E EXPORT ====================
    async downloadBookingPDF(bookingId) {
        try {
            // Simula download PDF
            window.notifications?.show('Download PDF avviato', 'info');

            // In produzione: chiamata API per generare PDF
            // const response = await window.api.downloadBookingPDF(bookingId);

        } catch (error) {
            console.error('❌ Error downloading PDF:', error);
            window.notifications?.show('Errore nel download PDF', 'error');
        }
    }
};

// ==================== AUTO-INIZIALIZZAZIONE ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.api && window.Auth && window.Navigation) {
            window.Booking.init();
        }
    });
} else if (window.api && window.Auth && window.Navigation) {
    window.Booking.init();
}