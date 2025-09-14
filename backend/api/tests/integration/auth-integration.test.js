// tests/integration/auth-integration.test.js

const request = require('supertest');
const app = require('../../app');
const TestDataSeeder = require('../helpers/TestDataSeeder');
const { query, pool } = require('../../src/config/database');
const jwt = require('jsonwebtoken');

describe('Authentication Integration Tests', () => {

    beforeEach(async () => {
        await TestDataSeeder.seedAll();
    }, 30000);

    afterEach(async () => {
        await TestDataSeeder.cleanTestData();
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('User Registration', () => {
        test('should reject registration with invalid email', async () => {
            const userData = {
                email: 'invalid-email',
                password: 'Password123!',
                first_name: 'Test',
                last_name: 'User'
            };
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);
            expect(response.status).toBe(400);
        });

        test('should reject registration with weak password', async () => {
            const userData = {
                email: 'weak@test.com',
                password: '123',
                first_name: 'Weak',
                last_name: 'Password'
            };
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);
            expect(response.status).toBe(400);
        });
    });

    describe('User Login', () => {
        test('should login with valid credentials', async () => {
            const loginData = {
                email: 'client@test.com',
                password: 'testPassword123'
            };
            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData);
            expect(response.status).toBe(200);
            expect(response.body.user.email).toBe(loginData.email);
        });

        test('should reject login with invalid email', async () => {
            const loginData = { email: 'nonexistent@test.com', password: 'password' };
            const response = await request(app).post('/api/auth/login').send(loginData);
            expect(response.status).toBe(401);
        });

        test('should reject login with invalid password', async () => {
            const loginData = { email: 'client@test.com', password: 'wrong' };
            const response = await request(app).post('/api/auth/login').send(loginData);
            expect(response.status).toBe(401);
        });
    });

    describe('Token Validation', () => {
        test('should validate valid token', async () => {
            const token = TestDataSeeder.generateTestToken('client');
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body.user.role).toBe('client');
        });
    });

    describe('Password Reset', () => {
        test.skip('should request password reset for valid email', async () => {
            const response = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'client@test.com' });
            expect(response.status).toBe(200);
        });
    });
});