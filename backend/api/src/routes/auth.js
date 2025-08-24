// src/routes/auth.js - Authentication routes CORRETTO
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Import locali
const User = require('../models/User');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { requireAuth } = require('../middleware/auth');

// Rate limiting per autenticazione
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // massimo 5 tentativi per IP
    message: {
        success: false,
        message: 'Troppi tentativi di login. Riprova tra 15 minuti.',
        error: { type: 'RATE_LIMIT_EXCEEDED' }
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Validatori per input
const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email non valida'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('La password deve contenere almeno 8 caratteri')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La password deve contenere almeno una lettera minuscola, una maiuscola e un numero'),
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Il nome deve essere tra 2 e 50 caratteri'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Il cognome deve essere tra 2 e 50 caratteri')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email non valida'),
    body('password')
        .notEmpty()
        .withMessage('Password richiesta')
];

// Helper per generare JWT - ✅ CORRETTO: usa "id" nel payload
const generateTokens = (user) => {
    const payload = {
        id: user.id,      // ✅ MANTIENI "id" (non "userId")
        email: user.email,
        role: user.role,
        status: user.status
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key', {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' }, // ✅ MANTIENI "id" (non "userId")
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
};

/**
 * @route   GET /api/auth/setup-status
 * @desc    Verifica se esiste già un admin nel sistema
 * @access  Public
 */
router.get('/setup-status', async (req, res) => {
    try {
        const adminExists = await User.count({ where: { role: 'admin' } });

        res.json({
            success: true,
            needsSetup: adminExists === 0,
            hasAdmin: adminExists > 0
        });

    } catch (error) {
        logger.error('Error checking admin setup status:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route   POST /api/auth/setup-admin
 * @desc    Crea il primo admin del sistema
 * @access  Public (solo se non esistono admin)
 */
router.post('/create-default-admin', async (req, res) => {
    try {
        // Verifica che non esistano già admin
        const adminExists = await User.findOne({ where: { role: 'admin' } });
        if (adminExists) {
            return res.status(403).json({
                success: false,
                message: 'Admin già esistente nel sistema'
            });
        }

        // CREDENZIALI ADMIN FISSE - MODIFICA QUESTE
        const ADMIN_CREDENTIALS = {
            email: 'admin@coworkspace.local',
            password: 'Admin123456',
            first_name: 'Administrator',
            last_name: 'System'
        };

        // Hash della password fissa
        const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, 12);

        // Crea l'admin predefinito
        const adminUser = await User.create({
            email: ADMIN_CREDENTIALS.email,
            password_hash: hashedPassword,
            first_name: ADMIN_CREDENTIALS.first_name,
            last_name: ADMIN_CREDENTIALS.last_name,
            role: 'admin',
            status: 'active',
            email_verified: true,
            phone: null,
            company: 'CoWorkSpace System',
            created_at: new Date(),
            updated_at: new Date()
        });

        logger.info('Default admin created', {
            adminId: adminUser.id,
            email: ADMIN_CREDENTIALS.email,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            success: true,
            message: 'Admin predefinito creato con successo',
            credentials: {
                email: ADMIN_CREDENTIALS.email,
                // Non restituire mai la password in risposta
                note: 'Usa le credenziali predefinite per il login'
            }
        });

    } catch (error) {
        logger.error('Error creating default admin:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante la creazione dell\'admin'
        });
    }
});

/**
 * @route   POST /api/auth/register
 * @desc    Registra un nuovo utente
 * @access  Public
 */
router.post('/register', registerValidation, async (req, res) => {
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

        // Verifica se l'utente esiste già
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email già registrata'
            });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Crea utente
        const userData = {
            email,
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            company: company || null,
            role: 'client', // Default role
            status: 'active',
            email_verified: false
        };

        const user = await User.create(userData);

        // Genera tokens
        const tokens = generateTokens(user);

        // Invia email di benvenuto (modalità mock) - ✅ CORRETTO
        try {
            await emailService.sendWelcomeEmail(user);
        } catch (emailError) {
            logger.error('Failed to send welcome email:', emailError);
        }

        logger.info('New user registered:', {
            userId: user.id,
            email: user.email,
            ip: req.ip
        });

        // Rimuovi password_hash dalla risposta
        const { password_hash: _, ...userResponse } = user;

        res.status(201).json({
            success: true,
            message: 'Registrazione completata con successo',
            user: userResponse,
            tokens
        });

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante la registrazione'
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login utente
 * @access  Public
 */
router.post('/login', authLimiter, loginValidation, async (req, res) => {
    try {
        // Validazione input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Credenziali non valide',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Trova utente
        const user = await User.findByEmail(email);
        if (!user) {
            logger.warn('Login attempt with non-existent email:', {
                email: email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(401).json({
                success: false,
                message: 'Credenziali non valide'
            });
        }

        // Verifica password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            logger.warn('Invalid password attempt:', {
                email: email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(401).json({
                success: false,
                message: 'Credenziali non valide'
            });
        }

        // Verifica status account
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

        logger.info('User logged in successfully:', {
            userId: user.id,
            email: user.email,
            ip: req.ip
        });

        // Rimuovi password_hash dalla risposta
        const { password_hash: _, ...userResponse } = user;

        res.json({
            success: true,
            message: 'Login effettuato con successo',
            user: userResponse,
            tokens
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Rinnova access token usando refresh token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token richiesto'
            });
        }

        // Verifica refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'fallback-secret-key');

        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Token non valido'
            });
        }

        // ✅ CORRETTO: Usa decoded.id (come nel generateTokens)
        const user = await User.findById(decoded.id);
        if (!user || user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Utente non trovato o non attivo'
            });
        }

        // Genera nuovi tokens
        const tokens = generateTokens(user);

        res.json({
            success: true,
            tokens
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Refresh token scaduto'
            });
        }

        logger.error('Refresh token error:', error);
        res.status(401).json({
            success: false,
            message: 'Token non valido'
        });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout utente (invalida refresh token)
 * @access  Private
 */
