// ==========================================
// ADMIN ROUTES - Backend (Versione Minimal)
// File: src/routes/admin.js
// ==========================================

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/roleAuth');

// Usa console.log invece del logger se non disponibile
const logger = console;

/**
 * @route   GET /api/admin/stats/dashboard
 * @desc    Ottiene statistiche generali per la dashboard admin
 * @access  Private (solo admin)
 */
router.get('/stats/dashboard', requireAuth, requireAdmin, async (req, res) => {
    try {
        logger.log('Admin dashboard stats requested', { userId: req.user.id });

        // Statistiche placeholder - sostituisci con query reali ai tuoi modelli
        const stats = {
            totalUsers: 150,
            activeUsers: 140,
            totalSpaces: 25,
            activeSpaces: 22,
            totalBookings: 450,
            todayBookings: 12,
            monthlyRevenue: 15800,
            usersByRole: {
                admin: 2,
                manager: 5,
                client: 143
            }
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('Error getting admin dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route   GET /api/admin/stats/users
 * @desc    Ottiene statistiche dettagliate degli utenti
 * @access  Private (solo admin)
 */
router.get('/stats/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = {
            totalUsers: 150,
            activeUsers: 140,
            usersByRole: {
                admin: 2,
                manager: 5,
                client: 143
            },
            usersByMonth: [
                { month: '2025-01', count: 15 },
                { month: '2025-02', count: 22 },
                { month: '2025-03', count: 18 },
                { month: '2025-04', count: 25 },
                { month: '2025-05', count: 30 },
                { month: '2025-06', count: 28 },
                { month: '2025-07', count: 35 },
                { month: '2025-08', count: 12 }
            ],
            recentRegistrations: []
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('Error getting user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route   GET /api/admin/stats/spaces
 * @desc    Ottiene statistiche degli spazi
 * @access  Private (solo admin)
 */
router.get('/stats/spaces', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = {
            totalSpaces: 25,
            activeSpaces: 22,
            spacesByCity: {
                Milano: 8,
                Roma: 6,
                Torino: 4,
                Bologna: 4,
                Napoli: 3
            },
            spacesByType: {
                desk: 10,
                meeting_room: 8,
                private_office: 5,
                coworking: 2
            },
            utilizationRate: 78.5
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('Error getting space stats:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route   GET /api/admin/stats/bookings
 * @desc    Ottiene statistiche delle prenotazioni
 * @access  Private (solo admin)
 */
router.get('/stats/bookings', requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = {
            totalBookings: 450,
            todayBookings: 12,
            monthlyTrend: [65, 59, 80, 81, 56, 55, 40, 65, 59, 80, 81, 56],
            bookingsByStatus: {
                confirmed: 380,
                pending: 25,
                cancelled: 45
            },
            topSpaces: [
                { name: 'Sala Meeting Milano Centro', bookings: 45 },
                { name: 'Open Space Roma EUR', bookings: 38 },
                { name: 'Ufficio Privato Torino', bookings: 32 }
            ]
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('Error getting booking stats:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route   GET /api/admin/users/:userId/details
 * @desc    Ottiene dettagli completi di un utente (admin view)
 * @access  Private (solo admin)
 */
router.get('/users/:userId/details', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // Placeholder - sostituisci con query al database
        const userDetails = {
            id: userId,
            first_name: 'Mario',
            last_name: 'Rossi',
            email: 'mario.rossi@example.com',
            phone: '+39 333 1234567',
            role: 'client',
            status: 'active',
            created_at: '2024-01-15T10:30:00Z',
            last_login: '2024-08-23T08:45:00Z',
            totalBookings: 15,
            totalSpent: 1250.00,
            bookingHistory: [
                {
                    id: 'book-001',
                    space_name: 'Sala Meeting Milano',
                    date: '2024-08-20',
                    status: 'completed',
                    amount: 85.00
                }
            ]
        };

        res.json({
            success: true,
            user: userDetails
        });

    } catch (error) {
        logger.error('Error getting user details:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    Aggiorna lo status di un utente (sospendi/attiva)
 * @access  Private (solo admin)
 */
router.put('/users/:userId/status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        // Validazione status
        const validStatuses = ['active', 'inactive', 'suspended'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status non valido'
            });
        }

        // TODO: Implementa l'update del database
        // await User.findByIdAndUpdate(userId, { status });

        logger.log('User status updated by admin', {
            adminId: req.user.id,
            targetUserId: userId,
            newStatus: status
        });

        res.json({
            success: true,
            message: `Status utente aggiornato a ${status}`,
            user: {
                id: userId,
                status: status
            }
        });

    } catch (error) {
        logger.error('Error updating user status:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route   GET /api/admin/system/health
 * @desc    Ottiene lo stato di salute del sistema
 * @access  Private (solo admin)
 */
router.get('/system/health', requireAuth, requireAdmin, async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date(),
            services: {
                database: 'healthy',
                redis: 'unknown',
                storage: 'healthy'
            },
            metrics: {
                uptime: Math.floor(process.uptime()),
                memory: process.memoryUsage(),
                nodeVersion: process.version
            }
        };

        res.json({
            success: true,
            health
        });

    } catch (error) {
        logger.error('Error checking system health:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel controllo dello stato del sistema'
        });
    }
});

/**
 * @route   POST /api/admin/broadcast
 * @desc    Invia notifica broadcast a tutti gli utenti
 * @access  Private (solo admin)
 */
router.post('/broadcast', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { title, message, type = 'info' } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Titolo e messaggio sono richiesti'
            });
        }

        // TODO: Implementa l'invio della notifica broadcast
        // await NotificationService.sendBroadcast({ title, message, type });

        logger.log('Broadcast notification sent', {
            adminId: req.user.id,
            title,
            type
        });

        res.json({
            success: true,
            message: 'Notifica broadcast inviata con successo'
        });

    } catch (error) {
        logger.error('Error sending broadcast:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'invio della notifica'
        });
    }
});

/**
 * @route   GET /api/admin/analytics/revenue
 * @desc    Ottiene analytics dei ricavi
 * @access  Private (solo admin)
 */
router.get('/analytics/revenue', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { period = '12m' } = req.query;

        const analytics = {
            period,
            monthlyRevenue: 15800,
            totalRevenue: 189600,
            revenueGrowth: 12.5,
            monthlyData: [
                { month: 'Gen', revenue: 12500 },
                { month: 'Feb', revenue: 13200 },
                { month: 'Mar', revenue: 14100 },
                { month: 'Apr', revenue: 15300 },
                { month: 'Mag', revenue: 16800 },
                { month: 'Giu', revenue: 15900 },
                { month: 'Lug', revenue: 17200 },
                { month: 'Ago', revenue: 15800 }
            ]
        };

        res.json({
            success: true,
            analytics
        });

    } catch (error) {
        logger.error('Error getting revenue analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento dei dati analytics'
        });
    }
});

module.exports = router;