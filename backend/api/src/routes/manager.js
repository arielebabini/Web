const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireManager } = require('../middleware/roleAuth');
const SpaceController = require('../controllers/spaceController');
const BookingController = require('../controllers/bookingController');
const { body, param, query } = require('express-validator');

// Middleware per verificare che l'utente sia un manager
const ensureManager = (req, res, next) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({
            success: false,
            message: 'Accesso negato. Solo i manager possono accedere a questa sezione.'
        });
    }
    next();
};

// ===============================================
// DASHBOARD MANAGER
// ===============================================

/**
 * @route   GET /api/manager/dashboard/stats
 * @desc    Ottiene statistiche dashboard per il manager
 * @access  Private (solo manager)
 */
router.get('/dashboard/stats', requireAuth, ensureManager, async (req, res) => {
    try {
        const managerId = req.user.id;

        // Statistiche spazi del manager
        const spaceStats = await SpaceController.getManagerSpaceStats(managerId);

        // Statistiche prenotazioni degli spazi del manager
        const bookingStats = await BookingController.getManagerBookingStats(managerId);

        res.json({
            success: true,
            data: {
                spaces: spaceStats,
                bookings: bookingStats
            }
        });
    } catch (error) {
        console.error('Error getting manager dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

// ===============================================
// GESTIONE SPAZI MANAGER
// ===============================================

/**
 * @route   GET /api/manager/spaces
 * @desc    Lista spazi del manager con filtri
 * @access  Private (solo manager)
 */
router.get('/spaces',
    requireAuth,
    ensureManager,
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Pagina deve essere un numero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve essere tra 1 e 100'),
        query('type').optional().isIn(['hot-desk', 'private-office', 'meeting-room', 'event-space']).withMessage('Tipo non valido'),
        query('city').optional().isLength({ max: 100 }).withMessage('Città troppo lunga'),
        query('search').optional().isLength({ max: 255 }).withMessage('Ricerca troppo lunga'),
        query('sortBy').optional().isIn(['created_at', 'updated_at', 'name', 'city', 'type', 'price_per_day', 'capacity']).withMessage('Campo ordinamento non valido'),
        query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Ordine non valido')
    ],
    async (req, res) => {
        try {
            const managerId = req.user.id;
            const managerEmail = req.user.email;

            const filters = {
                ...req.query,
                manager_id: req.user.id
            };

            const spaces = await SpaceController.getManagerSpaces(filters);

            res.json({
                success: true,
                spaces: spaces.spaces,
                pagination: spaces.pagination
            });
        } catch (error) {
            console.error('Error getting manager spaces:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel caricamento degli spazi'
            });
        }
    }
);

/**
 * @route   GET /api/manager/spaces/stats
 * @desc    Statistiche spazi del manager
 * @access  Private (solo manager)
 */
router.get('/spaces/stats', requireAuth, ensureManager, async (req, res) => {
    try {
        const managerId = req.user.id;
        const stats = await SpaceController.getManagerSpaceStats(managerId);

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error getting manager space stats:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento delle statistiche'
        });
    }
});

/**
 * @route   GET /api/manager/spaces/:spaceId
 * @desc    Dettagli spazio del manager
 * @access  Private (solo manager proprietario)
 */
router.get('/spaces/:spaceId',
    requireAuth,
    ensureManager,
    [
        param('spaceId').isUUID().withMessage('ID spazio non valido')
    ],
    async (req, res) => {
        try {
            const { spaceId } = req.params;
            const managerId = req.user.id;

            const space = await SpaceController.getSpaceByIdForManager(spaceId, managerId);

            if (!space) {
                return res.status(404).json({
                    success: false,
                    message: 'Spazio non trovato'
                });
            }

            res.json({
                success: true,
                space
            });
        } catch (error) {
            console.error('Error getting manager space:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel caricamento dello spazio'
            });
        }
    }
);

/**
 * @route   PUT /api/manager/spaces/:spaceId
 * @desc    Aggiorna spazio del manager
 * @access  Private (solo manager proprietario)
 */
router.put('/spaces/:spaceId',
    requireAuth,
    ensureManager,
    [
        param('spaceId').isUUID().withMessage('ID spazio non valido'),
        body('name').optional().isLength({ min: 3, max: 255 }).withMessage('Nome deve essere tra 3 e 255 caratteri'),
        body('description').optional().isLength({ min: 10, max: 2000 }).withMessage('Descrizione deve essere tra 10 e 2000 caratteri'),
        body('type').optional().isIn(['hot-desk', 'private-office', 'meeting-room', 'event-space']).withMessage('Tipo non valido'),
        body('capacity').optional().isInt({ min: 1 }).withMessage('Capacità deve essere positiva'),
        body('price_per_day').optional().isFloat({ min: 0 }).withMessage('Prezzo deve essere positivo')
    ],
    async (req, res) => {
        try {
            const { spaceId } = req.params;
            const managerId = req.user.id;

            // Verifica che il manager sia proprietario dello spazio
            const space = await SpaceController.getSpaceByIdForManager(spaceId, managerId);
            if (!space) {
                return res.status(404).json({
                    success: false,
                    message: 'Spazio non trovato o non autorizzato'
                });
            }

            const updatedSpace = await SpaceController.updateManagerSpace(spaceId, req.body, managerId);

            res.json({
                success: true,
                space: updatedSpace,
                message: 'Spazio aggiornato con successo'
            });
        } catch (error) {
            console.error('Error updating manager space:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nell\'aggiornamento dello spazio'
            });
        }
    }
);

