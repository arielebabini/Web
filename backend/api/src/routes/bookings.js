const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const BookingController = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/auth');
const {
    requireAdmin,
    requireManager,
    requireManagerOwnership,
    roleBasedRateLimit
} = require('../middleware/roleAuth');

// Validatori comuni
const bookingCreationValidation = [
    body('space_id')
        .isUUID()
        .withMessage('ID spazio non valido'),
    body('start_date')
        .isISO8601()
        .withMessage('Data inizio non valida'),
    body('end_date')
        .isISO8601()
        .withMessage('Data fine non valida'),
    body('start_time')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato ora inizio non valido (HH:MM)'),
    body('end_time')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato ora fine non valido (HH:MM)'),
    body('people_count')
        .isInt({ min: 1, max: 100 })
        .withMessage('Numero di persone deve essere tra 1 e 100'),
    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Le note non possono superare i 1000 caratteri'),
    // Validazione personalizzata per verificare che le ore siano coerenti
    body('end_time').custom((endTime, { req }) => {
        const startTime = req.body.start_time;
        if (startTime && endTime) {
            const start = new Date(`1970-01-01T${startTime}:00`);
            const end = new Date(`1970-01-01T${endTime}:00`);
            if (end <= start) {
                throw new Error('L\'ora fine deve essere successiva all\'ora inizio');
            }
        }
        return true;
    })
];

const bookingUpdateValidation = [
    body('start_date')
        .optional()
        .isISO8601()
        .withMessage('Data inizio non valida'),
    body('end_date')
        .optional()
        .isISO8601()
        .withMessage('Data fine non valida'),
    body('start_time')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato ora inizio non valido (HH:MM)'),
    body('end_time')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato ora fine non valido (HH:MM)'),
    body('people_count')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Numero di persone deve essere tra 1 e 100'),
    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Le note non possono superare i 1000 caratteri'),
    body('status')
        .optional()
        .isIn(['pending', 'confirmed', 'cancelled', 'completed'])
        .withMessage('Status non valido')
];

const bookingIdValidation = [
    param('bookingId')
        .isUUID()
        .withMessage('ID prenotazione non valido')
];

const conflictCheckValidation = [
    query('space_id')
        .isUUID()
        .withMessage('ID spazio non valido'),
    query('start_date')
        .isISO8601()
        .withMessage('Data inizio non valida'),
    query('end_date')
        .isISO8601()
        .withMessage('Data fine non valida'),
    query('start_time')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato ora inizio non valido (HH:MM)'),
    query('end_time')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato ora fine non valido (HH:MM)')
];

// Rate limiting per ruolo
const bookingRateLimit = roleBasedRateLimit({
    client: 50,    // 50 richieste/ora per i client
    manager: 200,  // 200 richieste/ora per i manager
    admin: -1      // Nessun limite per admin
});

// ===============================================
// ROUTE PRINCIPALI PRENOTAZIONI
// ===============================================

/**
 * @route   GET /api/bookings/all
 * @desc    Ottiene tutte le prenotazioni
 * @access  Private (admin)
 */
router.get('/all', requireAuth, requireAdmin, BookingController.getAllBookingsDashboard);

/**
 * @route   POST /api/bookings
 * @desc    Crea una nuova prenotazione
 * @access  Private (tutti gli utenti autenticati)
 */
router.post('/',
    requireAuth,
    bookingRateLimit,
    bookingCreationValidation,
    BookingController.createBooking
);

/**
 * @route   GET /api/bookings
 * @desc    Lista tutte le prenotazioni con filtri
 * @access  Private (filtrate per ruolo)
 */
router.get('/',
    requireAuth,
    bookingRateLimit,
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Pagina deve essere un numero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve essere tra 1 e 100'),
        query('space_id').optional().isUUID().withMessage('ID spazio non valido'),
        query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('Status non valido'),
        query('start_date_from').optional().isISO8601().withMessage('Data inizio filtro non valida'),
        query('start_date_to').optional().isISO8601().withMessage('Data fine filtro non valida'),
        query('sortBy').optional().isIn(['created_at', 'updated_at', 'start_date', 'end_date', 'total_price', 'status']).withMessage('Campo ordinamento non valido'),
        query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Ordine non valido')
    ],
    BookingController.getAllBookings
);

