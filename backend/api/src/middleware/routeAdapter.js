/**
 * RouteAdapter Middleware
 * Adatta le chiamate tra le rotte e i controller per garantire compatibilità
 */

const UserController = require('../controllers/userController');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

// ===============================================
// ADAPTER PER USER CONTROLLER
// ===============================================

/**
 * Adapter per il controller utenti
 * Converte i parametri delle rotte nei formati attesi dai controller
 */
const adaptUserController = {
    // Profilo utente
    getProfile: async (req, res, next) => {
        try {
            await UserController.getProfile(req, res);
        } catch (error) {
            next(error);
        }
    },

    updateProfile: async (req, res, next) => {
        try {
            await UserController.updateProfile(req, res);
        } catch (error) {
            next(error);
        }
    },

    changePassword: async (req, res, next) => {
        try {
            await UserController.changePassword(req, res);
        } catch (error) {
            next(error);
        }
    },

    verifyEmail: async (req, res, next) => {
        try {
            await UserController.verifyEmail(req, res);
        } catch (error) {
            next(error);
        }
    },

    // Gestione utenti (admin/manager)
    getAllUsers: async (req, res, next) => {
        try {
            await UserController.getAllUsers(req, res);
        } catch (error) {
            next(error);
        }
    },

    getUserStats: async (req, res, next) => {
        try {
            await UserController.getUserStats(req, res);
        } catch (error) {
            next(error);
        }
    },

    getUserById: async (req, res, next) => {
        try {
            await UserController.getUserById(req, res);
        } catch (error) {
            next(error);
        }
    },

    updateUserRole: async (req, res, next) => {
        try {
            await UserController.updateUserRole(req, res);
        } catch (error) {
            next(error);
        }
    },

    updateUserStatus: async (req, res, next) => {
        try {
            await UserController.updateUserStatus(req, res);
        } catch (error) {
            next(error);
        }
    },

    deleteUser: async (req, res, next) => {
        try {
            await UserController.deleteUser(req, res);
        } catch (error) {
            next(error);
        }
    }
};

// ===============================================
// PARAMETER MAPPER
// ===============================================

/**
 * Mapper per i parametri delle rotte
 * Mappa i parametri URL nei campi corretti del request
 */
const parameterMapper = {
    mapUserId: (req, res, next) => {
        if (req.params.userId) {
            req.userId = req.params.userId;
        }
        next();
    },

    mapSpaceId: (req, res, next) => {
        if (req.params.spaceId) {
            req.spaceId = req.params.spaceId;
        }
        next();
    },

    mapBookingId: (req, res, next) => {
        if (req.params.bookingId) {
            req.bookingId = req.params.bookingId;
        }
        next();
    }
};

// ===============================================
// RESPONSE ADAPTER
// ===============================================

/**
 * Middleware per standardizzare le risposte
 */
const responseAdapter = (req, res, next) => {
    // Funzione helper per risposte standardizzate
    res.apiResponse = (data, message = 'Success', statusCode = 200) => {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    };

    // Funzione helper per errori standardizzati
    res.apiError = (message = 'Error', statusCode = 400, error = null) => {
        return res.status(statusCode).json({
            success: false,
            message,
            error: error || undefined,
            timestamp: new Date().toISOString()
        });
    };

    next();
};

// ===============================================
// UUID VALIDATOR
// ===============================================

/**
 * Validatore per UUID
 */
const uuidValidator = (req, res, next) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Controlla tutti i parametri che potrebbero essere UUID
    const uuidParams = ['userId', 'spaceId', 'bookingId'];

    for (const param of uuidParams) {
        if (req.params[param] && !uuidRegex.test(req.params[param])) {
            // Accetta anche ID numerici per compatibilità
            if (!/^\d+$/.test(req.params[param])) {
                return res.status(400).json({
                    success: false,
                    message: `Formato ${param} non valido`,
                    error: {
                        type: 'INVALID_UUID',
                        field: param,
                        value: req.params[param]
                    }
                });
            }
        }
    }

    next();
};

// ===============================================
// ADAPTER LOGGER
// ===============================================

/**
 * Logger per le chiamate dei controller
 */
const adapterLogger = (controllerMethod) => {
    return (req, res, next) => {
        const startTime = Date.now();

        // Log della richiesta
        logger.info(`Calling ${controllerMethod}`, {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || 'anonymous'
        });

        // Override del metodo json per loggare la risposta
        const originalJson = res.json;
        res.json = function(body) {
            const duration = Date.now() - startTime;

            logger.info(`Response from ${controllerMethod}`, {
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                success: body?.success !== false
            });

            return originalJson.call(this, body);
        };

        next();
    };
};

// ===============================================
// VALIDATION MIDDLEWARE
// ===============================================

/**
 * Middleware per gestire i risultati della validazione
 */
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        logger.warn('Validation failed', {
            errors: errors.array(),
            url: req.originalUrl,
            method: req.method
        });

        return res.status(400).json({
            success: false,
            message: 'Errori di validazione',
            errors: errors.array()
        });
    }

    next();
};

// ===============================================
// EXPORTS
// ===============================================

module.exports = {
    adaptUserController,
    parameterMapper,
    responseAdapter,
    uuidValidator,
    adapterLogger,
    handleValidation
};