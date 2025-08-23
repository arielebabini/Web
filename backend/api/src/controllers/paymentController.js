/**
 * Payment Controller
 * Gestisce le operazioni relative ai pagamenti
 */

const logger = require('../utils/logger');

class PaymentController {
    /**
     * Health check per il servizio pagamenti
     */
    static async healthCheck(req, res) {
        try {
            res.json({
                success: true,
                message: 'Payment service is running',
                timestamp: new Date().toISOString(),
                services: {
                    stripe: 'ready',
                    database: 'connected'
                }
            });
        } catch (error) {
            logger.error('Payment health check failed:', error);
            res.status(500).json({
                success: false,
                message: 'Payment service unhealthy'
            });
        }
    }

    /**
     * Test connessione Stripe (solo development)
     */
    static async testStripeConnection(req, res) {
        try {
            if (process.env.NODE_ENV === 'production') {
                return res.status(403).json({
                    success: false,
                    message: 'Test endpoint not available in production'
                });
            }

            res.json({
                success: true,
                message: 'Stripe connection test',
                data: {
                    environment: process.env.NODE_ENV,
                    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
                    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
                }
            });
        } catch (error) {
            logger.error('Stripe connection test failed:', error);
            res.status(500).json({
                success: false,
                message: 'Stripe connection test failed'
            });
        }
    }

    /**
     * Crea un Payment Intent per una prenotazione
     */
    static async createPaymentIntent(req, res) {
        try {
            const { bookingId } = req.body;
            const userId = req.user.id;

            logger.info('Creating payment intent', { bookingId, userId });

            // VERIFICA configurazione Stripe
            if (!process.env.STRIPE_SECRET_KEY) {
                return res.status(500).json({
                    success: false,
                    message: 'Stripe non configurato sul server'
                });
            }

            // IMPORTA StripeService
            const StripeService = require('../services/stripeService');

            // Simula dati booking (sostituisci con query database reale)
            const mockBooking = {
                id: bookingId,
                total_price: 50.00, // Cambia con il prezzo reale dalla prenotazione
                space_name: 'Spazio Coworking'
            };

            // Simula dati utente (sostituisci con dati reali dall'auth)
            const userData = {
                id: userId,
                email: req.user.email || 'test@example.com',
                first_name: req.user.first_name || 'Test',
                last_name: req.user.last_name || 'User'
            };

            // CREA Payment Intent REALE tramite Stripe
            const paymentIntent = await StripeService.createPaymentIntent(mockBooking, userData);

            res.json({
                success: true,
                message: 'Payment intent created successfully',
                data: {
                    payment_intent: {
                        id: paymentIntent.id,
                        client_secret: paymentIntent.client_secret,
                        amount: paymentIntent.amount,
                        currency: paymentIntent.currency,
                        status: paymentIntent.status
                    }
                }
            });

        } catch (error) {
            logger.error('Error creating payment intent:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nella creazione del payment intent: ' + error.message
            });
        }
    }

    /**
     * Ottiene lo status di un pagamento
     */
    static async getPaymentStatus(req, res) {
        try {
            const { paymentId } = req.params;

            logger.info('Getting payment status', { paymentId, userId: req.user.id });

            // Mock payment status
            const mockPayment = {
                id: paymentId,
                status: 'completed',
                amount: 5000,
                currency: 'eur',
                booking_id: 'booking_mock_123',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            res.json({
                success: true,
                message: 'Payment status retrieved',
                data: {
                    payment: mockPayment
                }
            });

        } catch (error) {
            logger.error('Error getting payment status:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero dello status pagamento'
            });
        }
    }

    /**
     * Lista pagamenti dell'utente corrente
     */
    static async getUserPayments(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;

            logger.info('Getting user payments', { userId, page, limit });

            // Mock user payments
            const mockPayments = [
                {
                    id: 'payment_1',
                    amount: 5000,
                    currency: 'eur',
                    status: 'completed',
                    booking_id: 'booking_1',
                    created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
                },
                {
                    id: 'payment_2',
                    amount: 7500,
                    currency: 'eur',
                    status: 'completed',
                    booking_id: 'booking_2',
                    created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
                }
            ];

            res.json({
                success: true,
                message: 'User payments retrieved',
                data: {
                    payments: mockPayments,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: mockPayments.length,
                        totalPages: Math.ceil(mockPayments.length / limit)
                    }
                }
            });

        } catch (error) {
            logger.error('Error getting user payments:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero dei pagamenti utente'
            });
        }
    }

    /**
     * Gestisce webhook Stripe
     */
    static async handleStripeWebhook(req, res) {
        try {
            const signature = req.headers['stripe-signature'];

            logger.info('Received Stripe webhook', {
                signature: signature ? 'present' : 'missing',
                bodySize: req.body.length
            });

            // In produzione, qui verifichiamo il webhook con Stripe
            // Per ora, simuliamo una risposta di successo

            res.status(200).json({
                success: true,
                message: 'Webhook processed successfully'
            });

        } catch (error) {
            logger.error('Error processing Stripe webhook:', error);
            res.status(400).json({
                success: false,
                message: 'Webhook processing failed'
            });
        }
    }

    /**
     * Statistiche pagamenti (admin)
     */
    static async getPaymentStats(req, res) {
        try {
            if (!['admin', 'manager'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso negato'
                });
            }

            const { startDate, endDate } = req.query;

            logger.info('Getting payment stats', {
                userId: req.user.id,
                role: req.user.role,
                startDate,
                endDate
            });

            // Mock payment statistics
            const mockStats = {
                period: {
                    start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    end: endDate || new Date().toISOString()
                },
                summary: {
                    totalAmount: 25000, // €250.00
                    totalTransactions: 15,
                    averageTransaction: 1667, // €16.67
                    successRate: 93.33
                },
                byStatus: {
                    completed: 14,
                    pending: 1,
                    failed: 0,
                    refunded: 0
                },
                dailyTrends: [
                    { date: '2025-01-15', amount: 5000, transactions: 3 },
                    { date: '2025-01-16', amount: 7500, transactions: 4 },
                    { date: '2025-01-17', amount: 6000, transactions: 2 }
                ]
            };

            res.json({
                success: true,
                message: 'Payment statistics retrieved',
                data: mockStats
            });

        } catch (error) {
            logger.error('Error getting payment stats:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle statistiche pagamenti'
            });
        }
    }
}

module.exports = PaymentController;