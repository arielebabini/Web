// src/routes/auth.js - Authentication routes with Google OAuth
const express = require('express');

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize'); // ✅ AGGIUNTO: Import mancante

const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Import locali
const User = require('../models/User');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { requireAuth } = require('../middleware/auth');

let transporter = null;

// Rate limiting per autenticazione
/*const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // massimo 5 tentativi per IP
    message: {
        success: false,
        message: 'Troppi tentativi di login. Riprova tra 15 minuti.',
        error: { type: 'RATE_LIMIT_EXCEEDED' }
    },
    standardHeaders: true,
    legacyHeaders: false,
});*/

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

// ==================== GOOGLE OAUTH ROUTES ====================

/**
 * @route   GET /api/auth/google
 * @desc    Redirect to Google OAuth
 * @access  Public
 */
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
// file: auth.js

router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/login.html?error=oauth_failed'
    }),
    async (req, res) => {
        try {
            const user = req.user;

            if (!user) {
                // ... (codice esistente)
            }

            const { accessToken, refreshToken } = generateTokens(user);

            const userData = {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                avatar: user.avatar_url,
                status: user.status
            };

            // ==================== MODIFICA CHIAVE QUI ====================
            // 1. Definisci l'URL del tuo frontend (da una variabile d'ambiente)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';


            // 2. Costruisci l'URL di redirect completo
            const redirectUrl = `${frontendUrl}/?login_success=true&token=${accessToken}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify(userData))}`;

            logger.info('Google OAuth successful login, redirecting to frontend', {
                userId: user.id,
                redirectTarget: redirectUrl
            });

            // 3. Esegui il redirect all'URL assoluto del frontend
            res.redirect(redirectUrl);
            // ==========================================================

        } catch (error) {
            logger.error('Google OAuth callback error:', error);
            const errorRedirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login.html?error=oauth_callback_failed`;
            res.redirect(errorRedirectUrl);
        }
    }
);

function initializeEmailTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        logger.warn('Email configuration missing - EMAIL_USER or EMAIL_PASS not set. Email features will be disabled.');
        return null;
    }

    try {
        // ✅ CORRETTO: createTransport (NON createTransporter)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        logger.info('Email transporter initialized successfully');
        return transporter;
    } catch (error) {
        logger.error('Failed to initialize email transporter:', error);
        return null;
    }
}
transporter = initializeEmailTransporter();

async function sendEmail(to, subject, html) {
    if (!transporter) {
        logger.warn('Email sending skipped - transporter not initialized');
        return { success: false, error: 'Email service not configured' };
    }

    try {
        await transporter.sendMail({
            from: `"CoWorkSpace" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });

        logger.info(`Email sent successfully to: ${to}`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to send email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * @route   POST /api/auth/google/mobile
 * @desc    Mobile Google OAuth (for future mobile app)
 * @access  Public
 */
router.post('/google/mobile', async (req, res) => {
    try {
        const { googleToken } = req.body;

        if (!googleToken) {
            return res.status(400).json({
                success: false,
                message: 'Google token richiesto'
            });
        }

        // Import Google Auth Library
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: googleToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        // Find or create user
        let user = await User.findOne({ where: { email: payload.email } });

        if (!user) {
            // Create new user from Google data
            user = await User.create({
                google_id: payload.sub,
                email: payload.email,
                first_name: payload.given_name || 'User',
                last_name: payload.family_name || '',
                avatar_url: payload.picture,
                status: 'active',
                role: 'client',
                email_verified: true,
                password_hash: null // No password for OAuth users
            });

            logger.info('New user created via Google Mobile OAuth:', {
                userId: user.id,
                email: user.email
            });
        } else if (!user.google_id) {
            // Link existing account with Google
            await user.update({ google_id: payload.sub, avatar_url: payload.picture || user.avatar_url });

            logger.info('Existing user linked with Google:', {
                userId: user.id,
                email: user.email
            });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        res.json({
            success: true,
            message: 'Login Google completato',
            data: {
                token: accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    avatar: user.avatar_url,
                    status: user.status
                }
            }
        });

    } catch (error) {
        logger.error('Mobile Google OAuth error:', error);
        res.status(400).json({
            success: false,
            message: 'Token Google non valido'
        });
    }
});

// ==================== EXISTING ROUTES ====================

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
            google_id: null,
            avatar_url: null,
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
 * @route   POST /api/auth/fix-admin-role
 * @desc    Fix temporaneo per correggere il ruolo admin
 * @access  Public (temporaneo)
 */
router.post('/fix-admin-role', async (req, res) => {
    try {
        console.log('Fix admin role request received:', req.body);

        const { email } = req.body;

        if (email !== 'admin@coworkspace.local') {
            console.log('Email non autorizzata:', email);
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato'
            });
        }

        console.log('Cercando utente con email:', email);

        // Trova l'utente - adatta questo alla tua struttura del modello
        const user = await User.findByEmail(email);

        if (!user) {
            console.log('Utente non trovato');
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        console.log('Utente trovato:', user.email, 'ruolo attuale:', user.role);

        // Aggiorna il ruolo
        await user.update({ role: 'admin' });

        console.log('Ruolo aggiornato a admin');

        res.json({
            success: true,
            message: 'Ruolo admin corretto',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Errore completo:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel fix del ruolo: ' + error.message
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
            email_verified: false,
            google_id: null,
            avatar_url: null
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
router.post('/login', loginValidation, async (req, res) => {
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

        // Verifica password (solo per utenti non OAuth)
        if (!user.password_hash) {
            return res.status(401).json({
                success: false,
                message: 'Account creato tramite Google. Usa il login Google.'
            });
        }

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
            loginMethod: user.google_id ? 'google' : 'password',
            ip: req.ip
        });

        // Rimuovi password_hash dalla risposta
        const { password_hash: _, ...userResponse } = user;

        console.log('Dati utente inviati:', userResponse);
        console.log('Token generato:', tokens);

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

// CORREZIONE 1: Nel route forgot-password, cambia come generi il resetToken
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail().withMessage('Email non valida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Email non valida'
            });
        }

        const { email } = req.body;
        const user = await User.findByEmail(email);

        if (!user) {
            return res.json({
                success: true,
                message: 'Se l\'email esiste, riceverai un link per il reset'
            });
        }

        if (!user.password_hash) {
            return res.json({
                success: true,
                message: 'Se l\'email esiste, riceverai un link per il reset'
            });
        }

        // ✅ CORREZIONE: Usa crypto invece di JWT per il token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 ora

        // Salva il token nel database
        await User.updateResetToken(email, resetToken, resetTokenExpiry);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

        // ✅ CORREZIONE: Link diretto alla pagina di reset
        const resetLink = `http://localhost:3000/api/auth/reset-password?token=${resetToken}`;

        const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
                .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f8fafc; }
                .button { 
                    display: inline-block; 
                    background: #6366f1; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 8px;
                    margin: 20px 0;
                }
                .footer { padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔑 Reset Password - CoWorkSpace</h1>
                </div>
                
                <div class="content">
                    <h2>Ciao ${user.first_name || 'Utente'}!</h2>
                    
                    <p>Hai richiesto di reimpostare la password del tuo account CoWorkSpace.</p>
                    
                    <p>Clicca sul pulsante qui sotto per creare una nuova password:</p>
                    
                    <a href="${resetLink}" class="button">🔓 Reimposta Password</a>
                    
                    <p><strong>Importante:</strong></p>
                    <ul>
                        <li>Questo link è valido per 1 ora</li>
                        <li>Se non hai richiesto questo reset, ignora questa email</li>
                        <li>Il link può essere usato una sola volta</li>
                    </ul>
                    
                    <p>Se il pulsante non funziona, copia e incolla questo link:</p>
                    <p style="word-break: break-all; color: #6366f1;">${resetLink}</p>
                </div>
                
                <div class="footer">
                    <p>CoWorkSpace - La tua piattaforma di coworking</p>
                    <p>Questa email è stata inviata automaticamente, non rispondere.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        const emailResult = await sendEmail(
            email,
            '🔑 Reset Password - CoWorkSpace',
            emailHTML
        );

        if (emailResult.success) {
            logger.info(`Password reset email sent to: ${email}`);
        } else {
            logger.error(`Failed to send reset email to ${email}:`, emailResult.error);
        }

        res.json({
            success: true,
            message: 'Email di reset inviata con successo'
        });

    } catch (error) {
        logger.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

router.get('/reset-password', async (req, res) => {
    try {
        const { token } = req.query;

        // ✅ CONTROLLO ESSENZIALE: Verifica che il token sia presente
        if (!token) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Errore - CoWorkSpace</title>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
                        .error { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
                        .error h2 { color: #dc2626; }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h2>❌ Token Mancante</h2>
                        <p>Il link per il reset della password non è valido.</p>
                        <p>Richiedi un nuovo link di reset.</p>
                        <a href="/" style="color: #6366f1;">← Torna alla homepage</a>
                    </div>
                </body>
                </html>
            `);
        }

        // ✅ Verifica che il token sia valido nel database
        const user = await User.findByValidResetToken(token);

        if (!user) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Token Scaduto - CoWorkSpace</title>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
                        .error { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
                        .error h2 { color: #dc2626; }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h2>⏰ Token Scaduto</h2>
                        <p>Il link per il reset della password è scaduto o non valido.</p>
                        <p>Richiedi un nuovo link di reset.</p>
                        <a href="/" style="color: #6366f1;">← Torna alla homepage</a>
                    </div>
                </body>
                </html>
            `);
        }

        // ✅ AGGIUNGI QUESTI HEADER CSP
        res.setHeader('Content-Security-Policy', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "font-src 'self' https://cdnjs.cloudflare.com",
            "connect-src 'self'"
        ].join('; '));

        // ✅ Se il token è valido, serve la pagina HTML per inserire la nuova password
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reset Password - CoWorkSpace</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .reset-container {
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    max-width: 400px;
                    width: 100%;
                }
            </style>
        </head>
        <body>
            <div class="reset-container">
                <div class="text-center mb-4">
                    <h2>🔑 Nuova Password</h2>
                    <p class="text-muted">Inserisci la tua nuova password per ${user.first_name || 'il tuo account'}</p>
                </div>
                
                <form id="resetForm">
                    <div class="mb-3">
                        <label class="form-label">Nuova Password</label>
                        <input type="password" class="form-control" id="newPassword" required minlength="8">
                        <div class="form-text">Almeno 8 caratteri</div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Conferma Password</label>
                        <input type="password" class="form-control" id="confirmPassword" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary w-100">
                        🔓 Reimposta Password
                    </button>
                </form>
                
                <div id="message" class="mt-3"></div>
            </div>
            
            <script>
                document.getElementById('resetForm').addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const newPassword = document.getElementById('newPassword').value;
                    const confirmPassword = document.getElementById('confirmPassword').value;
                    const messageDiv = document.getElementById('message');
                    
                    // Mostra stato di caricamento
                    const submitBtn = e.target.querySelector('button[type="submit"]');
                    const originalText = submitBtn.innerHTML;
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '⏳ Aggiornamento...';
                    
                    if (newPassword !== confirmPassword) {
                        messageDiv.innerHTML = '<div class="alert alert-danger">Le password non coincidono</div>';
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                        return;
                    }
                    
                    if (newPassword.length < 8) {
                        messageDiv.innerHTML = '<div class="alert alert-danger">La password deve essere di almeno 8 caratteri</div>';
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                        return;
                    }
                    
                    try {
                        const response = await fetch('/api/auth/reset-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                token: '${token}', 
                                newPassword 
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            messageDiv.innerHTML = '<div class="alert alert-success">✅ Password reimpostata! Reindirizzamento al login...</div>';
                            setTimeout(() => {
                                window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:3001'}/';
                            }, 2000);
                        } else {
                            messageDiv.innerHTML = '<div class="alert alert-danger">' + data.message + '</div>';
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = originalText;
                        }
                        
                    } catch (error) {
                        console.error('Reset error:', error);
                        messageDiv.innerHTML = '<div class="alert alert-danger">Errore di connessione</div>';
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
                });
            </script>
        </body>
        </html>
        `);

    } catch (error) {
        logger.error('Reset password page error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Errore Server</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2>❌ Errore del Server</h2>
                <p>Si è verificato un errore. Riprova più tardi.</p>
            </body>
            </html>
        `);
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        console.log('🔍 Reset password attempt:', { token: token?.substring(0, 20) + '...', passwordLength: newPassword?.length });

        if (!token || !newPassword) {
            console.log('❌ Missing token or password');
            return res.status(400).json({
                success: false,
                message: 'Token e nuova password richiesti'
            });
        }

        // Debug: Trova utente con token valido
        console.log('🔍 Looking for user with token...');
        const user = await User.findByValidResetToken(token);
        console.log('👤 User found:', user ? { id: user.id, email: user.email } : 'NULL');

        if (!user) {
            console.log('❌ User not found or token invalid');
            return res.status(400).json({
                success: false,
                message: 'Token non valido o scaduto'
            });
        }

        if (newPassword.length < 8) {
            console.log('❌ Password too short');
            return res.status(400).json({
                success: false,
                message: 'La password deve essere di almeno 8 caratteri'
            });
        }

        // Hash della nuova password
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        console.log('✅ Password hashed successfully');

        // Aggiorna password e cancella token
        console.log('💾 Updating password in database...');
        const updateResult = await User.updatePasswordAndClearResetToken(user.id, hashedPassword);
        console.log('📝 Update result:', updateResult);

        logger.info(`Password reset completed for user: ${user.email}`);
        console.log('✅ Password reset completed successfully');

        res.json({
            success: true,
            message: 'Password reimpostata con successo'
        });

    } catch (error) {
        console.error('💥 FULL RESET ERROR DETAILS:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        logger.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server: ' + error.message
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