// ===============================================
// GESTIONE PRENOTAZIONI MANAGER
// ===============================================

/**
 * @route   GET /api/manager/bookings
 * @desc    Lista prenotazioni degli spazi del manager
 * @access  Private (solo manager)
 */
router.get('/bookings',
    requireAuth,
    ensureManager,
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Pagina deve essere un numero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve essere tra 1 e 100'),
        query('space_id').optional().isUUID().withMessage('ID spazio non valido'),
        query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('Status non valido'),
        query('start_date_from').optional().isISO8601().withMessage('Data inizio non valida'),
        query('start_date_to').optional().isISO8601().withMessage('Data fine non valida'),
        query('sortBy').optional().isIn(['created_at', 'updated_at', 'start_date', 'end_date', 'total_price', 'status']).withMessage('Campo ordinamento non valido'),
        query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Ordine non valido')
    ],
    async (req, res) => {
        try {
            const managerId = req.user.id;
            const managerEmail = req.user.email;

            const bookings = await BookingController.getManagerBookings(
                req.query,
                managerId,
                managerEmail
            );

            res.json({
                success: true,
                bookings: bookings.bookings,
                pagination: bookings.pagination
            });
        } catch (error) {
            console.error('Error getting manager bookings:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel caricamento delle prenotazioni'
            });
        }
    }
);

/**
 * @route   GET /api/manager/bookings/stats
 * @desc    Statistiche prenotazioni del manager
 * @access  Private (solo manager)
 */
router.get('/bookings/stats',
    requireAuth,
    ensureManager,
    async (req, res) => {
        try {
            const managerId = req.user.id;
            const managerEmail = req.user.email;
            const { date_from, date_to } = req.query;

            // ✅ Chiamata corretta con tutti i parametri
            const stats = await BookingController.getManagerBookingStats(
                managerId,
                managerEmail,
                { date_from, date_to }
            );

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            console.error('Error getting manager booking stats:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel caricamento delle statistiche'
            });
        }
    }
);

/**
 * @route   GET /api/manager/bookings/:bookingId
 * @desc    Dettagli prenotazione (solo se relativa agli spazi del manager)
 * @access  Private (solo manager proprietario spazio)
 */
router.get('/bookings/:bookingId',
    requireAuth,
    ensureManager,
    [
        param('bookingId').isUUID().withMessage('ID prenotazione non valido')
    ],
    async (req, res) => {
        try {
            const { bookingId } = req.params;
            const managerId = req.user.id;
            const managerEmail = req.user.email;

            const booking = await BookingController.getBookingForManager(
                bookingId,
                managerId,
                managerEmail
            );

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Prenotazione non trovata o non autorizzata'
                });
            }

            res.json({
                success: true,
                booking
            });
        } catch (error) {
            console.error('Error getting manager booking:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel caricamento della prenotazione'
            });
        }
    }
);

/**
 * @route   POST /api/manager/bookings/:bookingId/confirm
 * @desc    Conferma prenotazione
 * @access  Private (solo manager proprietario spazio)
 */
router.post('/bookings/:bookingId/confirm',
    requireAuth,
    ensureManager,
    [
        param('bookingId').isUUID().withMessage('ID prenotazione non valido')
    ],
    async (req, res) => {
        try {
            const { bookingId } = req.params;
            const managerId = req.user.id;

            const booking = await BookingController.confirmBookingAsManager(bookingId, managerId);

            res.json({
                success: true,
                booking,
                message: 'Prenotazione confermata con successo'
            });
        } catch (error) {
            console.error('Error confirming booking as manager:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Errore nella conferma della prenotazione'
            });
        }
    }
);

/**
 * @route   POST /api/manager/bookings/:bookingId/cancel
 * @desc    Cancella prenotazione
 * @access  Private (solo manager proprietario spazio)
 */
router.post('/bookings/:bookingId/cancel',
    requireAuth,
    ensureManager,
    [
        param('bookingId').isUUID().withMessage('ID prenotazione non valido'),
        body('reason').optional().isLength({ max: 500 }).withMessage('Motivo troppo lungo')
    ],
    async (req, res) => {
        try {
            const { bookingId } = req.params;
            const { reason } = req.body;
            const managerId = req.user.id;

            const booking = await BookingController.cancelBookingAsManager(bookingId, managerId, reason);

            res.json({
                success: true,
                booking,
                message: 'Prenotazione cancellata con successo'
            });
        } catch (error) {
            console.error('Error cancelling booking as manager:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Errore nella cancellazione della prenotazione'
            });
        }
    }
);

// ===============================================
// CALENDARIO E DISPONIBILITA'
// ===============================================

/**
 * @route   GET /api/manager/calendar
 * @desc    Calendario prenotazioni per tutti gli spazi del manager
 * @access  Private (solo manager)
 */
router.get('/calendar',
    requireAuth,
    ensureManager,
    [
        query('start_date').isISO8601().withMessage('Data inizio non valida'),
        query('end_date').isISO8601().withMessage('Data fine non valida'),
        query('space_id').optional().isUUID().withMessage('ID spazio non valido')
    ],
    async (req, res) => {
        try {
            const managerId = req.user.id;
            const { start_date, end_date, space_id } = req.query;

            const calendar = await BookingController.getManagerCalendar(managerId, {
                start_date,
                end_date,
                space_id
            });

            res.json({
                success: true,
                calendar
            });
        } catch (error) {
            console.error('Error getting manager calendar:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel caricamento del calendario'
            });
        }
    }
);

module.exports = router;