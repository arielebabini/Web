const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { UserController } = require('../controllers/userController');

// Import del middleware AUTH corretto e adapter
const { requireAuth } = require('../middleware/auth');
const {
    requireAdmin,
    requireManager,
    requireOwnershipOrRole,
    roleBasedRateLimit
} = require('../middleware/roleAuth');

// Import degli adapter per compatibilità
const {
    adaptUserController,
    parameterMapper,
    responseAdapter,
    uuidValidator,
    adapterLogger
} = require('../middleware/routeAdapter');

// Validatori comuni
const userProfileValidation = [
    body('first_name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Il nome deve essere tra 2 e 100 caratteri'),
    body('last_name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Il cognome deve essere tra 2 e 100 caratteri'),
    body('firstName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Il nome deve essere tra 2 e 100 caratteri'),
    body('lastName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Il cognome deve essere tra 2 e 100 caratteri'),
    body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Numero di telefono non valido'),
    body('company')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Il nome dell\'azienda non può superare i 255 caratteri')
];

const roleValidation = [
    body('role')
        .isIn(['client', 'user', 'manager', 'admin'])
        .withMessage('Ruolo non valido')
];

const statusValidation = [
    body('status')
        .isIn(['active', 'inactive', 'suspended'])
        .withMessage('Status non valido')
];

const passwordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Password corrente richiesta'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('La nuova password deve essere di almeno 8 caratteri')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La nuova password deve contenere almeno una lettera minuscola, una maiuscola e un numero')
];

const userIdValidation = [
    param('userId')
        .custom((value) => {
            // Accetta sia UUID che ID numerici per compatibilità
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const isUuid = uuidRegex.test(value);
            const isNumeric = /^\d+$/.test(value);

            if (!isUuid && !isNumeric) {
                throw new Error('ID utente non valido');
            }
            return true;
        })
        .withMessage('ID utente non valido')
];

// Rate limiting per ruolo
const userRateLimit = roleBasedRateLimit({
    client: 100,   // 100 richieste/ora
    user: 100,     // Compatibilità per 'user'
    manager: 500,  // 500 richieste/ora
    admin: -1      // Nessun limite
});

// Middleware globale per response adapter
router.use(responseAdapter);

// ===============================================
// ROUTE PROFILO UTENTE
// ===============================================

/**
 * @route   GET /api/users/profile
 * @desc    Ottiene il profilo dell'utente corrente
 * @access  Private (tutti gli utenti autenticati)
 */
router.get('/profile',
    requireAuth,
    userRateLimit,
    adapterLogger('UserController.getProfile'),
    adaptUserController.getProfile
);

/**
 * @route   PUT /api/users/profile
 * @desc    Aggiorna il profilo dell'utente corrente
 * @access  Private (tutti gli utenti autenticati)
 */
router.put('/profile',
    requireAuth,
    userRateLimit,
    userProfileValidation,
    adapterLogger('UserController.updateProfile'),
    adaptUserController.updateProfile
);

/**
 * @route   PUT /api/users/change-password
 * @desc    Cambia la password dell'utente corrente
 * @access  Private (tutti gli utenti autenticati)
 */
router.put('/change-password',
    requireAuth,
    userRateLimit,
    passwordValidation,
    adapterLogger('UserController.changePassword'),
    adaptUserController.changePassword
);

/**
 * @route   POST /api/users/verify-email/:token
 * @desc    Verifica email utente
 * @access  Public
 */
router.post('/verify-email/:token',
    param('token').notEmpty().withMessage('Token richiesto'),
    adapterLogger('UserController.verifyEmail'),
    adaptUserController.verifyEmail
);

/**
 * @route   POST /api/users
 * @desc    Registra un nuovo utente (creazione account)
 * @access  Public
 */
router.post('/',
    body('email').isEmail().withMessage('Indirizzo email non valido'),
    body('password').isLength({ min: 8 }).withMessage('La password deve essere di almeno 8 caratteri'),
    body('firstName').notEmpty().withMessage('Il nome è richiesto'),
    body('lastName').notEmpty().withMessage('Il cognome è richiesto'),
    adapterLogger('UserController.createUser'),
    adaptUserController.createUser
);

router.post('/users/by-email', requireAuth, UserController.getUserByEmail);

// ===============================================
// ROUTE GESTIONE UTENTI (ADMIN/MANAGER)
// ===============================================

/**
 * @route   GET /api/users
 * @desc    Lista tutti gli utenti con filtri e paginazione
 * @access  Private (admin/manager)
 */
router.get('/',
    requireAuth,
    requireManager,
    userRateLimit,
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Pagina deve essere un numero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve essere tra 1 e 100'),
        query('role').optional().isIn(['client', 'user', 'manager', 'admin']).withMessage('Ruolo non valido'),
        query('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Status non valido'),
        query('search').optional().isLength({ max: 255 }).withMessage('Ricerca troppo lunga'),
        query('sortBy').optional().isIn(['created_at', 'updated_at', 'first_name', 'last_name', 'firstName', 'lastName', 'email', 'role']).withMessage('Campo di ordinamento non valido'),
        query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Ordine non valido')
    ],
    adapterLogger('UserController.getAllUsers'),
    adaptUserController.getAllUsers
);

/**
 * @route   GET /api/users/stats
 * @desc    Ottiene statistiche degli utenti
 * @access  Private (admin)
 */
router.get('/stats',
    requireAuth,
    requireAdmin,
    userRateLimit,
    adapterLogger('UserController.getUserStats'),
    adaptUserController.getUserStats
);

/**
 * @route   GET /api/users/:userId
 * @desc    Ottiene un utente specifico
 * @access  Private (admin/manager o proprietario)
 */
router.get('/:userId',
    requireAuth,
    userRateLimit,
    userIdValidation,
    parameterMapper.mapUserId,
    requireOwnershipOrRole('userId', ['manager', 'admin']),
    adapterLogger('UserController.getUserById'),
    adaptUserController.getUserById
);

router.get('/users', UserController.getAllUsers);

/**
 * @route   PUT /api/users/:userId/role
 * @desc    Aggiorna il ruolo di un utente
 * @access  Private (solo admin)
 */
router.put('/:userId/role',
    requireAuth,
    requireAdmin,
    userRateLimit,
    userIdValidation,
    roleValidation,
    parameterMapper.mapUserId,
    adapterLogger('UserController.updateUserRole'),
    adaptUserController.updateUserRole
);

/**
 * @route   PUT /api/users/:userId/status
 * @desc    Aggiorna lo status di un utente
 * @access  Private (admin/manager)
 */
router.put('/:userId/status',
    requireAuth,
    requireManager,
    userRateLimit,
    userIdValidation,
    statusValidation,
    parameterMapper.mapUserId,
    adapterLogger('UserController.updateUserStatus'),
    adaptUserController.updateUserStatus
);

/**
 * @route   DELETE /api/users/:userId
 * @desc    Elimina un utente (soft delete)
 * @access  Private (solo admin)
 */
router.delete('/:userId',
    requireAuth,
    requireAdmin,
    userRateLimit,
    userIdValidation,
    parameterMapper.mapUserId,
    adapterLogger('UserController.deleteUser'),
    adaptUserController.deleteUser
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

    // Gestione errori UUID/ID
    if (error.message && error.message.includes('ID utente non valido')) {
        return res.status(400).json({
            success: false,
            message: 'Formato ID utente non valido'
        });
    }

    next(error);
});

module.exports = router;