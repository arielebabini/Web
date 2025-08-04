// api/src/routes/analytics.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { query } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @route   GET /api/analytics/health
 * @desc    Health check per il servizio analytics
 * @access  Private
 */
router.get('/health', authMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'Analytics service is running',
        timestamp: new Date().toISOString(),
        user: {
            id: req.user.id,
            role: req.user.role
        },
        features: {
            dashboard_admin: req.user.role === 'admin',
            dashboard_manager: ['admin', 'manager'].includes(req.user.role),
            dashboard_user: true,
            export_reports: ['admin', 'manager'].includes(req.user.role)
        }
    });
});

/**
 * @route   GET /api/analytics/dashboard/admin
 * @desc    Dashboard completa per amministratori
 * @access  Private (Admin)
 */
router.get('/dashboard/admin', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accesso riservato agli amministratori'
            });
        }

        const { timeRange = '30d' } = req.query;

        // Simulazione dati per progetto scolastico
        const mockDashboardData = {
            timeRange,
            period: {
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            },
            general: {
                users: { total: 125, new: 8 },
                spaces: { total: 15 },
                bookings: { total: 89, new: 12, confirmed: 10, conversionRate: 83.33 },
                revenue: { total: 2450.00, payments: 45, averageTransaction: 54.44 }
            },
            revenue: {
                dailyRevenue: [
                    { date: '2025-01-15', revenue: 150.00, payments: 3 },
                    { date: '2025-01-16', revenue: 200.00, payments: 4 },
                    { date: '2025-01-17', revenue: 180.00, payments: 2 }
                ].slice(-7), // Ultimi 7 giorni
                totals: { current: 2450.00, previous: 2100.00, growthRate: 16.67 }
            },
            topSpaces: [
                { id: '1', name: 'Creative Hub Milano', location: 'Milano Centro', revenue: 850.00, bookings: { total: 25, confirmed: 23 } },
                { id: '2', name: 'Tech Space Roma', location: 'Roma EUR', revenue: 720.00, bookings: { total: 18, confirmed: 17 } },
                { id: '3', name: 'Design Studio Torino', location: 'Torino', revenue: 650.00, bookings: { total: 15, confirmed: 14 } }
            ],
            userGrowth: [
                { date: '2025-01-15', newUsers: 2 },
                { date: '2025-01-16', newUsers: 3 },
                { date: '2025-01-17', newUsers: 1 }
            ].slice(-7),
            paymentMethods: [
                { method: 'card', count: 42, amount: 2280.00 },
                { method: 'bank_transfer', count: 3, amount: 170.00 }
            ]
        };

        logger.info(`Admin dashboard accessed by user ${req.user.id}`);

        res.json({
            success: true,
            message: 'Dashboard admin data retrieved successfully',
            data: mockDashboardData
        });

    } catch (error) {
        logger.error('Error getting admin dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche dashboard'
        });
    }
});

/**
 * @route   GET /api/analytics/dashboard/manager
 * @desc    Dashboard per gestori di spazi
 * @access  Private (Manager/Admin)
 */
router.get('/dashboard/manager', authMiddleware, async (req, res) => {
    try {
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Accesso riservato a manager e amministratori'
            });
        }

        const { timeRange = '30d', spaceIds } = req.query;

        // Simulazione dati manager
        const mockManagerData = {
            timeRange,
            period: {
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            },
            spaceIds: spaceIds ? spaceIds.split(',') : ['1', '2'],
            general: {
                bookings: { total: 35, confirmed: 32, cancelled: 3 },
                revenue: 1250.00,
                customers: 28,
                rating: 4.3
            },
            occupancy: [
                { spaceId: '1', spaceName: 'Creative Hub Milano', totalBookings: 20, hoursBooked: 160, availableHours: 360, occupancyRate: 44.44 },
                { spaceId: '2', spaceName: 'Tech Space Roma', totalBookings: 15, hoursBooked: 120, availableHours: 360, occupancyRate: 33.33 }
            ],
            reviews: {
                total: 28,
                average: 4.3,
                distribution: { 5: 15, 4: 8, 3: 3, 2: 1, 1: 1 }
            }
        };

        logger.info(`Manager dashboard accessed by user ${req.user.id}`);

        res.json({
            success: true,
            message: 'Dashboard manager data retrieved successfully',
            data: mockManagerData
        });

    } catch (error) {
        logger.error('Error getting manager dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche manager'
        });
    }
});

