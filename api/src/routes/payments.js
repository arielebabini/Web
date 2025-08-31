const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/auth');

/**
 * Crea Payment Intent per prenotazione
 */
router.post('/create-intent',
    requireAuth,
    body('bookingId').isUUID().withMessage('ID prenotazione non valido'),
    PaymentController.createPaymentIntent
);

/**
 * Conferma pagamento (per test)
 */
router.post('/confirm',
    requireAuth,
    body('payment_intent_id').notEmpty().withMessage('Payment Intent ID richiesto'),
    PaymentController.confirmPayment
);

/**
 * Webhook Stripe
 */
router.post('/webhook/stripe',
    express.raw({ type: 'application/json' }),
    PaymentController.handleStripeWebhook
);

/**
 * Stato pagamento
 */
router.get('/:paymentId',
    requireAuth,
    param('paymentId').isUUID().withMessage('ID pagamento non valido'),
    PaymentController.getPaymentStatus
);

module.exports = router;