router.post('/logout', requireAuth, async (req, res) => {
    try {
        // In una implementazione reale, qui si invaliderebbero i tokens
        // Per ora loggiamo solo l'azione
        logger.info('User logged out:', {
            userId: req.user.id,
            email: req.user.email,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Logout effettuato con successo'
        });

    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante il logout'
        });
    }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Richiesta reset password
 * @access  Public
 */
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail().withMessage('Email non valida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Email non valida',
                errors: errors.array()
            });
        }

        const { email } = req.body;

        // Trova utente
        const user = await User.findByEmail(email);

        // Per sicurezza, restituiamo sempre successo anche se l'utente non esiste
        if (!user) {
            logger.warn('Password reset requested for non-existent email:', email);
            return res.json({
                success: true,
                message: 'Se l\'email esiste, riceverai istruzioni per il reset'
            });
        }

        // Genera token reset (semplificato per demo)
        const resetToken = jwt.sign(
            { userId: user.id, type: 'reset' }, // ✅ Qui può rimanere userId per differenziarlo
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '1h' }
        );

        // Invia email reset (modalità mock) - ✅ CORRETTO
        try {
            await emailService.sendPasswordReset(user, resetToken);
        } catch (emailError) {
            logger.error('Failed to send reset email:', emailError);
        }

        logger.info('Password reset requested:', {
            userId: user.id,
            email: user.email,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Se l\'email esiste, riceverai istruzioni per il reset'
        });

    } catch (error) {
        logger.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Ottiene informazioni utente corrente
 * @access  Private
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        // Rimuovi password_hash dalla risposta
        const { password_hash: _, ...userResponse } = user;

        res.json({
            success: true,
            user: userResponse
        });

    } catch (error) {
        logger.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

module.exports = router;