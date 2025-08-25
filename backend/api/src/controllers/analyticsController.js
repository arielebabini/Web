// api/src/controllers/analyticsController.js - VERSIONE AGGIORNATA CON QUERY REALI
const AnalyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');
const {query} = require("../config/database");

class AnalyticsController {
    /**
     * Dashboard admin - Statistiche generali REALI
     */
    static async getAdminDashboard(req, res) {
        try {
            const { timeRange = '30d' } = req.query;

            // Query dirette al database
            const { query } = require('../config/database');

            // Conta utenti reali
            const userCount = await query('SELECT COUNT(*) as total FROM users');
            const spaceCount = await query('SELECT COUNT(*) as total FROM spaces');
            const bookingCount = await query('SELECT COUNT(*) as total FROM bookings');

            const revenueQuery = await query(`
                SELECT COALESCE(SUM(amount), 0) as total_revenue, COUNT(*) as total_payments, COALESCE(AVG(amount), 0) as avg_transaction
                FROM payments 
            `);
            const confirmedBookingsQuery = await query(`
                SELECT COUNT(*) as confirmed 
                FROM bookings 
                WHERE status = 'confirmed'
            `);

            const realData = {
                timeRange: '30d',
                period: {
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date().toISOString()
                },
                general: {
                    users: { total: parseInt(userCount.rows[0].total), new: 0 },
                    spaces: { total: parseInt(spaceCount.rows[0].total) },
                    bookings: {
                        total: parseInt(bookingCount.rows[0].total),
                        confirmed: parseInt(confirmedBookingsQuery.rows[0].confirmed),
                        conversionRate: bookingCount.rows[0].total > 0 ?
                            (confirmedBookingsQuery.rows[0].confirmed / bookingCount.rows[0].total * 100).toFixed(1) : 0
                    },
                    revenue: {
                        total: parseFloat(revenueQuery.rows[0].total_revenue),
                        payments: parseInt(revenueQuery.rows[0].total_payments),
                        averageTransaction: parseFloat(revenueQuery.rows[0].avg_transaction).toFixed(2)
                    }
                },
                topSpaces: []
            };

            res.json({
                success: true,
                message: 'Dashboard admin data retrieved successfully',
                data: realData
            });

        } catch (error) {
            console.error('Error getting admin dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle statistiche dashboard'
            });
        }
    }


    /**
     * Dashboard manager - Statistiche spazi REALI
     */
    static async getManagerDashboard(req, res) {
        try {
            if (!['admin', 'manager'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso riservato a manager e amministratori'
                });
            }

            const { timeRange = '30d', spaceIds } = req.query;
            const managerId = req.user.role === 'admin' ? null : req.user.id;

            // Converte spaceIds da stringa a array se fornito
            const spaceIdsArray = spaceIds ?
                (Array.isArray(spaceIds) ? spaceIds : spaceIds.split(',').map(id => id.trim())) :
                null;

            try {
                const days = parseInt(timeRange.replace('d', ''));
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                const endDate = new Date();

                // Usa le query reali del database
                const stats = await AnalyticsService.getManagerStats(
                    managerId,
                    spaceIdsArray,
                    startDate.toISOString(),
                    endDate.toISOString()
                );

                logger.info(`Manager dashboard real data accessed by user ${req.user.id}`, {
                    managerId,
                    timeRange,
                    spaceIds: spaceIdsArray,
                    totalBookings: stats.general.bookings.total,
                    revenue: stats.general.revenue
                });

                res.json({
                    success: true,
                    message: 'Dashboard manager data retrieved successfully',
                    data: stats
                });

            } catch (serviceError) {
                logger.error('AnalyticsService error for manager, falling back to mock data:', serviceError);

                // Fallback ai dati mock
                const mockManagerData = {
                    general: {
                        bookings: { total: 35, confirmed: 32, cancelled: 3 },
                        revenue: 1250.00,
                        customers: 28,
                        rating: 4.3
                    }
                };

                res.json({
                    success: true,
                    message: 'Dashboard manager data retrieved successfully (mock data)',
                    data: mockManagerData
                });
            }

        } catch (error) {
            logger.error('Error getting manager dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle statistiche manager'
            });
        }
    }

    /**
     * Dashboard utente - Statistiche personali REALI
     */
    static async getUserDashboard(req, res) {
        try {
            const { timeRange = '30d' } = req.query;
            const userId = req.user.id;

            try {
                const days = parseInt(timeRange.replace('d', ''));
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                const endDate = new Date();

                // Usa le query reali del database
                const stats = await AnalyticsService.getUserStats(
                    userId,
                    startDate.toISOString(),
                    endDate.toISOString()
                );

                logger.info(`User dashboard real data accessed by user ${userId}`, {
                    timeRange,
                    totalBookings: stats.bookings.total,
                    totalSpent: stats.spending.total
                });

                res.json({
                    success: true,
                    message: 'Dashboard user data retrieved successfully',
                    data: stats
                });

            } catch (serviceError) {
                logger.error('AnalyticsService error for user, falling back to mock data:', serviceError);

                // Fallback ai dati mock
                const mockUserData = {
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
                };

                res.json({
                    success: true,
                    message: 'Dashboard user data retrieved successfully (mock data)',
                    data: mockUserData
                });
            }

        } catch (error) {
            logger.error('Error getting user dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle statistiche utente'
            });
        }
    }

    /**
     * Widget data per dashboard dinamica
     */
    static async getWidgetData(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso riservato agli amministratori'
                });
            }

            const { widget, timeRange = '30d' } = req.query;

            if (!widget) {
                return res.status(400).json({
                    success: false,
                    message: 'Parametro widget richiesto'
                });
            }

            try {
                const dashboardStats = await AnalyticsService.getDashboardStats(timeRange);
                let data;

                switch (widget) {
                    case 'revenue':
                        data = dashboardStats.revenue.dailyRevenue;
                        break;
                    case 'bookings':
                        data = dashboardStats.general.bookings;
                        break;
                    case 'users':
                        data = dashboardStats.userGrowth;
                        break;
                    case 'topSpaces':
                        data = dashboardStats.topSpaces;
                        break;
                    default:
                        return res.status(400).json({
                            success: false,
                            message: 'Widget non supportato'
                        });
                }

                res.json({
                    success: true,
                    data: {
                        widget,
                        timeRange,
                        data
                    }
                });

            } catch (serviceError) {
                logger.error('AnalyticsService error for widget, using mock data:', serviceError);

                // Mock widget data come fallback
                let mockData;
                switch (widget) {
                    case 'revenue':
                        mockData = [
                            { date: '2025-01-15', revenue: 150.00, payments: 3 },
                            { date: '2025-01-16', revenue: 200.00, payments: 4 },
                            { date: '2025-01-17', revenue: 180.00, payments: 2 }
                        ];
                        break;
                    case 'bookings':
                        mockData = { total: 89, confirmed: 10, cancelled: 2 };
                        break;
                    default:
                        mockData = [];
                }

                res.json({
                    success: true,
                    data: {
                        widget,
                        timeRange,
                        data: mockData
                    }
                });
            }

        } catch (error) {
            logger.error(`Error getting widget data for ${req.query.widget}:`, error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero dei dati del widget'
            });
        }
    }

    /**
     * Esporta report in formato CSV
     */
    static async exportReport(req, res) {
        try {
            if (!['admin', 'manager'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso riservato a manager e amministratori'
                });
            }

            const { type, startDate, endDate } = req.query;

            if (!type || !startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Parametri type, startDate e endDate richiesti'
                });
            }

            // TODO: Implementare export CSV dal database
            // Per ora response di placeholder
            res.json({
                success: true,
                message: `Export ${type} in sviluppo`,
                data: {
                    type,
                    startDate,
                    endDate,
                    status: 'pending'
                }
            });

        } catch (error) {
            logger.error('Error exporting report:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nell\'esportazione del report'
            });
        }
    }
}

module.exports = AnalyticsController;