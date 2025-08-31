/**
 * CoWorkSpace Backend Application
 * Main Express app configuration with frontend integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Internal imports
const logger = require('./src/utils/logger');
const db = require('./src/config/database');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports - COMMENTATI TEMPORANEAMENTE PER TEST GRADUALE
// const authRoutes = require('./src/routes/auth');
// const userRoutes = require('./src/routes/users');
// const spaceRoutes = require('./src/routes/spaces');
// const bookingRoutes = require('./src/routes/bookings');
const paymentRoutes = require('./src/routes/payments');
const analyticsRoutes = require('./src/routes/analytics');

// ===== EXPRESS APP SETUP =====
const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// ===== CORS CONFIGURATION =====
const corsOptions = {
    origin: function (origin, callback) {
        // List of allowed origins from environment
        const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001')
            .split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0);

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-User-Agent'
    ],
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// ===== SECURITY MIDDLEWARE =====
if (process.env.ENABLE_HELMET !== 'false') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                scriptSrc: ["'self'"],
                connectSrc: ["'self'", process.env.FRONTEND_URL].filter(Boolean)
            }
        },
        crossOriginEmbedderPolicy: false
    }));
}

// ===== RATE LIMITING =====
if (process.env.ENABLE_RATE_LIMITING !== 'false') {
    const limiter = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
        message: {
            success: false,
            message: 'Too many requests from this IP, please try again later',
            error: {
                type: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
            }
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/api/health' || req.path === '/health';
        }
    });

    app.use('/api/', limiter);
}

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

// ===== LOGGING =====
if (process.env.ENABLE_REQUEST_LOGGING !== 'false') {
    const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

    app.use(morgan(morganFormat, {
        stream: {
            write: (message) => {
                logger.info(message.trim());
            }
        },
        skip: (req) => {
            // Skip logging for health checks in production
            return process.env.NODE_ENV === 'production' &&
                (req.path === '/api/health' || req.path === '/health');
        }
    }));
}

// ===== BODY PARSING =====
app.use(express.json({
    limit: '10mb',
    strict: true
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// ===== STATIC FILES (for uploaded content) =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true
}));

// ===== PREFLIGHT HANDLING =====
app.options('*', cors(corsOptions));

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'CoWorkSpace API is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});

app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const dbTest = await db.query('SELECT 1 as test');
        const dbHealthy = dbTest.rows.length > 0;

        // System info
        const healthData = {
            success: true,
            message: 'CoWorkSpace API is operational',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            services: {
                database: dbHealthy ? 'healthy' : 'unhealthy',
                redis: 'optional', // Will be implemented when Redis is added
                email: 'mock' // Currently in mock mode
            },
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
            }
        };

        res.status(200).json(healthData);
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            success: false,
            message: 'Service unhealthy',
            error: {
                type: 'HEALTH_CHECK_FAILED',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
            }
        });
    }
});

// ===== API ROUTES - SOLO QUELLE CHE FUNZIONANO =====
// app.use('/api/auth', authRoutes);              // ← COMMENTATA PER TEST
// app.use('/api/users', userRoutes);             // ← COMMENTATA PER TEST
// app.use('/api/spaces', spaceRoutes);           // ← COMMENTATA PER TEST
// app.use('/api/bookings', bookingRoutes);       // ← COMMENTATA PER TEST
app.use('/api/payments', paymentRoutes);         // ← SOLO QUELLE CHE FUNZIONANO
app.use('/api/analytics', analyticsRoutes);      // ← SOLO QUELLE CHE FUNZIONANO

// ===== API INFO ENDPOINT =====
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'CoWorkSpace API v1.0 - Partial Mode',
        documentation: process.env.ENABLE_SWAGGER === 'true' ? '/api/docs' : 'disabled',
        endpoints: {
            health: '/api/health',
            // auth: '/api/auth',        // ← COMMENTATO
            // users: '/api/users',      // ← COMMENTATO
            // spaces: '/api/spaces',    // ← COMMENTATO
            // bookings: '/api/bookings', // ← COMMENTATO
            payments: '/api/payments',
            analytics: '/api/analytics'
        },
        environment: process.env.NODE_ENV || 'development',
        frontend: process.env.FRONTEND_URL || 'http://localhost:3001',
        cors: {
            allowedOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3001').split(',')
        },
        note: "🔧 Running in partial mode - some routes disabled for testing"
    });
});

// ===== SWAGGER DOCUMENTATION (OPZIONALE) =====
if (process.env.ENABLE_SWAGGER === 'true') {
    const swaggerUi = require('swagger-ui-express');
    const swaggerDocument = require('./docs/swagger.json');

    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'CoWorkSpace API Documentation'
    }));

    logger.info('📚 Swagger documentation available at /api/docs');
}

// ===== 404 HANDLER =====
app.use('*', (req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        error: {
            type: 'ROUTE_NOT_FOUND',
            method: req.method,
            path: req.originalUrl,
            suggestion: 'Check /api for available endpoints'
        }
    });
});

// ===== ERROR HANDLER =====
app.use(errorHandler);

// ===== DATABASE CONNECTION =====
const initializeDatabase = async () => {
    logger.info('🔄 Initializing database connection...');

    try {
        const isConnected = await db.connectDatabase();

        if (isConnected) {
            // Verify tables exist
            const tablesQuery = `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN ('users', 'spaces', 'bookings', 'payments')
                ORDER BY table_name
            `;

            const result = await db.query(tablesQuery);
            const existingTables = result.rows.map(row => row.table_name);

            logger.info('📋 Database tables found:', existingTables);

            if (existingTables.length === 0) {
                logger.warn('⚠️ No tables found. Run database migrations first.');
            }

            return true;
        }

        return false;
    } catch (error) {
        logger.error('❌ Database initialization failed:', error);
        return false;
    }
};

// ===== REDIS CONNECTION (OPZIONALE) =====
const initializeRedis = () => {
    if (process.env.REDIS_HOST) {
        try {
            // Redis initialization - to be implemented when needed
            logger.info('✅ Redis configuration available');
        } catch (error) {
            logger.error('❌ Redis connection failed:', error);
        }
    } else {
        logger.info('ℹ️ Redis configuration not provided, skipping...');
    }
};

// ===== SERVER STARTUP =====
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Initialize database
        const dbConnected = await initializeDatabase();

        if (!dbConnected) {
            logger.error('❌ Cannot start server: Database connection failed');
            process.exit(1);
        }

        // Initialize Redis (optional)
        initializeRedis();

        // Start server
        const server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 CoWorkSpace API Server running on port ${PORT}`, {
                environment: process.env.NODE_ENV || 'development',
                port: PORT,
                pid: process.pid,
                frontend: process.env.FRONTEND_URL || 'http://localhost:3001'
            });

            logger.info(`📍 Health check: http://localhost:${PORT}/api/health`);
            logger.info(`📖 API info: http://localhost:${PORT}/api`);

            if (process.env.ENABLE_SWAGGER === 'true') {
                logger.info(`📚 API docs: http://localhost:${PORT}/api/docs`);
            }

            logger.info('🎉 CoWorkSpace Backend partially operational!');
            logger.info('🔧 Note: Some routes disabled for testing - will enable gradually');
        });

        // Graceful shutdown
        const gracefulShutdown = (signal) => {
            logger.info(`🛑 ${signal} received: closing HTTP server`);

            server.close(async () => {
                logger.info('📡 HTTP server closed');

                try {
                    await db.closePool();
                    logger.info('🔌 Database pool closed');
                } catch (error) {
                    logger.error('❌ Error closing database pool:', error);
                }

                process.exit(0);
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        return server;
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;