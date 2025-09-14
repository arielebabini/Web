// tests/unit/controllers/SpaceController.test.js

// Mock delle dipendenze
jest.mock('../../../src/models/Space', () => ({
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    checkAvailability: jest.fn(),
    calculatePrice: jest.fn(),
    getDashboardStats: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn()
}));

jest.mock('express-validator', () => ({
    validationResult: jest.fn()
}));

const SpaceController = require('../../../src/controllers/SpaceController');
const Space = require('../../../src/models/Space');
const { validationResult } = require('express-validator');

describe('SpaceController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            query: {},
            user: {
                id: 'user123',
                role: 'admin',
                email: 'admin@test.com'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();

        // Mock validation to pass by default
        validationResult.mockReturnValue({ isEmpty: () => true });
    });

    describe('createSpace', () => {
        test('should create space successfully', async () => {
            const spaceData = {
                name: 'Test Space',
                description: 'A test space',
                type: 'desk',
                city: 'Milan',
                address: 'Via Test 123',
                capacity: 10,
                price_per_day: 50.00
            };

            req.body = spaceData;

            const mockCreatedSpace = {
                id: 'space123',
                ...spaceData,
                manager_id: 'user123'
            };

            Space.create.mockResolvedValue(mockCreatedSpace);

            await SpaceController.createSpace(req, res);

            expect(Space.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: spaceData.name,
                    manager_id: 'user123',
                    is_featured: undefined  // Cambia da false a undefined
                })
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Spazio creato con successo',
                space: mockCreatedSpace
            });
        });

        test('should handle validation errors', async () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ field: 'name', message: 'Name is required' }]
            });

            await SpaceController.createSpace(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Dati non validi',
                errors: [{ field: 'name', message: 'Name is required' }]
            });
            expect(Space.create).not.toHaveBeenCalled();
        });

        test('should set manager_id correctly for manager role', async () => {
            req.user.role = 'manager';
            req.body = {
                name: 'Manager Space',
                type: 'office',
                city: 'Rome',
                capacity: 5,
                price_per_day: 75.00
            };

            Space.create.mockResolvedValue({ id: 'space456' });

            await SpaceController.createSpace(req, res);

            expect(Space.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    manager_id: 'user123', // Should use current user's ID
                    is_featured: false // Manager cannot set featured
                })
            );
        });
    });

    describe('getAllSpaces', () => {
        test('should get all spaces with filters', async () => {
            req.query = {
                page: '1',
                limit: '10',
                city: 'Milan',
                type: 'desk'
            };

            const mockResult = {
                spaces: [
                    { id: 'space1', name: 'Space 1', city: 'Milan' },
                    { id: 'space2', name: 'Space 2', city: 'Milan' }
                ],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 2
                }
            };

            Space.findAll.mockResolvedValue(mockResult);

            await SpaceController.getAllSpaces(req, res);

            expect(Space.findAll).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                city: 'Milan',
                type: 'desk',
                manager_id: undefined, // Admin sees all
                is_featured: undefined,
                min_price: undefined,
                max_price: undefined,
                min_capacity: undefined,
                max_capacity: undefined,
                amenities: undefined,
                search: undefined,
                sortBy: undefined,
                sortOrder: undefined
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                ...mockResult
            });
        });

        test('should filter by manager_id for manager role', async () => {
            req.user.role = 'manager';
            req.query = { page: '1', limit: '10' };

            Space.findAll.mockResolvedValue({ spaces: [], pagination: {} });

            await SpaceController.getAllSpaces(req, res);

            expect(Space.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    manager_id: 'user123' // Should filter by manager's ID
                })
            );
        });
    });

    describe('getSpaceById', () => {
        test('should get space by ID successfully', async () => {
            req.params.spaceId = 'space123';

            const mockSpace = {
                id: 'space123',
                name: 'Test Space',
                is_active: true,
                manager_id: 'manager123',
                internal_notes: 'secret notes'
            };

            Space.findById.mockResolvedValue(mockSpace);

            await SpaceController.getSpaceById(req, res);

            expect(Space.findById).toHaveBeenCalledWith('space123');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                space: expect.objectContaining({
                    id: 'space123',
                    name: 'Test Space'
                })
            });

            // Verify sensitive data is filtered out
            const returnedSpace = res.json.mock.calls[0][0].space;
            expect(returnedSpace.manager_id).toBeUndefined();
            expect(returnedSpace.internal_notes).toBeUndefined();
        });

        test('should return 404 when space not found', async () => {
            req.params.spaceId = 'nonexistent';
            Space.findById.mockResolvedValue(null);

            await SpaceController.getSpaceById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Spazio non trovato'
            });
        });

        test('should return 404 when space is inactive', async () => {
            req.params.spaceId = 'space123';
            Space.findById.mockResolvedValue({
                id: 'space123',
                is_active: false
            });

            await SpaceController.getSpaceById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Spazio non disponibile'
            });
        });
    });

    describe('updateSpace', () => {
        test('should update space successfully', async () => {
            req.params.spaceId = 'space123';
            req.body = {
                name: 'Updated Space',
                capacity: 15
            };

            const mockUpdatedSpace = {
                id: 'space123',
                name: 'Updated Space',
                capacity: 15
            };

            Space.update.mockResolvedValue(mockUpdatedSpace);

            await SpaceController.updateSpace(req, res);

            expect(Space.update).toHaveBeenCalledWith('space123', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Spazio aggiornato con successo',
                space: mockUpdatedSpace
            });
        });

        test('should remove restricted fields for non-admin users', async () => {
            req.user.role = 'manager';
            req.params.spaceId = 'space123';
            req.body = {
                name: 'Updated Space',
                is_featured: true, // Should be removed
                manager_id: 'other_manager' // Should be removed
            };

            Space.update.mockResolvedValue({ id: 'space123' });

            await SpaceController.updateSpace(req, res);

            expect(Space.update).toHaveBeenCalledWith('space123', {
                name: 'Updated Space'
                // is_featured and manager_id should be removed
            });
        });
    });

    describe('checkAvailability', () => {
        test('should check availability successfully', async () => {
            req.params.spaceId = 'space123';
            req.query = {
                start_date: '2024-01-15',
                end_date: '2024-01-16',
                start_time: '09:00',
                end_time: '17:00'
            };

            Space.checkAvailability.mockResolvedValue(true);

            await SpaceController.checkAvailability(req, res);

            expect(Space.checkAvailability).toHaveBeenCalledWith(
                'space123',
                '2024-01-15',
                '2024-01-16',
                '09:00',
                '17:00'
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                available: true,
                message: 'Spazio disponibile'
            });
        });
    });
});