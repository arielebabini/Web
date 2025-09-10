class BookingPaymentManager {
    constructor() {
        // Inizializza Stripe con la chiave pubblica
        this.stripe = Stripe('pk_test_51Rs7kdJ9mfmkNGem1gP2uTZlLw6POAlDwMAlnFPxhINseQfj7nAPL7O0YDgsslmC5htPU47wIbx88IkfGktkB59q00Ua9AmYBj');
        this.elements = null;
        this.cardElement = null;
        this.currentBooking = null;
        this.clientSecret = null;
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
     * Calcola il breakdown dei costi
     */
    calculateCostBreakdown(booking) {
        const totalPrice = parseFloat(booking.total_price);

        // Se abbiamo base_price nel booking, usalo
        let basePrice;
        if (booking.base_price) {
            basePrice = parseFloat(booking.base_price);
        } else {
            // Altrimenti calcoliamo al contrario dal totale
            // Supponendo: totale = base + (base * 0.05) + (base * 0.22)
            // totale = base * (1 + 0.05 + 0.22) = base * 1.27
            basePrice = Math.round((totalPrice / 1.27) * 100) / 100;
        }

        const vatRate = 0.22; // 22% IVA
        const serviceRate = 0.05; // 5% commissione

        const serviceFee = Math.round((basePrice * serviceRate) * 100) / 100;
        const vatAmount = Math.round((basePrice * vatRate) * 100) / 100;

        // Verifica che i calcoli tornino
        const calculatedTotal = basePrice + serviceFee + vatAmount;

        // Se c'è una discrepanza significativa, aggiusta il base price
        if (Math.abs(calculatedTotal - totalPrice) > 0.02) {
            console.warn('Price calculation mismatch, adjusting base price');
            basePrice = Math.round((totalPrice - serviceFee - vatAmount) * 100) / 100;
        }

        return {
            basePrice: basePrice,
            serviceFee: serviceFee,
            vatAmount: vatAmount,
            vatRate: vatRate * 100,
            totalPrice: totalPrice,
            totalIncrease: serviceFee + vatAmount
        };
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
        const costBreakdown = this.calculateCostBreakdown(booking);

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
                        <!-- Dettagli prenotazione -->
                        <div class="booking-summary mb-4">
                            <h6 class="fw-bold mb-3">
                                <i class="fas fa-calendar-check me-2"></i>Riepilogo Prenotazione
                            </h6>
                            <div class="card bg-light border-0">
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-7">
                                            <h6 class="mb-1 text-primary">${booking.space_name}</h6>
                                            <p class="text-muted mb-2">
                                                <i class="fas fa-map-marker-alt me-1"></i>${booking.space_address || booking.space_city}
                                            </p>
                                            <p class="mb-1">
                                                <i class="fas fa-calendar me-2 text-success"></i>
                                                <strong>${this.formatDate(booking.start_date)} - ${this.formatDate(booking.end_date)}</strong>
                                            </p>
                                            <p class="mb-0">
                                                <i class="fas fa-users me-2 text-info"></i>
                                                <strong>${booking.people_count} persone</strong>
                                            </p>
                                        </div>
                                        <div class="col-md-5">
                                            <!-- Breakdown costi MIGLIORATO -->
                                            <div class="cost-breakdown-container">
                                                <div class="card border border-primary">
                                                    <div class="card-header bg-primary text-white py-2">
                                                        <h6 class="mb-0">
                                                            <i class="fas fa-calculator me-2"></i>Dettaglio Costi
                                                        </h6>
                                                    </div>
                                                    <div class="card-body py-3">
                                                        <div class="cost-breakdown">
                                                            <!-- Prezzo base -->
                                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                                <span class="text-muted">
                                                                    <i class="fas fa-home me-1"></i>Prezzo spazio:
                                                                </span>
                                                                <span class="fw-medium">€${costBreakdown.basePrice.toFixed(2)}</span>
                                                            </div>
                                                            
                                                            <!-- Commissione servizio -->
                                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                                <span class="text-muted">
                                                                    <i class="fas fa-cog me-1"></i>Commissione (5%):
                                                                </span>
                                                                <span class="text-warning fw-medium">+€${costBreakdown.serviceFee.toFixed(2)}</span>
                                                            </div>
                                                            
                                                            <!-- IVA -->
                                                            <div class="d-flex justify-content-between align-items-center mb-3">
                                                                <span class="text-muted">
                                                                    <i class="fas fa-receipt me-1"></i>IVA (${costBreakdown.vatRate}%):
                                                                </span>
                                                                <span class="text-info fw-medium">+€${costBreakdown.vatAmount.toFixed(2)}</span>
                                                            </div>
                                                            
                                                            <!-- Divisore -->
                                                            <hr class="my-2 border-primary">
                                                            
                                                            <!-- Totale -->
                                                            <div class="d-flex justify-content-between align-items-center">
                                                                <span class="fw-bold text-dark fs-6">
                                                                    <i class="fas fa-euro-sign me-1"></i>TOTALE:
                                                                </span>
                                                                <span class="fw-bold text-success fs-5">€${costBreakdown.totalPrice.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <!-- Differenza evidenziata -->
                                                <div class="mt-2">
                                                    <div class="alert alert-warning py-2 mb-0" role="alert">
                                                        <small class="d-flex justify-content-between align-items-center">
                                                            <span>
                                                                <i class="fas fa-info-circle me-1"></i>
                                                                <strong>Aumento totale:</strong>
                                                            </span>
                                                            <span class="fw-bold">
                                                                +€${(costBreakdown.serviceFee + costBreakdown.vatAmount).toFixed(2)}
                                                            </span>
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Info dettagliate sui costi -->
                            <div class="row mt-3">
                                <div class="col-md-6">
                                    <div class="alert alert-info p-3">
                                        <h6 class="alert-heading mb-2">
                                            <i class="fas fa-info-circle me-2"></i>Commissione Servizio
                                        </h6>
                                        <small>
                                            La commissione del <strong>5%</strong> copre:
                                            <ul class="mb-0 mt-1">
                                                <li>Gestione piattaforma</li>
                                                <li>Supporto clienti 24/7</li>
                                                <li>Sicurezza pagamenti</li>
                                            </ul>
                                        </small>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="alert alert-secondary p-3">
                                        <h6 class="alert-heading mb-2">
                                            <i class="fas fa-receipt me-2"></i>IVA ${costBreakdown.vatRate}%
                                        </h6>
                                        <small>
                                            Imposta sul Valore Aggiunto applicata secondo la normativa italiana vigente.
                                            <br><strong>Fattura disponibile</strong> nell'area personale.
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Form di pagamento Stripe -->
                        <div class="payment-section">
                            <h6 class="fw-bold mb-3">
                                <i class="fas fa-lock me-2"></i>Metodo di Pagamento
                            </h6>
                            <div class="card border">
                                <div class="card-body">
                                    <div id="payment-element" class="mb-3">
                                        <!-- Stripe Elements Payment Element -->
                                    </div>
                                    <div id="payment-errors" role="alert" class="text-danger mb-3" style="display: none;"></div>
                                    
                                    <!-- Sicurezza pagamento -->
                                    <div class="security-badges mt-3 text-center">
                                        <small class="text-muted d-block mb-2">Pagamento sicuro protetto da:</small>
                                        <div class="d-flex justify-content-center align-items-center gap-3">
                                            <span class="badge bg-primary">
                                                <i class="fab fa-stripe me-1"></i>Stripe
                                            </span>
                                            <span class="badge bg-success">
                                                <i class="fas fa-shield-alt me-1"></i>SSL
                                            </span>
                                            <span class="badge bg-info">
                                                <i class="fas fa-lock me-1"></i>PCI DSS
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer d-flex justify-content-between align-items-center">
                        <div>
                            <small class="text-muted">
                                <i class="fas fa-shield-alt me-1"></i>
                                Transazione sicura al 100%
                            </small>
                        </div>
                        <div>
                            <button type="button" class="btn btn-outline-secondary me-2" data-bs-dismiss="modal">
                                <i class="fas fa-times me-1"></i>Annulla
                            </button>
                            <button type="button" class="btn btn-success btn-lg" id="submitPaymentBtn">
                                <i class="fas fa-credit-card me-2"></i>Paga €${costBreakdown.totalPrice.toFixed(2)}
                            </button>
                        </div>
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

    /**
     * Elabora il pagamento
     */
    async processPayment() {
        const submitBtn = document.getElementById('submitPaymentBtn');
        const originalBtnText = submitBtn.innerHTML;

        try {
            // Loading
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Elaborazione in corso...';
            submitBtn.disabled = true;

            // Conferma pagamento con Stripe
            const {error, paymentIntent} = await this.stripe.confirmPayment({
                elements: this.elements,
                redirect: 'if_required'
            });

            if (error) {
                throw error;
            }

            if (paymentIntent.status === 'succeeded') {
                await this.handlePaymentSuccess(paymentIntent);
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

    /**
     * Crea Payment Intent tramite API
     */
    async createPaymentIntent(bookingId) {
        const response = await fetch('/api/payments/create-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
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
        // Chiudi modal con animazione
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        modal.hide();

        // Mostra messaggio di successo dettagliato
        this.showSuccess(`
            <strong>Pagamento completato con successo!</strong><br>
            <small>
                Transazione ID: ${paymentIntent.id}<br>
                La tua prenotazione è stata confermata e riceverai una email di conferma.
            </small>
        `);

        // Ricarica la lista delle prenotazioni
        if (typeof window.bookingManager !== 'undefined') {
            setTimeout(() => {
                window.bookingManager.loadBookings();
            }, 2000);
        }
    }

    /**
     * Mostra messaggio di errore
     */
    showError(message) {
        // Crea container se non esiste
        if (!document.getElementById('alerts-container')) {
            const container = document.createElement('div');
            container.id = 'alerts-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            container.style.maxWidth = '400px';
            document.body.appendChild(container);
        }

        const alert = `
            <div class="alert alert-danger alert-dismissible fade show shadow" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.getElementById('alerts-container').innerHTML = alert;

        // Auto-remove dopo 5 secondi
        setTimeout(() => {
            const alertElement = document.querySelector('#alerts-container .alert');
            if (alertElement) {
                alertElement.remove();
            }
        }, 5000);
    }

    /**
     * Mostra messaggio di successo
     */
    showSuccess(message) {
        // Crea container se non esiste
        if (!document.getElementById('alerts-container')) {
            const container = document.createElement('div');
            container.id = 'alerts-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            container.style.maxWidth = '400px';
            document.body.appendChild(container);
        }

        const alert = `
            <div class="alert alert-success alert-dismissible fade show shadow" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.getElementById('alerts-container').innerHTML = alert;

        // Auto-remove dopo 7 secondi
        setTimeout(() => {
            const alertElement = document.querySelector('#alerts-container .alert');
            if (alertElement) {
                alertElement.remove();
            }
        }, 7000);
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
}

// Inizializza il gestore pagamenti
window.paymentManager = new BookingPaymentManager();