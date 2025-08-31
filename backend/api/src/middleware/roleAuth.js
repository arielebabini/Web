// src/middleware/roleAuth.js - Role-based authorization middleware CORRETTO
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware per la gestione dei ruoli e autorizzazioni
 */

/**
 * Verifica che l'utente abbia uno dei ruoli richiesti
 * @param {string[]} allowedRoles - Array di ruoli consentiti
 * @returns {Function} Middleware function
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            // Verifica che l'utente sia autenticato
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Accesso non autorizzato'
                });
            }

            // Verifica che l'utente abbia il ruolo richiesto
            if (!allowedRoles.includes(req.user.role)) {
                logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}. Required: ${allowedRoles.join(', ')}`);
                return res.status(403).json({
                    success: false,
                    message: 'Permessi insufficienti per questa operazione'
                });
            }

            // Verifica che l'account sia attivo
            if (req.user.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Account non attivo'
                });
            }

            next();
        } catch (error) {
            logger.error('Error in role middleware:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    };
};

/**
 * Middleware per richiedere ruolo admin
 */
const requireAdmin = requireRole(['admin']);

/**
 * Middleware per richiedere ruolo manager o admin
 */
const requireManager = requireRole(['manager', 'admin']);

/**
 * Middleware per richiedere ruolo client, manager o admin (utenti autenticati)
 */
const requireAuth = requireRole(['client', 'manager', 'admin']);

/**
 * Middleware per verificare che l'utente possa accedere alle proprie risorse
 * o sia un admin/manager
 * @param {string} userIdParam - Nome del parametro che contiene l'ID utente
 * @param {string[]} allowedRoles - Ruoli autorizzati ad accedere a qualsiasi risorsa
 * @returns {Function} Middleware function
 */
