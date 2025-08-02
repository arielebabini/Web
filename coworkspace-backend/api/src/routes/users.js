const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const UserController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const {
    requireAdmin,
    requireManager,
    requireOwnershipOrRole,
    roleBasedRateLimit
} = require('../middleware/roleAuth');

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
        .isIn(['client', 'manager', 'admin'])
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
        .isUUID()
        .withMessage('ID utente non valido')
];

// Rate limiting per ruolo
const userRateLimit = roleBasedRateLimit({
    client: 100,   // 100 richieste/ora
    manager: 500,  // 500 richieste/ora
    admin: -1      // Nessun limite
});

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
    UserController.getProfile
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
    UserController.updateProfile
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
    UserController.changePassword
);

/**
 * @route   POST /api/users/verify-email/:token
 * @desc    Verifica email utente
 * @access  Public
 */
router.post('/verify-email/:token',
    param('token').notEmpty().withMessage('Token richiesto'),
    UserController.verifyEmail
);

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
        query('role').optional().isIn(['client', 'manager', 'admin']).withMessage('Ruolo non valido'),
        query('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Status non valido'),
        query('search').optional().isLength({ max: 255 }).withMessage('Ricerca troppo lunga'),
        query('sortBy').optional().isIn(['created_at', 'updated_at', 'first_name', 'last_name', 'email', 'role']).withMessage('Campo di ordinamento non valido'),
        query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Ordine non valido')
    ],
    UserController.getAllUsers
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
    UserController.getUserStats
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
    requireOwnershipOrRole('userId', ['manager', 'admin']),
    UserController.getUserById
);

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
    UserController.updateUserRole
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
    UserController.updateUserStatus
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
    UserController.deleteUser
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
    next(error);
});

module.exports = router;