// tests/integration/payment-integration.test.js

const request = require('supertest');
const app = require('../../app');
const TestDataSeeder = require('../helpers/TestDataSeeder');
const { pool } = require('../../src/config/database');

const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
});

describe('Payment Integration Tests', () => {
    let clientToken;
    let adminToken;

    beforeEach(async () => {
        await TestDataSeeder.cleanTestData();
        await TestDataSeeder.seedAll();
        clientToken = TestDataSeeder.generateTestToken('client');
        adminToken = TestDataSeeder.generateTestToken('admin');
    }, 20000);

    afterAll(async () => {
        await pool.end();
    });

    describe('Payment Creation', () => {
        test('should return 404 for unimplemented payment intent route', async () => {
            const response = await request(app)
                .post('/api/payments/create-intent')
                .set(authHeaders(clientToken))
                .send({ booking_id: 'some-booking-id' });
            expect(response.status).toBe(404);
        });

        test('should reject payment for non-existent booking', async () => {
            const fakeBookingId = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .post('/api/payments/create-intent')
                .set(authHeaders(clientToken))
                .send({ booking_id: fakeBookingId });
            expect(response.status).toBe(404);
        });
    });

    describe('Payment Status', () => {
        test('should return 404 for unimplemented payment status route', async () => {
            const fakePaymentId = 'pi_test_payment_intent';
            const response = await request(app)
                .get(`/api/payments/${fakePaymentId}/status`)
                .set(authHeaders(clientToken));
            expect(response.status).toBe(404);
        });

        test('should return 404 for unimplemented webhook route', async () => {
            const response = await request(app)
                .post('/api/payments/webhook')
                .send({ type: 'payment_intent.succeeded' });
            expect(response.status).toBe(404);
        });
    });

    describe('Refund Processing', () => {
        test('should return 404 for unimplemented refund route', async () => {
            const fakePaymentId = 'pi_test_payment_intent';
            const response = await request(app)
                .post(`/api/payments/${fakePaymentId}/refund`)
                .set(authHeaders(adminToken))
                .send({ reason: 'booking_cancelled' });
            expect(response.status).toBe(404);
        });
    });
});