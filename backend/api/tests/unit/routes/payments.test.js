// tests/unit/routes/payments.test.js
const request = require('supertest');
const express = require('express');

// Mock delle dipendenze
jest.mock('../../../src/controllers/paymentController');
jest.mock('../../../src/middleware/auth', () => ({
    requireAuth: (req, res, next) => {
        req.user = { id: 'test-user', role: 'client' };
        next();
    }
}));

const PaymentController = require('../../../src/controllers/paymentController');
const paymentsRouter = require('../../../src/routes/payments');

const app = express();
app.use(express.json());
// Nota: il webhook richiede un body parser RAW, che viene applicato direttamente nella rotta
app.use('/api/payments', paymentsRouter);

describe('Payments Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/payments/create-intent', () => {
        test('should call PaymentController.createPaymentIntent', async () => {
            PaymentController.createPaymentIntent.mockImplementation((req, res) => 
                res.status(200).json({ success: true, client_secret: 'pi_secret' })
            );

            const response = await request(app)
                .post('/api/payments/create-intent')
                .send({ bookingId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });

            expect(response.status).toBe(200);
            expect(response.body.client_secret).toBe('pi_secret');
            expect(PaymentController.createPaymentIntent).toHaveBeenCalled();
        });
    });

    describe('POST /api/payments/webhook/stripe', () => {
        test('should handle stripe webhook call', async () => {
            PaymentController.handleStripeWebhook.mockImplementation((req, res) => 
                res.status(200).json({ received: true })
            );

            const payload = { id: 'evt_123', type: 'payment_intent.succeeded' };

            const response = await request(app)
                .post('/api/payments/webhook/stripe')
                .set('Content-Type', 'application/json')
                .send(JSON.stringify(payload, null, 2));

            expect(response.status).toBe(200);
            expect(response.body.received).toBe(true);
            expect(PaymentController.handleStripeWebhook).toHaveBeenCalled();
        });
    });

    describe('GET /api/payments/:paymentId', () => {
        test('should call getPaymentStatus with valid UUID', async () => {
            PaymentController.getPaymentStatus.mockImplementation((req, res) => 
                res.status(200).json({ success: true, status: 'succeeded' })
            );

            const validUUID = 'a47ac10b-58cc-4372-a567-0e02b2c3d47a';
            const response = await request(app).get(`/api/payments/${validUUID}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('succeeded');
            expect(PaymentController.getPaymentStatus).toHaveBeenCalled();
        });
    });
});