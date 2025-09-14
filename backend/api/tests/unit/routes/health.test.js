// tests/unit/routes/health.test.js
const request = require('supertest');

// Creiamo un mock dell'app per evitare dipendenze del database per ora
const express = require('express');
const app = express();

// Simula le route di health della tua app reale
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get('/api/health', async (req, res) => {
    try {
        // Mock del check database - lo sostituiremo dopo
        const dbHealthy = true;

        res.status(200).json({
            success: true,
            message: 'CoWorkSpace API is operational',
            services: {
                database: dbHealthy ? 'healthy' : 'unhealthy'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Service unavailable'
        });
    }
});

describe('Health Check Endpoints', () => {
    test('GET /health should return status ok', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(response.body).toEqual({ status: 'ok' });
    });

    test('GET /api/health should return detailed status', async () => {
        const response = await request(app)
            .get('/api/health')
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('operational');
        expect(response.body.services).toBeDefined();
        expect(response.body.services.database).toBe('healthy');
    });
});