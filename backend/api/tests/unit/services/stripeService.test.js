// tests/unit/services/stripeService.test.js

// Mock delle dipendenze
jest.mock('../../../src/config/stripeConfig', () => ({
    paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn()
    },
    webhooks: {
        constructEvent: jest.fn()
    }
}));
jest.mock('../../../src/models/Payment', () => ({
    create: jest.fn(),
    findByStripeIntent: jest.fn(),
    updateByStripeIntent: jest.fn()
}));
jest.mock('../../../src/models/Booking', () => ({
    findById: jest.fn(),
    confirm: jest.fn()
}));
jest.mock('../../../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

const stripeClient = require('../../../src/config/stripeConfig');
const Payment = require('../../../src/models/Payment');
const Booking = require('../../../src/models/Booking');
const logger = require('../../../src/utils/logger');
const StripeService = require('../../../src/services/stripeService');

describe('StripeService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Ripulisce tutti gli spy sui metodi statici
        jest.restoreAllMocks();
    });

    describe('createPaymentIntent', () => {
        test('should create a payment intent and a local payment record', async () => {
            const mockBooking = {
                id: 'booking123',
                total_price: 150.50,
                space_name: 'Sala Conferenze',
                start_date: '2025-10-10'
            };
            const mockUserData = { id: 'user123', email: 'user@test.com' };
            const mockPaymentIntent = { id: 'pi_123', client_secret: 'secret' };

            Booking.findById.mockResolvedValue(mockBooking);
            stripeClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
            Payment.create.mockResolvedValue({});

            const result = await StripeService.createPaymentIntent(mockBooking, mockUserData);

            expect(Booking.findById).toHaveBeenCalledWith('booking123');
            expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith({
                amount: 15050, // Prezzo in centesimi
                currency: 'eur',
                automatic_payment_methods: { enabled: true },
                metadata: {
                    booking_id: 'booking123',
                    user_id: 'user123',
                    user_email: 'user@test.com',
                    space_name: 'Sala Conferenze'
                },
                description: 'Prenotazione Sala Conferenze - 2025-10-10',
                receipt_email: 'user@test.com'
            });
            expect(Payment.create).toHaveBeenCalledWith({
                booking_id: 'booking123',
                stripe_payment_intent_id: 'pi_123',
                amount: 150.50,
                currency: 'EUR',
                status: 'pending',
                payment_method: {}
            });
            expect(result).toBe(mockPaymentIntent);
        });

        test('should throw an error if booking is not found', async () => {
            Booking.findById.mockResolvedValue(null);

            await expect(StripeService.createPaymentIntent({ id: 'nonexistent' }, {}))
                .rejects.toThrow('Prenotazione non trovata');

            expect(logger.error).toHaveBeenCalledWith(
                'Error creating payment intent:',
                expect.any(Error)
            );
        });

        test('should handle stripe errors gracefully', async () => {
            const mockBooking = {
                id: 'booking123',
                total_price: 150.50,
                space_name: 'Sala Conferenze',
                start_date: '2025-10-10'
            };
            const mockUserData = { id: 'user123', email: 'user@test.com' };

            Booking.findById.mockResolvedValue(mockBooking);
            stripeClient.paymentIntents.create.mockRejectedValue(new Error('Stripe API error'));

            await expect(StripeService.createPaymentIntent(mockBooking, mockUserData))
                .rejects.toThrow('Stripe API error');

            expect(logger.error).toHaveBeenCalledWith(
                'Error creating payment intent:',
                expect.any(Error)
            );
        });
    });

    describe('confirmPaymentIntent', () => {
        test('should confirm payment intent and update booking', async () => {
            const paymentIntentId = 'pi_test_123';
            const paymentData = {
                cardNumber: '4242424242424242',
                expiry: '12/25'
            };

            const mockPaymentIntent = {
                id: paymentIntentId,
                status: 'requires_confirmation',
                amount: 15000,
                currency: 'eur',
                metadata: { booking_id: 'booking123' }
            };

            const mockPayment = {
                booking_id: 'booking123',
                stripe_payment_intent_id: paymentIntentId
            };

            stripeClient.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
            Payment.findByStripeIntent.mockResolvedValue(mockPayment);
            Payment.updateByStripeIntent.mockResolvedValue({});
            Booking.confirm.mockResolvedValue({});

            const result = await StripeService.confirmPaymentIntent(paymentIntentId, paymentData);

            expect(stripeClient.paymentIntents.retrieve).toHaveBeenCalledWith(paymentIntentId);
            expect(Payment.updateByStripeIntent).toHaveBeenCalledWith(paymentIntentId, {
                status: 'succeeded',
                payment_method: expect.objectContaining({
                    type: 'card',
                    card: expect.objectContaining({
                        last4: '4242'
                    })
                }),
                completed_at: expect.any(Date)
            });
            expect(Booking.confirm).toHaveBeenCalledWith('booking123');

            expect(result.status).toBe('succeeded');
            expect(result.id).toBe(paymentIntentId);
        });

        test('should handle missing payment record', async () => {
            const paymentIntentId = 'pi_test_456';
            const mockPaymentIntent = {
                id: paymentIntentId,
                amount: 10000,
                currency: 'eur',
                metadata: { booking_id: 'booking456' }
            };

            stripeClient.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
            Payment.findByStripeIntent.mockResolvedValue(null);
            Payment.create.mockResolvedValue({});
            Payment.updateByStripeIntent.mockResolvedValue({});

            await StripeService.confirmPaymentIntent(paymentIntentId, {});

            expect(Payment.create).toHaveBeenCalledWith({
                booking_id: 'booking456',
                stripe_payment_intent_id: paymentIntentId,
                amount: 100,
                currency: 'EUR',
                status: 'pending',
                payment_method: {}
            });
        });

        test('should handle payment intent not found', async () => {
            stripeClient.paymentIntents.retrieve.mockResolvedValue(null);

            await expect(StripeService.confirmPaymentIntent('pi_invalid', {}))
                .rejects.toThrow('Payment Intent non trovato su Stripe');
        });
    });

    describe('handleWebhook', () => {

        test('should process webhook without signature in development', async () => {
            const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
            delete process.env.STRIPE_WEBHOOK_SECRET;

            const mockEventPayload = JSON.stringify({
                type: 'payment_intent.succeeded',
                data: { object: { id: 'pi_456' } }
            });

            jest.spyOn(StripeService, 'processWebhookEvent').mockResolvedValue();

            const result = await StripeService.handleWebhook('', Buffer.from(mockEventPayload));

            expect(StripeService.processWebhookEvent).toHaveBeenCalledWith({
                type: 'payment_intent.succeeded',
                data: { object: { id: 'pi_456' } }
            });
            expect(result).toEqual({ received: true });

            // Ripristina la variabile d'ambiente
            if (originalSecret) {
                process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
            }
        });

        test('should throw error on webhook signature verification failure', async () => {
            const error = new Error('Signature verification failed');

            // Imposta STRIPE_WEBHOOK_SECRET per forzare la verifica della signature
            process.env.STRIPE_WEBHOOK_SECRET = 'test_secret';
            stripeClient.webhooks.constructEvent.mockImplementation(() => { throw error; });

            await expect(StripeService.handleWebhook('invalid_sig', Buffer.from('payload')))
                .rejects.toThrow('Signature verification failed');

            expect(logger.error).toHaveBeenCalledWith('Webhook signature verification failed:', error);
        });

        test('should handle invalid JSON payload gracefully', async () => {
            delete process.env.STRIPE_WEBHOOK_SECRET;

            await expect(StripeService.handleWebhook('', 'invalid json'))
                .rejects.toThrow();
        });
    });

    describe('processWebhookEvent', () => {
        test('should process "payment_intent.succeeded" event', async () => {
            const mockEvent = {
                type: 'payment_intent.succeeded',
                data: { object: { id: 'pi_123' } }
            };
            const mockPayment = { booking_id: 'booking456' };

            Payment.updateByStripeIntent.mockResolvedValue({});
            Payment.findByStripeIntent.mockResolvedValue(mockPayment);
            Booking.confirm.mockResolvedValue({});

            await StripeService.processWebhookEvent(mockEvent);

            expect(Payment.updateByStripeIntent).toHaveBeenCalledWith('pi_123', {
                status: 'succeeded',
                completed_at: expect.any(Date)
            });
            expect(Booking.confirm).toHaveBeenCalledWith('booking456');
            expect(logger.info).toHaveBeenCalledWith('Booking booking456 automatically confirmed after payment');
        });

        test('should process "payment_intent.payment_failed" event', async () => {
            const mockEvent = {
                type: 'payment_intent.payment_failed',
                data: {
                    object: {
                        id: 'pi_failed_123',
                        last_payment_error: { message: 'Card declined' }
                    }
                }
            };

            Payment.updateByStripeIntent.mockResolvedValue({});

            await StripeService.processWebhookEvent(mockEvent);

            expect(Payment.updateByStripeIntent).toHaveBeenCalledWith('pi_failed_123', {
                status: 'failed',
                failure_reason: 'Card declined'
            });
            expect(Booking.confirm).not.toHaveBeenCalled();
        });

        test('should handle unhandled event types', async () => {
            const mockEvent = {
                type: 'customer.created',
                data: { object: { id: 'cus_123' } }
            };

            await StripeService.processWebhookEvent(mockEvent);

            expect(logger.info).toHaveBeenCalledWith('Processing webhook event: customer.created');
            expect(logger.info).toHaveBeenCalledWith('Unhandled event type: customer.created');
        });
    });

    describe('Event Handlers', () => {
        test('handlePaymentSucceeded should update payment and confirm booking', async () => {
            const mockPaymentIntent = { id: 'pi_success_123' };
            const mockPayment = { booking_id: 'booking789' };

            Payment.updateByStripeIntent.mockResolvedValue({});
            Payment.findByStripeIntent.mockResolvedValue(mockPayment);
            Booking.confirm.mockResolvedValue({});

            await StripeService.handlePaymentSucceeded(mockPaymentIntent);

            expect(Payment.updateByStripeIntent).toHaveBeenCalledWith('pi_success_123', {
                status: 'succeeded',
                completed_at: expect.any(Date)
            });
            expect(Booking.confirm).toHaveBeenCalledWith('booking789');
        });

        test('handlePaymentSucceeded should handle errors gracefully', async () => {
            const mockPaymentIntent = { id: 'pi_error_123' };

            Payment.updateByStripeIntent.mockRejectedValue(new Error('Database error'));

            await StripeService.handlePaymentSucceeded(mockPaymentIntent);

            expect(logger.error).toHaveBeenCalledWith(
                'Error handling payment succeeded:',
                expect.any(Error)
            );
        });

        test('handlePaymentFailed should update payment with failure reason', async () => {
            const mockPaymentIntent = {
                id: 'pi_failed_456',
                last_payment_error: { message: 'Insufficient funds' }
            };

            Payment.updateByStripeIntent.mockResolvedValue({});

            await StripeService.handlePaymentFailed(mockPaymentIntent);

            expect(Payment.updateByStripeIntent).toHaveBeenCalledWith('pi_failed_456', {
                status: 'failed',
                failure_reason: 'Insufficient funds'
            });
        });

        test('handlePaymentFailed should handle errors gracefully', async () => {
            const mockPaymentIntent = { id: 'pi_error_789' };

            Payment.updateByStripeIntent.mockRejectedValue(new Error('Update failed'));

            await StripeService.handlePaymentFailed(mockPaymentIntent);

            expect(logger.error).toHaveBeenCalledWith(
                'Error handling payment failed:',
                expect.any(Error)
            );
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing booking ID in payment intent metadata', async () => {
            const paymentIntentId = 'pi_no_booking';
            const mockPaymentIntent = {
                id: paymentIntentId,
                amount: 5000,
                currency: 'eur',
                metadata: {} // Nessun booking_id
            };

            stripeClient.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
            Payment.findByStripeIntent.mockResolvedValue(null);
            Payment.updateByStripeIntent.mockResolvedValue({});

            await StripeService.confirmPaymentIntent(paymentIntentId, {});

            // Non dovrebbe creare un payment record senza booking_id
            expect(Payment.create).not.toHaveBeenCalled();
        });

        test('should handle booking confirmation failure gracefully', async () => {
            const mockPaymentIntent = { id: 'pi_booking_fail' };
            const mockPayment = { booking_id: 'booking_fail' };

            Payment.updateByStripeIntent.mockResolvedValue({});
            Payment.findByStripeIntent.mockResolvedValue(mockPayment);
            Booking.confirm.mockRejectedValue(new Error('Booking not found'));

            // Non dovrebbe lanciare errore anche se il booking confirmation fallisce
            await expect(StripeService.handlePaymentSucceeded(mockPaymentIntent))
                .resolves.not.toThrow();
        });

        test('should handle missing space_name in booking', async () => {
            const mockBooking = {
                id: 'booking_no_name',
                total_price: 100.00,
                start_date: '2025-10-10'
                // space_name mancante
            };

            Booking.findById.mockResolvedValue(mockBooking);
            stripeClient.paymentIntents.create.mockResolvedValue({ id: 'pi_123' });
            Payment.create.mockResolvedValue({});

            await StripeService.createPaymentIntent(mockBooking, { id: 'user1', email: 'test@example.com' });

            expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        space_name: 'Spazio Coworking' // Fallback value
                    })
                })
            );
        });
    });
});