const requireOwnershipOrRole = (userIdParam = 'userId', allowedRoles = ['manager', 'admin']) => {
    return (req, res, next) => {
        try {
            const targetUserId = req.params[userIdParam];
            const currentUserId = req.user.id;
            const currentUserRole = req.user.role;

            // L'utente può accedere alle proprie risorse
            if (targetUserId === currentUserId) {
                return next();
            }

            // Oppure deve avere uno dei ruoli autorizzati
            if (allowedRoles.includes(currentUserRole)) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Non hai il permesso di accedere a questa risorsa'
            });
        } catch (error) {
            logger.error('Error in ownership middleware:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    };
};

/**
 * Middleware per verificare la proprietà delle risorse per manager
 * Un manager può accedere solo alle risorse dei propri spazi
 * @param {string} resourceType - Tipo di risorsa ('space', 'booking', etc.)
 * @returns {Function} Middleware function
 */
const requireManagerOwnership = (resourceType) => {
    return async (req, res, next) => {
        try {
            const currentUserId = req.user.id;
            const currentUserRole = req.user.role;

            // Gli admin possono accedere a tutto
            if (currentUserRole === 'admin') {
                return next();
            }

            // I manager possono accedere solo alle loro risorse
            if (currentUserRole === 'manager') {
                let resourceId;
                let ownershipQuery;

                switch (resourceType) {
                    case 'space':
                        resourceId = req.params.spaceId || req.params.id;
                        ownershipQuery = `
                            SELECT manager_id 
                            FROM spaces 
                            WHERE id = $1 
                        `;
                        break;

                    case 'booking':
                        resourceId = req.params.bookingId || req.params.id;
                        ownershipQuery = `
                            SELECT s.manager_id, b.user_id
                            FROM bookings b
                            JOIN spaces s ON b.space_id = s.id
                            WHERE b.id = $1
                        `;
                        break;

                    default:
                        return res.status(400).json({
                            success: false,
                            message: 'Tipo di risorsa non supportato'
                        });
                }

                const result = await query(ownershipQuery, [resourceId]);

                if (result.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: `${resourceType} non trovato`
                    });
                }

                const resource = result.rows[0];

                // Per gli spazi, verifica che il manager sia il proprietario
                if (resourceType === 'space') {
                    if (resource.manager_id !== currentUserId) {
                        return res.status(403).json({
                            success: false,
                            message: 'Non hai il permesso di gestire questo spazio'
                        });
                    }
                }

                // Per le prenotazioni, il manager può accedere se è proprietario dello spazio
                if (resourceType === 'booking') {
                    if (resource.manager_id !== currentUserId) {
                        return res.status(403).json({
                            success: false,
                            message: 'Non hai il permesso di gestire questa prenotazione'
                        });
                    }
                }

                return next();
            }

            // I client non possono accedere a risorse manageriali
            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti per questa operazione'
            });
        } catch (error) {
            logger.error('Error in manager ownership middleware:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    };
};

/**
 * Middleware per verificare che l'utente possa accedere alle proprie prenotazioni
 * @returns {Function} Middleware function
 */
const requireBookingOwnership = () => {
    return async (req, res, next) => {
        try {
            const bookingId = req.params.bookingId || req.params.id;
            const currentUserId = req.user.id;
            const currentUserRole = req.user.role;

            // Gli admin possono accedere a tutto
            if (currentUserRole === 'admin') {
                return next();
            }

            if (currentUserRole === 'manager') {
                // I manager possono accedere alle prenotazioni dei loro spazi
                const result = await query(`
                    SELECT b.user_id, s.manager_id
                    FROM bookings b
                             JOIN spaces s ON b.space_id = s.id
                    WHERE b.id = $1
                `, [bookingId]);

                if (result.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Prenotazione non trovata'
                    });
                }

                const { user_id, manager_id } = result.rows[0];

                // Il manager può accedere se è il proprietario dello spazio o l'utente che ha fatto la prenotazione
                if (manager_id === currentUserId || user_id === currentUserId) {
                    return next();
                }

                return res.status(403).json({
                    success: false,
                    message: 'Non hai il permesso di accedere a questa prenotazione'
                });
            }

            if (currentUserRole === 'client') {
                // I client possono accedere solo alle proprie prenotazioni
                const result = await query(`
                    SELECT user_id
                    FROM bookings
                    WHERE id = $1
                `, [bookingId]);

                if (result.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Prenotazione non trovata'
                    });
                }

                const { user_id } = result.rows[0];

                if (user_id !== currentUserId) {
                    return res.status(403).json({
                        success: false,
                        message: 'Puoi accedere solo alle tue prenotazioni'
                    });
                }

                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti'
            });
        } catch (error) {
            logger.error('Error in booking ownership middleware:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    };
};

/**
 * Middleware per rate limiting basato sui ruoli
 * @param {Object} limits - Limiti per ruolo (richieste per ora)
 * @param {number} limits.client - Limite per i client
 * @param {number} limits.manager - Limite per i manager
 * @param {number} limits.admin - Limite per gli admin (-1 = nessun limite)
 * @returns {Function} Middleware function
 */
const roleBasedRateLimit = (limits = { client: 100, manager: 200, admin: -1 }) => {
    const requestCounts = new Map();
    const windowMs = 60 * 60 * 1000; // 1 ora

    return (req, res, next) => {
        if (!req.user) {
            return next();
        }

        const userId = req.user.id;
        const userRole = req.user.role;
        const limit = limits[userRole];

        // Nessun limite per questo ruolo
        if (limit === -1) {
            return next();
        }

        const now = Date.now();
        const windowStart = now - windowMs;

        // Ottieni o inizializza il conteggio per l'utente
        if (!requestCounts.has(userId)) {
            requestCounts.set(userId, []);
        }

        const userRequests = requestCounts.get(userId);

        // Rimuovi richieste fuori dalla finestra temporale
        const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
        requestCounts.set(userId, validRequests);

        // Controlla se ha superato il limite
        if (validRequests.length >= limit) {
            logger.warn('Role-based rate limit exceeded:', {
                userId: userId,
                role: userRole,
                requestCount: validRequests.length,
                limit: limit,
                ip: req.ip
            });

            return res.status(429).json({
                success: false,
                message: 'Troppi tentativi. Riprova più tardi.',
                error: {
                    type: 'ROLE_RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil(windowMs / 1000)
                }
            });
        }

        // Aggiungi la richiesta corrente
        validRequests.push(now);
        requestCounts.set(userId, validRequests);

        next();
    };
};

/**
 * Middleware per verificare permessi specifici
 * @param {string[]} permissions - Lista di permessi richiesti
 * @returns {Function} Middleware function
 */
const requirePermissions = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticazione richiesta'
            });
        }

        const userRole = req.user.role;

        // Definizione permessi per ruolo
        const rolePermissions = {
            admin: ['*'], // Admin ha tutti i permessi
            manager: [
                'spaces:create',
                'spaces:read',
                'spaces:update',
                'spaces:delete',
                'bookings:read',
                'bookings:update',
                'bookings:cancel',
                'users:read',
                'analytics:read'
            ],
            client: [
                'spaces:read',
                'bookings:create',
                'bookings:read:own',
                'bookings:update:own',
                'bookings:cancel:own',
                'profile:update:own'
            ]
        };

        const userPermissions = rolePermissions[userRole] || [];

        // Admin ha tutti i permessi
        if (userPermissions.includes('*')) {
            return next();
        }

        // Verifica se l'utente ha tutti i permessi richiesti
        const hasAllPermissions = permissions.every(permission =>
            userPermissions.includes(permission) ||
            userPermissions.includes(permission.replace(':own', ''))
        );

        if (!hasAllPermissions) {
            logger.warn('Permission denied:', {
                userId: req.user.id,
                role: userRole,
                requiredPermissions: permissions,
                userPermissions: userPermissions,
                endpoint: req.originalUrl
            });

            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti per questa operazione',
                error: {
                    type: 'INSUFFICIENT_PERMISSIONS',
                    required: permissions,
                    available: userPermissions
                }
            });
        }

        next();
    };
};

module.exports = {
    requireRole,
    requireAdmin,
    requireManager,
    requireAuth,
    requireOwnershipOrRole,
    requireManagerOwnership,
    requireBookingOwnership,
    roleBasedRateLimit,
    requirePermissions
};