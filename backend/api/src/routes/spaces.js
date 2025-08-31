const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const SpaceController = require('../controllers/spaceController');
const { requireAuth } = require('../middleware/auth');
const {
    requireAdmin,
    requireManager,
    requireManagerOwnership,
    roleBasedRateLimit
} = require('../middleware/roleAuth');

// Validatori comuni
const spaceCreationValidation = [
    body('name')
        .isLength({ min: 3, max: 255 })
        .withMessage('Il nome deve essere tra 3 e 255 caratteri'),
    body('description')
        .isLength({ min: 10, max: 2000 })
        .withMessage('La descrizione deve essere tra 10 e 2000 caratteri'),
    body('type')
        .isIn(['hot-desk', 'private-office', 'meeting-room', 'event-space'])
        .withMessage('Tipo di spazio non valido'),
    body('city')
        .isLength({ min: 2, max: 100 })
        .withMessage('La città deve essere tra 2 e 100 caratteri'),
    body('address')
        .isLength({ min: 5, max: 500 })
        .withMessage('L\'indirizzo deve essere tra 5 e 500 caratteri'),
    body('capacity')
        .isInt({ min: 1 })
        .withMessage('La capacità deve essere un numero positivo'),
    body('price_per_day')
        .isFloat({ min: 0 })
        .withMessage('Il prezzo deve essere un numero positivo'),
    body('amenities')
        .optional()
        .isArray()
        .withMessage('I servizi devono essere un array'),
    body('images')
        .optional()
        .isArray()
        .withMessage('Le immagini devono essere un array'),
    body('coordinates')
        .optional()
        .custom((value) => {
            if (value && (!value.lat || !value.lng)) {
                throw new Error('Le coordinate devono contenere lat e lng');
            }
            return true;
        }),
    body('is_featured')
        .optional()
        .isBoolean()
        .withMessage('is_featured deve essere un booleano'),
    body('manager_id')
        .optional()
        .isUUID()
        .withMessage('ID manager non valido')
];

const spaceUpdateValidation = [
    body('name')
        .optional()
        .isLength({ min: 3, max: 255 })
        .withMessage('Il nome deve essere tra 3 e 255 caratteri'),
    body('description')
        .optional()
        .isLength({ min: 10, max: 2000 })
        .withMessage('La descrizione deve essere tra 10 e 2000 caratteri'),
    body('type')
        .optional()
        .isIn(['hot-desk', 'private-office', 'meeting-room', 'event-space'])
        .withMessage('Tipo di spazio non valido'),
    body('city')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('La città deve essere tra 2 e 100 caratteri'),
    body('address')
        .optional()
        .isLength({ min: 5, max: 500 })
        .withMessage('L\'indirizzo deve essere tra 5 e 500 caratteri'),
    body('capacity')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La capacità deve essere un numero positivo'),
    body('price_per_day')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Il prezzo deve essere un numero positivo'),
    body('amenities')
        .optional()
        .isArray()
        .withMessage('I servizi devono essere un array'),
    body('images')
        .optional()
        .isArray()
        .withMessage('Le immagini devono essere un array'),
    body('coordinates')
        .optional()
        .custom((value) => {
            if (value && (!value.lat || !value.lng)) {
                throw new Error('Le coordinate devono contenere lat e lng');
            }
            return true;
        }),
    body('is_featured')
        .optional()
        .isBoolean()
        .withMessage('is_featured deve essere un booleano')
];

const spaceIdValidation = [
    param('spaceId')
        .isUUID()
        .withMessage('ID spazio non valido')
];

const availabilityValidation = [
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

const nearbyValidation = [
    query('lat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitudine non valida'),
    query('lng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitudine non valida'),
    query('radius')
        .optional()
        .isFloat({ min: 0.1, max: 100 })
        .withMessage('Raggio deve essere tra 0.1 e 100 km'),
    query('type')
        .optional()
        .isIn(['hot-desk', 'private-office', 'meeting-room', 'event-space'])
        .withMessage('Tipo di spazio non valido'),
    query('max_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Prezzo massimo non valido'),
    query('min_capacity')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Capacità minima non valida'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limite deve essere tra 1 e 100')
];

const priceCalculationValidation = [
    query('start_date')
        .isISO8601()
        .withMessage('Data inizio non valida'),
    query('end_date')
        .isISO8601()
        .withMessage('Data fine non valida'),
    query('people_count')
        .isInt({ min: 1 })
        .withMessage('Numero di persone deve essere positivo')
];

// Rate limiting per ruolo
const spaceRateLimit = roleBasedRateLimit({
    client: 200,   // 200 richieste/ora per i client
    manager: 1000, // 1000 richieste/ora per i manager
    admin: -1      // Nessun limite per admin
});

// Middleware per gestire utenti non autenticati
const optionalAuth = (req, res, next) => {
    if (req.headers.authorization) {
        requireAuth(req, res, next);
    } else {
        next();
    }
};

// ===============================================
// ROUTE PUBBLICHE (RICERCA E VISUALIZZAZIONE)
// ===============================================

/**
 * @route   GET /api/spaces
 * @desc    Lista tutti gli spazi con filtri e paginazione
 * @access  Public/Private (diversi livelli di accesso)
 */
