// src/app.js - Applicazione Express CORRETTA
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Import locali
const logger = require('./utils/logger');
const db = require('./config/database');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/auth');

// Import route (con try-catch per evitare errori se non esistono)
let authRoutes, userRoutes, spaceRoutes, bookingRoutes, paymentRoutes;
try {
    authRoutes = require('./routes/auth');
    logger.info('✅ Auth routes loaded successfully');
} catch (e) {
    logger.error('❌ Auth routes failed to load:', {
        message: e.message,
        stack: e.stack
    });
}
try {
    userRoutes = require('./routes/users');
    logger.info('✅ User routes loaded successfully');
} catch (e) {
    logger.warn('⚠️ User routes not found, skipping...');
}
try {
    spaceRoutes = require('./routes/spaces');
    logger.info('✅ Space routes loaded successfully');
} catch (e) {
    logger.warn('⚠️ Space routes not found, skipping...');
}
try {
    bookingRoutes = require('./routes/bookings');
    logger.info('✅ Booking routes loaded successfully');
} catch (e) {
    logger.warn('⚠️ Booking routes not found, skipping...');
}
try {
    paymentRoutes = require('./routes/payments');
    logger.info('✅ Payment routes loaded successfully');
} catch (e) {
    logger.warn('⚠️ Payment routes not found, skipping...');
}

const app = express();

// ===== TRUST PROXY =====
// Importante per rate limiting e IP real con reverse proxy
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// ===== SECURITY MIDDLEWARE =====
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

// ===== CORS CONFIGURATION =====
const allowedOrigins = [
    process.env.CORS_ORIGIN || 'http://localhost:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3000'
];

const corsOptions = {
    origin: (origin, callback) => {
        // Permetti richieste senza origin (app mobile, Postman, ecc) solo in development
        if (!origin && process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Non consentito dal CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));

// ===== COMPRESSION =====
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024
}));

// ===== BODY PARSING =====
app.use(express.json({
    limit: process.env.UPLOAD_MAX_SIZE || '10mb',
    type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({
    extended: true,
    limit: process.env.UPLOAD_MAX_SIZE || '10mb'
}));

// ===== LOGGING =====
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
    stream: logger.stream,
    skip: (req) => {
        // Skip logging per health check in produzione
        return process.env.NODE_ENV === 'production' && req.path === '/api/health';
    }
}));