/**
 * @route   GET /api/analytics/dashboard/user/:userId?
 * @desc    Dashboard utente
 * @access  Private (User can see own, Admin can see all)
 */
router.get('/dashboard/user/:userId?', authMiddleware, async (req, res) => {
    try {
        const { timeRange = '30d' } = req.query;
        const userId = req.params.userId || req.user.id;

        // Gli utenti normali possono vedere solo le proprie stats
        if (req.user.role === 'user' && userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Puoi visualizzare solo le tue statistiche'
            });
        }

        // Simulazione dati utente
        const mockUserData = {
            timeRange,
            period: {
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            },
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
            },
            favoriteSpaces: [
                { id: '1', name: 'Creative Hub Milano', location: 'Milano Centro', visitCount: 4, lastVisit: '2025-01-15T10:00:00Z' },
                { id: '2', name: 'Tech Space Roma', location: 'Roma EUR', visitCount: 3, lastVisit: '2025-01-10T14:00:00Z' }
            ],
            recentBookings: [
                { id: 'b1', startDate: '2025-01-15T09:00:00Z', endDate: '2025-01-15T17:00:00Z', status: 'confirmed', totalPrice: 80.00, space: { name: 'Creative Hub Milano', location: 'Milano Centro' } },
                { id: 'b2', startDate: '2025-01-10T10:00:00Z', endDate: '2025-01-10T18:00:00Z', status: 'confirmed', totalPrice: 90.00, space: { name: 'Tech Space Roma', location: 'Roma EUR' } }
            ]
        };

        logger.info(`User dashboard accessed by user ${req.user.id} for user ${userId}`);

        res.json({
            success: true,
            message: 'Dashboard user data retrieved successfully',
            data: mockUserData
        });

    } catch (error) {
        logger.error('Error getting user dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche utente'
        });
    }
});

/**
 * @route   GET /api/analytics/export
 * @desc    Esporta report in formato CSV
 * @access  Private (Manager/Admin)
 */
router.get('/export', authMiddleware, async (req, res) => {
    try {
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Accesso negato'
            });
        }

        const { type = 'bookings', startDate, endDate } = req.query;

        if (!['bookings', 'payments', 'users', 'spaces'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo di report non valido. Usa: bookings, payments, users, spaces'
            });
        }

        // Simulazione dati CSV
        const mockCSVData = {
            bookings: [
                ['ID', 'Data Creazione', 'Utente', 'Spazio', 'Status', 'Prezzo'],
                ['b1', '2025-01-15', 'mario.rossi@email.com', 'Creative Hub Milano', 'confirmed', '80.00'],
                ['b2', '2025-01-14', 'laura.bianchi@email.com', 'Tech Space Roma', 'confirmed', '90.00']
            ],
            payments: [
                ['ID', 'Data', 'Utente', 'Importo', 'Status', 'Stripe ID'],
                ['p1', '2025-01-15', 'mario.rossi@email.com', '80.00', 'completed', 'pi_test_123'],
                ['p2', '2025-01-14', 'laura.bianchi@email.com', '90.00', 'completed', 'pi_test_456']
            ]
        };

        const csvContent = mockCSVData[type]
            ? mockCSVData[type].map(row => row.join(',')).join('\n')
            : 'No data available';

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);

        logger.info(`CSV report exported by user ${req.user.id}`, { type, startDate, endDate });

    } catch (error) {
        logger.error('Error exporting report:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'esportazione del report'
        });
    }
});

module.exports = router;