// api/src/services/stripeService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

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
}

module.exports = StripeService;