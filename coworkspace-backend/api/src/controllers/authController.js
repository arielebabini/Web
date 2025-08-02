// src/controllers/authController.js - Controller autenticazione funzionante
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: utente@esempio.com
 *         password:
 *           type: string
 *           minLength: 8
 *           example: Password123!
 *         firstName:
 *           type: string
 *           example: Mario
 *         lastName:
 *           type: string
 *           example: Rossi
 *         phone:
 *           type: string
 *           example: +39 123 456 7890
 *         company:
 *           type: string
 *           example: Azienda SRL
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: utente@esempio.com
 *         password:
 *           type: string
 *           example: Password123!
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             tokens:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: string
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
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
 *         role:
 *           type: string
 *           enum: [client, manager, admin]
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         emailVerified:
 *           type: boolean
 */

// Genera JWT tokens
const generateTokens = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });

    return {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    };
};

// Formatta user response (rimuove password hash)
const formatUserResponse = (user) => {
    const { passwordHash, emailVerificationToken, passwordResetToken, ...userResponse } = user;
    return userResponse;
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrazione nuovo utente
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               company:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utente registrato con successo
 *       400:
 *         description: Dati non validi
 *       409:
 *         description: Email già esistente
 */
const register = async (req, res) => {
    try {
        // Validazione input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dati di registrazione non validi',
                errors: errors.array()
            });
        }

        const { email, password, firstName, lastName, phone, company } = req.body;

        // Controlla se l'utente esiste già
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Un utente con questa email è già registrato'
            });
        }

        // Crea nuovo utente
        const userData = {
            email: email.toLowerCase(),
            password,
            firstName,
            lastName,
            phone: phone || null,
            company: company || null,
            role: 'client' // Default role
        };

        const user = await User.create(userData);

        // Genera tokens
        const tokens = generateTokens(user);

        // Invia email di benvenuto (in modalità mock non darà errore)
        try {
            await emailService.sendWelcomeEmail(user);

            // Se l'utente ha un token di verifica, invia anche email di verifica
            if (user.emailVerificationToken) {
                await emailService.sendVerificationEmail(user, user.emailVerificationToken);
            }
        } catch (emailError) {
            logger.warn('Errore invio email benvenuto:', emailError.message);
            // Non fermiamo la registrazione per un errore email
        }

        logger.info(`User registered successfully: ${user.email} (${user.id})`);

        res.status(201).json({
            success: true,
            message: 'Registrazione completata con successo! Controlla la tua email per verificare l\'account.',
            data: {
                user: formatUserResponse(user),
                tokens
            }
        });

    } catch (error) {
        logger.error('Errore registrazione:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login utente
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login effettuato con successo
 *       401:
 *         description: Credenziali non valide
 *       403:
 *         description: Account non attivo
 */
const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dati di login non validi',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Trova utente
        const user = await User.findByEmail(email.toLowerCase());
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email o password non corretti'
            });
        }

        // Verifica password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email o password non corretti'
            });
        }

        // Verifica stato account
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account non attivo. Contatta il supporto.'
            });
        }

        // Aggiorna ultimo login
        await User.updateLastLogin(user.id);

        // Genera tokens
        const tokens = generateTokens(user);

        logger.info(`User logged in: ${user.email} (${user.id})`);

        res.json({
            success: true,
            message: 'Login effettuato con successo',
            data: {
                user: formatUserResponse(user),
                tokens
            }
        });

    } catch (error) {
        logger.error('Errore login:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
};

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rinnova access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token rinnovato con successo
 *       401:
 *         description: Refresh token non valido
 */
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token richiesto'
            });
        }

        // Verifica refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        // Trova utente
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        // Verifica stato account
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account non attivo'
            });
        }

        // Genera nuovi tokens
        const tokens = generateTokens(user);

        res.json({
            success: true,
            message: 'Token rinnovato con successo',
            data: {
                user: formatUserResponse(user),
                tokens
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Refresh token non valido'
            });
        }

        logger.error('Errore refresh token:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
};

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout utente
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout effettuato con successo
 */
const logout = async (req, res) => {
    try {
        // In questa implementazione semplice, il logout è gestito lato client
        // rimuovendo il token. In un'implementazione più avanzata, si potrebbe
        // mantenere una blacklist dei token invalidati.

        res.json({
            success: true,
            message: 'Logout effettuato con successo'
        });

    } catch (error) {
        logger.error('Errore logout:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
};

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verifica email utente
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verificata con successo
 *       400:
 *         description: Token non valido
 */
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token di verifica richiesto'
            });
        }

        // Verifica email con token
        const user = await User.verifyEmail(token);

        res.json({
            success: true,
            message: 'Email verificata con successo!',
            data: {
                user: formatUserResponse(user)
            }
        });

    } catch (error) {
        logger.error('Errore verifica email:', error);

        if (error.message === 'Token di verifica non valido') {
            return res.status(400).json({
                success: false,
                message: 'Token di verifica non valido o scaduto'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
};

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Richiesta reset password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email di reset inviata
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email richiesta'
            });
        }

        // Trova utente (non restituire errore se non esiste per sicurezza)
        const user = await User.findByEmail(email.toLowerCase());

        if (user) {
            // Genera token di reset
            const { token } = await User.setPasswordResetToken(email);

            // Invia email di reset
            try {
                await emailService.sendPasswordResetEmail(user, token);
            } catch (emailError) {
                logger.warn('Errore invio email reset:', emailError.message);
            }
        }

        // Sempre restituire successo per sicurezza
        res.json({
            success: true,
            message: 'Se l\'email esiste, riceverai le istruzioni per il reset della password'
        });

    } catch (error) {
        logger.error('Errore forgot password:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
};

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reimpostata con successo
 *       400:
 *         description: Token non valido o scaduto
 */
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token e nuova password richiesti'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La password deve essere di almeno 8 caratteri'
            });
        }

        // Reset password con token
        const user = await User.resetPassword(token, newPassword);

        res.json({
            success: true,
            message: 'Password reimpostata con successo! Puoi ora effettuare il login.',
            data: {
                user: formatUserResponse(user)
            }
        });

    } catch (error) {
        logger.error('Errore reset password:', error);

        if (error.message.includes('Token') || error.message.includes('scaduto')) {
            return res.status(400).json({
                success: false,
                message: 'Token non valido o scaduto'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
};

module.exports = {
    register,
    login,
    refresh,
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword
};