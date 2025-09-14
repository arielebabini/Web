// tests/unit/models/Space.test.js

// Mock delle dipendenze
jest.mock('../../../src/config/database', () => ({
    query: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
}));

const Space = require('../../../src/models/Space');
const { query } = require('../../../src/config/database');
const logger = require('../../../src/utils/logger');

describe('Space Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('create', () => {
        test('should create space successfully with all fields', async () => {
            const spaceData = {
                name: 'Conference Room A',
                description: 'Modern conference room with projector',
                type: 'meeting_room',
                city: 'Milan',
                address: 'Via Roma 123',
                capacity: 10,
                price_per_day: 150.00,
                manager_id: 'manager123',
                amenities: ['wifi', 'projector', 'whiteboard'],
                images: ['image1.jpg', 'image2.jpg'],
                coordinates: { lat: 45.4642, lng: 9.1900 },
                is_featured: true
            };

            const mockCreatedSpace = {
                id: 'space123',
                ...spaceData,
                amenities: JSON.stringify(spaceData.amenities),
                images: JSON.stringify(spaceData.images),
                coordinates: JSON.stringify(spaceData.coordinates),
                created_at: new Date()
            };

            query.mockResolvedValue({ rows: [mockCreatedSpace] });

            const result = await Space.create(spaceData);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO spaces'),
                [
                    'Conference Room A',
                    'Modern conference room with projector',
                    'meeting_room',
                    'Milan',
                    'Via Roma 123',
                    10,
                    150.00,
                    'manager123',
                    JSON.stringify(['wifi', 'projector', 'whiteboard']),
                    JSON.stringify(['image1.jpg', 'image2.jpg']),
                    JSON.stringify({ lat: 45.4642, lng: 9.1900 }),
                    true
                ]
            );
            expect(result).toEqual(mockCreatedSpace);
        });

        test('should create space with default values', async () => {
            const spaceData = {
                name: 'Basic Room',
                type: 'office',
                city: 'Rome',
                address: 'Via Nazionale 1',
                capacity: 5,
                price_per_day: 100.00,
                manager_id: 'manager456'
            };

            query.mockResolvedValue({ rows: [{ id: 'space456' }] });

            await Space.create(spaceData);

            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    'Basic Room',
                    undefined, // description
                    'office',
                    'Rome',
                    'Via Nazionale 1',
                    5,
                    100.00,
                    'manager456',
                    JSON.stringify([]), // default empty amenities
                    JSON.stringify([]), // default empty images
                    null, // no coordinates
                    false // default is_featured
                ])
            );
        });

        test('should handle database errors', async () => {
            const spaceData = {
                name: 'Test Space',
                type: 'office',
                city: 'Milan',
                address: 'Test Address',
                capacity: 5,
                price_per_day: 100,
                manager_id: 'manager123'
            };

            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.create(spaceData)).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error creating space:', expect.any(Error));
        });
    });

    describe('findById', () => {
        test('should find space by ID with manager data', async () => {
            const mockSpace = {
                id: 'space123',
                name: 'Conference Room A',
                type: 'meeting_room',
                city: 'Milan',
                capacity: 10,
                price_per_day: 150.00,
                manager_first_name: 'John',
                manager_last_name: 'Doe',
                manager_email: 'john@example.com',
                manager_phone: '+39123456789'
            };

            query.mockResolvedValue({ rows: [mockSpace] });

            const result = await Space.findById('space123');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE s.id = $1 AND s.is_active = true'),
                ['space123']
            );
            expect(result).toEqual(mockSpace);
        });

        test('should return null when space not found', async () => {
            query.mockResolvedValue({ rows: [] });

            const result = await Space.findById('nonexistent');

            expect(result).toBeNull();
        });

        test('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.findById('space123')).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error finding space by ID:', expect.any(Error));
        });
    });

    describe('update', () => {
        test('should update space with valid fields', async () => {
            const updateData = {
                name: 'Updated Room',
                capacity: 15,
                price_per_day: 200.00,
                amenities: ['wifi', 'projector'],
                coordinates: { lat: 45.4642, lng: 9.1900 }
            };

            const mockUpdatedSpace = {
                id: 'space123',
                ...updateData,
                updated_at: new Date()
            };

            query.mockResolvedValue({ rows: [mockUpdatedSpace] });

            const result = await Space.update('space123', updateData);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE spaces'),
                [
                    'Updated Room',
                    15,
                    200.00,
                    JSON.stringify(['wifi', 'projector']),
                    JSON.stringify({ lat: 45.4642, lng: 9.1900 }),
                    'space123'
                ]
            );
            expect(result).toEqual(mockUpdatedSpace);
        });

        test('should handle JSON fields correctly', async () => {
            const updateData = {
                amenities: ['wifi'],
                images: ['new_image.jpg'],
                coordinates: null
            };

            query.mockResolvedValue({ rows: [{ id: 'space123' }] });

            await Space.update('space123', updateData);

            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                [
                    JSON.stringify(['wifi']),
                    JSON.stringify(['new_image.jpg']),
                    null, // coordinates null
                    'space123'
                ]
            );
        });

        test('should reject update with no valid fields', async () => {
            await expect(Space.update('space123', {})).rejects.toThrow('No valid fields to update');
        });

        test('should filter out invalid fields', async () => {
            const updateData = {
                name: 'Valid Field',
                invalid_field: 'Should be ignored',
                another_invalid: 123
            };

            query.mockResolvedValue({ rows: [{ id: 'space123' }] });

            await Space.update('space123', updateData);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE spaces'),
                ['Valid Field', 'space123']
            );
        });

        test('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.update('space123', { name: 'Test' })).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error updating space:', expect.any(Error));
        });
    });

    describe('findAll', () => {
        test('should find all spaces with pagination', async () => {
            const options = {
                page: 2,
                limit: 10,
                city: 'Milan',
                type: 'meeting_room'
            };

            const mockSpaces = [
                { id: 'space1', name: 'Room 1', city: 'Milan' },
                { id: 'space2', name: 'Room 2', city: 'Milan' }
            ];

            query.mockResolvedValueOnce({ rows: mockSpaces });
            query.mockResolvedValueOnce({ rows: [{ total: '25' }] });

            const result = await Space.findAll(options);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('s.city ILIKE $1 AND s.type = $2'),
                expect.arrayContaining(['%Milan%', 'meeting_room', 10, 10])
            );
            expect(result).toEqual({
                spaces: mockSpaces,
                pagination: {
                    page: 2,
                    limit: 10,
                    total: 25,
                    totalPages: 3,
                    hasNext: true,
                    hasPrev: true
                }
            });
        });

        test('should handle price range filters', async () => {
            const options = {
                min_price: 50,
                max_price: 200,
                min_capacity: 5,
                max_capacity: 20
            };

            query.mockResolvedValueOnce({ rows: [] });
            query.mockResolvedValueOnce({ rows: [{ total: '0' }] });

            await Space.findAll(options);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('s.price_per_day >= $1 AND s.price_per_day <= $2'),
                expect.arrayContaining([50, 200, 5, 20])
            );
        });

        test('should handle amenities filter', async () => {
            const options = {
                amenities: ['wifi', 'projector']
            };

            query.mockResolvedValueOnce({ rows: [] });
            query.mockResolvedValueOnce({ rows: [{ total: '0' }] });

            await Space.findAll(options);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('s.amenities @> $1'),
                expect.arrayContaining([JSON.stringify(['wifi', 'projector'])])
            );
        });

        test('should use safe sorting parameters', async () => {
            const options = {
                sortBy: 'invalid_field',
                sortOrder: 'INVALID'
            };

            query.mockResolvedValueOnce({ rows: [] });
            query.mockResolvedValueOnce({ rows: [{ total: '0' }] });

            await Space.findAll(options);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY s.created_at DESC'),
                expect.any(Array)
            );
        });

        test('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.findAll()).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error fetching spaces:', expect.any(Error));
        });
    });

    describe('softDelete', () => {
        test('should soft delete space successfully', async () => {
            query.mockResolvedValue({ rowCount: 1 });

            const result = await Space.softDelete('space123');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('SET is_active = false'),
                ['space123']
            );
            expect(result).toBe(true);
        });

        test('should return false when space not found', async () => {
            query.mockResolvedValue({ rowCount: 0 });

            const result = await Space.softDelete('nonexistent');

            expect(result).toBe(false);
        });

        test('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.softDelete('space123')).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error soft deleting space:', expect.any(Error));
        });
    });

    describe('checkAvailability', () => {
        test('should return true when space is available', async () => {
            query.mockResolvedValue({ rows: [{ conflicts: '0' }] });

            const result = await Space.checkAvailability('space123', '2025-12-25', '2025-12-26');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE space_id = $1'),
                ['space123', '2025-12-25', '2025-12-26']
            );
            expect(result).toBe(true);
        });

        test('should return false when space has conflicts', async () => {
            query.mockResolvedValue({ rows: [{ conflicts: '2' }] });

            const result = await Space.checkAvailability('space123', '2025-12-25', '2025-12-26');

            expect(result).toBe(false);
        });

        test('should check time slots when provided', async () => {
            query.mockResolvedValue({ rows: [{ conflicts: '0' }] });

            await Space.checkAvailability('space123', '2025-12-25', '2025-12-25', '09:00', '17:00');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('start_time < $5 AND end_time > $4'),
                ['space123', '2025-12-25', '2025-12-25', '09:00', '17:00']
            );
        });

        test('should exclude specific booking when provided', async () => {
            query.mockResolvedValue({ rows: [{ conflicts: '0' }] });

            await Space.checkAvailability('space123', '2025-12-25', '2025-12-26', null, null, 'booking456');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('AND id != $4'),
                ['space123', '2025-12-25', '2025-12-26', 'booking456']
            );
        });

        test('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.checkAvailability('space123', '2025-12-25', '2025-12-26')).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error checking space availability:', expect.any(Error));
        });
    });

    describe('calculatePrice', () => {
        test('should calculate price correctly for multi-day booking', async () => {
            const mockSpace = {
                id: 'space123',
                price_per_day: 100.00,
                capacity: 10
            };

            Space.findById = jest.fn().mockResolvedValue(mockSpace);

            const result = await Space.calculatePrice('space123', '2025-12-25', '2025-12-27', 8);

            expect(result).toEqual({
                basePrice: 300.00, // 3 days * 100
                fees: 30.00, // 10% of base price
                extraPersonFee: 0,
                totalPrice: 330.00,
                days: 3,
                pricePerDay: 100.00
            });
        });

        test('should calculate price for same-day booking', async () => {
            const mockSpace = {
                id: 'space123',
                price_per_day: 150.00,
                capacity: 5
            };

            Space.findById = jest.fn().mockResolvedValue(mockSpace);

            const result = await Space.calculatePrice('space123', '2025-12-25', '2025-12-25', 3);

            expect(result).toEqual({
                basePrice: 150.00, // 1 day * 150
                fees: 15.00, // 10% of base price
                extraPersonFee: 0,
                totalPrice: 165.00,
                days: 1,
                pricePerDay: 150.00
            });
        });

        test('should reject booking exceeding capacity', async () => {
            const mockSpace = {
                id: 'space123',
                price_per_day: 100.00,
                capacity: 5
            };

            Space.findById = jest.fn().mockResolvedValue(mockSpace);

            await expect(Space.calculatePrice('space123', '2025-12-25', '2025-12-26', 8))
                .rejects.toThrow('Numero di persone superiore alla capacità');
        });

        test('should handle space not found', async () => {
            Space.findById = jest.fn().mockResolvedValue(null);

            await expect(Space.calculatePrice('nonexistent', '2025-12-25', '2025-12-26', 5))
                .rejects.toThrow('Space not found');
        });

        test('should handle database errors', async () => {
            Space.findById = jest.fn().mockRejectedValue(new Error('Database error'));

            await expect(Space.calculatePrice('space123', '2025-12-25', '2025-12-26', 5))
                .rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error calculating price:', expect.any(Error));
        });
    });

    describe('getAvailabilityCalendar', () => {
        test('should return availability calendar', async () => {
            const mockCalendar = [
                {
                    date: '2025-12-25',
                    available: true,
                    status: null,
                    start_time: null,
                    end_time: null,
                    people_count: null
                },
                {
                    date: '2025-12-26',
                    available: false,
                    status: 'confirmed',
                    start_time: '09:00',
                    end_time: '17:00',
                    people_count: 8
                }
            ];

            query.mockResolvedValue({ rows: mockCalendar });

            const result = await Space.getAvailabilityCalendar('space123', '2025-12-25', '2025-12-27');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('WITH date_series AS'),
                ['space123', '2025-12-25', '2025-12-27']
            );
            expect(result).toEqual(mockCalendar);
        });

        test('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.getAvailabilityCalendar('space123', '2025-12-25', '2025-12-27'))
                .rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error getting availability calendar:', expect.any(Error));
        });
    });

    describe('getOccupiedSlots', () => {
        test('should return occupied slots', async () => {
            const mockSlots = [
                {
                    start_date: '2025-12-25',
                    end_date: '2025-12-25',
                    start_time: '09:00',
                    end_time: '17:00',
                    status: 'confirmed',
                    people_count: 8
                }
            ];

            query.mockResolvedValue({ rows: mockSlots });

            const result = await Space.getOccupiedSlots('space123', '2025-12-25', '2025-12-31');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE space_id = $1'),
                ['space123', '2025-12-25', '2025-12-31']
            );
            expect(result).toEqual(mockSlots);
        });

        test('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.getOccupiedSlots('space123', '2025-12-25', '2025-12-31'))
                .rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error getting occupied slots:', expect.any(Error));
        });
    });

    describe('getPopularSpaces', () => {
        test('should get popular spaces without manager filter', async () => {
            const mockPopularSpaces = [
                {
                    id: 'space1',
                    name: 'Popular Room 1',
                    total_bookings: '25',
                    completed_bookings: '20',
                    avg_booking_price: '150.00'
                },
                {
                    id: 'space2',
                    name: 'Popular Room 2',
                    total_bookings: '18',
                    completed_bookings: '15',
                    avg_booking_price: '120.00'
                }
            ];

            query.mockResolvedValue({ rows: mockPopularSpaces });

            const result = await Space.getPopularSpaces(5);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY total_bookings DESC'),
                [5]
            );
            expect(result).toEqual(mockPopularSpaces);
        });

        test('should filter by manager when provided', async () => {
            query.mockResolvedValue({ rows: [] });

            await Space.getPopularSpaces(10, 'manager123');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('AND s.manager_id = $2'),
                [10, 'manager123']
            );
        });

        test('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.getPopularSpaces()).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error getting popular spaces:', expect.any(Error));
        });
    });

    describe('findNearby', () => {
        test('should find nearby spaces', async () => {
            const mockNearbySpaces = [
                {
                    id: 'space1',
                    name: 'Nearby Room 1',
                    distance: 2.5
                },
                {
                    id: 'space2',
                    name: 'Nearby Room 2',
                    distance: 5.8
                }
            ];

            query.mockResolvedValue({ rows: mockNearbySpaces });

            const result = await Space.findNearby(45.4642, 9.1900, 10);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('6371 * acos'),
                [45.4642, 9.1900, 10]
            );
            expect(result).toEqual(mockNearbySpaces);
        });

        test('should apply additional filters', async () => {
            const options = {
                type: 'meeting_room',
                max_price: 200,
                min_capacity: 5,
                limit: 20
            };

            query.mockResolvedValue({ rows: [] });

            await Space.findNearby(45.4642, 9.1900, 15, options);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE'),
                expect.arrayContaining([45.4642, 9.1900, 15, 'meeting_room', 200, 5])
            );
        });

        test('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.findNearby(45.4642, 9.1900)).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error finding nearby spaces:', expect.any(Error));
        });
    });

    describe('getDashboardStats', () => {
        test('should get admin dashboard stats', async () => {
            const mockStats = {
                total_spaces: '50',
                active_spaces: '45',
                booked_today: '8',
                monthly_revenue: '12500.00'
            };

            query.mockResolvedValue({ rows: [mockStats] });

            const result = await Space.getDashboardStats();

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('WITH space_stats AS'),
                [null]
            );
            expect(result).toEqual({
                total: 50,
                active: 45,
                bookedToday: 8,
                monthlyRevenue: 12500.00
            });
        });

        test('should get manager dashboard stats', async () => {
            const mockStats = {
                total_spaces: '5',
                active_spaces: '4',
                booked_today: '2',
                monthly_revenue: '1500.00'
            };

            query.mockResolvedValue({ rows: [mockStats] });

            const result = await Space.getDashboardStats('manager123');

            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                ['manager123']
            );
            expect(result).toEqual({
                total: 5,
                active: 4,
                bookedToday: 2,
                monthlyRevenue: 1500.00
            });
        });

        test('should handle null values in stats', async () => {
            const mockStats = {
                total_spaces: null,
                active_spaces: null,
                booked_today: null,
                monthly_revenue: null
            };

            query.mockResolvedValue({ rows: [mockStats] });

            const result = await Space.getDashboardStats();

            expect(result).toEqual({
                total: 0,
                active: 0,
                bookedToday: 0,
                monthlyRevenue: 0
            });
        });

        test('should handle database errors', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await expect(Space.getDashboardStats()).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error getting dashboard stats:', expect.any(Error));
        });
    });

    describe('Edge Cases and Validation', () => {
        test('should handle coordinates as null in create', async () => {
            const spaceData = {
                name: 'Test Space',
                type: 'office',
                city: 'Milan',
                address: 'Test Address',
                capacity: 5,
                price_per_day: 100,
                manager_id: 'manager123',
                coordinates: null
            };

            query.mockResolvedValue({ rows: [{ id: 'space123' }] });

            await Space.create(spaceData);

            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([null]) // coordinates should be null
            );
        });

        test('should handle empty amenities array', async () => {
            const updateData = {
                amenities: []
            };

            query.mockResolvedValue({ rows: [{ id: 'space123' }] });

            await Space.update('space123', updateData);

            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                [JSON.stringify([]), 'space123']
            );
        });

        test('should handle availability check with same start and end date', async () => {
            query.mockResolvedValue({ rows: [{ conflicts: '0' }] });

            const result = await Space.checkAvailability('space123', '2025-12-25', '2025-12-25');

            expect(result).toBe(true);
            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                ['space123', '2025-12-25', '2025-12-25']
            );
        });

        test('should handle price calculation with zero capacity edge case', async () => {
            const mockSpace = {
                id: 'space123',
                price_per_day: 100.00,
                capacity: 0
            };

            Space.findById = jest.fn().mockResolvedValue(mockSpace);

            await expect(Space.calculatePrice('space123', '2025-12-25', '2025-12-26', 1))
                .rejects.toThrow('Numero di persone superiore alla capacità');
        });

        test('should handle findAll with no filters', async () => {
            query.mockResolvedValueOnce({ rows: [] });
            query.mockResolvedValueOnce({ rows: [{ total: '0' }] });

            const result = await Space.findAll({});

            expect(result.pagination).toEqual({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            });
        });

        test('should handle findNearby with default radius and options', async () => {
            query.mockResolvedValue({ rows: [] });

            await Space.findNearby(45.4642, 9.1900);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT 50'), // default limit
                [45.4642, 9.1900, 10] // default radius 10km
            );
        });
    });
});