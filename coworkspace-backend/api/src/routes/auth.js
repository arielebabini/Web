// src/routes/auth.js - Route di autenticazione FUNZIONANTI
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

const router = express.Router();

/**
 * GET /api/auth/test
 * Test route per verificare che l'API funzioni
 */
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Auth routes working!',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/auth/register
 * Registrazione nuovo utente
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, company } = req.body;

        // Validazione campi obbligatori
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, firstName e lastName sono obbligatori'
            });
        }

        // Validazione formato email (basic)
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({
                success: false,
                message: 'Formato email non valido'
            });
        }

        // Validazione password
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La password deve essere di almeno 8 caratteri'
            });
        }

        // Validazione password robusta
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'La password deve contenere almeno una lettera minuscola, una maiuscola e un numero'
            });
        }

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
            role: 'client'
        };

        const user = await User.create(userData);

        // Genera token JWT
        const accessToken = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id, type: 'refresh' },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '7d' }
        );

        // Invia email di benvenuto (non-blocking)
        try {
            await emailService.sendWelcomeEmail(user);
            if (user.emailVerificationToken) {
                await emailService.sendVerificationEmail(user, user.emailVerificationToken);
            }
        } catch (emailError) {
            logger.warn('Errore invio email benvenuto:', emailError.message);
            // Non bloccare la registrazione per errori email
        }

        logger.info(`User registered successfully: ${user.email} (${user.id})`);

        // Risposta sicura (rimuovi dati sensibili)
        const safeUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            company: user.company,
            role: user.role,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'Registrazione completata con successo! Controlla la tua email per verificare l\'account.',
            user: safeUser,
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: '24h'
            }
        });

    } catch (error) {
        logger.error('Errore registrazione:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * POST /api/auth/login
 * Login utente
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validazione campi obbligatori
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email e password sono obbligatori'
            });
        }

        // Trova utente
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email o password errate'
            });
        }

        // Verifica password
        const isValidPassword = await user.verifyPassword(password);
        if (!isValidPassword) {
            logger.warn('Invalid password attempt:', {
                email: email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(401).json({
                success: false,
                message: 'Email o password errate'
            });
        }

        // Verifica che l'account sia attivo
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account non attivo',
                error: {
                    type: 'ACCOUNT_INACTIVE',
                    status: user.status
                }
            });
        }

        // Genera tokens
        const accessToken = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id, type: 'refresh' },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '7d' }
        );

        // Aggiorna ultimo login
        try {
            await User.updateLastLogin(user.id);
        } catch (updateError) {
            logger.warn('Failed to update last login:', updateError.message);
        }

        logger.info(`User logged in successfully: ${user.email} (${user.id})`);

        // Risposta sicura
        const safeUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            company: user.company,
            role: user.role,
            emailVerified: user.emailVerified,
            lastLogin: user.lastLogin
        };

        res.json({
            success: true,
            message: 'Login effettuato con successo',
            user: safeUser,
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: '24h'
            }
        });

    } catch (error) {
        logger.error('Errore login:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token usando refresh token
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
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'fallback-secret-key');
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token non valido',
                error: {
                    type: 'INVALID_REFRESH_TOKEN'
                }
            });
        }

        // Verifica che sia un refresh token
        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Token non valido',
                error: {
                    type: 'INVALID_TOKEN_TYPE'
                }
            });
        }

        // Trova utente
        const user = await User.findById(decoded.userId);
        if (!user || user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Utente non trovato o non attivo',
                error: {
                    type: 'USER_NOT_FOUND'
                }
            });
        }

        // Genera nuovo access token
        const newAccessToken = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
        );

        logger.info(`Token refreshed for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Token aggiornato con successo',
            accessToken: newAccessToken,
            expiresIn: '24h'
        });

    } catch (error) {
        logger.error('Errore refresh token:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout utente (principalmente client-side con JWT)
 */
router.post('/logout', async (req, res) => {
    // Con JWT stateless, il logout è principalmente client-side
    // Il client deve rimuovere il token dal localStorage
    // Qui possiamo fare log per audit trail

    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
            logger.info(`User logged out: ${decoded.userId}`);
        } catch (error) {
            // Token già scaduto o non valido, non importa per il logout
        }
    }

    res.json({
        success: true,
        message: 'Logout effettuato con successo'
    });
});

/**
 * POST /api/auth/forgot-password
 * Richiesta reset password
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email richiesta'
            });
        }

        const resetToken = await User.generateResetToken(email);

        if (!resetToken) {
            // Per sicurezza, non riveliamo se l'email esiste o meno
            return res.json({
                success: true,
                message: 'Se l\'email è registrata, riceverai un link per il reset della password'
            });
        }

        // In modalità mock, l'email sarà simulata
        logger.info(`Password reset requested for: ${email}`);

        res.json({
            success: true,
            message: 'Se l\'email è registrata, riceverai un link per il reset della password'
        });

    } catch (error) {
        logger.error('Errore forgot password:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

module.exports = router;