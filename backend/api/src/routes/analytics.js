// api/src/routes/analytics.js - VERSIONE MINIMALE CHE FUNZIONA
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Import del middleware AUTH
const { requireAuth } = require('../middleware/auth');

/**
 * @route   GET /api/analytics/health
 * @desc    Health check per il servizio analytics
 * @access  Private
 */
router.get('/health', requireAuth, (req, res) => {
    res.json({
        success: true,
        message: 'Analytics service is running',
        timestamp: new Date().toISOString(),
        user: {
            id: req.user.id,
            role: req.user.role
        }
    });
});

/**
 * @route   GET /api/analytics/dashboard/admin
 * @desc    Dashboard completa per amministratori
 * @access  Private (Admin)
 */
router.get('/dashboard/admin', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accesso riservato agli amministratori'
            });
        }

        const { timeRange = '30d' } = req.query;

        // Dati mock per demo
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
                ].slice(-7),
                totals: { current: 2450.00, previous: 2100.00, growthRate: 16.67 }
            },
            topSpaces: [
                { id: '1', name: 'Creative Hub Milano', location: 'Milano Centro', revenue: 850.00, bookings: { total: 25, confirmed: 23 } },
                { id: '2', name: 'Tech Space Roma', location: 'Roma EUR', revenue: 720.00, bookings: { total: 18, confirmed: 17 } }
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
router.get('/dashboard/manager', requireAuth, async (req, res) => {
    try {
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Accesso riservato a manager e amministratori'
            });
        }

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
 * @route   GET /api/analytics/dashboard/user
 * @desc    Dashboard utente
 * @access  Private
 */
router.get('/dashboard/user', requireAuth, async (req, res) => {
    try {
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
router.get('/export', requireAuth, async (req, res) => {
    try {
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Accesso negato'
            });
        }

        const { type = 'bookings' } = req.query;

        // CSV mock
        const csvData = `Date,Type,Amount,Status
2025-01-15,${type},150.00,completed
2025-01-16,${type},200.00,completed
2025-01-17,${type},180.00,pending`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${new Date().toISOString().split('T')[0]}.csv"`);

        res.send(csvData);

    } catch (error) {
        logger.error('Error exporting report:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'esportazione del report'
        });
    }
});

// CRITICO: Assicurati che il module.exports sia presente
module.exports = router;