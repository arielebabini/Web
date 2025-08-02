// src/middleware/auth.js - Authentication middleware AGGIORNATO
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware per richiedere autenticazione JWT
 * Estrae e verifica il token Bearer dall'header Authorization
 */
const requireAuth = async (req, res, next) => {
    try {
        // Estrae token dall'header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token di accesso richiesto',
                error: {
                    type: 'MISSING_TOKEN',
                    description: 'Fornisci un token Bearer nell\'header Authorization'
                }
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token non valido',
                error: {
                    type: 'INVALID_TOKEN_FORMAT'
                }
            });
        }

        // Verifica token JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        } catch (jwtError) {
            logger.warn('JWT verification failed:', {
                error: jwtError.message,
                token: token.substring(0, 20) + '...',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            let message = 'Token non valido';
            let type = 'INVALID_TOKEN';

            if (jwtError.name === 'TokenExpiredError') {
                message = 'Token scaduto';
                type = 'TOKEN_EXPIRED';
            } else if (jwtError.name === 'JsonWebTokenError') {
                message = 'Token malformato';
                type = 'MALFORMED_TOKEN';
            } else if (jwtError.name === 'NotBeforeError') {
                message = 'Token non ancora valido';
                type = 'TOKEN_NOT_ACTIVE';
            }

            return res.status(401).json({
                success: false,
                message,
                error: { type }
            });
        }

        // Verifica che non sia un refresh token
        if (decoded.type === 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Token non valido per questa operazione',
                error: {
                    type: 'WRONG_TOKEN_TYPE',
                    description: 'Usa un access token, non un refresh token'
                }
            });
        }

        // Trova utente nel database
        const user = await User.findById(decoded.userId);

        if (!user) {
            logger.warn('User not found for valid token:', {
                userId: decoded.userId,
                ip: req.ip
            });

            return res.status(401).json({
                success: false,
                message: 'Utente non trovato',
                error: {
                    type: 'USER_NOT_FOUND'
                }
            });
        }

        // Verifica che l'utente sia attivo
        if (user.status !== 'active') {
            logger.warn('Inactive user attempted access:', {
                userId: user.id,
                email: user.email,
                status: user.status,
                ip: req.ip
            });

            return res.status(403).json({
                success: false,
                message: 'Account non attivo',
                error: {
                    type: 'ACCOUNT_INACTIVE',
                    status: user.status
                }
            });
        }

        // Aggiungi utente alla request per i middleware successivi
        req.user = user;
        req.token = token;
        req.tokenData = decoded;

        // Log accesso per audit (solo in debug)
        logger.debug('User authenticated:', {
            userId: user.id,
            email: user.email,
            role: user.role,
            ip: req.ip,
            endpoint: req.originalUrl,
            method: req.method
        });

        next();

    } catch (error) {
        logger.error('Authentication middleware error:', error);

        res.status(500).json({
            success: false,
            message: 'Errore interno di autenticazione',
            error: {
                type: 'AUTH_MIDDLEWARE_ERROR'
            }
        });
    }
};

/**
 * Middleware per richiedere ruoli specifici
 * Deve essere usato DOPO requireAuth
 * @param {string|Array} allowedRoles - Ruolo o array di ruoli consentiti
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticazione richiesta',
                error: {
                    type: 'AUTHENTICATION_REQUIRED'
                }
            });
        }

        const userRole = req.user.role;
        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!rolesArray.includes(userRole)) {
            logger.warn('Insufficient permissions:', {
                userId: req.user.id,
                email: req.user.email,
                userRole: userRole,
                requiredRoles: rolesArray,
                endpoint: req.originalUrl,
                method: req.method,
                ip: req.ip
            });

            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti',
                error: {
                    type: 'INSUFFICIENT_PERMISSIONS',
                    required: rolesArray,
                    current: userRole
                }
            });
        }

        logger.debug('Role authorization successful:', {
            userId: req.user.id,
            role: userRole,
            endpoint: req.originalUrl
        });

        next();
    };
};

/**
 * Middleware per verificare la proprietà di una risorsa
 * L'utente può accedere solo alle proprie risorse, oppure essere admin
 * @param {string} resourceIdParam - Nome del parametro che contiene l'ID della risorsa (default: 'id')
 */
