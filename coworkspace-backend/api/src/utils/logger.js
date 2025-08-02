// src/utils/logger.js - Logger completo con Winston
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crea directory logs se non exists
const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Configurazione livelli e colori
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'cyan'
};

winston.addColors(logColors);

// Formato per console (development)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaString = '';
        if (Object.keys(meta).length > 0) {
            metaString = '\n' + JSON.stringify(meta, null, 2);
        }
        return `${timestamp} [${level}]: ${message}${metaString}`;
    })
);

// Formato per file (production)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Configurazione transports
const transports = [];

// Console transport (sempre attivo)
transports.push(
    new winston.transports.Console({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true
    })
);

// File transports (solo se LOG_DIR è configurato o in produzione)
if (process.env.NODE_ENV === 'production' || process.env.LOG_DIR) {
    // Log di errore
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 10,
            handleExceptions: true,
            handleRejections: true
        })
    );

    // Log combinato
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 15
        })
    );

    // Log HTTP (per morgan)
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'access.log'),
            level: 'http',
            format: fileFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 10
        })
    );
}

// Crea il logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    levels: logLevels,
    format: fileFormat,
    transports,
    exitOnError: false
});

// Estende il logger con metodi personalizzati
logger.extend = function(moduleName) {
    return {
        error: (message, meta = {}) => logger.error(`[${moduleName}] ${message}`, meta),
        warn: (message, meta = {}) => logger.warn(`[${moduleName}] ${message}`, meta),
        info: (message, meta = {}) => logger.info(`[${moduleName}] ${message}`, meta),
        http: (message, meta = {}) => logger.http(`[${moduleName}] ${message}`, meta),
        debug: (message, meta = {}) => logger.debug(`[${moduleName}] ${message}`, meta)
    };
};

// Metodi di utilità
logger.logRequest = function(req, res, responseTime) {
    const logData = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLength: res.get('Content-Length') || 0
    };

    if (req.user) {
        logData.userId = req.user.id;
        logData.userEmail = req.user.email;
    }

    const level = res.statusCode >= 400 ? 'warn' : 'http';
    this[level]('HTTP Request', logData);
};

logger.logError = function(error, context = {}) {
    const errorData = {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...context
    };

    this.error('Application Error', errorData);
};

logger.logDatabase = function(query, params, duration, error = null) {
    const logData = {
        query: query.replace(/\s+/g, ' ').trim(),
        paramsCount: params?.length || 0,
        duration: `${duration}ms`
    };

    if (error) {
        logData.error = error.message;
        logData.errorCode = error.code;
        this.error('Database Query Failed', logData);
    } else {
        this.debug('Database Query', logData);
    }
};

logger.logAuth = function(action, userId, email, success = true, details = {}) {
    const logData = {
        action,
        userId,
        email,
        success,
        timestamp: new Date().toISOString(),
        ...details
    };

    const level = success ? 'info' : 'warn';
    this[level](`Auth: ${action}`, logData);
};

logger.logPayment = function(action, paymentId, amount, currency, userId, success = true, details = {}) {
    const logData = {
        action,
        paymentId,
        amount,
        currency,
        userId,
        success,
        timestamp: new Date().toISOString(),
        ...details
    };

    const level = success ? 'info' : 'error';
    this[level](`Payment: ${action}`, logData);
};

logger.logBooking = function(action, bookingId, spaceId, userId, details = {}) {
    const logData = {
        action,
        bookingId,
        spaceId,
        userId,
        timestamp: new Date().toISOString(),
        ...details
    };

    this.info(`Booking: ${action}`, logData);
};

// Stream per Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Gestione graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT. Closing logger...');
    logger.end();
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Closing logger...');
    logger.end();
});

// Log startup info
logger.info('Logger initialized', {
    level: logger.level,
    environment: process.env.NODE_ENV || 'development',
    logDir: logDir,
    transportsCount: transports.length
});

module.exports = logger;