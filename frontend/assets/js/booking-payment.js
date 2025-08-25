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
                                <h6 class="fw-bold mb-3">Riepilogo Prenotazione</h6>
                                <div class="card bg-light">
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col-md-8">
                                                <h6 class="mb-1">${booking.space_name}</h6>
                                                <p class="text-muted mb-2">${booking.space_address}</p>
                                                <p class="mb-0">
                                                    <i class="fas fa-calendar me-2"></i>
                                                    ${this.formatDate(booking.start_date)} - ${this.formatDate(booking.end_date)}
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

                            <!-- Form di pagamento Stripe -->
                            <div class="payment-section">
                                <h6 class="fw-bold mb-3">Metodo di Pagamento</h6>
                                <div id="payment-element" class="mb-3">
                                    <!-- Stripe Elements Payment Element -->
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
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Elaborazione...';
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
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        modal.hide();

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
     * Mostra messaggio di errore
     */
    showError(message) {
        const alert = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.getElementById('alerts-container').innerHTML = alert;
    }

    /**
     * Mostra messaggio di successo
     */
    showSuccess(message) {
        const alert = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.getElementById('alerts-container').innerHTML = alert;
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