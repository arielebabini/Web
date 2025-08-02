// src/routes/users.js - Rotte Users Complete
const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const {
    requireAuth,
    requireRole,
    requireEmailVerified
} = require('../middleware/auth');

const router = express.Router();

// Validazioni riutilizzabili
const nameValidation = (field, required = false) => {
    const validation = body(field);
    if (!required) validation.optional();

    return validation
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage(`${field} deve essere tra 2 e 50 caratteri`)
        .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
        .withMessage(`${field} può contenere solo lettere, spazi, apostrofi e trattini`);
};

const phoneValidation = body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Numero di telefono non valido');

const companyValidation = body('company')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Nome azienda troppo lungo (max 255 caratteri)');

const passwordValidation = body('newPassword')
    .isLength({ min: 8 })
    .withMessage('La password deve essere di almeno 8 caratteri')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La password deve contenere almeno una lettera minuscola, una maiuscola e un numero');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         company:
 *           type: string
 *         role:
 *           type: string
 *           enum: [client, manager, admin]
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         emailVerified:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         lastLogin:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Ottieni profilo utente corrente
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profilo utente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Non autorizzato
 */
router.get('/profile', requireAuth, userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Aggiorna profilo utente corrente
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               company:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profilo aggiornato con successo
 *       400:
 *         description: Dati non validi
 */
router.put('/profile',
    requireAuth,
    [
        nameValidation('firstName'),
        nameValidation('lastName'),
        phoneValidation,
        companyValidation
    ],
    userController.updateProfile
);

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Cambia password utente corrente
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password cambiata con successo
 *       400:
 *         description: Password corrente non valida
 */
router.put('/change-password',
    requireAuth,
    [
        body('currentPassword')
            .notEmpty()
            .withMessage('Password corrente richiesta'),
        passwordValidation
    ],
    userController.changePassword
);

// ===== ROTTE ADMIN/MANAGER =====

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista utenti con filtri (Admin/Manager)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [client, manager, admin]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, lastLogin, email, firstName, lastName]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *     responses:
 *       200:
 *         description: Lista utenti
 *       403:
 *         description: Accesso negato
 */
router.get('/',
    requireAuth,
    requireRole(['admin', 'manager']),
    userController.getUsers
);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Statistiche utenti (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche utenti
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         activeUsers:
 *                           type: integer
 *                         verifiedUsers:
 *                           type: integer
 *                         roleCount:
 *                           type: object
 *                           properties:
 *                             client:
 *                               type: integer
 *                             manager:
 *                               type: integer
 *                             admin:
 *                               type: integer
 *       403:
 *         description: Accesso negato
 */
router.get('/stats',
    requireAuth,
    requireRole(['admin']),
    userController.getUserStats
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Ottieni dettagli utente specifico (Admin/Manager)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dettagli utente
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Utente non trovato
 */
router.get('/:id',
    requireAuth,
    requireRole(['admin', 'manager']),
    userController.getUserById
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Aggiorna utente (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               company:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [client, manager, admin]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: Utente aggiornato con successo
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Utente non trovato
 */
router.put('/:id',
    requireAuth,
    requireRole(['admin']),
    [
        nameValidation('firstName'),
        nameValidation('lastName'),
        phoneValidation,
        companyValidation,
        body('role')
            .optional()
            .isIn(['client', 'manager', 'admin'])
            .withMessage('Ruolo non valido'),
        body('status')
            .optional()
            .isIn(['active', 'inactive', 'suspended'])
            .withMessage('Stato non valido')
    ],
    userController.updateUser
);

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Aggiorna stato utente (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: Stato aggiornato con successo
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Utente non trovato
 */
router.patch('/:id/status',
    requireAuth,
    requireRole(['admin']),
    [
        body('status')
            .isIn(['active', 'inactive', 'suspended'])
            .withMessage('Stato non valido')
    ],
    userController.updateUserStatus
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Elimina utente (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Utente eliminato con successo
 *       403:
 *         description: Accesso negato
 *       404:
 *         description: Utente non trovato
 */
router.delete('/:id',
    requireAuth,
    requireRole(['admin']),
    userController.deleteUser
);

module.exports = router;