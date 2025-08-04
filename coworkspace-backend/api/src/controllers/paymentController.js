// api/src/controllers/paymentController.js
const StripeService = require('../services/stripeService');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

class PaymentController {
    /**
     * Health check per payments
     */
    static async healthCheck(req, res) {
        try {
            res.json({
                success: true,
                message: 'Payment service is ready',
                features: {
                    stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured',
                    mode: 'test (educational project)',
                    payments_enabled: true
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error in payment health check:', error);
            res.status(500).json({
                success: false,
                message: 'Payment service error'
            });
        }
    }

    /**
     * Test connessione Stripe (solo development)
     */
    static async testStripeConnection(req, res) {
        try {
            if (process.env.NODE_ENV !== 'development') {
                return res.status(403).json({
                    success: false,
                    message: 'Endpoint disponibile solo in development'
                });
            }

            const testIntent = await StripeService.testConnection();

            res.json({
                success: true,
                message: 'Connessione Stripe funzionante',
                data: {
                    testPaymentIntentId: testIntent.id,
                    amount: testIntent.amount / 100,
                    currency: testIntent.currency,
                    status: testIntent.status,
                    mode: 'test',
                    created: new Date(testIntent.created * 1000)
                }
            });

        } catch (error) {
            logger.error('Error testing Stripe connection:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nella connessione Stripe',
                error: error.message,
                suggestion: 'Verifica che le chiavi Stripe siano configurate correttamente nel .env'
            });
        }
    }

    /**
     * Crea un Payment Intent per una prenotazione
     */
    static async createPaymentIntent(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dati non validi',
                    errors: errors.array()
                });
            }

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
                    message: 'Non autorizzato ad accedere a questa prenotazione'
                });
            }

            // Verifica che la prenotazione non abbia già un pagamento completato
            const existingPayments = await Payment.findByBookingId(bookingId);
            const completedPayment = existingPayments.find(p => p.status === 'completed');

            if (completedPayment) {
                return res.status(400).json({
                    success: false,
                    message: 'Questa prenotazione è già stata pagata'
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            // Crea il Payment Intent con Stripe
            const paymentIntent = await StripeService.createPaymentIntent(booking, user);

            // Salva il pagamento nel database
            const payment = await Payment.create({
                booking_id: bookingId,
                stripe_payment_intent_id: paymentIntent.id,
                amount: booking.total_price,
                currency: 'EUR',
                status: 'pending'
            });

            logger.info(`Payment intent created for booking ${bookingId}`, {
                paymentId: payment.id,
                userId,
                amount: booking.total_price,
                stripeIntentId: paymentIntent.id
            });

            res.json({
                success: true,
                message: 'Payment Intent creato con successo',
                data: {
                    paymentIntent: {
                        id: paymentIntent.id,
                        clientSecret: paymentIntent.client_secret,
                        amount: paymentIntent.amount / 100,
                        currency: paymentIntent.currency
                    },
                    payment: {
                        id: payment.id,
                        status: payment.status,
                        amount: payment.amount
                    }
                }
            });

        } catch (error) {
            logger.error('Error creating payment intent:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nella creazione del pagamento',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Verifica lo stato di un pagamento
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

            // Verifica autorizzazione
            if (payment.user_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Non autorizzato'
                });
            }

            // Se c'è un payment intent, ottieni lo stato aggiornato da Stripe
            let stripeStatus = null;
            if (payment.stripe_payment_intent_id) {
                try {
                    stripeStatus = await StripeService.getPaymentStatus(payment.stripe_payment_intent_id);
                } catch (stripeError) {
                    logger.warn('Could not fetch Stripe status:', stripeError.message);
                }
            }

            res.json({
                success: true,
                data: {
                    id: payment.id,
                    status: payment.status,
                    amount: payment.amount,
                    currency: payment.currency,
                    createdAt: payment.created_at,
                    completedAt: payment.completed_at,
                    failureReason: payment.failure_reason,
                    booking: {
                        id: payment.booking_id,
                        spaceName: payment.space_name,
                        startDate: payment.start_date,
                        endDate: payment.end_date
                    },
                    stripeStatus: stripeStatus
                }
            });

        } catch (error) {
            logger.error('Error getting payment status:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero dello stato del pagamento'
            });
        }
    }

    /**
     * Lista pagamenti dell'utente
     */
    static async getUserPayments(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            const payments = await Payment.findByUserId(userId, parseInt(limit), offset);

            res.json({
                success: true,
                data: {
                    payments: payments.map(payment => ({
                        id: payment.id,
                        amount: payment.amount,
                        currency: payment.currency,
                        status: payment.status,
                        createdAt: payment.created_at,
                        booking: {
                            spaceName: payment.space_name,
                            location: payment.location,
                            startDate: payment.start_date,
                            endDate: payment.end_date
                        }
                    })),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        hasMore: payments.length === parseInt(limit)
                    }
                }
            });

        } catch (error) {
            logger.error('Error getting user payments:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero dei pagamenti'
            });
        }
    }

    /**
     * Webhook Stripe
     */
    static async handleStripeWebhook(req, res) {
        try {
            const signature = req.headers['stripe-signature'];
            const payload = req.body;

            if (!signature) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing Stripe signature'
                });
            }

            await StripeService.handleWebhook(signature, payload);

            logger.info('Stripe webhook processed successfully');
            res.json({ received: true });

        } catch (error) {
            logger.error('Error handling Stripe webhook:', error);
            res.status(400).json({
                success: false,
                message: 'Webhook verification failed'
            });
        }
    }

    /**
     * Statistiche pagamenti (solo admin)
     */
    static async getPaymentStats(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso riservato agli amministratori'
                });
            }

            const { startDate, endDate } = req.query;
            const stats = await Payment.getStats(startDate, endDate);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error getting payment stats:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle statistiche'
            });
        }
    }
}

module.exports = PaymentController;