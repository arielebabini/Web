class Booking {
    constructor() {
        this.apiUrl = '/api/bookings';

        // Properties from Booking
        this.currentSpace = null;
        this.selectedDates = null;
        this.bookingData = null;

        // Properties from BookingPaymentManager merged
        this.stripe = Stripe('pk_test_51Rs7kdJ9mfmkNGem1gP2uTZlLw6POAlDwMAlnFPxhINseQfj7nAPL7O0YDgsslmC5htPU47wIbx88IkfGktkB59q00Ua9AmYBj');
        this.elements = null;
        this.cardElement = null;
        this.currentBooking = null;
        this.clientSecret = null;

        // Stripe key from Booking
        this.STRIPE_PUBLISHABLE_KEY = 'pk_test_51Rs7kdJ9mfmkNGem1gP2uTZlLw6POAlDwMAlnFPxhINseQfj7nAPL7O0YDgsslmC5htPU47wIbx88IkfGktkB59q00Ua9AmYBj';

        // Initializer from Booking
        this.initializeStripe();

        this.ensureAlertsContainer();
    }

    async initializeStripe() {
        try {
            // Attendi che Stripe.js sia caricato
            if (!window.Stripe) {
                console.log('⏳ Waiting for Stripe.js...');
                await this.waitForStripe();
            }

            this.stripe = window.Stripe(this.STRIPE_PUBLISHABLE_KEY);
            console.log('✅ Stripe initialized');

        } catch (error) {
            console.error('❌ Error initializing Stripe:', error);
        }
    }

    async waitForStripe(maxWait = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkStripe = () => {
                if (window.Stripe) {
                    resolve();
                } else if (Date.now() - startTime > maxWait) {
                    reject(new Error('Stripe.js non caricato'));
                } else {
                    setTimeout(checkStripe, 100);
                }
            };

            checkStripe();
        });
    }

    // ===== APERTURA MODAL PRENOTAZIONE =====
    async openBookingModal(spaceId) {
        try {
            console.log('📅 Opening booking modal for space:', spaceId);

            // Carica i dati dello spazio
            await this.loadSpaceData(spaceId);

            // Crea e mostra il modal
            this.createBookingModal();
            this.showBookingModal();

        } catch (error) {
            console.error('Error opening booking modal:', error);
            this.showError('Errore nel caricamento dei dati di prenotazione');
        }
    }

    async loadSpaceData(spaceId) {
        try {
            console.log('🔍 Loading space data for:', spaceId);

            // Chiamata fetch diretta senza dipendere da this.api
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:3000/api/spaces/${spaceId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            const data = await response.json();
            console.log('📦 Space data response:', data);

            if (response.ok && (data.success || data.data || data.space)) {
                this.currentSpace = data.data || data.space || data;
                console.log('✅ Space data loaded:', this.currentSpace);
            } else {
                throw new Error(data.message || 'Spazio non trovato');
            }

        } catch (error) {
            console.error('❌ Error loading space data:', error);
            throw new Error('Impossibile caricare i dati dello spazio: ' + error.message);
        }
    }

    createBookingModal() {
        // Rimuovi modal esistente se presente
        const existingModal = document.getElementById('bookingModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = this.generateBookingModalHTML();
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Inizializza componenti del modal
        this.initializeDatePickers();
        this.initializeTimeSlots();
        this.setupModalEventListeners();
    }

    generateBookingModalHTML() {
        const space = this.currentSpace;

        return `
            <div class="modal fade" id="bookingModal" tabindex="-1" aria-labelledby="bookingModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="bookingModalLabel">
                                <i class="fas fa-calendar-plus me-2"></i>
                                Prenota: ${space.name}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        
                        <div class="modal-body">
                            <div class="space-info-card mb-4">
                                <div class="row">
                                    <div class="col-md-4">
                                        <img src="${space.images?.[0] || '/assets/images/placeholder-space.jpg'}" 
                                             alt="${space.name}" class="img-fluid rounded">
                                    </div>
                                    <div class="col-md-8">
                                        <h6>${space.name}</h6>
                                        <p class="text-muted mb-2">
                                            <i class="fas fa-map-marker-alt me-1"></i>
                                            ${space.address}, ${space.city}
                                        </p>
                                        <p class="mb-2">
                                            <i class="fas fa-users me-1"></i>
                                            Capacità: ${space.capacity} persone
                                        </p>
                                        <div class="space-price">
                                            <strong class="text-primary">€${space.price_per_day}/giorno</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form id="bookingForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="startDate" class="form-label">Data Inizio *</label>
                                        <input type="date" class="form-control" id="startDate" required>
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <div class="col-md-6 mb-3">
                                        <label for="endDate" class="form-label">Data Fine *</label>
                                        <input type="date" class="form-control" id="endDate" required>
                                        <div class="invalid-feedback"></div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="startTime" class="form-label">Ora Inizio *</label>
                                        <select class="form-select" id="startTime" required>
                                            <option value="">Seleziona ora</option>
                                        </select>
                                        <div class="invalid-feedback"></div>
                                    </div>
                                    
                                    <div class="col-md-6 mb-3">
                                        <label for="endTime" class="form-label">Ora Fine *</label>
                                        <select class="form-select" id="endTime" required>
                                            <option value="">Seleziona ora</option>
                                        </select>
                                        <div class="invalid-feedback"></div>
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label for="peopleCount" class="form-label">Numero Persone *</label>
                                    <input type="number" class="form-control" id="peopleCount" 
                                           min="1" max="${space.capacity}" value="1" required>
                                    <div class="form-text">Massimo ${space.capacity} persone</div>
                                    <div class="invalid-feedback"></div>
                                </div>

                                <div class="mb-3">
                                    <label for="bookingNotes" class="form-label">Note (facoltativo)</label>
                                    <textarea class="form-control" id="bookingNotes" rows="3" 
                                              placeholder="Aggiungi eventuali note o richieste speciali..."></textarea>
                                </div>

                                <div class="booking-summary p-3 bg-light rounded">
                                    <h6>Riepilogo Prenotazione</h6>
                                    <div class="row">
                                        <div class="col-sm-6">
                                            <div id="bookingDuration">Durata: -</div>
                                            <div id="bookingPeople">Persone: 1</div>
                                        </div>
                                        <div class="col-sm-6 text-end">
                                            <div class="total-price">
                                                <strong>Totale: <span id="totalPrice">€0</span></strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times me-1"></i>
                                Annulla
                            </button>
                            <button type="button" class="btn btn-primary" id="confirmBookingBtn" disabled>
                                <i class="fas fa-credit-card me-1"></i>
                                Procedi al Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== INIZIALIZZAZIONE COMPONENTI =====
    initializeDatePickers() {
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        // Imposta data minima come oggi
        startDateInput.setAttribute('min', today);
        endDateInput.setAttribute('min', today);

        // Event listeners per le date
        startDateInput.addEventListener('change', () => {
            this.handleStartDateChange();
            this.calculateTotalPrice();
        });

        endDateInput.addEventListener('change', () => {
            this.handleEndDateChange();
            this.calculateTotalPrice();
        });
    }

    initializeTimeSlots() {
        const timeSlots = this.generateTimeSlots();
        const startTimeSelect = document.getElementById('startTime');
        const endTimeSelect = document.getElementById('endTime');

        // Popola le opzioni degli orari
        timeSlots.forEach(time => {
            startTimeSelect.innerHTML += `<option value="${time}">${time}</option>`;
            endTimeSelect.innerHTML += `<option value="${time}">${time}</option>`;
        });

        // Event listeners per gli orari
        startTimeSelect.addEventListener('change', () => {
            this.updateEndTimeOptions();
            this.calculateTotalPrice();
        });

        endTimeSelect.addEventListener('change', () => {
            this.calculateTotalPrice();
        });
    }

    generateTimeSlots() {
        const slots = [];
        for (let hour = 8; hour <= 22; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                slots.push(timeString);
            }
        }
        return slots;
    }

    ensureAlertsContainer() {
        let alertsContainer = document.getElementById('alerts-container');

        if (!alertsContainer) {
            // Crea il container se non esiste
            alertsContainer = document.createElement('div');
            alertsContainer.id = 'alerts-container';
            alertsContainer.className = 'alerts-container position-fixed';
            alertsContainer.style.cssText = `
            top: 100px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
        `;

            // Aggiungilo al body
            document.body.appendChild(alertsContainer);
            console.log('✅ Alert container created');
        }

        return alertsContainer;
    }


    /**
     * Inizializza il form di pagamento
     */
    async initializePaymentForm(booking) {
        this.currentBooking = booking;

        try {
            // Crea Payment Intent
            const paymentIntent = await this.createPaymentIntent(booking.id);
            this.clientSecret = paymentIntent.client_secret;

            // Inizializza Stripe Elements
            this.setupStripeElements();

            // Mostra il form di pagamento
            this.showPaymentModal(booking, paymentIntent);

        } catch (error) {
            console.error('Error initializing payment:', error);
            this.showError('Errore nell\'inizializzazione del pagamento');
        }
    }

    /**
     * Configura Stripe Elements
     */
    setupStripeElements() {
        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#667eea',
                colorBackground: '#ffffff',
                colorText: '#30313d',
                colorDanger: '#df1b41',
                borderRadius: '8px',
                spacingUnit: '4px'
            }
        };

        this.elements = this.stripe.elements({
            clientSecret: this.clientSecret,
            appearance: appearance
        });

        // Crea il Payment Element
        this.cardElement = this.elements.create('payment');
    }

    /**
     * Mostra il modal di pagamento
     */
    showPaymentModal(booking, paymentIntent) {
        console.log('DEBUG - showPaymentModal called with:', booking);
        console.log('DEBUG - this.currentSpace:', this.currentSpace);

        const modalHtml = `
            <div class="modal fade" id="paymentModal" tabindex="-1" aria-labelledby="paymentModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="paymentModalLabel">
                                <i class="fas fa-credit-card me-2"></i>Pagamento Prenotazione
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="booking-summary mb-4">
                                <h6 class="fw-bold mb-3">Riepilogo Prenotazione</h6>
                                <div class="card bg-light">
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col-md-8">
                                                <h6 class="mb-1">${booking.space_name || this.currentSpace?.name || 'Spazio Coworking'}</h6>
                                                <p class="text-muted mb-2">${booking.space_address || this.currentSpace?.address || ''}</p>
                                                <p class="mb-0">
                                                    <i class="fas fa-calendar me-2"></i>
                                                    ${this.formatDate(booking.start_date || booking.startDate)} - ${this.formatDate(booking.end_date || booking.endDate)}
                                                </p>
                                                <p class="mb-0">
                                                    <i class="fas fa-users me-2"></i>
                                                    ${booking.people_count} persone
                                                </p>
                                            </div>
                                            <div class="col-md-4 text-end">
                                                <div class="total-amount">
                                                    <span class="amount">€${booking.total_price}</span>
                                                    <small class="text-muted d-block">Totale</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="payment-section">
                                <h6 class="fw-bold mb-3">Metodo di Pagamento</h6>
                                <div id="payment-element" class="mb-3">
                                    </div>
                                <div id="payment-errors" role="alert" class="text-danger mb-3" style="display: none;"></div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                            <button type="button" class="btn btn-primary" id="submitPaymentBtn">
                                <i class="fas fa-lock me-2"></i>Paga €${booking.total_price}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Rimuovi modal esistente
        const existingModal = document.getElementById('paymentModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Aggiungi nuovo modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Mostra modal
        const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
        modal.show();

        // Monta Stripe Elements dopo che il modal è visibile
        setTimeout(() => {
            this.cardElement.mount('#payment-element');
            this.setupEventListeners();
        }, 300);
    }

    showAlert(message, type = 'info') {
        const container = this.ensureAlertsContainer();

        // Mappa i tipi
        const typeMap = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'danger': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        };

        const iconMap = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-triangle',
            'danger': 'fas fa-exclamation-triangle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };

        const alertClass = typeMap[type] || 'alert-info';
        const iconClass = iconMap[type] || 'fas fa-info-circle';

        // Crea l'alert
        const alertId = 'alert-' + Date.now();
        const alertHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show mb-3" role="alert" id="${alertId}">
                <i class="${iconClass} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        // Aggiungi l'alert
        container.insertAdjacentHTML('beforeend', alertHTML);

        // Auto-rimozione dopo 5 secondi
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    /**
     * Configura gli event listeners
     */
    setupEventListeners() {
        // Gestione submit pagamento
        document.getElementById('submitPaymentBtn').addEventListener('click', () => {
            this.processPayment();
        });

        // Gestione errori Stripe Elements
        this.cardElement.on('change', ({error}) => {
            const displayError = document.getElementById('payment-errors');
            if (error) {
                displayError.textContent = error.message;
                displayError.style.display = 'block';
            } else {
                displayError.style.display = 'none';
            }
        });
    }

    setupModalEventListeners() {
        // Numero persone
        document.getElementById('peopleCount').addEventListener('input', (e) => {
            this.handlePeopleCountChange(e.target.value);
        });

        // Bottone conferma
        document.getElementById('confirmBookingBtn').addEventListener('click', () => {
            this.handleBookingConfirmation();
        });

        // Validazione in tempo reale
        document.getElementById('bookingForm').addEventListener('input', () => {
            this.validateForm();
        });
    }

    // ===== GESTIONE EVENTI =====
    handleStartDateChange() {
        const startDate = document.getElementById('startDate').value;
        const endDateInput = document.getElementById('endDate');

        if (startDate) {
            // La data fine non può essere precedente a quella di inizio
            endDateInput.setAttribute('min', startDate);

            // Se la data fine è precedente, resettala
            if (endDateInput.value && endDateInput.value < startDate) {
                endDateInput.value = startDate;
            }
        }
    }

    handleEndDateChange() {
        // Ricalcola il prezzo quando cambia la data fine
        this.calculateTotalPrice();
    }

    updateEndTimeOptions() {
        const startTime = document.getElementById('startTime').value;
        const endTimeSelect = document.getElementById('endTime');

        if (!startTime) return;

        // Disabilita le opzioni precedenti all'ora di inizio
        Array.from(endTimeSelect.options).forEach(option => {
            if (option.value && option.value <= startTime) {
                option.disabled = true;
            } else {
                option.disabled = false;
            }
        });

        // Se l'ora fine è precedente o uguale, resettala
        if (endTimeSelect.value && endTimeSelect.value <= startTime) {
            endTimeSelect.value = '';
        }
    }

    handlePeopleCountChange(count) {
        const peopleCount = parseInt(count);
        const maxCapacity = this.currentSpace.capacity;

        if (peopleCount > maxCapacity) {
            document.getElementById('peopleCount').value = maxCapacity;
            this.showWarning(`Il numero massimo di persone per questo spazio è ${maxCapacity}`);
        }

        document.getElementById('bookingPeople').textContent = `Persone: ${document.getElementById('peopleCount').value}`;
        this.calculateTotalPrice();
    }

    // ===== CALCOLI E VALIDAZIONE =====
    calculateTotalPrice() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        if (!startDate || !endDate || !startTime || !endTime) {
            document.getElementById('totalPrice').textContent = '€0';
            document.getElementById('bookingDuration').textContent = 'Durata: -';
            return;
        }

        // Calcola la durata in giorni
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        // Calcola il prezzo totale
        const dailyPrice = this.currentSpace.price_per_day;
        const totalPrice = daysDiff * dailyPrice;

        // Aggiorna UI
        document.getElementById('bookingDuration').textContent = `Durata: ${daysDiff} giorno${daysDiff > 1 ? 'i' : ''}`;
        document.getElementById('totalPrice').textContent = `€${totalPrice}`;

        this.validateForm();
    }

    validateForm() {
        const form = document.getElementById('bookingForm');
        const submitBtn = document.getElementById('confirmBookingBtn');

        // Verifica che tutti i campi obbligatori siano compilati
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
            }
        });

        // Verifica che l'ora fine sia successiva a quella di inizio
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        if (startTime && endTime && endTime <= startTime) {
            isValid = false;
        }

        submitBtn.disabled = !isValid;
        return isValid;
    }

    // ===== CONFERMA PRENOTAZIONE =====
    async handleBookingConfirmation() {
        if (!this.validateForm()) {
            this.showError('Compila tutti i campi obbligatori');
            return;
        }

        try {
            // Mostra loading
            this.setBookingButtonLoading(true);

            // Prepara i dati della prenotazione
            const bookingData = this.collectBookingData();

            // Invia la richiesta di prenotazione
            const response = await this.createBooking(bookingData);

            if (response.success) {
                // Nasconde il modal
                this.hideBookingModal();

                // Mostra successo e procedi al pagamento
                this.handleBookingSuccess(response.booking);
            } else {
                throw new Error(response.message || 'Errore nella creazione della prenotazione');
            }

        } catch (error) {
            console.error('Booking confirmation error:', error);
            this.showError('Errore nella prenotazione: ' + error.message);
        } finally {
            this.setBookingButtonLoading(false);
        }
    }

    collectBookingData() {
        return {
            space_id: this.currentSpace.id,
            start_date: document.getElementById('startDate').value,
            end_date: document.getElementById('endDate').value,
            start_time: document.getElementById('startTime').value,
            end_time: document.getElementById('endTime').value,
            people_count: parseInt(document.getElementById('peopleCount').value),
            notes: document.getElementById('bookingNotes').value.trim()
        };
    }

    async createBooking(bookingData) {
        try {
            console.log('📝 Creating booking:', bookingData);

            // Verifica autenticazione
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Devi effettuare il login per prenotare');
            }

            // Chiamata fetch diretta
            const response = await fetch('http://localhost:3000/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingData)
            });

            const data = await response.json();
            console.log('📦 Booking response:', data);

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;

        } catch (error) {
            console.error('❌ Error creating booking:', error);
            throw error;
        }
    }

    /**
     * Elabora il pagamento
     */
    async processPayment() {
        const submitBtn = document.getElementById('submitPaymentBtn');
        const originalBtnText = submitBtn.innerHTML;

        try {
            // Loading
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Elaborazione...';
            submitBtn.disabled = true;

            // Conferma il pagamento con Stripe Elements reale
            const {error, paymentIntent} = await this.stripe.confirmPayment({
                elements: this.elements,
                redirect: 'if_required'
            });

            if (error) {
                throw error;
            }

            if (paymentIntent.status === 'succeeded') {
                // Conferma il pagamento al backend
                await this.confirmPaymentWithBackend(paymentIntent);

                // Gestisci successo
                this.handlePaymentSuccess(paymentIntent);
            } else {
                throw new Error(`Pagamento in stato: ${paymentIntent.status}`);
            }

        } catch (error) {
            console.error('Payment error:', error);
            this.showError(error.message || 'Errore durante il pagamento');
        } finally {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    }

    async confirmPaymentWithBackend(paymentIntent) {
        const response = await fetch('http://localhost:3000/api/payments/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                payment_intent_id: paymentIntent.id,
                payment_data: {
                    cardNumber: '4242424242424242', // Carta di test
                    expiry: '12/25',
                    cvc: '123',
                    name: 'Test User'
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore nella conferma del pagamento');
        }

        return data;
    }

    /**
     * Crea Payment Intent tramite API
     */
    async createPaymentIntent(bookingId) {
        const response = await fetch('http://localhost:3000/api/payments/create-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ bookingId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Errore nella creazione del pagamento');
        }

        return data.data.payment_intent;
    }

    /**
     * Gestisce il successo del pagamento
     */
    async handlePaymentSuccess(paymentIntent) {
        // Chiudi modal
        const modalElement = document.getElementById('paymentModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            } else {
                modalElement.remove();
            }
        } else {
            console.log('Payment modal not found - probably already closed');
        }

        // Mostra messaggio di successo
        this.showSuccess('Pagamento completato con successo! La tua prenotazione è stata confermata.');

        // Ricarica la lista delle prenotazioni
        if (typeof window.bookingManager !== 'undefined') {
            setTimeout(() => {
                window.bookingManager.loadBookings();
            }, 2000);
        }
    }

    /**
     * Formatta data per visualizzazione
     */
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    async handleBookingSuccess(booking) {
        // Salva i dati della prenotazione per il pagamento
        this.bookingData = booking;

        // Mostra notifica di successo
        this.showSuccess('Prenotazione creata con successo!');

        // Reindirizza al pagamento o mostra il modal di pagamento
        setTimeout(async () => {
            try {
                await this.openPaymentFlow(booking);
            } catch (error) {
                console.error('Error in payment flow:', error);
                this.showError('Errore nel processo di pagamento');
            }
        }, 300);
    }

    async openPaymentFlow(booking) {
        console.log('Opening payment flow for booking:', booking);

        this.hideBookingModal();

        setTimeout(async () => {
            try {
                await this.createPaymentModal(booking);
            } catch (error) {
                console.error('Error in payment flow:', error);
                this.showError('Errore nel processo di pagamento');
            }
        }, 300);
    }

    async createPaymentModal(booking) {
        // Rimuovi modal esistente se presente
        const existingModal = document.getElementById('paymentModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = this.generatePaymentModalHTML(booking);
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        try {
            // Aspetta che l'inizializzazione sia completata
            await this.initializePaymentForm(booking);
            // showPaymentModal viene già chiamato dentro initializePaymentModal
        } catch (error) {
            console.error('Error initializing payment modal:', error);
            this.showError('Errore nell\'inizializzazione del pagamento');
        }
    }

    generatePaymentModalHTML(booking) {
        return `
        <div class="modal fade" id="paymentModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-gradient-primary text-white">
                        <h5 class="modal-title">
                            <i class="fab fa-stripe me-2"></i>
                            Pagamento Sicuro con Stripe
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="payment-summary mb-4">
                            <h6><i class="fas fa-file-invoice me-2"></i>Riepilogo</h6>
                            <div class="summary-card p-3 bg-light rounded">
                                <div class="row">
                                    <div class="col-md-8">
                                        <h6 class="mb-1">${this.currentSpace.name}</h6>
                                        <p class="text-muted mb-2">
                                            <i class="fas fa-map-marker-alt me-1"></i>
                                            ${this.currentSpace.city}
                                        </p>
                                        <small class="text-muted">
                                            Dal: ${booking.start_date} ${booking.start_time}<br>
                                            Al: ${booking.end_date} ${booking.end_time}<br>
                                            Persone: ${booking.people_count}
                                        </small>
                                    </div>
                                    <div class="col-md-4 text-end">
                                        <div class="total-amount">
                                            <span class="h4 text-success mb-0">€${booking.total_price}</span>
                                            <div class="small text-muted">Totale</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="stripe-section">
                            <h6><i class="fab fa-cc-stripe me-2"></i>Dettagli Pagamento</h6>
                            
                            <div class="mb-3">
                                <label class="form-label">Nome Titolare Carta *</label>
                                <input type="text" class="form-control" id="cardholderName" 
                                       placeholder="Mario Rossi" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Dati Carta *</label>
                                <div id="stripe-card-element" class="stripe-card-element">
                                    </div>
                                <div id="stripe-card-errors" class="text-danger mt-2"></div>
                            </div>
                        </div>
                        
                        <div class="payment-security text-center">
                            <div class="alert alert-success d-flex align-items-center justify-content-center">
                                <i class="fas fa-shield-alt me-2"></i>
                                <span>Pagamento sicuro con crittografia SSL 256-bit</span>
                                <i class="fab fa-stripe-s ms-2"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>
                            Annulla
                        </button>
                        <button type="button" class="btn btn-success btn-lg" id="processPaymentBtn">
                            <i class="fas fa-lock me-1"></i>
                            Paga €${booking.total_price} con Stripe
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    }

    async initializePaymentModal(booking) {
        try {
            console.log('🔄 Initializing payment modal...');
            console.log('Booking data:', booking);

            // STEP 1: Crea Payment Intent
            console.log('Step 1: Creating payment intent...');
            const paymentIntent = await this.createStripePaymentIntent(booking);
            console.log('Step 1 completed:', paymentIntent);

            // STEP 2: Simula il pagamento (se stai usando simulazione)
            console.log('Step 2: Processing payment simulation...');
            const paymentResult = await this.simulateStripePayment('Test User');
            console.log('Step 2 completed:', paymentResult);

            // STEP 3: Gestisci successo
            if (paymentResult.status === 'succeeded') {
                console.log('Step 3: Handling payment success...');
                this.handlePaymentSuccess(booking, paymentResult);
                console.log('✅ Payment modal initialization completed');
            } else {
                throw new Error(`Pagamento in stato: ${paymentResult.status}`);
            }

        } catch (error) {
            console.error('❌ Error initializing payment modal:', error);
            this.showError('Errore inizializzazione pagamento: ' + error.message);
        }
    }

    async processStripePayment(booking) {
        const paymentBtn = document.getElementById('processPaymentBtn');

        try {
            // Validazione nome
            const cardholderName = document.getElementById('cardholderName').value.trim();
            if (!cardholderName) {
                throw new Error('Inserisci il nome del titolare della carta');
            }

            // Loading
            paymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Elaborazione...';
            paymentBtn.disabled = true;

            console.log('💳 Starting Stripe payment process...');

            // STEP 1: Crea Payment Intent sul backend
            const paymentIntent = await this.createStripePaymentIntent(booking);
            console.log('✅ Payment Intent created:', paymentIntent.client_secret);

            // STEP 2: Simula conferma pagamento Stripe
            const paymentResult = await this.simulateStripePayment(cardholderName);
            console.log('✅ Payment simulated:', paymentResult);

            if (paymentResult.status === 'succeeded') {
                // STEP 3: Notifica successo al backend (opzionale)
                //await this.notifyBackendPaymentSuccess(paymentResult, booking);
                console.log('✅ Payment completed successfully');
                this.handlePaymentSuccess(booking, paymentResult);
            } else {
                throw new Error(`Pagamento in stato: ${paymentResult.status}`);
            }

        } catch (error) {
            console.error('❌ Stripe payment error:', error);
            this.handlePaymentError(error.message);
        } finally {
            paymentBtn.innerHTML = `<i class="fas fa-lock me-1"></i>Paga €${booking.total_price} con Stripe`;
            paymentBtn.disabled = false;
        }
    }
    async simulateStripePayment(cardholderName) {
        // Simula tempo di elaborazione Stripe (1-3 secondi)
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

        // Simula diversi risultati basati sul nome del titolare (per test)
        const lowerName = cardholderName.toLowerCase();

        if (lowerName.includes('fail') || lowerName.includes('error')) {
            throw new Error('La tua carta è stata rifiutata.');
        }

        if (lowerName.includes('insufficient') || lowerName.includes('funds')) {
            throw new Error('Fondi insufficienti.');
        }

        // Simula errore casuale (5% di probabilità)
        if (Math.random() < 0.05) {
            throw new Error('Errore temporaneo del servizio. Riprova.');
        }

        // Successo
        return {
            id: `pi_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'succeeded',
            amount: this.bookingData?.total_price * 100 || 5000,
            currency: 'eur',
            created: Math.floor(Date.now() / 1000)
        };
    }

