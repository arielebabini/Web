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

    // Use beforeEach to ensure a clean state for every single test
    beforeEach(async () => {
        await TestDataSeeder.cleanTestData();
        await TestDataSeeder.seedAll(); // This populates TestDataSeeder.testUsers and .testSpaces
    }, 20000);

    // Use afterAll to close the database connection pool once all tests are done
    afterAll(async () => {
        await TestDataSeeder.cleanTestData(); // Optional: final cleanup
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
        expect(response.body.success).toBe(true);
        expect(response.body.space.name).toBe(spaceData.name);
    });

    test('should reject space creation without auth', async () => {
        const spaceData = { name: 'Unauthorized Space' /* ... other fields */ };
        const response = await request(app).post('/api/spaces').send(spaceData);
        expect(response.status).toBe(401);
    });

    test('should reject space creation with client token', async () => {
        const clientToken = TestDataSeeder.generateTestToken('client');
        const spaceData = { name: 'Client Attempted Space' /* ... other fields */ };
        const response = await request(app)
            .post('/api/spaces')
            .set(authHeaders(clientToken))
            .send(spaceData);
        expect(response.status).toBe(403);
    });

    test('should get space by ID with valid UUID', async () => {
        // FIX: Access the seeded space ID directly from the Seeder's static property
        const spaceId = TestDataSeeder.testSpaces.testSpace.id;

        const response = await request(app).get(`/api/spaces/${spaceId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.space.id).toBe(spaceId);
        expect(response.body.space.name).toBe('Test Coworking Space');
    });

    test('should update space with manager token', async () => {
        const managerToken = TestDataSeeder.generateTestToken('manager');
        // FIX: Access the seeded space ID directly from the Seeder's static property
        const spaceId = TestDataSeeder.testSpaces.testSpace.id;

        const updateData = {
            name: 'Updated Test Space',
            capacity: 15,
            price_per_day: 30.00
        };

        const response = await request(app)
            .put(`/api/spaces/${spaceId}`)
            .set(authHeaders(managerToken))
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.space.name).toBe(updateData.name);
        expect(response.body.space.capacity).toBe(updateData.capacity);
    });

    test('should reject update with client token', async () => {
        const clientToken = TestDataSeeder.generateTestToken('client');
        // FIX: Access the seeded space ID directly from the Seeder's static property
        const spaceId = TestDataSeeder.testSpaces.testSpace.id;

        const updateData = { name: 'Hacked Space Name' };

        const response = await request(app)
            .put(`/api/spaces/${spaceId}`)
            .set(authHeaders(clientToken))
            .send(updateData);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
    });

    test('should allow admin to create featured spaces', async () => {
        const adminToken = TestDataSeeder.generateTestToken('admin');

        const spaceData = {
            name: 'Featured Admin Space',
            description: 'A featured space created by admin',
            type: 'private-office',
            city: 'Roma',
            address: 'Via Admin 789, Roma',
            capacity: 8,
            price_per_day: 50.00,
            is_featured: true,
            amenities: ['wifi', 'printer', 'parking'],
            images: []
        };

        const response = await request(app)
            .post('/api/spaces')
            .set(authHeaders(adminToken))
            .send(spaceData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.space.is_featured).toBe(true);
    });
});