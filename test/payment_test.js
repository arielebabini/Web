/**
 * @file Mock data and objects for testing the BookingPaymentManager class.
 * @description This file simulates external dependencies like Stripe.js,
 * API responses, and global objects (Bootstrap, etc.).
 * @version 1.0.0
 */

// ==================== MOCK BOOKING OBJECTS ====================

export const mockBookings = {
    /** A standard booking for a co-working desk. */
    standard: {
        id: 'booking_12345',
        space_name: 'Scrivania Singola - Open Space',
        space_address: 'Via Roma 10, 20121 Milano MI',
        start_date: '2025-09-15T09:00:00.000Z',
        end_date: '2025-09-15T18:00:00.000Z',
        people_count: 1,
        total_price: '25.00',
    },
    /** A more expensive booking for a meeting room. */
    meetingRoom: {
        id: 'booking_67890',
        space_name: 'Sala Riunioni "Innovazione"',
        space_address: 'Corso Buenos Aires 5, 20124 Milano MI',
        start_date: '2025-10-20T14:00:00.000Z',
        end_date: '2025-10-20T16:00:00.000Z',
        people_count: 8,
        total_price: '150.50',
    },
};

// ==================== MOCK API RESPONSES ====================

export const apiResponses = {
    /** Simulates a successful response from the /api/payments/create-intent endpoint. */
    createIntent: {
        success: {
            success: true,
            data: {
                payment_intent: {
                    id: 'pi_3P5aBcDEfghiJKL',
                    client_secret: 'pi_3P5aBcDEfghiJKL_secret_mnopqrSTUVWXYZ',
                },
            },
        },
        /** Simulates a failure response due to an invalid booking ID or server error. */
        failure: {
            success: false,
            message: 'ID prenotazione non valido o inesistente.',
        },
    },
};

// ==================== MOCK STRIPE.JS OBJECTS ====================

export const stripeMocks = {
    /**
     * Mocks the response from `stripe.confirmPayment`.
     * @param {('succeeded'|'requires_payment_method'|'processing')} status - The desired outcome.
     * @returns {Object} A mock response object.
     */
    createConfirmPaymentResponse: (status = 'succeeded') => {
        if (status === 'requires_payment_method') {
            return {
                error: {
                    code: 'payment_intent_authentication_failure',
                    message: 'La carta è stata rifiutata. Si prega di utilizzare un altro metodo di pagamento.',
                },
                paymentIntent: null,
            };
        }
        return {
            error: null,
            paymentIntent: {
                id: 'pi_3P5aBcDEfghiJKL',
                status: status, // 'succeeded', 'processing', etc.
                amount: 2500, // Amount in cents
                currency: 'eur',
            },
        };
    },

    /**
     * A mock of the Stripe Card Element.
     * It simulates the `mount` and `on` methods.
     */
    mockCardElement: {
        mount: (selector) => {
            console.log(`Stripe Card Element mounted to: ${selector}`);
        },
        on: (event, handler) => {
            console.log(`Event listener for '${event}' has been attached to Card Element.`);
            // You can optionally trigger the handler for testing purposes:
            // handler({ error: { message: 'Numero carta incompleto' } });
        },
        _triggerChangeEvent: (handler, error = null) => {
            handler({ error });
        }
    },

    /**
     * A mock of the Stripe Elements object.
     */
    mockElements: {
        create: (type) => {
            console.log(`Stripe Elements creating element of type: '${type}'`);
            if (type === 'payment') {
                return stripeMocks.mockCardElement;
            }
            return null;
        },
    },

    /**
     * Mocks the global `Stripe()` constructor function.
     * @param {string} publicKey - The Stripe public key.
     * @returns {Object} A mock Stripe instance.
     */
    createStripeInstance: (publicKey) => {
        console.log(`Stripe initialized with public key: ${publicKey}`);
        return {
            elements: (options) => {
                console.log('Stripe elements created with client secret:', options.clientSecret);
                return stripeMocks.mockElements;
            },
            confirmPayment: (options) => {
                console.log('Stripe confirmPayment called.');
                // Default to a successful payment for simulation
                return Promise.resolve(stripeMocks.createConfirmPaymentResponse('succeeded'));
            },
        };
    },
};

// ==================== GLOBAL & THIRD-PARTY MOCKS ====================

export const globalMocks = {
    /**
     * Mocks the Bootstrap Modal class.
     */
    mockBootstrapModal: {
        // A store for the "shown" instance
        _instance: null,
        // Mock the constructor
        Modal: class {
            constructor(element) {
                console.log('Bootstrap Modal initialized for element:', element.id);
                globalMocks.mockBootstrapModal._instance = this;
            }
            show() {
                console.log('Modal.show() called.');
            }
            hide() {
                console.log('Modal.hide() called.');
            }
            // Static method mock
            static getInstance(element) {
                console.log('Modal.getInstance() called for element:', element.id);
                return globalMocks.mockBootstrapModal._instance;
            }
        },
    },

    /**
     * Mocks the global booking manager to test interactions.
     */
    mockBookingManager: {
        loadBookings: () => {
            console.log('window.bookingManager.loadBookings() was called successfully.');
        },
    },
};