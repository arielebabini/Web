// tests/unit/routes/manager.test.js
const request = require('supertest');
const express = require('express');

// ✅ Import the mocked middleware
const { requireAuth } = require('../../../src/middleware/auth');

// Mock delle dipendenze prima di importare il router
jest.mock('../../../src/middleware/auth', () => ({
    requireAuth: jest.fn((req, res, next) => {
        // Simula un utente autenticato di default come manager
        if (!req.user) {
            req.user = { id: 'manager123', email: 'manager@test.com', role: 'manager' };
        }
        next();
    })
}));

jest.mock('../../../src/controllers/spaceController');
jest.mock('../../../src/controllers/bookingController');
jest.mock('express-validator', () => {
    const chain = {
        optional: jest.fn().mockReturnThis(),
        isLength: jest.fn().mockReturnThis(),
        isUUID: jest.fn().mockReturnThis(),
        isInt: jest.fn().mockReturnThis(),
        isIn: jest.fn().mockReturnThis(),
        isISO8601: jest.fn().mockReturnThis(),
        isFloat: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnValue((req, res, next) => next()),
    };
    return {
        body: jest.fn(() => chain),
        param: jest.fn(() => chain),
        query: jest.fn(() => chain),
        validationResult: jest.fn(() => ({
            isEmpty: () => true,
            array: () => [],
        })),
    };
});

const SpaceController = require('../../../src/controllers/spaceController');
const BookingController = require('../../../src/controllers/bookingController');
const managerRouter = require('../../../src/routes/manager');

const app = express();
app.use(express.json());
app.use('/api/manager', managerRouter);

describe('Manager Routes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the default implementation for requireAuth before each test
        requireAuth.mockImplementation((req, res, next) => {
            if (!req.user) {
                req.user = { id: 'manager123', email: 'manager@test.com', role: 'manager' };
            }
            next();
        });
    });

    describe('Authorization Middleware', () => {
        // ✅ Corrected test using mockImplementationOnce
        test('should return 403 if user is not a manager', async () => {
            requireAuth.mockImplementationOnce((req, res, next) => {
                req.user = { id: 'client123', email: 'client@test.com', role: 'client' };
                next();
            });

            const response = await request(app)
                .get('/api/manager/spaces');

            expect(response.status).toBe(403);
            expect(response.body.message).toContain('Accesso negato. Solo i manager possono accedere');
        });
    });

    describe('GET /api/manager/spaces', () => {
        test('should return a list of manager\'s spaces', async () => {
            const mockResponse = { spaces: [{ id: 'space1' }], pagination: { total: 1 } };
            SpaceController.getManagerSpaces.mockResolvedValue(mockResponse);

            const response = await request(app)
                .get('/api/manager/spaces?page=1&limit=10');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.spaces).toEqual([{ id: 'space1' }]);
            expect(SpaceController.getManagerSpaces).toHaveBeenCalledWith({
                page: '1',
                limit: '10',
                manager_id: 'manager123'
            });
        });
    });

    describe('GET /api/manager/spaces/:spaceId', () => {
        test('should return 404 if space is not found or not owned by manager', async () => {
            SpaceController.getSpaceByIdForManager.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/manager/spaces/uuid-not-found');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(SpaceController.getSpaceByIdForManager).toHaveBeenCalledWith('uuid-not-found', 'manager123');
        });

        test('should return 500 on controller error', async () => {
            SpaceController.getSpaceByIdForManager.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/manager/spaces/uuid-for-error');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Errore nel caricamento dello spazio');
        });
    });

    describe('PUT /api/manager/spaces/:spaceId', () => {
        test('should update a space successfully', async () => {
            const mockSpace = { id: 'space-to-update', name: 'Old Name' };
            const updatedData = { name: 'New Name' };

            SpaceController.getSpaceByIdForManager.mockResolvedValue(mockSpace);
            SpaceController.updateManagerSpace.mockResolvedValue({ ...mockSpace, ...updatedData });

            const response = await request(app)
                .put('/api/manager/spaces/space-to-update')
                .send(updatedData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.space.name).toBe('New Name');
            expect(SpaceController.updateManagerSpace).toHaveBeenCalledWith('space-to-update', updatedData, 'manager123');
        });
    });

    describe('GET /api/manager/bookings', () => {
        test('should retrieve manager\'s bookings', async () => {
            const mockResponse = { bookings: [{ id: 'booking1' }], pagination: { total: 1 } };
            BookingController.getManagerBookings.mockResolvedValue(mockResponse);

            const response = await request(app)
                .get('/api/manager/bookings');

            expect(response.status).toBe(200);
            expect(BookingController.getManagerBookings).toHaveBeenCalledWith(expect.any(Object), 'manager123', 'manager@test.com');
            expect(response.body.bookings).toBeDefined();
        });
    });
});