router.get('/',
    spaceRateLimit,
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Pagina deve essere un numero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve essere tra 1 e 100'),
        query('city').optional().isLength({ max: 100 }).withMessage('Città troppo lunga'),
        query('type').optional().isIn(['hot-desk', 'private-office', 'meeting-room', 'event-space']).withMessage('Tipo non valido'),
        query('manager_id').optional().isUUID().withMessage('ID manager non valido'),
        query('is_featured').optional().isBoolean().withMessage('is_featured deve essere booleano'),
        query('min_price').optional().isFloat({ min: 0 }).withMessage('Prezzo minimo non valido'),
        query('max_price').optional().isFloat({ min: 0 }).withMessage('Prezzo massimo non valido'),
        query('min_capacity').optional().isInt({ min: 1 }).withMessage('Capacità minima non valida'),
        query('max_capacity').optional().isInt({ min: 1 }).withMessage('Capacità massima non valida'),
        query('search').optional().isLength({ max: 255 }).withMessage('Ricerca troppo lunga'),
        query('sortBy').optional().isIn(['created_at', 'updated_at', 'name', 'city', 'type', 'price_per_day', 'capacity', 'rating']).withMessage('Campo ordinamento non valido'),
        query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Ordine non valido')
    ],
    optionalAuth,
    SpaceController.getAllSpaces
);

/**
 * @route   GET /api/spaces/nearby
 * @desc    Cerca spazi nelle vicinanze
 * @access  Public
 */
router.get('/nearby',
    spaceRateLimit,
    nearbyValidation,
    SpaceController.findNearbySpaces
);

/**
 * @route   GET /api/spaces/popular
 * @desc    Ottiene gli spazi più popolari
 * @access  Public/Private
 */
router.get('/popular',
    spaceRateLimit,
    [
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite deve essere tra 1 e 50')
    ],
    optionalAuth,
    SpaceController.getPopularSpaces
);

/**
 * @route   GET /api/spaces/stats
 * @desc    Ottiene statistiche degli spazi
 * @access  Private (manager/admin)
 */
router.get('/stats',
    requireAuth,
    requireManager,
    spaceRateLimit,
    SpaceController.getSpaceStats
);

/**
 * @route   GET /api/spaces/:spaceId
 * @desc    Ottiene un spazio specifico
 * @access  Public/Private
 */
router.get('/:spaceId',
    spaceRateLimit,
    spaceIdValidation,
    optionalAuth,
    SpaceController.getSpaceById
);

/**
 * @route   GET /api/spaces/:spaceId/availability
 * @desc    Verifica disponibilità di uno spazio
 * @access  Public
 */
router.get('/:spaceId/availability',
    spaceRateLimit,
    spaceIdValidation,
    availabilityValidation,
    SpaceController.checkAvailability
);

/**
 * @route   GET /api/spaces/:spaceId/calendar
 * @desc    Ottiene calendario disponibilità
 * @access  Public
 */
router.get('/:spaceId/calendar',
    spaceRateLimit,
    spaceIdValidation,
    [
        query('start_date').isISO8601().withMessage('Data inizio non valida'),
        query('end_date').isISO8601().withMessage('Data fine non valida')
    ],
    SpaceController.getAvailabilityCalendar
);

/**
 * @route   GET /api/spaces/:spaceId/pricing
 * @desc    Calcola prezzo per una prenotazione
 * @access  Public
 */
router.get('/:spaceId/pricing',
    spaceRateLimit,
    spaceIdValidation,
    priceCalculationValidation,
    SpaceController.calculatePrice
);

/**
 * @route   GET /api/spaces/:spaceId/occupied-slots
 * @desc    Ottiene slot occupati per uno spazio
 * @access  Public
 */
router.get('/:spaceId/occupied-slots',
    spaceRateLimit,
    spaceIdValidation,
    [
        query('from_date').isISO8601().withMessage('Data inizio non valida'),
        query('to_date').isISO8601().withMessage('Data fine non valida')
    ],
    SpaceController.getOccupiedSlots
);

// ===============================================
// ROUTE PROTETTE (GESTIONE SPAZI)
// ===============================================

/**
 * @route   POST /api/spaces
 * @desc    Crea un nuovo spazio
 * @access  Private (manager/admin)
 */
router.post('/',
    requireAuth,
    requireManager,
    spaceRateLimit,
    spaceCreationValidation,
    SpaceController.createSpace
);

/**
 * @route   PUT /api/spaces/:spaceId
 * @desc    Aggiorna uno spazio
 * @access  Private (proprietario/admin)
 */
router.put('/:spaceId',
    requireAuth,
    requireManager,
    spaceRateLimit,
    spaceIdValidation,
    spaceUpdateValidation,
    requireManagerOwnership('space'),
    SpaceController.updateSpace
);

/**
 * @route   DELETE /api/spaces/:spaceId
 * @desc    Elimina uno spazio
 * @access  Private (proprietario/admin)
 */
router.delete('/:spaceId',
    requireAuth,
    requireManager,
    spaceRateLimit,
    spaceIdValidation,
    requireManagerOwnership('space'),
    SpaceController.deleteSpace
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

    next(error);
});

module.exports = router;