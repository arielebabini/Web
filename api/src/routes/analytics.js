// api/src/routes/analytics.js - VERSIONE MINIMALE CHE FUNZIONA
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Import del middleware AUTH
const { requireAuth } = require('../middleware/auth');
const {query} = require("../config/database");

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
router.get('/dashboard/admin', async (req, res) => {
    try {
        console.log('Dashboard admin endpoint called');

        const { query } = require('../config/database');

        // Query database reali
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

        // Dopo le query esistenti, aggiungi:
        const dailyRevenueQuery = await query(`
            SELECT 
            DATE(created_at) as date,
            COALESCE(SUM(amount), 0) as revenue,
            COUNT(*) as payments
            FROM payments
            WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        const dailyRevenue = dailyRevenueQuery.rows.map(row => ({
            date: row.date,
            revenue: parseFloat(row.revenue),
            payments: parseInt(row.payments)
        }));

        // Dopo le query esistenti, aggiungi:
        const currentPeriodQuery = await query(`
            SELECT COALESCE(SUM(amount), 0) as current_revenue
            FROM payments
            WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'
        `);

        const previousPeriodQuery = await query(`
            SELECT COALESCE(SUM(amount), 0) as previous_revenue
            FROM payments
            WHERE created_at >= CURRENT_DATE - INTERVAL '120 days'
              AND created_at < CURRENT_DATE - INTERVAL '365 days'
        `);

        const currentRevenue = parseFloat(currentPeriodQuery.rows[0].current_revenue);
        const previousRevenue = parseFloat(previousPeriodQuery.rows[0].previous_revenue);
        const growthRate = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        const topSpacesQuery = await query(`
            SELECT 
                s.id,
                s.name,
                COALESCE(s.address, s.city, 'Posizione non specificata') as location,
                COALESCE(SUM(CASE WHEN p.status IS NOT NULL THEN p.amount END), 0) as revenue,
                COUNT(DISTINCT b.id) as total_bookings,
                COUNT(DISTINCT CASE WHEN b.status IS NOT NULL THEN b.id END) as confirmed_bookings
            FROM spaces s
            LEFT JOIN bookings b ON s.id = b.space_id AND b.created_at IS NOT NULL
            LEFT JOIN payments p ON b.id = p.booking_id AND p.status IS NOT NULL AND p.created_at IS NOT NULL
            WHERE s.created_at IS NOT NULL
            GROUP BY s.id, s.name, s.address, s.city
            ORDER BY total_bookings DESC, confirmed_bookings DESC, revenue DESC
            LIMIT 5
        `);

        const topSpaces = topSpacesQuery.rows.map(row => {
            const space = {
                id: row.id.toString(),
                name: row.name || 'Spazio senza nome',
                location: [row.address, row.city].filter(Boolean).join(', ') || 'Posizione non specificata',
                revenue: parseFloat(row.revenue || 0),
                bookings: {
                    total: parseInt(row.total_bookings || 0),
                    confirmed: parseInt(row.total_bookings || 0)
                }
            };

            return space;
        });


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
                    confirmed: parseInt(confirmedBookingsQuery.rows[0].total),
                },
                revenue: {
                    total: parseFloat(revenueQuery.rows[0].total_revenue),
                    payments: parseInt(revenueQuery.rows[0].total_payments),
                    averageTransaction: parseFloat(revenueQuery.rows[0].avg_transaction).toFixed(2)
                }
            },

            revenue: {
                dailyRevenue: dailyRevenue,
                totals: {
                    current: currentRevenue,
                    previous: previousRevenue,
                    growthRate: Math.round(growthRate * 100) / 100
                }
            },

            topSpaces: topSpaces
        };

        console.log('Real data:', realData);

        res.json({
            success: true,
            message: 'Dashboard admin data retrieved successfully',
            data: realData
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche dashboard'
        });
    }
});

module.exports = router;

router.get('/db-test', async (req, res) => {
    try {
        const { query } = require('../config/database');
        const result = await query('SELECT NOW() as current_time');

        res.json({
            success: true,
            message: 'Database connected!',
            time: result.rows[0].current_time
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database error: ' + error.message
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

// Aggiungi questa rotta se non c'è già
router.get('/dashboard/admin', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accesso riservato agli amministratori'
            });
        }

        // Dati mock per test rapido
        const mockData = {
            general: {
                users: { total: 15, new: 3 },
                spaces: { total: 8 },
                bookings: { total: 42, confirmed: 38, conversionRate: 90.5 },
                revenue: { total: 2847.50, payments: 35, averageTransaction: 81.36 }
            },
            topSpaces: [
                { id: '1', name: 'Creative Hub Milano', location: 'Milano Centro', revenue: 850.00, bookings: { total: 25, confirmed: 23 } }
            ]
        };

        res.json({
            success: true,
            data: mockData
        });

    } catch (error) {
        console.error('Error in admin dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento dashboard'
        });
    }
});

// CRITICO: Assicurati che il module.exports sia presente
module.exports = router;