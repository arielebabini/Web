// tests/integration/spaces-api.test.js

const request = require('supertest');
const app = require('../../app');
const TestDataSeeder = require('../helpers/TestDataSeeder');
const { pool } = require('../../src/config/database');

const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
});

describe('Spaces API Integration Test', () => {
    let testData = {};

    beforeEach(async () => {
        await TestDataSeeder.cleanTestData();
        testData = await TestDataSeeder.seedAll();
    }, 20000);

    afterAll(async () => {
        await pool.end();
    });

    test('should get public spaces list', async () => {
        const response = await request(app).get('/api/spaces');
        expect(response.status).toBe(200);
        expect(response.body.spaces.length).toBeGreaterThanOrEqual(1);
    });

    test('should create space with manager token', async () => {
        const managerToken = TestDataSeeder.generateTestToken('manager');
        const spaceData = {
            name: 'Test Coworking Space 2',
            description: 'A second test space for integration testing',
            type: 'hot-desk',
            city: 'Milano',
            address: 'Via Test 456, Milano',
            capacity: 10,
            price_per_day: 25.50,
            amenities: ['wifi', 'coffee', 'parking'],
            images: []
        };
        const response = await request(app)
            .post('/api/spaces')
            .set(authHeaders(managerToken))
            .send(spaceData);
        expect(response.status).toBe(201);
    });

    test('should reject space creation with client token', async () => {
        const clientToken = TestDataSeeder.generateTestToken('client');
        const spaceData = { name: 'Client Attempted Space' };
        const response = await request(app)
            .post('/api/spaces')
            .set(authHeaders(clientToken))
            .send(spaceData);
        expect(response.status).toBe(403);
    });

    test('should get space by ID with valid UUID', async () => {
        const spaceId = testData.spaces.testSpace.id;
        const response = await request(app).get(`/api/spaces/${spaceId}`);
        expect(response.status).toBe(200);
        expect(response.body.space.id).toBe(spaceId);
    });

    test('should update space with manager token', async () => {
        const managerToken = TestDataSeeder.generateTestToken('manager');
        const spaceId = testData.spaces.testSpace.id;
        const updateData = { name: 'Updated Test Space', capacity: 15 };
        const response = await request(app)
            .put(`/api/spaces/${spaceId}`)
            .set(authHeaders(managerToken))
            .send(updateData);
        expect(response.status).toBe(200);
        expect(response.body.space.name).toBe(updateData.name);
    });
});