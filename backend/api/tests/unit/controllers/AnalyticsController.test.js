// tests/unit/controllers/AnalyticsController.test.js

beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});

// Mock delle dipendenze
jest.mock('../../../src/services/analyticsService', () => ({
    getManagerStats: jest.fn(),
    getUserStats: jest.fn(),
    getDashboardStats: jest.fn()
}));

jest.mock('../../../src/config/database', () => ({
    query: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const AnalyticsController = require('../../../src/controllers/analyticsController');
const AnalyticsService = require('../../../src/services/analyticsService');
const { query } = require('../../../src/config/database');
const logger = require('../../../src/utils/logger');

describe('AnalyticsController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: {
                id: 'user123',
                role: 'admin',
                email: 'admin@test.com'
            },
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('getAdminDashboard', () => {

        test('should handle database errors in admin dashboard', async () => {
            query.mockRejectedValue(new Error('Database connection failed'));

            await AnalyticsController.getAdminDashboard(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errore nel recupero delle statistiche dashboard'
            });
        });
    });

    describe('getManagerDashboard', () => {
        beforeEach(() => {
            req.user.role = 'manager';
        });

        test('should get manager dashboard successfully', async () => {
            req.query = { timeRange: '30d', spaceIds: 'space1,space2' };

            const mockStats = {
                general: {
                    bookings: { total: 45, confirmed: 40, cancelled: 5 },
                    revenue: 2250.00,
                    customers: 35,
                    rating: 4.5
                }
            };

            AnalyticsService.getManagerStats.mockResolvedValue(mockStats);

            await AnalyticsController.getManagerDashboard(req, res);

            expect(AnalyticsService.getManagerStats).toHaveBeenCalledWith(
                'user123', // managerId
                ['space1', 'space2'], // spaceIdsArray
                expect.any(String), // startDate ISO string
                expect.any(String)  // endDate ISO string
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Dashboard manager data retrieved successfully',
                data: mockStats
            });
        });

        test('should allow admin to access manager dashboard', async () => {
            req.user.role = 'admin';

            const mockStats = {
                general: {
                    bookings: { total: 100, confirmed: 90, cancelled: 10 },
                    revenue: 5000.00
                }
            };

            AnalyticsService.getManagerStats.mockResolvedValue(mockStats);

            await AnalyticsController.getManagerDashboard(req, res);

            expect(AnalyticsService.getManagerStats).toHaveBeenCalledWith(
                null, // managerId is null for admin
                null, // no space filter
                expect.any(String),
                expect.any(String)
            );
        });

        test('should reject non-manager/admin access', async () => {
            req.user.role = 'client';

            await AnalyticsController.getManagerDashboard(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Accesso riservato a manager e amministratori'
            });
            expect(AnalyticsService.getManagerStats).not.toHaveBeenCalled();
        });

        test('should fallback to mock data when service fails', async () => {
            AnalyticsService.getManagerStats.mockRejectedValue(new Error('Service error'));

            await AnalyticsController.getManagerDashboard(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Dashboard manager data retrieved successfully (mock data)',
                data: expect.objectContaining({
                    general: expect.objectContaining({
                        bookings: { total: 35, confirmed: 32, cancelled: 3 },
                        revenue: 1250.00,
                        customers: 28,
                        rating: 4.3
                    })
                })
            });
        });

        test('should parse space IDs correctly', async () => {
            req.query = { spaceIds: 'space1, space2 ,space3' }; // With spaces

            const mockStats = { general: {} };
            AnalyticsService.getManagerStats.mockResolvedValue(mockStats);

            await AnalyticsController.getManagerDashboard(req, res);

            expect(AnalyticsService.getManagerStats).toHaveBeenCalledWith(
                'user123',
                ['space1', 'space2', 'space3'], // Trimmed spaces
                expect.any(String),
                expect.any(String)
            );
        });
    });

    describe('getUserDashboard', () => {
        beforeEach(() => {
            req.user.role = 'client';
        });

        test('should get user dashboard successfully', async () => {
            req.query = { timeRange: '7d' };

            const mockStats = {
                bookings: {
                    total: 12,
                    confirmed: 10,
                    cancelled: 2,
                    totalHours: 84
                },
                spending: {
                    total: 630.00,
                    payments: 10,
                    average: 63.00
                }
            };

            AnalyticsService.getUserStats.mockResolvedValue(mockStats);

            await AnalyticsController.getUserDashboard(req, res);

            expect(AnalyticsService.getUserStats).toHaveBeenCalledWith(
                'user123',
                expect.any(String), // startDate
                expect.any(String)  // endDate
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Dashboard user data retrieved successfully',
                data: mockStats
            });
        });

        test('should fallback to mock data when service fails', async () => {
            AnalyticsService.getUserStats.mockRejectedValue(new Error('Service error'));

            await AnalyticsController.getUserDashboard(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Dashboard user data retrieved successfully (mock data)',
                data: expect.objectContaining({
                    bookings: {
                        total: 8,
                        confirmed: 7,
                        cancelled: 1,
                        totalHours: 56
                    },
                    spending: {
                        total: 420.00,
                        payments: 7,
                        average: 60.00
                    }
                })
            });
        });

        test('should handle different time ranges', async () => {
            req.query = { timeRange: '90d' };

            const mockStats = { bookings: {}, spending: {} };
            AnalyticsService.getUserStats.mockResolvedValue(mockStats);

            await AnalyticsController.getUserDashboard(req, res);

            // Verify that the date calculation worked for 90 days
            const callArgs = AnalyticsService.getUserStats.mock.calls[0];
            const startDate = new Date(callArgs[1]);
            const endDate = new Date(callArgs[2]);
            const daysDiff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

            expect(daysDiff).toBe(90);
        });
    });

    describe('getWidgetData', () => {
        test('should get widget data successfully', async () => {
            req.query = { widget: 'revenue', timeRange: '30d' };

            const mockDashboardStats = {
                revenue: {
                    dailyRevenue: [
                        { date: '2024-01-15', revenue: 150.00, payments: 3 },
                        { date: '2024-01-16', revenue: 200.00, payments: 4 }
                    ]
                },
                general: {
                    bookings: { total: 89, confirmed: 10, cancelled: 2 }
                }
            };

            AnalyticsService.getDashboardStats.mockResolvedValue(mockDashboardStats);

            await AnalyticsController.getWidgetData(req, res);

            expect(AnalyticsService.getDashboardStats).toHaveBeenCalledWith('30d');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    widget: 'revenue',
                    timeRange: '30d',
                    data: mockDashboardStats.revenue.dailyRevenue
                }
            });
        });

        test('should reject non-admin access', async () => {
            req.user.role = 'manager';
            req.query = { widget: 'revenue' };

            await AnalyticsController.getWidgetData(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Accesso riservato agli amministratori'
            });
        });

        test('should reject missing widget parameter', async () => {
            req.query = { timeRange: '30d' };

            await AnalyticsController.getWidgetData(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Parametro widget richiesto'
            });
        });

        test('should reject unsupported widget', async () => {
            req.query = { widget: 'unsupported' };

            const mockStats = {};
            AnalyticsService.getDashboardStats.mockResolvedValue(mockStats);

            await AnalyticsController.getWidgetData(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Widget non supportato'
            });
        });

        test('should handle different widget types', async () => {
            req.query = { widget: 'bookings' };

            const mockStats = {
                general: {
                    bookings: { total: 50, confirmed: 45, cancelled: 5 }
                }
            };

            AnalyticsService.getDashboardStats.mockResolvedValue(mockStats);

            await AnalyticsController.getWidgetData(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    widget: 'bookings',
                    timeRange: '30d',
                    data: mockStats.general.bookings
                }
            });
        });

        test('should fallback to mock data when service fails', async () => {
            req.query = { widget: 'revenue' };

            AnalyticsService.getDashboardStats.mockRejectedValue(new Error('Service error'));

            await AnalyticsController.getWidgetData(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    widget: 'revenue',
                    timeRange: '30d',
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            date: expect.any(String),
                            revenue: expect.any(Number),
                            payments: expect.any(Number)
                        })
                    ])
                }
            });
        });
    });

    describe('getSpaceData', () => {
        test('should get space data successfully', async () => {
            req.query = { timeRange: '30d' };

            // Mock all database queries
            query.mockResolvedValueOnce({ rows: [{ total: '45' }] }); // spazi attivi
            query.mockResolvedValueOnce({ rows: [{ total: '8' }] }); // prenotati oggi
            query.mockResolvedValueOnce({ rows: [{ total_revenue: '2500.00' }] }); // ricavi mensili
            query.mockResolvedValueOnce({ rows: [{ total: '200' }] }); // user count
            query.mockResolvedValueOnce({ rows: [{ total: '50' }] }); // total space count
            query.mockResolvedValueOnce({ rows: [{ total: '300' }] }); // booking count
            query.mockResolvedValueOnce({ rows: [ // daily revenue
                    { date: '2024-01-15', revenue: '150.00', payments: '3' },
                    { date: '2024-01-16', revenue: '200.00', payments: '4' }
                ] });
            query.mockResolvedValueOnce({ rows: [ // top spaces
                    {
                        id: 'space1',
                        name: 'Conference Room A',
                        location: 'Milan Center',
                        revenue: '500.00',
                        total_bookings: '15'
                    }
                ] });

            await AnalyticsController.getSpaceData(req, res);

            expect(query).toHaveBeenCalledTimes(8);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Dashboard data retrieved successfully',
                data: expect.objectContaining({
                    timeRange: '30d',
                    main_stats: {
                        spazi_attivi: 45,
                        prenotati_oggi: 8,
                        ricavi_mensili: 2500.00
                    },
                    general: expect.objectContaining({
                        users: { total: 200 },
                        spaces: {
                            total: 50,
                            active: 45
                        },
                        bookings: {
                            total: 300,
                            today: 8
                        },
                        revenue: {
                            monthly: 2500.00
                        }
                    }),
                    revenue: {
                        dailyRevenue: [
                            { date: '2024-01-15', revenue: 150.00, payments: 3 },
                            { date: '2024-01-16', revenue: 200.00, payments: 4 }
                        ]
                    },
                    topSpaces: [
                        {
                            id: 'space1',
                            name: 'Conference Room A',
                            location: 'Milan Center',
                            revenue: 500.00,
                            bookings: { total: 15 }
                        }
                    ]
                })
            });
        });

        test('should handle database errors in space data', async () => {
            query.mockRejectedValue(new Error('Database error'));

            await AnalyticsController.getSpaceData(req, res);

            expect(res.status).toHaveBeenCalledWith(500);

            // L'error field è presente solo in development mode
            const expectedResponse = {
                success: false,
                message: 'Errore nel recupero delle statistiche dashboard'
            };

            // Non ci aspettiamo error field in test environment
            expect(res.json).toHaveBeenCalledWith(expectedResponse);
        });

        test('should handle spaces without names', async () => {
            // Mock queries with minimal data to test the getSpaceData path
            query.mockResolvedValueOnce({ rows: [{ total: '0' }] }); // spazi attivi
            query.mockResolvedValueOnce({ rows: [{ total: '0' }] }); // prenotati oggi
            query.mockResolvedValueOnce({ rows: [{ total_revenue: '0.00' }] }); // ricavi mensili
            query.mockResolvedValueOnce({ rows: [{ total: '0' }] }); // user count
            query.mockResolvedValueOnce({ rows: [{ total: '0' }] }); // total space count
            query.mockResolvedValueOnce({ rows: [{ total: '0' }] }); // booking count
            query.mockResolvedValueOnce({ rows: [] }); // daily revenue (empty)
            query.mockResolvedValueOnce({ rows: [{ // top space without name
                    id: 'space1',
                    name: null,
                    location: 'Unknown Location',
                    revenue: '100.00',
                    total_bookings: '5'
                }] });

            await AnalyticsController.getSpaceData(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        topSpaces: [
                            expect.objectContaining({
                                name: 'Spazio senza nome'
                            })
                        ]
                    })
                })
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle service errors gracefully', async () => {
            req.user.role = 'manager';
            AnalyticsService.getManagerStats.mockRejectedValue(new Error('Database timeout'));

            await AnalyticsController.getManagerDashboard(req, res);

            expect(logger.error).toHaveBeenCalledWith(
                'AnalyticsService error for manager, falling back to mock data:',
                expect.any(Error)
            );
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: expect.stringContaining('mock data')
                })
            );
        });

        test('should log appropriate info for successful requests', async () => {
            req.user.role = 'client';
            const mockStats = {
                bookings: { total: 5 },
                spending: { total: 250.00 }
            };
            AnalyticsService.getUserStats.mockResolvedValue(mockStats);

            await AnalyticsController.getUserDashboard(req, res);

            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('User dashboard real data accessed'),
                expect.objectContaining({
                    timeRange: '30d',
                    totalBookings: 5,
                    totalSpent: 250.00
                })
            );
        });
    });

    describe('Time Range Processing', () => {
        test('should default to 30d when no timeRange provided', async () => {
            req.query = {}; // No timeRange
            const mockStats = { bookings: {}, spending: {} };
            AnalyticsService.getUserStats.mockResolvedValue(mockStats);

            await AnalyticsController.getUserDashboard(req, res);

            const callArgs = AnalyticsService.getUserStats.mock.calls[0];
            const startDate = new Date(callArgs[1]);
            const endDate = new Date(callArgs[2]);
            const daysDiff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

            expect(daysDiff).toBe(30);
        });

        test('should handle custom time ranges', async () => {
            req.query = { timeRange: '14d' };
            const mockStats = { bookings: {}, spending: {} };
            AnalyticsService.getUserStats.mockResolvedValue(mockStats);

            await AnalyticsController.getUserDashboard(req, res);

            const callArgs = AnalyticsService.getUserStats.mock.calls[0];
            const startDate = new Date(callArgs[1]);
            const endDate = new Date(callArgs[2]);
            const daysDiff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

            expect(daysDiff).toBe(14);
        });
    });
});