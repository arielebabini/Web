// tests/unit/routes/admin.test.js
const request = require('supertest');
const express = require('express');

const originalConsoleError = console.error;

beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalConsoleError;
});


// Mock delle dipendenze
jest.mock('../../../src/middleware/roleAuth', () => ({
    requireAuth: (req, res, next) => {
        if (!req.user) {
            req.user = { id: 'defaultUser', role: 'client' }; // Utente di default non admin
        }
        // Simula la modifica del ruolo basata su un header di test
        if (req.headers['x-test-role'] === 'admin') {
            req.user = { id: 'admin123', role: 'admin' };
        }
        next();
    },
    requireAdmin: (req, res, next) => {
        if (req.user && req.user.role === 'admin') {
            return next();
        }
        return res.status(403).json({ success: false, message: 'Accesso negato' });
    }
}));


const adminRouter = require('../../../src/routes/admin');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

describe('Admin Routes', () => {

    describe('Authorization', () => {
        test('should deny access to a non-admin user for a protected route', async () => {
            const response = await request(app)
                .get('/api/admin/stats/dashboard')
                .set('x-test-role', 'client'); // Simula un utente con ruolo 'client'

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Accesso negato');
        });
    });

    describe('GET /api/admin/stats/dashboard', () => {
        test('should return dashboard stats for an admin user', async () => {
            const response = await request(app)
                .get('/api/admin/stats/dashboard')
                .set('x-test-role', 'admin');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.stats).toBeDefined();
            expect(response.body.stats.totalUsers).toBe(150);
        });
    });

    describe('PUT /api/admin/users/:userId/status', () => {
        test('should update user status for an admin', async () => {
            const response = await request(app)
                .put('/api/admin/users/user-to-update/status')
                .set('x-test-role', 'admin')
                .send({ status: 'suspended' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Status utente aggiornato a suspended');
            expect(response.body.user.status).toBe('suspended');
        });

        test('should return 400 for an invalid status', async () => {
            const response = await request(app)
                .put('/api/admin/users/user-to-update/status')
                .set('x-test-role', 'admin')
                .send({ status: 'invalid-status' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Status non valido');
        });
    });

    describe('POST /api/admin/broadcast', () => {
        test('should send a broadcast notification', async () => {
            const broadcastData = {
                title: 'Maintenance',
                message: 'System will be down for maintenance.'
            };
            const response = await request(app)
                .post('/api/admin/broadcast')
                .set('x-test-role', 'admin')
                .send(broadcastData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Notifica broadcast inviata con successo');
        });

        test('should return 400 if title or message is missing', async () => {
            const response = await request(app)
                .post('/api/admin/broadcast')
                .set('x-test-role', 'admin')
                .send({ title: 'Incomplete' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Titolo e messaggio sono richiesti');
        });
    });
});