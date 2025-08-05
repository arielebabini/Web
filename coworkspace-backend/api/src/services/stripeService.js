// api/src/services/stripeService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');
const Payment = require('../models/Payment');

class StripeService {
    /**
     * Crea un Payment Intent per una prenotazione
     */
    static async createPaymentIntent(booking, user) {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(booking.total_price * 100), // Stripe usa centesimi
                currency: 'eur',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    booking_id: booking.id,
                    user_id: user.id,
                    user_email: user.email,
                    space_name: booking.space_name || 'Spazio Coworking'
                },
                description: `Prenotazione spazio coworking - ${booking.space_name}`,
                receipt_email: user.email,
            });

            logger.info(`Payment Intent created: ${paymentIntent.id} for booking: ${booking.id}`);
            return paymentIntent;
        } catch (error) {
            logger.error('Error creating payment intent:', error);
            throw new Error('Errore nella creazione del pagamento');
        }
    }

    /**
     * Conferma un Payment Intent
     */
    static async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
        try {
            const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
                payment_method: paymentMethodId,
                return_url: `${process.env.FRONTEND_URL}/booking/success`,
            });

            logger.info(`Payment Intent confirmed: ${paymentIntentId}`);
            return paymentIntent;
        } catch (error) {
            logger.error('Error confirming payment intent:', error);
            throw new Error('Errore nella conferma del pagamento');
        }
    }

    /**
     * Recupera un Payment Intent
     */
    static async retrievePaymentIntent(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            logger.error('Error retrieving payment intent:', error);
            throw new Error('Errore nel recupero del pagamento');
        }
    }

    /**
     * Verifica lo stato di un pagamento
     */
    static async getPaymentStatus(paymentIntentId) {
        try {
            const paymentIntent = await this.retrievePaymentIntent(paymentIntentId);

            return {
                status: paymentIntent.status,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                created: new Date(paymentIntent.created * 1000),
                metadata: paymentIntent.metadata
            };
        } catch (error) {
            logger.error('Error getting payment status:', error);
            throw error;
        }
    }

    /**
     * Gestisce i webhook di Stripe
     */
    static async handleWebhook(signature, payload) {
        try {
            if (!process.env.STRIPE_WEBHOOK_SECRET) {
                logger.warn('STRIPE_WEBHOOK_SECRET not configured, skipping signature verification');
                // Per sviluppo, permettiamo il webhook senza verifica
                const event = JSON.parse(payload);
                await this.processWebhookEvent(event);
                return;
            }

            // Verifica la firma del webhook
            const event = stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );

            await this.processWebhookEvent(event);

        } catch (error) {
            logger.error('Error handling webhook:', error);
            throw error;
        }
    }

    /**
     * Processa l'evento del webhook
     */
    static async processWebhookEvent(event) {
        try {
            logger.info(`Processing webhook event: ${event.type}`);

            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;

                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;

                case 'payment_intent.processing':
                    await this.handlePaymentProcessing(event.data.object);
                    break;

                case 'payment_intent.canceled':
                    await this.handlePaymentCanceled(event.data.object);
                    break;

                default:
                    logger.info(`Unhandled webhook event type: ${event.type}`);
            }

        } catch (error) {
            logger.error('Error processing webhook event:', error);
            throw error;
        }
    }

    /**
     * Gestisce pagamento riuscito
     */
    static async handlePaymentSucceeded(paymentIntent) {
        try {
            const payment = await Payment.findByStripeIntent(paymentIntent.id);
            if (!payment) {
                logger.warn(`Payment not found for intent: ${paymentIntent.id}`);
                return;
            }

            await Payment.updateStatus(payment.id, 'completed', {
                completed_at: new Date(),
                stripe_payment_method: paymentIntent.payment_method
            });

            logger.info(`Payment ${payment.id} marked as completed`);

            // Qui potresti aggiungere logica per:
            // - Confermare automaticamente la prenotazione
            // - Inviare email di conferma
            // - Aggiornare lo stato della prenotazione

        } catch (error) {
            logger.error('Error handling payment succeeded:', error);
        }
    }

    /**
     * Gestisce pagamento fallito
     */
    static async handlePaymentFailed(paymentIntent) {
        try {
            const payment = await Payment.findByStripeIntent(paymentIntent.id);
            if (!payment) {
                logger.warn(`Payment not found for intent: ${paymentIntent.id}`);
                return;
            }

            await Payment.updateStatus(payment.id, 'failed', {
                failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
            });

            logger.info(`Payment ${payment.id} marked as failed`);

        } catch (error) {
            logger.error('Error handling payment failed:', error);
        }
    }

    /**
     * Gestisce pagamento in elaborazione
     */
    static async handlePaymentProcessing(paymentIntent) {
        try {
            const payment = await Payment.findByStripeIntent(paymentIntent.id);
            if (!payment) {
                logger.warn(`Payment not found for intent: ${paymentIntent.id}`);
                return;
            }

            await Payment.updateStatus(payment.id, 'processing');
            logger.info(`Payment ${payment.id} marked as processing`);

        } catch (error) {
            logger.error('Error handling payment processing:', error);
        }
    }

    /**
     * Gestisce pagamento cancellato
     */
    static async handlePaymentCanceled(paymentIntent) {
        try {
            const payment = await Payment.findByStripeIntent(paymentIntent.id);
            if (!payment) {
                logger.warn(`Payment not found for intent: ${paymentIntent.id}`);
                return;
            }

            await Payment.updateStatus(payment.id, 'canceled');
            logger.info(`Payment ${payment.id} marked as canceled`);

        } catch (error) {
            logger.error('Error handling payment canceled:', error);
        }
    }

    /**
     * Test connection per verificare Stripe
     */
    static async testConnection() {
        try {
            const testIntent = await this.createPaymentIntent(
                {
                    id: 'test-booking',
                    total_price: 10.00,
                    space_name: 'Test Space'
                },
                {
                    id: 'test-user',
                    email: 'test@example.com',
                    first_name: 'Test',
                    last_name: 'User'
                }
            );
            return testIntent;
        } catch (error) {
            logger.error('Stripe connection test failed:', error);
            throw error;
        }
    }

    /**
     * Cancella un Payment Intent
     */
    static async cancelPaymentIntent(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
            logger.info(`Payment Intent canceled: ${paymentIntentId}`);
            return paymentIntent;
        } catch (error) {
            logger.error('Error canceling payment intent:', error);
            throw error;
        }
    }

    /**
     * Crea un rimborso
     */
    static async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
        try {
            const refundData = {
                payment_intent: paymentIntentId,
                reason: reason
            };

            if (amount) {
                refundData.amount = Math.round(amount * 100); // Stripe usa centesimi
            }

            const refund = await stripe.refunds.create(refundData);
            logger.info(`Refund created: ${refund.id} for payment: ${paymentIntentId}`);
            return refund;
        } catch (error) {
            logger.error('Error creating refund:', error);
            throw error;
        }
    }
}

module.exports = StripeService;