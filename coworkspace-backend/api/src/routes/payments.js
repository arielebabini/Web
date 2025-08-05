// api/src/routes/payments.js
const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { body, param, query } = require('express-validator');

// Import del middleware AUTH corretto
const { requireAuth } = require('../middleware/auth');

/**
 * @route   GET /api/payments/health
 * @desc    Health check per payment service
 * @access  Public
 */
router.get('/health', PaymentController.healthCheck);

/**
 * @route   GET /api/payments/test-stripe
 * @desc    Test connessione Stripe (solo development)
 * @access  Public (development only)
 */
router.get('/test-stripe', PaymentController.testStripeConnection);

/**
 * @route   POST /api/payments/create-intent
 * @desc    Crea un Payment Intent per una prenotazione
 * @access  Private (User)
 */
router.post('/create-intent',
    requireAuth,
    body('bookingId')
        .isUUID()
        .withMessage('ID prenotazione deve essere un UUID valido'),
    PaymentController.createPaymentIntent
);

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Ottiene i dettagli di un pagamento
 * @access  Private (User/Admin)
 */
router.get('/:paymentId',
    requireAuth,
    param('paymentId')
        .isUUID()
        .withMessage('ID pagamento non valido'),
    PaymentController.getPaymentStatus
);

/**
 * @route   GET /api/payments/user/my-payments
 * @desc    Lista tutti i pagamenti dell'utente corrente
 * @access  Private (User)
 */
router.get('/user/my-payments',
    requireAuth,
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Pagina deve essere un numero positivo'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limite deve essere tra 1 e 100'),
    PaymentController.getUserPayments
);

/**
 * @route   POST /api/payments/webhook/stripe
 * @desc    Webhook endpoint per Stripe
 * @access  Public (Stripe)
 */
router.post('/webhook/stripe',
    express.raw({ type: 'application/json' }),
    PaymentController.handleStripeWebhook
);

/**
 * @route   GET /api/payments/admin/stats
 * @desc    Statistiche pagamenti per admin
 * @access  Private (Admin)
 */
router.get('/admin/stats',
    requireAuth,
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Data inizio deve essere nel formato ISO8601'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Data fine deve essere nel formato ISO8601'),
    PaymentController.getPaymentStats
);

module.exports = router;