// src/middleware/errorHandler.js - Error handling middleware
const logger = require('../utils/logger');

/**
 * Gestisce errori di validazione express-validator
 */
const handleValidationError = (errors) => {
    return {
        success: false,
        message: 'Dati di validazione non validi',
        errors: errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value
        }))
    };
};

/**
 * Gestisce errori database PostgreSQL
 */
const handleDatabaseError = (error) => {
    const dbError = {
        success: false,
        message: 'Errore del database'
    };

    switch (error.code) {
        case '23505': // Unique violation
            dbError.message = 'Dato già esistente';
            dbError.type = 'DUPLICATE_ENTRY';
            break;
        case '23503': // Foreign key violation
            dbError.message = 'Riferimento non valido';
            dbError.type = 'FOREIGN_KEY_VIOLATION';
            break;
        case '23502': // Not null violation
            dbError.message = 'Campo obbligatorio mancante';
            dbError.type = 'NOT_NULL_VIOLATION';
            break;
        case '22001': // String data too long
            dbError.message = 'Dati troppo lunghi';
            dbError.type = 'DATA_TOO_LONG';
            break;
        case '08006': // Connection exception
        case '08001': // Unable to connect
            dbError.message = 'Errore di connessione al database';
            dbError.type = 'CONNECTION_ERROR';
            break;
        default:
            dbError.message = 'Errore interno del database';
            dbError.type = 'DATABASE_ERROR';
    }

    return dbError;
};

/**
 * Gestisce errori JWT
 */
const handleJWTError = (error) => {
    switch (error.name) {
        case 'TokenExpiredError':
            return {
                success: false,
                message: 'Token scaduto',
                type: 'TOKEN_EXPIRED'
            };
        case 'JsonWebTokenError':
            return {
                success: false,
                message: 'Token non valido',
                type: 'INVALID_TOKEN'
            };
        case 'NotBeforeError':
            return {
                success: false,
                message: 'Token non ancora valido',
                type: 'TOKEN_NOT_ACTIVE'
            };
        default:
            return {
                success: false,
                message: 'Errore di autenticazione',
                type: 'AUTH_ERROR'
            };
    }
};

/**
 * Middleware principale per gestione errori
 */
const errorHandler = (error, req, res, next) => {
    // Se l'header è già stato inviato, passa al default handler di Express
    if (res.headersSent) {
        return next(error);
    }

    // Log dell'errore
    logger.error('Request error:', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        timestamp: new Date().toISOString()
    });

    let statusCode = 500;
    let errorResponse;

    // Gestione errori specifici
    if (error.name === 'ValidationError' && error.errors) {
        // Errori express-validator
        statusCode = 400;
        errorResponse = handleValidationError(error);
    } else if (error.code && error.code.startsWith('23')) {
        // Errori database PostgreSQL
        statusCode = 400;
        errorResponse = handleDatabaseError(error);
    } else if (error.name && error.name.includes('JWT')) {
        // Errori JWT
        statusCode = 401;
        errorResponse = handleJWTError(error);
    } else if (error.name === 'CastError') {
        // Errori di cast (ID non validi, ecc.)
        statusCode = 400;
        errorResponse = {
            success: false,
            message: 'Formato ID non valido',
            type: 'INVALID_ID_FORMAT'
        };
    } else if (error.name === 'MulterError') {
        // Errori upload file
        statusCode = 400;
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                errorResponse = {
                    success: false,
                    message: 'File troppo grande',
                    type: 'FILE_TOO_LARGE'
                };
                break;
            case 'LIMIT_FILE_COUNT':
                errorResponse = {
                    success: false,
                    message: 'Troppi file',
                    type: 'TOO_MANY_FILES'
                };
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                errorResponse = {
                    success: false,
                    message: 'Campo file non previsto',
                    type: 'UNEXPECTED_FILE'
                };
                break;
            default:
                errorResponse = {
                    success: false,
                    message: 'Errore upload file',
                    type: 'UPLOAD_ERROR'
                };
        }
    } else if (error.type === 'entity.parse.failed') {
        // Errori parsing JSON
        statusCode = 400;
        errorResponse = {
            success: false,
            message: 'JSON non valido',
            type: 'INVALID_JSON'
        };
    } else if (error.type === 'entity.too.large') {
        // Payload troppo grande
        statusCode = 413;
        errorResponse = {
            success: false,
            message: 'Richiesta troppo grande',
            type: 'PAYLOAD_TOO_LARGE'
        };
    } else {
        // Errori generici o personalizzati
        statusCode = error.statusCode || error.status || 500;

        if (statusCode < 500) {
            // Errori client (4xx) - mostra il messaggio
            errorResponse = {
                success: false,
                message: error.message || 'Richiesta non valida',
                type: error.type || 'CLIENT_ERROR'
            };
        } else {
            // Errori server (5xx) - messaggio generico per sicurezza
            errorResponse = {
                success: false,
                message: process.env.NODE_ENV === 'production'
                    ? 'Errore interno del server'
                    : error.message,
                type: 'INTERNAL_SERVER_ERROR'
            };
        }
    }

    // In development, aggiungi stack trace
    if (process.env.NODE_ENV !== 'production') {
        errorResponse.stack = error.stack;
        errorResponse.details = {
            name: error.name,
            code: error.code,
            originalUrl: req.originalUrl,
            method: req.method
        };
    }

    // Invia risposta di errore
    res.status(statusCode).json(errorResponse);
};

/**
 * Middleware per gestire rotte non trovate (404)
 */
const notFoundHandler = (req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    res.status(404).json({
        success: false,
        message: 'Endpoint non trovato',
        error: {
            type: 'ROUTE_NOT_FOUND',
            method: req.method,
            path: req.originalUrl
        }
    });
};

/**
 * Wrapper per funzioni async che cattura automaticamente gli errori
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Middleware di validazione personalizzato
 */
const validationHandler = (req, res, next) => {
    const errors = require('express-validator').validationResult(req);

    if (!errors.isEmpty()) {
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';
        validationError.errors = errors;
        return next(validationError);
    }

    next();
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    validationHandler,
    handleValidationError,
    handleDatabaseError,
    handleJWTError
};