// Notifica successo al backend (opzionale)
    async notifyBackendPaymentSuccess(paymentIntent, booking) {
        try {
            await fetch('http://localhost:3000/api/payments/confirm-success', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    payment_intent_id: paymentIntent.id,
                    booking_id: booking.id,
                    status: paymentIntent.status
                })
            });
        } catch (error) {
            console.warn('⚠️ Could not notify backend of payment success:', error);
            // Non bloccare se la notifica fallisce
        }
    }

    setupCardFormatting() {
        // Formattazione numero carta
        const cardNumberInput = document.getElementById('cardNumber');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
                let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = formattedValue;
                this.updateCardBrand(value);
            });
        }

        // Formattazione scadenza
        const cardExpiryInput = document.getElementById('cardExpiry');
        if (cardExpiryInput) {
            cardExpiryInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
            });
        }

        // Solo numeri per CVC
        const cardCvcInput = document.getElementById('cardCvc');
        if (cardCvcInput) {
            cardCvcInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }

        // Validazione in tempo reale
        document.querySelectorAll('#cardNumber, #cardExpiry, #cardCvc, #cardholderName').forEach(input => {
            input.addEventListener('blur', () => {
                this.validatePaymentField(input);
            });
        });
    }

    handlePaymentError(message) {
        console.error('💥 Payment failed:', message);

        // Mostra errore specifico
        if (message.includes('carta') || message.includes('card')) {
            this.showError('Problema con la carta: ' + message);
        } else if (message.includes('fondi') || message.includes('insufficient')) {
            this.showError('Fondi insufficienti sulla carta. Verifica il saldo o usa una carta diversa.');
        } else if (message.includes('declinata') || message.includes('declined')) {
            this.showError('Carta declinata. Verifica i dati inseriti o prova con una carta diversa.');
        } else {
            this.showError('Errore durante il pagamento: ' + message);
        }
    }

    async createStripePaymentIntent(booking) {
        console.log('Creating Stripe Payment Intent for booking:', booking.id);

        try {
            const response = await fetch('http://localhost:3000/api/payments/create-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    bookingId: booking.id
                })
            });

            const data = await response.json();
            console.log('Backend response:', data);

            if (response.ok && data.success && data.data) {
                return data.data.payment_intent || data.data;
            } else {
                console.warn('Backend failed, using fallback simulation');
                throw new Error('Backend unavailable');
            }

        } catch (error) {
            console.warn('Backend error, using local simulation:', error.message);

            // Fallback locale che simula la risposta del backend
            return {
                id: `pi_sim_${Date.now()}`,
                client_secret: `pi_sim_${Date.now()}_secret_sim`,
                amount: Math.round(booking.total_price * 100),
                currency: 'eur',
                status: 'requires_payment_method'
            };
        }
    }

    async confirmStripePayment(paymentIntent) {
        try {
            console.log('🔒 Confirming payment with Stripe...');

            // Raccogli dati carta dal form
            const cardData = this.collectCardData();

            // Simula chiamata a Stripe Elements
            // In produzione useresti: stripe.confirmCardPayment(client_secret, card_element)
            const paymentResult = await this.simulateStripeConfirmation(paymentIntent, cardData);

            if (paymentResult.error) {
                throw new Error(paymentResult.error.message);
            }

            return paymentResult.paymentIntent;

        } catch (error) {
            console.error('❌ Error confirming Stripe payment:', error);
            throw error;
        }
    }

    async simulateStripeConfirmation(paymentIntent, cardData) {
        // Simula tempo di elaborazione Stripe
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

        // Validazione base numero carta
        const cardNumber = cardData.number.replace(/\s/g, '');

        // Carte di test Stripe
        const testCards = {
            '4242424242424242': 'success',
            '4000000000000002': 'card_declined',
            '4000000000009995': 'insufficient_funds',
            '4000000000009987': 'lost_card',
            '4000000000009979': 'stolen_card'
        };

        const cardResult = testCards[cardNumber];

        if (cardResult && cardResult !== 'success') {
            return {
                error: {
                    type: 'card_error',
                    code: cardResult,
                    message: this.getCardErrorMessage(cardResult)
                }
            };
        }

        // Simula errori occasionali per carte non di test
        if (!cardResult && Math.random() < 0.1) {
            return {
                error: {
                    type: 'card_error',
                    code: 'generic_decline',
                    message: 'La tua carta è stata declinata. Prova con una carta diversa.'
                }
            };
        }

        // Successo
        return {
            paymentIntent: {
                id: paymentIntent.id,
                status: 'succeeded',
                amount: paymentIntent.amount,
                currency: paymentIntent.currency
            }
        };
    }

    collectCardData() {
        return {
            number: document.getElementById('cardNumber').value,
            expiry: document.getElementById('cardExpiry').value,
            cvc: document.getElementById('cardCvc').value,
            name: document.getElementById('cardholderName').value,
            billing: {
                address: document.getElementById('billingAddress')?.value || '',
                city: document.getElementById('billingCity')?.value || '',
                postal_code: document.getElementById('billingZip')?.value || '',
                country: document.getElementById('billingCountry')?.value || 'IT'
            }
        };
    }

    getCardErrorMessage(errorCode) {
        const messages = {
            'card_declined': 'La tua carta è stata declinata. Verifica i dati o prova con una carta diversa.',
            'insufficient_funds': 'Fondi insufficienti sulla carta.',
            'lost_card': 'La carta è stata segnalata come smarrita.',
            'stolen_card': 'La carta è stata segnalata come rubata.',
            'expired_card': 'La carta è scaduta.',
            'incorrect_cvc': 'Il codice CVC non è corretto.',
            'processing_error': 'Errore durante l\'elaborazione. Riprova.',
            'generic_decline': 'La carta è stata declinata per motivi generici.'
        };

        return messages[errorCode] || 'Errore durante il pagamento. Riprova.';
    }

    async verifyPaymentStatus(paymentIntentId) {
        try {
            console.log('🔍 Verifying payment status...');

            const response = await fetch(`http://localhost:3000/api/payments/${paymentIntentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                console.warn('⚠️ Could not verify payment status:', data.message);
                return; // Non bloccare se la verifica fallisce
            }

            console.log('✅ Payment status verified:', data.data.status);
            return data.data;

        } catch (error) {
            console.warn('⚠️ Payment verification failed:', error.message);
            // Non lanciare errore, il pagamento potrebbe essere comunque riuscito
        }
    }

    /**
     * Carica e visualizza le prenotazioni dell'utente.
     */
    async loadBookings() {
        console.log('Loading user bookings...');

        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('No auth token found');
            this.showError('Devi effettuare il login per vedere le prenotazioni');
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Errore nel caricamento delle prenotazioni');
            }

            if (data.success) {
                this.currentBookings = data.data || [];
                this.renderBookings();
                console.log('Bookings loaded successfully:', this.currentBookings.length);
            } else {
                throw new Error(data.message || 'Errore sconosciuto');
            }

        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showError(error.message || 'Errore nel caricamento delle prenotazioni');
        }
    }

    // Funzione per recuperare e visualizzare le prenotazioni dell'utente
    async fetchAndRenderUserBookings() {
        console.log('🔄 Fetching user bookings...');
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                this.showError('Autenticazione richiesta per visualizzare le prenotazioni.');
                return;
            }

            const response = await fetch('http://localhost:3000/api/bookings/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore nel recupero delle prenotazioni');
            }

            const { data: bookings } = await response.json();
            console.log('✅ Bookings received:', bookings);

            // Chiamata alla funzione per visualizzare i dati
            this.renderBookings(bookings);

        } catch (error) {
            console.error('❌ Errore nel recupero delle prenotazioni:', error);
            this.showError(`Impossibile caricare le prenotazioni: ${error.message}`);
            this.renderBookings([]); // Visualizza una lista vuota in caso di errore
        }
    }

    /**
     * Esegue il rendering delle prenotazioni all'interno di un container.
     * @param {Array} bookings - L'array di oggetti prenotazione da visualizzare.
     * @param {HTMLElement} container - Il contenitore dove visualizzare le prenotazioni.
     */
    renderBookings() {
        const container = document.getElementById('bookingsContainer');
        if (!container) {
            console.error('Booking container not found');
            return;
        }

        if (this.currentBookings.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h4>Nessuna prenotazione trovata</h4>
                    <p class="text-muted">Non hai ancora effettuato alcuna prenotazione.</p>
                    <a href="#" onclick="showSection('spaces')" class="btn btn-primary">
                        <i class="fas fa-search me-2"></i>Cerca Spazi
                    </a>
                </div>
            `;
            return;
        }

        let bookingsHtml = '';
        this.currentBookings.forEach(booking => {
            bookingsHtml += this.renderBookingCard(booking);
        });

        container.innerHTML = bookingsHtml;
    }

    /**
     * Renderizza una singola card di prenotazione
     */
    renderBookingCard(booking) {
        const statusClass = this.getStatusClass(booking.status);
        const statusText = this.getStatusText(booking.status);
        const formattedStartDate = this.formatDate(booking.start_date);
        const formattedEndDate = this.formatDate(booking.end_date);

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card booking-card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <small class="text-muted">ID: ${booking.id.substring(0, 8)}...</small>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${booking.space_name}</h5>
                        <p class="card-text">
                            <i class="fas fa-map-marker-alt text-primary me-2"></i>
                            ${booking.space_city || 'Non specificato'}
                        </p>
                        <div class="booking-details">
                            <div class="mb-2">
                                <i class="fas fa-calendar text-primary me-2"></i>
                                <strong>Dal:</strong> ${formattedStartDate}
                            </div>
                            <div class="mb-2">
                                <i class="fas fa-calendar text-primary me-2"></i>
                                <strong>Al:</strong> ${formattedEndDate}
                            </div>
                            ${booking.start_time ? `
                                <div class="mb-2">
                                    <i class="fas fa-clock text-primary me-2"></i>
                                    <strong>Orario:</strong> ${booking.start_time} - ${booking.end_time}
                                </div>
                            ` : ''}
                            <div class="mb-2">
                                <i class="fas fa-users text-primary me-2"></i>
                                <strong>Persone:</strong> ${booking.people_count}
                            </div>
                            <div class="mb-2">
                                <i class="fas fa-euro-sign text-primary me-2"></i>
                                <strong>Prezzo:</strong> €${parseFloat(booking.total_price).toFixed(2)}
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        ${this.renderBookingActions(booking)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizza le azioni disponibili per una prenotazione
     */
    renderBookingActions(booking) {
        let actions = '';

        if (booking.status === 'pending') {
            actions += `
                <button class="btn btn-outline-danger btn-sm me-2" 
                        onclick="cancelBooking('${booking.id}')">
                    <i class="fas fa-times me-1"></i>Cancella
                </button>
            `;
        }

        actions += `
            <button class="btn btn-outline-primary btn-sm" 
                    onclick="viewBookingDetails('${booking.id}')">
                <i class="fas fa-eye me-1"></i>Dettagli
            </button>
        `;

        return actions;
    }

    // Genera l'HTML per una singola prenotazione
    generateBookingCardHTML(booking) {
        // Formatta le date
        const startDate = new Date(booking.start_date).toLocaleDateString('it-IT');
        const endDate = new Date(booking.end_date).toLocaleDateString('it-IT');

        return `
            <div class="col-md-6 mb-4">
                <div class="card booking-card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title text-primary">${booking.space_name}</h5>
                            <span class="badge bg-success">${booking.status}</span>
                        </div>
                        <p class="card-text text-muted">
                            <i class="fas fa-calendar me-2"></i>
                            ${startDate} - ${endDate}
                        </p>
                        <p class="card-text text-muted">
                            <i class="fas fa-clock me-2"></i>
                            ${booking.start_time || 'N/D'} - ${booking.end_time || 'N/D'}
                        </p>
                        <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                            <p class="mb-0">
                                <i class="fas fa-users me-2"></i>
                                ${booking.people_count} persone
                            </p>
                            <h5 class="mb-0 text-success">€${booking.total_price}</h5>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    hidePaymentModal() {
        const modalElement = document.getElementById('paymentModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
            setTimeout(() => modalElement.remove(), 300);
        }
    }

    // ===== UTILITY METHODS =====
    showBookingModal() {
        const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
        modal.show();
    }

    hideBookingModal() {
        const modalElement = document.getElementById('bookingModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }

    setBookingButtonLoading(loading) {
        const btn = document.getElementById('confirmBookingBtn');
        if (loading) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Elaborazione...';
            btn.disabled = true;
        } else {
            btn.innerHTML = '<i class="fas fa-credit-card me-1"></i>Procedi al Pagamento';
            btn.disabled = false;
        }
    }

    showSuccess(message) {
        console.log('Success:', message);

        if (window.showNotification) {
            window.showNotification(message, 'success');
            return;
        }

        // Fallback sicuro
        alert('Successo: ' + message);
    }

    showError(message) {
        console.error('Error:', message);

        if (window.showNotification) {
            window.showNotification(message, 'error');
            return;
        }

        // Fallback sicuro
        alert('Errore: ' + message);
    }

    showWarning(message) {
        console.warn('⚠️ Warning:', message);

        if (window.Notifications && window.Notifications.show) {
            window.Notifications.show({
                message: message,
                type: 'warning',
                duration: 5000
            });
            return;
        }

        if (window.showNotification) {
            window.showNotification(message, 'warning');
            return;
        }

        // Fallback: usa alert container
        this.showAlert(message, 'warning');
    }
}

// ===== FUNZIONE GLOBALE PER I BOTTONI =====
window.bookSpace = function(spaceId) {
    // Verifica autenticazione
    const token = localStorage.getItem('auth_token');
    if (!token) {
        if (window.showNotification) {
            window.showNotification('Devi effettuare il login per prenotare', 'warning');
        }

        // Mostra il modal di login se disponibile
        if (window.showLogin) {
            window.showLogin();
        } else {
            alert('Devi effettuare il login per prenotare');
        }
        return;
    }

    // Apri il modal di prenotazione
    window.BookingManager.openBookingModal(spaceId);
};

window.cancelBooking = function(bookingId) {
    if (confirm('Sei sicuro di voler cancellare questa prenotazione?')) {
        // Implementa la cancellazione
        console.log('Cancelling booking:', bookingId);
        alert('Funzionalità di cancellazione in sviluppo');
    }
};

console.log('File booking.js caricato completamente');
console.log('Classe Booking definita:', typeof Booking);
window.Booking = Booking; // Esporta esplicitamente
console.log('Booking esportata su window.Booking');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inizializzazione BookingManager dal booking.js...');

    if (typeof Booking !== 'undefined') {
        window.BookingManager = new Booking();
        console.log('BookingManager inizializzato con successo');

        // Definisci anche la funzione showSection qui se non è già definita in app.js
        if (!window.showSection) {
            window.showSection = function(section) {
                console.log('Mostrando sezione:', section);

                const allSections = ['homeSection', 'spacesSection', 'bookingsSection', 'aboutSection', 'supportSection'];
                allSections.forEach(id => {
                    const section = document.getElementById(id);
                    if (section) {
                        section.style.display = 'none';
                    }
                });

                const targetSection = document.getElementById(section + 'Section');
                if (targetSection) {
                    targetSection.style.display = 'block';
                }

                if (section === 'bookings') {
                    if (window.BookingManager && window.BookingManager.loadBookings) {
                        window.BookingManager.loadBookings();
                    }
                }
            };
        }
    }
});