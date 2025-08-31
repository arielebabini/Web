const StripeService = require('../services/stripeService');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

class PaymentController {
    /**
     * Crea un Payment Intent per una prenotazione
     */
    static async createPaymentIntent(req, res) {
        try {
            const { bookingId } = req.body;
            const userId = req.user.id;

            // Verifica che la prenotazione esista e appartenga all'utente
            const booking = await Booking.findById(bookingId);
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Prenotazione non trovata'
                });
            }

            if (booking.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Non autorizzato'
                });
            }

            if (booking.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'La prenotazione non è in stato pending'
                });
            }

            // Crea il Payment Intent
            const paymentIntent = await StripeService.createPaymentIntent(booking, req.user);

            res.json({
                success: true,
                message: 'Payment intent creato con successo',
                data: {
                    payment_intent: {
                        id: paymentIntent.id,
                        client_secret: paymentIntent.client_secret,
                        amount: paymentIntent.amount,
                        currency: paymentIntent.currency,
                        status: paymentIntent.status
                    },
                    booking: {
                        id: booking.id,
                        space_name: booking.space_name,
                        start_date: booking.start_date,
                        end_date: booking.end_date,
                        total_price: booking.total_price
                    }
                }
            });

        } catch (error) {
            logger.error('Error creating payment intent:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nella creazione del payment intent'
            });
        }
    }

    /**
     * Conferma un pagamento (per ambiente test)
     */
    static async confirmPayment(req, res) {
        try {
            const { payment_intent_id, payment_data } = req.body;

            const result = await StripeService.confirmPaymentIntent(payment_intent_id, payment_data);

            res.json({
                success: true,
                message: 'Pagamento confermato con successo',
                data: {
                    payment: result
                }
            });

        } catch (error) {
            logger.error('Error confirming payment:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nella conferma del pagamento'
            });
        }
    }

    /**
     * Webhook Stripe
     */
    static async handleStripeWebhook(req, res) {
        try {
            const signature = req.headers['stripe-signature'];
            await StripeService.handleWebhook(signature, req.body);

            res.status(200).json({ received: true });
        } catch (error) {
            logger.error('Webhook error:', error);
            res.status(400).json({
                success: false,
                message: 'Webhook processing failed'
            });
        }
    }

    /**
     * Stato pagamento
     */
    static async getPaymentStatus(req, res) {
        try {
            const { paymentId } = req.params;
            const payment = await Payment.findById(paymentId);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Pagamento non trovato'
                });
            }

            res.json({
                success: true,
                data: { payment }
            });

        } catch (error) {
            logger.error('Error getting payment status:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero dello stato pagamento'
            });
        }
    }
}

module.exports = PaymentController;