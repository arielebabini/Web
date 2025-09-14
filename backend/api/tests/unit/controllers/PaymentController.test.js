// tests/unit/controllers/PaymentController.test.js

// Mock delle dipendenze
jest.mock('../../../src/services/stripeService', () => ({
    createPaymentIntent: jest.fn(),
    confirmPaymentIntent: jest.fn(),
    handleWebhook: jest.fn()
}));

jest.mock('../../../src/models/Booking', () => ({
    findById: jest.fn()
}));

jest.mock('../../../src/models/Payment', () => ({
    findById: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn()
}));

const PaymentController = require('../../../src/controllers/paymentController');
const StripeService = require('../../../src/services/stripeService');
const Booking = require('../../../src/models/Booking');
const Payment = require('../../../src/models/Payment');

describe('PaymentController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: {
                id: 'user123',
                email: 'test@example.com',
                first_name: 'John',
                last_name: 'Doe'
            },
            body: {},
            params: {},
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('createPaymentIntent', () => {
        test('should create payment intent successfully', async () => {
            req.body = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'user123',
                space_name: 'Conference Room A',
                start_date: '2024-02-15',
                end_date: '2024-02-15',
                total_price: 150.00,
                status: 'pending'
            };

            const mockPaymentIntent = {
                id: 'pi_test_123',
                client_secret: 'pi_test_123_secret',
                amount: 15000, // in cents
                currency: 'eur',
                status: 'requires_payment_method'
            };

            Booking.findById.mockResolvedValue(mockBooking);
            StripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

            await PaymentController.createPaymentIntent(req, res);

            expect(Booking.findById).toHaveBeenCalledWith('booking123');
            expect(StripeService.createPaymentIntent).toHaveBeenCalledWith(mockBooking, req.user);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Payment intent creato con successo',
                data: {
                    payment_intent: {
                        id: 'pi_test_123',
                        client_secret: 'pi_test_123_secret',
                        amount: 15000,
                        currency: 'eur',
                        status: 'requires_payment_method'
                    },
                    booking: {
                        id: 'booking123',
                        space_name: 'Conference Room A',
                        start_date: '2024-02-15',
                        end_date: '2024-02-15',
                        total_price: 150.00
                    }
                }
            });
        });

        test('should return 404 when booking not found', async () => {
            req.body = { bookingId: 'nonexistent' };

            Booking.findById.mockResolvedValue(null);

            await PaymentController.createPaymentIntent(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Prenotazione non trovata'
            });
            expect(StripeService.createPaymentIntent).not.toHaveBeenCalled();
        });

        test('should return 403 when booking belongs to different user', async () => {
            req.body = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'other_user', // Diverso dall'utente corrente
                status: 'pending'
            };

            Booking.findById.mockResolvedValue(mockBooking);

            await PaymentController.createPaymentIntent(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non autorizzato'
            });
            expect(StripeService.createPaymentIntent).not.toHaveBeenCalled();
        });

        test('should return 400 when booking is not in pending status', async () => {
            req.body = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'user123',
                status: 'confirmed' // Non pending
            };

            Booking.findById.mockResolvedValue(mockBooking);

            await PaymentController.createPaymentIntent(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'La prenotazione non è in stato pending'
            });
            expect(StripeService.createPaymentIntent).not.toHaveBeenCalled();
        });

        test('should handle Stripe service errors', async () => {
            req.body = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'user123',
                status: 'pending'
            };

            Booking.findById.mockResolvedValue(mockBooking);
            StripeService.createPaymentIntent.mockRejectedValue(new Error('Stripe API error'));

            await PaymentController.createPaymentIntent(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errore nella creazione del payment intent'
            });
        });

        test('should handle database errors', async () => {
            req.body = { bookingId: 'booking123' };

            Booking.findById.mockRejectedValue(new Error('Database error'));

            await PaymentController.createPaymentIntent(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errore nella creazione del payment intent'
            });
        });
    });

    describe('confirmPayment', () => {
        test('should confirm payment successfully', async () => {
            req.body = {
                payment_intent_id: 'pi_test_123',
                payment_data: {
                    payment_method: 'pm_card_visa'
                }
            };

            const mockPaymentResult = {
                id: 'pi_test_123',
                status: 'succeeded',
                amount: 15000,
                currency: 'eur'
            };

            StripeService.confirmPaymentIntent.mockResolvedValue(mockPaymentResult);

            await PaymentController.confirmPayment(req, res);

            expect(StripeService.confirmPaymentIntent).toHaveBeenCalledWith(
                'pi_test_123',
                { payment_method: 'pm_card_visa' }
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Pagamento confermato con successo',
                data: {
                    payment: mockPaymentResult
                }
            });
        });

        test('should handle payment confirmation errors', async () => {
            req.body = {
                payment_intent_id: 'pi_test_123',
                payment_data: {}
            };

            StripeService.confirmPaymentIntent.mockRejectedValue(
                new Error('Payment confirmation failed')
            );

            await PaymentController.confirmPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errore nella conferma del pagamento'
            });
        });

        test('should handle missing payment data', async () => {
            req.body = {
                payment_intent_id: 'pi_test_123'
                // payment_data mancante
            };

            StripeService.confirmPaymentIntent.mockResolvedValue({});

            await PaymentController.confirmPayment(req, res);

            expect(StripeService.confirmPaymentIntent).toHaveBeenCalledWith(
                'pi_test_123',
                undefined
            );
        });
    });

    describe('handleStripeWebhook', () => {
        test('should handle webhook successfully', async () => {
            req.headers = {
                'stripe-signature': 'whsec_test_signature'
            };
            req.body = {
                id: 'evt_test_123',
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_test_123'
                    }
                }
            };

            StripeService.handleWebhook.mockResolvedValue(true);

            await PaymentController.handleStripeWebhook(req, res);

            expect(StripeService.handleWebhook).toHaveBeenCalledWith(
                'whsec_test_signature',
                req.body
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ received: true });
        });

        test('should handle webhook processing errors', async () => {
            req.headers = {
                'stripe-signature': 'invalid_signature'
            };
            req.body = {};

            StripeService.handleWebhook.mockRejectedValue(
                new Error('Invalid webhook signature')
            );

            await PaymentController.handleStripeWebhook(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Webhook processing failed'
            });
        });

        test('should handle missing signature header', async () => {
            req.headers = {}; // Nessuna signature
            req.body = {};

            StripeService.handleWebhook.mockRejectedValue(
                new Error('Missing stripe signature')
            );

            await PaymentController.handleStripeWebhook(req, res);

            expect(StripeService.handleWebhook).toHaveBeenCalledWith(
                undefined,
                req.body
            );
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getPaymentStatus', () => {
        test('should get payment status successfully', async () => {
            req.params = { paymentId: 'payment123' };

            const mockPayment = {
                id: 'payment123',
                stripe_payment_intent_id: 'pi_test_123',
                booking_id: 'booking123',
                user_id: 'user123',
                amount: 150.00,
                currency: 'EUR',
                status: 'succeeded',
                created_at: '2024-02-15T10:00:00Z'
            };

            Payment.findById.mockResolvedValue(mockPayment);

            await PaymentController.getPaymentStatus(req, res);

            expect(Payment.findById).toHaveBeenCalledWith('payment123');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { payment: mockPayment }
            });
        });

        test('should return 404 when payment not found', async () => {
            req.params = { paymentId: 'nonexistent' };

            Payment.findById.mockResolvedValue(null);

            await PaymentController.getPaymentStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Pagamento non trovato'
            });
        });

        test('should handle database errors when getting payment status', async () => {
            req.params = { paymentId: 'payment123' };

            Payment.findById.mockRejectedValue(new Error('Database connection failed'));

            await PaymentController.getPaymentStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errore nel recupero dello stato pagamento'
            });
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('createPaymentIntent should handle null bookingId', async () => {
            req.body = { bookingId: null };

            Booking.findById.mockResolvedValue(null);

            await PaymentController.createPaymentIntent(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Prenotazione non trovata'
            });
        });

        test('createPaymentIntent should handle undefined bookingId', async () => {
            req.body = {}; // bookingId undefined

            Booking.findById.mockResolvedValue(null);

            await PaymentController.createPaymentIntent(req, res);

            expect(Booking.findById).toHaveBeenCalledWith(undefined);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('confirmPayment should handle empty payment_intent_id', async () => {
            req.body = {
                payment_intent_id: '',
                payment_data: {}
            };

            StripeService.confirmPaymentIntent.mockRejectedValue(
                new Error('Invalid payment intent ID')
            );

            await PaymentController.confirmPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('handleStripeWebhook should handle malformed webhook data', async () => {
            req.headers = {
                'stripe-signature': 'valid_signature'
            };
            req.body = 'invalid json'; // Malformed data

            StripeService.handleWebhook.mockRejectedValue(
                new Error('Invalid JSON in webhook body')
            );

            await PaymentController.handleStripeWebhook(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Security Tests', () => {
        test('createPaymentIntent should prevent access to other users bookings', async () => {
            req.body = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'malicious_user',
                status: 'pending'
            };

            Booking.findById.mockResolvedValue(mockBooking);

            await PaymentController.createPaymentIntent(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(StripeService.createPaymentIntent).not.toHaveBeenCalled();
        });

        test('should handle concurrent payment attempt scenarios', async () => {
            req.body = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'user123',
                status: 'confirmed' // Already processed
            };

            Booking.findById.mockResolvedValue(mockBooking);

            await PaymentController.createPaymentIntent(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'La prenotazione non è in stato pending'
            });
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle full payment flow simulation', async () => {
            // Step 1: Create payment intent
            req.body = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'user123',
                space_name: 'Meeting Room',
                start_date: '2024-02-15',
                end_date: '2024-02-15',
                total_price: 100.00,
                status: 'pending'
            };

            const mockPaymentIntent = {
                id: 'pi_test_123',
                client_secret: 'pi_test_123_secret',
                amount: 10000,
                currency: 'eur',
                status: 'requires_payment_method'
            };

            Booking.findById.mockResolvedValue(mockBooking);
            StripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

            await PaymentController.createPaymentIntent(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        payment_intent: expect.objectContaining({
                            id: 'pi_test_123'
                        })
                    })
                })
            );

            // Step 2: Check payment status
            jest.clearAllMocks();
            req.params = { paymentId: 'payment123' };

            const mockPayment = {
                id: 'payment123',
                stripe_payment_intent_id: 'pi_test_123',
                status: 'succeeded'
            };

            Payment.findById.mockResolvedValue(mockPayment);

            await PaymentController.getPaymentStatus(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { payment: mockPayment }
            });
        });
    });
});