const requireOwnership = (resourceIdParam = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticazione richiesta',
                error: {
                    type: 'AUTHENTICATION_REQUIRED'
                }
            });
        }

        const resourceId = req.params[resourceIdParam];
        const userId = req.user.id;
        const userRole = req.user.role;

        // Admin può accedere a tutto
        if (userRole === 'admin') {
            logger.debug('Admin access granted:', {
                userId: userId,
                resourceId: resourceId,
                endpoint: req.originalUrl
            });
            return next();
        }

        // Manager può accedere alle risorse della propria organizzazione
        // (da implementare quando avremo il concetto di organizzazione)

        // Per altri ruoli, verifica ownership
        if (userId !== resourceId) {
            logger.warn('Ownership check failed:', {
                userId: userId,
                resourceId: resourceId,
                userRole: userRole,
                endpoint: req.originalUrl,
                method: req.method,
                ip: req.ip
            });

            return res.status(403).json({
                success: false,
                message: 'Accesso negato: puoi accedere solo alle tue risorse',
                error: {
                    type: 'RESOURCE_ACCESS_DENIED'
                }
            });
        }

        logger.debug('Ownership verified:', {
            userId: userId,
            resourceId: resourceId,
            endpoint: req.originalUrl
        });

        next();
    };
};

/**
 * Middleware per autenticazione opzionale
 * Non blocca la richiesta se il token non è presente o non valido
 * Utile per endpoint che cambiano comportamento se l'utente è autenticato
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Nessun token presente, continua senza autenticazione
            return next();
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return next();
        }

        // Verifica token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');

        // Non accettare refresh token
        if (decoded.type === 'refresh') {
            return next();
        }

        const user = await User.findById(decoded.userId);

        if (user && user.status === 'active') {
            req.user = user;
            req.token = token;
            req.tokenData = decoded;

            logger.debug('Optional auth successful:', {
                userId: user.id,
                email: user.email,
                endpoint: req.originalUrl
            });
        }

        next();

    } catch (error) {
        // In caso di errore, continua senza autenticazione
        logger.debug('Optional auth failed, continuing without auth:', {
            error: error.message,
            endpoint: req.originalUrl
        });
        next();
    }
};

/**
 * Middleware per verificare email verificata
 * Richiede che l'utente abbia verificato la propria email
 */
const requireEmailVerified = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Autenticazione richiesta',
            error: {
                type: 'AUTHENTICATION_REQUIRED'
            }
        });
    }

    if (!req.user.emailVerified) {
        logger.warn('Unverified email access attempt:', {
            userId: req.user.id,
            email: req.user.email,
            endpoint: req.originalUrl,
            ip: req.ip
        });

        return res.status(403).json({
            success: false,
            message: 'Email non verificata. Controlla la tua email e clicca sul link di verifica.',
            error: {
                type: 'EMAIL_NOT_VERIFIED'
            }
        });
    }

    next();
};

/**
 * Middleware per rate limiting personalizzato per utente
 * Limita il numero di richieste per utente/IP in una finestra temporale
 * @param {number} maxRequests - Numero massimo di richieste (default: 100)
 * @param {number} windowMs - Finestra temporale in millisecondi (default: 15 minuti)
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const userRequests = new Map();

    return (req, res, next) => {
        const userId = req.user?.id || req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Pulisci vecchi record
        if (userRequests.has(userId)) {
            const requests = userRequests.get(userId);
            userRequests.set(userId, requests.filter(time => time > windowStart));
        }

        // Conta richieste attuali
        const currentRequests = userRequests.get(userId) || [];

        if (currentRequests.length >= maxRequests) {
            logger.warn('User rate limit exceeded:', {
                userId: userId,
                requestCount: currentRequests.length,
                maxRequests: maxRequests,
                endpoint: req.originalUrl,
                ip: req.ip
            });

            return res.status(429).json({
                success: false,
                message: 'Troppe richieste. Riprova più tardi.',
                error: {
                    type: 'USER_RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil(windowMs / 1000)
                }
            });
        }

        // Aggiungi richiesta corrente
        currentRequests.push(now);
        userRequests.set(userId, currentRequests);

        next();
    };
};

/**
 * Middleware per verificare il ruolo admin
 * Shortcut per requireRole(['admin'])
 */
const requireAdmin = requireRole(['admin']);

/**
 * Middleware per verificare il ruolo manager o admin
 * Shortcut per requireRole(['manager', 'admin'])
 */
const requireManager = requireRole(['manager', 'admin']);

/**
 * Utility function per estrarre l'utente dal token senza middleware
 * Utile per operazioni interne o background jobs
 * @param {string} token - JWT token
 * @returns {Promise<User|null>} User object o null se non valido
 */
const getUserFromToken = async (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');

        if (decoded.type === 'refresh') {
            return null; // Non accettare refresh token
        }

        const user = await User.findById(decoded.userId);

        if (user && user.status === 'active') {
            return user;
        }

        return null;
    } catch (error) {
        return null;
    }
};

module.exports = {
    requireAuth,
    requireRole,
    requireOwnership,
    optionalAuth,
    requireEmailVerified,
    userRateLimit,
    requireAdmin,
    requireManager,
    getUserFromToken
};