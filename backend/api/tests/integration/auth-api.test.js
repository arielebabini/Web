const request = require('supertest');

// Imposta le variabili d'ambiente per i test
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.LOG_LEVEL = 'silent';

const app = require('../../app');
// Importa la classe TestDataSeeder direttamente
const TestDataSeeder = require('../helpers/TestDataSeeder');

// Funzione helper per gli header di autorizzazione
const authHeaders = (token) => {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

describe('Spaces API Integration Test', () => {
    let clientToken;
    let adminToken;

    // Prima di tutti i test, pulisce il DB e crea i dati di test
    beforeAll(async () => {
        // Chiama il metodo statico per creare tutti i dati necessari
        await TestDataSeeder.seedAll();

        // Genera i token usando il metodo statico dopo che gli utenti sono stati creati
        clientToken = TestDataSeeder.generateTestToken('client');
        adminToken = TestDataSeeder.generateTestToken('admin');
    });

    // Dopo tutti i test, pulisce il DB
    afterAll(async () => {
        // Chiama il metodo statico per pulire tutti i dati di test
        await TestDataSeeder.cleanTestData();
    });

    test('should get public spaces list', async () => {
        const response = await request(app)
            .get('/api/spaces');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.spaces)).toBe(true);
        // Verifica che lo spazio creato dal seeder sia presente
        expect(response.body.spaces.length).toBeGreaterThan(0);
        expect(response.body.spaces[0].name).toBe('Test Coworking Space');
    });

    test('should reject space creation without auth', async () => {
        const spaceData = {
            name: 'Unauthorized Space',
            type: 'private-office',
            city: 'Roma',
            address: 'Via Unauthorized 1',
            capacity: 5,
            price_per_day: 30.00
        };

        const response = await request(app)
            .post('/api/spaces')
            .send(spaceData);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test('should reject space creation with client token', async () => {
        const spaceData = {
            name: 'Client Attempted Space',
            type: 'meeting-room',
            city: 'Napoli',
            address: 'Via Client 456',
            capacity: 8,
            price_per_day: 40.00
        };

        const response = await request(app)
            .post('/api/spaces')
            .set(authHeaders(clientToken)) // Usa il token del client
            .send(spaceData);

        // 403 Forbidden: sei autenticato, ma non hai i permessi
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
    });
});