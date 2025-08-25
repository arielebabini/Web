const stripeClient = require('../config/stripeConfig');
const logger = require('../utils/logger');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

class StripeService {
    /**
     * Crea un Payment Intent per una prenotazione
     */
    static async createPaymentIntent(bookingData, userData) {
        try {
            // Recupera i dati reali della prenotazione
            const booking = await Booking.findById(bookingData.id);
            if (!booking) {
                throw new Error('Prenotazione non trovata');
            }

            const paymentIntent = await stripeClient.paymentIntents.create({
                amount: Math.round(booking.total_price * 100), // Stripe usa centesimi
                currency: 'eur',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    booking_id: booking.id,
                    user_id: userData.id,
                    user_email: userData.email,
                    space_name: booking.space_name || 'Spazio Coworking'
                },
                description: `Prenotazione ${booking.space_name} - ${booking.start_date}`,
                receipt_email: userData.email,
            });

            // Salva il pagamento nel database
            await Payment.create({
                booking_id: booking.id,
                stripe_payment_intent_id: paymentIntent.id,
                amount: booking.total_price,
                currency: 'EUR',
                status: 'pending',
                payment_method: {}
            });

            logger.info(`Payment Intent created: ${paymentIntent.id} for booking: ${booking.id}`);
            return paymentIntent;
        } catch (error) {
            logger.error('Error creating payment intent:', error);
            throw error;
        }
    }

    /**
     * Conferma un Payment Intent (simulazione per ambiente test)
     */
    static async confirmPaymentIntent(paymentIntentId, paymentData) {
        try {
            // In ambiente test, simula la conferma
            const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

            // Simula successo del pagamento
            const mockPaymentMethod = {
                id: `pm_test_${Date.now()}`,
                type: 'card',
                card: {
                    brand: 'visa',
                    last4: paymentData.cardNumber.slice(-4),
                    exp_month: parseInt(paymentData.expiry.split('/')[0]),
                    exp_year: parseInt('20' + paymentData.expiry.split('/')[1])
                }
            };

            // Aggiorna il pagamento nel database
            await Payment.updateByStripeIntent(paymentIntentId, {
                status: 'completed',
                payment_method: mockPaymentMethod,
                completed_at: new Date()
            });

            // Simula response di Stripe
            return {
                id: paymentIntentId,
                status: 'succeeded',
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                metadata: paymentIntent.metadata,
                payment_method: mockPaymentMethod
            };

        } catch (error) {
            logger.error('Error confirming payment intent:', error);
            throw error;
        }
    }

    /**
     * Webhook handler per eventi Stripe
     */
    static async handleWebhook(signature, payload) {
        try {
            let event;

            if (process.env.STRIPE_WEBHOOK_SECRET) {
                event = stripeClient.webhooks.constructEvent(
                    payload,
                    signature,
                    process.env.STRIPE_WEBHOOK_SECRET
                );
            } else {
                // Per sviluppo senza webhook secret
                event = JSON.parse(payload.toString());
            }

            await this.processWebhookEvent(event);
            return { received: true };

        } catch (error) {
            logger.error('Webhook signature verification failed:', error);
            throw error;
        }
    }

    /**
     * Processa gli eventi del webhook
     */
    static async processWebhookEvent(event) {
        logger.info(`Processing webhook event: ${event.type}`);

        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await this.handlePaymentFailed(event.data.object);
                break;
            default:
                logger.info(`Unhandled event type: ${event.type}`);
        }
    }

    static async handlePaymentSucceeded(paymentIntent) {
        try {
            // Aggiorna pagamento
            await Payment.updateByStripeIntent(paymentIntent.id, {
                status: 'completed',
                completed_at: new Date()
            });

            // Conferma automaticamente la prenotazione
            const payment = await Payment.findByStripeIntent(paymentIntent.id);
            if (payment && payment.booking_id) {
                await Booking.confirm(payment.booking_id);
                logger.info(`Booking ${payment.booking_id} automatically confirmed after payment`);
            }

        } catch (error) {
            logger.error('Error handling payment succeeded:', error);
        }
    }

    static async handlePaymentFailed(paymentIntent) {
        try {
            await Payment.updateByStripeIntent(paymentIntent.id, {
                status: 'failed',
                failure_reason: paymentIntent.last_payment_error?.message
            });
        } catch (error) {
            logger.error('Error handling payment failed:', error);
        }
    }
}

module.exports = StripeService;