/**
 * @route   GET /api/bookings/stats
 * @desc    Ottiene statistiche delle prenotazioni
 * @access  Private (filtrate per ruolo)
 */
router.get('/stats',
    requireAuth,
    bookingRateLimit,
    [
        query('space_id').optional().isUUID().withMessage('ID spazio non valido'),
        query('date_from').optional().isISO8601().withMessage('Data inizio non valida'),
        query('date_to').optional().isISO8601().withMessage('Data fine non valida')
    ],
    BookingController.getBookingStats
);

/**
 * @route   GET /api/bookings/upcoming
 * @desc    Ottiene prenotazioni in arrivo
 * @access  Private (filtrate per ruolo)
 */
router.get('/upcoming',
    requireAuth,
    bookingRateLimit,
    [
        query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('Ore deve essere tra 1 e 168')
    ],
    BookingController.getUpcomingBookings
);

/**
 * @route   GET /api/bookings/check-conflicts
 * @desc    Verifica conflitti per una nuova prenotazione
 * @access  Private (manager/admin)
 */
router.get('/check-conflicts',
    requireAuth,
    requireManager,
    bookingRateLimit,
    conflictCheckValidation,
    BookingController.checkConflicts
);

/**
 * @route   GET /api/bookings/:bookingId
 * @desc    Ottiene una prenotazione specifica
 * @access  Private (proprietario/manager/admin)
 */
router.get('/:bookingId',
    requireAuth,
    bookingRateLimit,
    bookingIdValidation,
    BookingController.getBookingById
);

/**
 * @route   PUT /api/bookings/:bookingId
 * @desc    Aggiorna una prenotazione
 * @access  Private (proprietario/manager/admin con limitazioni)
 */
router.put('/:bookingId',
    requireAuth,
    bookingRateLimit,
    bookingIdValidation,
    bookingUpdateValidation,
    BookingController.updateBooking
);

/**
 * @route   POST /api/bookings/:bookingId/cancel
 * @desc    Cancella una prenotazione
 * @access  Private (proprietario/manager/admin)
 */
router.post('/:bookingId/cancel',
    requireAuth,
    bookingRateLimit,
    bookingIdValidation,
    [
        body('reason')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Il motivo della cancellazione non può superare i 500 caratteri')
    ],
    BookingController.cancelBooking
);

/**
 * @route   POST /api/bookings/:bookingId/confirm
 * @desc    Conferma una prenotazione
 * @access  Private (manager/admin)
 */
router.post('/:bookingId/confirm',
    requireAuth,
    requireManager,
    bookingRateLimit,
    bookingIdValidation,
    requireManagerOwnership('booking'),
    BookingController.confirmBooking
);

/**
 * @route   POST /api/bookings/:bookingId/complete
 * @desc    Completa una prenotazione
 * @access  Private (manager/admin)
 */
router.post('/:bookingId/complete',
    requireAuth,
    requireManager,
    bookingRateLimit,
    bookingIdValidation,
    requireManagerOwnership('booking'),
    BookingController.completeBooking
);

// ===============================================
// MIDDLEWARE DI GESTIONE ERRORI SPECIFICO
// ===============================================
router.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Dati JSON non validi'
        });
    }

    if (error.code === '22P02') { // Invalid UUID format
        return res.status(400).json({
            success: false,
            message: 'Formato ID non valido'
        });
    }

    if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({
            success: false,
            message: 'Riferimento non valido (spazio o utente inesistente)'
        });
    }

    if (error.code === '23505') { // Unique violation (overlap)
        return res.status(409).json({
            success: false,
            message: 'Conflitto con prenotazione esistente'
        });
    }

    next(error);
});

module.exports = router;