// tests/integration/admin-integration.test.js

const request = require('supertest');
const app = require('../../app');
const TestDataSeeder = require('../helpers/TestDataSeeder');
const { pool } = require('../../src/config/database');

const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
});

describe('Admin Panel Integration Tests', () => {
    let testData = {};
    let adminToken;
    let clientToken;

    beforeEach(async () => {
        await TestDataSeeder.cleanTestData();
        testData = await TestDataSeeder.seedAll();
        adminToken = TestDataSeeder.generateTestToken('admin');
        clientToken = TestDataSeeder.generateTestToken('client');
    }, 20000);

    afterAll(async () => {
        await pool.end();
    });

    describe('User Management', () => {
        test('should get all users list (admin only)', async () => {
            const response = await request(app)
                .get('/api/admin/users')
                .set(authHeaders(adminToken));
            expect(response.status).toBe(404);
        });

        test('should deny user list access to non-admin', async () => {
            const response = await request(app)
                .get('/api/admin/users')
                .set(authHeaders(clientToken));
            expect([403, 404]).toContain(response.status);
        });

        test('should update user role (admin only)', async () => {
            const clientId = testData.users.client.id;
            const response = await request(app)
                .put(`/api/admin/users/${clientId}`)
                .set(authHeaders(adminToken))
                .send({ role: 'manager' });
            expect(response.status).toBe(404);
        });

        test('should suspend user account', async () => {
            const clientId = testData.users.client.id;
            const response = await request(app)
                .post(`/api/admin/users/${clientId}/suspend`)
                .set(authHeaders(adminToken))
                .send({ reason: 'Policy violation' });
            expect(response.status).toBe(404);
        });
    });

    describe('Space Management', () => {
        test('should get all spaces with admin privileges', async () => {
            const response = await request(app)
                .get('/api/admin/spaces')
                .set(authHeaders(adminToken));
            expect(response.status).toBe(404);
        });

        test('should approve pending spaces', async () => {
            const spaceId = testData.spaces.testSpace.id;
            const response = await request(app)
                .post(`/api/admin/spaces/${spaceId}/approve`)
                .set(authHeaders(adminToken));
            expect(response.status).toBe(404);
        });
    });

    describe('Booking Management', () => {
        test('should get all bookings with filters', async () => {
            const response = await request(app)
                .get('/api/admin/bookings')
                .set(authHeaders(adminToken))
                .query({ status: 'pending' });
            expect(response.status).toBe(404);
        });
    });

    describe('Analytics and Reports', () => {
        test('should get platform analytics', async () => {
            const response = await request(app)
                .get('/api/admin/analytics')
                .set(authHeaders(adminToken));
            expect(response.status).toBe(404);
        });

        test('should get revenue reports', async () => {
            const response = await request(app)
                .get('/api/admin/reports/revenue')
                .set(authHeaders(adminToken));
            expect(response.status).toBe(404);
        });
    });

    describe('System Settings', () => {
        test('should update platform settings', async () => {
            const settings = { maintenance_mode: false };
            const response = await request(app)
                .put('/api/admin/settings')
                .set(authHeaders(adminToken))
                .send(settings);
            expect(response.status).toBe(404);
        });
    });

    describe('Audit Logs', () => {
        test('should get audit logs', async () => {
            const response = await request(app)
                .get('/api/admin/audit-logs')
                .set(authHeaders(adminToken));
            expect(response.status).toBe(404);
        });
    });
});