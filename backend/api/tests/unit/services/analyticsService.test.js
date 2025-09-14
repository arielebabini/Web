// tests/unit/services/analyticsService.test.js

// Mock delle dipendenze
jest.mock('../../../src/config/database', () => ({
    query: jest.fn()
}));
jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn()
}));

const db = require('../../../src/config/database');
const AnalyticsService = require('../../../src/services/analyticsService');
const logger = require('../../../src/utils/logger');

describe('AnalyticsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getGeneralStats', () => {
        test('should fetch and format general stats correctly', async () => {
            const mockDbResponse = {
                rows: [{
                    total_users: '150',
                    new_users: '12',
                    total_spaces: '25',
                    total_bookings: '50',
                    total_revenue: '12345.67',
                    total_payments: '100'
                }]
            };
            db.query.mockResolvedValue(mockDbResponse);

            const result = await AnalyticsService.getGeneralStats('start_date', 'end_date');

            expect(db.query).toHaveBeenCalled();
            expect(result).toEqual({
                users: { total: 150, new: 12 },
                spaces: { total: 25 },
                bookings: { total: 50, new: 50, confirmed: 50 },
                revenue: { total: 12345.67, payments: 100, averageTransaction: 123.46 }
            });
        });
    });

    describe('getRevenueStats', () => {
        test('should calculate revenue and growth rate correctly', async () => {
            const mockDbResponse = {
                rows: [{
                    current_revenue: '10000.00',
                    previous_revenue: '8000.00'
                }]
            };
            db.query.mockResolvedValue(mockDbResponse);

            const result = await AnalyticsService.getRevenueStats('2025-09-01', '2025-09-10');

            expect(result).toEqual({
                current: 10000.00,
                previous: 8000.00,
                growthRate: 25.00
            });
        });
    });

    describe('getTopSpaces', () => {
        test('should fetch and format top spaces correctly', async () => {
            const mockDbResponse = {
                rows: [{
                    id: 'space1',
                    name: 'Top Space',
                    location: 'Milan',
                    revenue: '500.00',
                    total_bookings: '20'
                }]
            };
            db.query.mockResolvedValue(mockDbResponse);

            const result = await AnalyticsService.getTopSpaces('start', 'end', 1);

            expect(db.query).toHaveBeenCalledWith(expect.any(String), ['start', 'end', 1]);
            expect(result[0]).toEqual({
                id: 'space1',
                name: 'Top Space',
                location: 'Milan',
                revenue: 500.00,
                bookings: { total: 20, confirmed: 20 }
            });
        });
    });

    describe('getManagerStats', () => {
        test('should apply spaceId filters correctly', async () => {
            const mockDbResponse = { rows: [{ total_bookings: '5' }] };
            db.query.mockResolvedValue(mockDbResponse);

            const managerId = 'manager123';
            const spaceIds = ['space1', 'space2'];
            await AnalyticsService.getManagerStats(managerId, spaceIds, 'start', 'end');

            const [query, params] = db.query.mock.calls[0];
            expect(query).toContain('s.id IN ($4,$5)');
            expect(params).toEqual(['manager123', 'start', 'end', 'space1', 'space2']);
        });
    });

    describe('Error Handling', () => {
        test('should throw error and log if database query fails', async () => {
            const error = new Error('DB Connection Error');
            db.query.mockRejectedValue(error);

            await expect(AnalyticsService.getDashboardStats()).rejects.toThrow('DB Connection Error');
            expect(logger.error).toHaveBeenCalledWith('Error getting dashboard stats:', error);
        });
    });
});