// ===== RATE LIMITING =====
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minuti
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 100 : 1000),
    message: {
        success: false,
        error: 'Troppe richieste da questo IP, riprova più tardi.',
        retryAfter: '15 minuti'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting per health check e docs
        return req.path === '/api/health' || req.path.startsWith('/api/docs');
    },
    handler: (req, res) => {
        logger.warn (`Rate limit exceeded for IP: ${req.ip}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl
        });
        res.status(429).json({
            success: false,
            message: 'Troppe richieste da questo IP, riprova più tardi.',
            error: {
                type: 'RATE_LIMIT_EXCEEDED',
                retryAfter: '15 minuti'
            }
        });
    }
});

app.use('/api/', limiter);

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    const healthcheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        services: {
            database: 'unknown',
            redis: 'unknown',
            email: 'unknown'
        }
    };

    // Test database connection
    db.query('SELECT 1')
        .then(() => {
            healthcheck.services.database = 'connected';
        })
        .catch(() => {
            healthcheck.services.database = 'disconnected';
            healthcheck.status = 'degraded';
        })
        .finally(() => {
            // Test Redis connection
            try {
                const redis = require('./config/redis');
                if (redis && redis.ping) {
                    redis.ping()
                        .then(() => {
                            healthcheck.services.redis = 'connected';
                        })
                        .catch(() => {
                            healthcheck.services.redis = 'disconnected';
                        })
                        .finally(() => sendHealthResponse());
                } else {
                    healthcheck.services.redis = 'not_configured';
                    sendHealthResponse();
                }
            } catch (error) {
                healthcheck.services.redis = 'not_configured';
                sendHealthResponse();
            }
        });

    function sendHealthResponse() {
        // Check email service
        try {
            const emailService = require('./services/emailService');
            healthcheck.services.email = emailService.isMockMode() ? 'mock_mode' : 'configured';
        } catch (error) {
            healthcheck.services.email = 'not_configured';
        }

        const statusCode = healthcheck.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(healthcheck);
    }
});

// ===== API ROUTES =====
if (authRoutes) {
    app.use('/api/auth', authRoutes);
}
if (userRoutes && requireAuth) {
    app.use('/api/users', requireAuth, userRoutes);
}
if (spaceRoutes) {
    app.use('/api/spaces', spaceRoutes);
}
if (bookingRoutes && requireAuth) {
    app.use('/api/bookings', requireAuth, bookingRoutes);
}
if (paymentRoutes && requireAuth) {
    app.use('/api/payments', requireAuth, paymentRoutes);
}

// ===== SWAGGER DOCUMENTATION =====
if (process.env.ENABLE_SWAGGER !== 'false') {
    try {
        const swaggerUi = require('swagger-ui-express');
        const swaggerJsdoc = require('swagger-jsdoc');

        const swaggerOptions = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: 'CoWorkSpace API',
                    version: '1.0.0',
                    description: 'API REST completa per la gestione di spazi di coworking',
                    contact: {
                        name: 'CoWorkSpace Team',
                        email: 'support@coworkspace.com'
                    }
                },
                servers: [
                    {
                        url: process.env.API_BASE_URL || 'http://localhost:3000',
                        description: 'Development server'
                    }
                ],
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT'
                        }
                    }
                }
            },
            apis: ['./src/routes/*.js', './src/models/*.js']
        };

        const specs = swaggerJsdoc(swaggerOptions);
        app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
            customSiteTitle: 'CoWorkSpace API Documentation',
            customfavIcon: '/favicon.ico',
            customCss: '.swagger-ui .topbar { display: none }'
        }));

        logger.info('📚 Swagger documentation available at /api/docs');
    } catch (error) {
        logger.warn('Swagger setup failed:', error.message);
    }
}

// ===== 404 HANDLER =====
app.use('*', (req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
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
});

// ===== ERROR HANDLER =====
app.use(errorHandler);

// ===== SERVER STARTUP =====
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Connessione database
        logger.info('🔄 Initializing database connection...');
        await db.connectDatabase();

        // Test Redis (opzionale)
        try {
            // Redis config non disponibile, skip per ora
            logger.info('⚠️ Redis configuration not available, skipping...');
        } catch (redisError) {
            logger.warn('⚠️ Redis not available (continuing without cache):', redisError.message);
        }

        // Avvia server
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`, {
                environment: process.env.NODE_ENV || 'development',
                port: PORT,
                pid: process.pid,
                timestamp: new Date().toISOString()
            });

            logger.info(`📖 Health check: http://localhost:${PORT}/api/health`);
            if (process.env.ENABLE_SWAGGER !== 'false') {
                logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
            }
        });

        // Graceful shutdown
        const gracefulShutdown = (signal) => {
            logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

            server.close(async (err) => {
                if (err) {
                    logger.error('❌ Error during server shutdown:', err);
                    process.exit(1);
                }

                logger.info('✅ HTTP server closed');

                try {
                    // Chiudi connessioni database
                    await db.closePool();
                    logger.info('✅ Database connections closed');
                } catch (dbError) {
                    logger.error('❌ Error closing database:', dbError);
                }

                try {
                    // Chiudi Redis se presente (skip per ora)
                    logger.info('✅ Redis connection closed (skipped)');
                } catch (redisError) {
                    logger.warn('⚠️ Redis cleanup skipped:', redisError.message);
                }

                logger.info('👋 Graceful shutdown completed');
                process.exit(0);
            });

            // Force shutdown dopo 30 secondi
            setTimeout(() => {
                logger.error('⏰ Graceful shutdown timeout. Forcing exit...');
                process.exit(1);
            }, 30000);
        };

        // Process event handlers
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        process.on('uncaughtException', (error) => {
            logger.error('💥 Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('💥 Unhandled Rejection:', { reason, promise });
            gracefulShutdown('unhandledRejection');
        });

        return server;

    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Avvia server solo se non è in modalità test
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = app;