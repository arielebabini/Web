/**
 * @file Mock data and objects for testing the consolidated Booking class.
 * @description This file simulates API responses, Stripe.js, space data,
 * booking objects, and global browser dependencies.
 * @version 1.0.0
 */

// ==================== MOCK SPACES DATA ====================
export const mockSpaces = {
    desk: {
        id: 'space_001',
        name: 'Postazione Flessibile in Open Space',
        address: 'Via dell\'Innovazione, 1',
        city: 'Milano',
        capacity: 1,
        price_per_day: 35.00,
        images: ['/assets/images/desk-space.jpg'],
    },
    meetingRoom: {
        id: 'space_002',
        name: 'Sala Riunioni "Creative Hub"',
        address: 'Piazza della Tecnologia, 5',
        city: 'Roma',
        capacity: 10,
        price_per_day: 120.00,
        images: ['/assets/images/meeting-room.jpg'],
    },
};

// ==================== MOCK BOOKINGS DATA ====================
export const mockBookings = [
    {
        id: 'booking_abc123',
        space_id: 'space_002',
        space_name: 'Sala Riunioni "Creative Hub"',
        space_city: 'Roma',
        start_date: '2025-09-10',
        end_date: '2025-09-10',
        start_time: '10:00',
        end_time: '12:00',
        people_count: 5,
        total_price: '120.00',
        status: 'confirmed',
    },
    {
        id: 'booking_def456',
        space_id: 'space_001',
        space_name: 'Postazione Flessibile in Open Space',
        space_city: 'Milano',
        start_date: '2025-09-15',
        end_date: '2025-09-16',
        start_time: '09:00',
        end_time: '18:00',
        people_count: 1,
        total_price: '70.00',
        status: 'pending',
    },
    {
        id: 'booking_ghi789',
        space_id: 'space_001',
        space_name: 'Postazione Flessibile in Open Space',
        space_city: 'Milano',
        start_date: '2025-08-01',
        end_date: '2025-08-01',
        start_time: '14:00',
        end_time: '18:00',
        people_count: 1,
        total_price: '35.00',
        status: 'cancelled',
    },
];

// ==================== MOCK API RESPONSES ====================
export const apiResponses = {
    // GET /api/spaces/{id}
    getSpace: {
        success: {
            success: true,
            data: mockSpaces.desk,
        },
        failure: {
            success: false,
            message: 'Spazio non trovato.',
        },
    },
    // POST /api/bookings/check-availability
    checkAvailability: {
        available: { isAvailable: true },
        notAvailable: { isAvailable: false },
    },
    // POST /api/bookings
    createBooking: {
        success: {
            success: true,
            booking: {
                id: 'booking_new_xyz789',
                ...mockFormData.validBookingForm,
                total_price: 35.00, // Calculated price
                status: 'pending_payment'
            },
        },
        failure: {
            success: false,
            message: 'Le date selezionate non sono disponibili.',
        },
    },
    // GET /api/bookings/me
    getUserBookings: {
        success: {
            success: true,
            data: mockBookings
        },
        empty: {
            success: true,
            data: []
        },
        failure: {
            success: false,
            message: 'Token di autenticazione non valido.'
        }
    },
    // POST /api/payments/create-intent
    createPaymentIntent: {
        success: {
            success: true,
            data: {
                payment_intent: {
                    id: 'pi_mock_12345',
                    client_secret: 'pi_mock_12345_secret_mock_67890',
                },
            },
        },
        failure: {
            success: false,
            message: 'Errore nella creazione del pagamento.',
        },
    },
    // POST /api/payments/confirm
    confirmPayment: {
        success: {
            success: true,
            message: 'Pagamento confermato con successo.'
        }
    }
};

// ==================== MOCK FORM DATA (USER INPUT) ====================
export const mockFormData = {
    validBookingForm: {
        space_id: 'space_001',
        start_date: '2025-09-20',
        end_date: '2025-09-20',
        start_time: '09:00',
        end_time: '18:00',
        people_count: 1,
        notes: 'Nessuna nota particolare.'
    },
    validPaymentForm: {
        cardholderName: 'Mario Rossi',
        // In un test reale, non si gestirebbero direttamente i dati della carta
        // ma si simulerebbe l'interazione con Stripe Elements.
    }
};

// ==================== MOCK STRIPE.JS OBJECTS ====================
export const stripeMocks = {
    /** Mock Payment Intent object returned by Stripe.js */
    mockPaymentIntent: {
        succeeded: {
            id: 'pi_mock_12345',
            status: 'succeeded',
        },
        card_error: {
            code: 'card_declined',
            message: 'La tua carta è stata rifiutata.',
            type: 'card_error'
        }
    },

    /** Mock Card Element */
    mockCardElement: {
        mount: (selector) => console.log(`Stripe Card Element mounted to: ${selector}`),
        on: (event, handler) => console.log(`Listener for '${event}' attached.`),
    },

    /** Mock Elements object */
    mockElements: {
        create: (type) => {
            if (type === 'payment') return stripeMocks.mockCardElement;
            return null;
        },
    },

    /** A mock Stripe instance returned by the global Stripe() constructor */
    createStripeInstance: (publicKey) => ({
        elements: (options) => stripeMocks.mockElements,
        /**
         * Simulates the confirmPayment method.
         * @returns {Promise<Object>} A promise that resolves with a mock payment result.
         */
        confirmPayment: ({ elements, redirect }) => {
            console.log('Stripe.confirmPayment called with redirect:', redirect);
            // Simulate a successful payment by default
            return Promise.resolve({
                error: null,
                paymentIntent: stripeMocks.mockPaymentIntent.succeeded,
            });
        },
    }),
};

// ==================== GLOBAL & BROWSER MOCKS ====================
export const globalMocks = {
    /** Mocks the Bootstrap Modal class */
    mockBootstrapModal: {
        _instance: null,
        Modal: class {
            constructor(element) { this._element = element; globalMocks.mockBootstrapModal._instance = this; }
            show() { console.log(`Bootstrap Modal shown: #${this._element.id}`); }
            hide() { console.log(`Bootstrap Modal hidden: #${this._element.id}`); }
            static getInstance(element) { return globalMocks.mockBootstrapModal._instance; }
        },
    },

    /** Mocks window.localStorage */
    mockLocalStorage: (() => {
        let store = {};
        return {
            getItem: (key) => store[key] || null,
            setItem: (key, value) => { store[key] = value.toString(); },
            removeItem: (key) => { delete store[key]; },
            clear: () => { store = {}; },
            // Helper to pre-populate for tests
            _populate: (data) => { store = { ...data }; }
        };
    })(),

    /** Mocks a global notification system */
    mockShowNotification: (message, type) => {
        console.log(`[NOTIFICATION | ${type.toUpperCase()}]: ${message}`);
    }
};

// Pre-populate localStorage for authenticated user tests
globalMocks.mockLocalStorage._populate({
    auth_token: 'mock_jwt_auth_token_for_testing'
});