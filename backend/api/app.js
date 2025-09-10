/**
 * CoWorkSpace Backend Application
 * Main Express app configuration with frontend integration
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const bcrypt = require('bcryptjs');

// Internal imports
const logger = require('./src/utils/logger');
const db = require('./src/config/database');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const User = require('./src/models/User'); // O il percorso corretto

// Passport configuration - NUOVO
const passport = require('./src/config/passport');

// Route imports
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const spaceRoutes = require('./src/routes/spaces');
const bookingRoutes = require('./src/routes/bookings');
const paymentRoutes = require('./src/routes/payments');
const analyticsRoutes = require('./src/routes/analytics');
const adminRoutes = require('./src/routes/admin');
const managerRoutes = require('./src/routes/manager');

// ===============================================
// ===== EXPRESS APP & CORE MIDDLEWARE SETUP =====
// ===============================================
const app = express();

// Trust proxy for accurate IP addresses if behind a reverse proxy
app.set('trust proxy', 1);

// ===== CORS CONFIGURATION (UNIFIED) =====

const corsOptions = {
    origin: function (origin, callback) {
        // Lista base di origins consentiti
        let allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:8080')
            .split(',')
            .map(url => url.trim())
            .filter(Boolean);

        // Aggiungi sempre questi origins (anche in production per il reset password)
        allowedOrigins = [
            ...allowedOrigins,
            'http://localhost:3000',     // Per reset password
            'http://127.0.0.1:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3001',
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost:5000'
        ];

        // Permetti richieste senza origin (come richieste dirette) o se origin è nella lista
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight requests for all routes

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

// ===== LOGGING =====
if (process.env.ENABLE_REQUEST_LOGGING !== 'false') {
    const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
    app.use(morgan(morganFormat, {
        stream: { write: (message) => logger.info(message.trim()) },
        skip: (req) => (req.path === '/api/health' || req.path === '/health'),
    }));
}

// ===== BODY PARSING MIDDLEWARE =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== COMPRESSION =====
app.use(compression());

// ===== PASSPORT INITIALIZATION - NUOVO =====
app.use(passport.initialize());
// Non usiamo passport.session() perché utilizziamo JWT invece di sessioni

// ===== STATIC FILES (for uploaded content) =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ======================================
// ===== API ROUTES & HEALTH CHECKS =====
// ======================================

// Health checks
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');

        // Test Google OAuth configuration
        const googleConfigOk = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

        res.status(200).json({
            success: true,
            message: 'CoWorkSpace API is operational',
            services: {
                database: 'healthy',
                googleOAuth: googleConfigOk ? 'configured' : 'missing_config'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({ success: false, message: 'Service unhealthy' });
    }
});

// OAuth configuration check endpoint
app.get('/api/oauth/status', (req, res) => {
    const hasGoogleConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

    res.json({
        success: true,
        oauth: {
            google: {
                enabled: hasGoogleConfig,
                clientId: process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing',
                clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing',
                redirectUri: process.env.GOOGLE_REDIRECT_URI || '/api/auth/google/callback'
            }
        }
    });
});

// Rotta di benvenuto per la radice (/)
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Benvenuto nella API di CoWorkSpace!'
    });
});

// Main API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/manager', managerRoutes);

// ===== SWAGGER DOCUMENTATION (Optional) =====
if (process.env.ENABLE_SWAGGER === 'true') {
    try {
        const swaggerUi = require('swagger-ui-express');
        const swaggerDocument = require('./docs/swagger.json');
        app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
        logger.info('📚 Swagger documentation available at /api/docs');
    } catch (error) {
        logger.warn('Swagger documentation not available:', error.message);
    }
}

// =============================
// ===== ERROR HANDLING =====
// =============================
app.use(notFoundHandler); // Handle 404 for routes not found
app.use(errorHandler);    // General error handler

// ======================================
// ===== DATABASE & SERVER STARTUP =====
// ======================================

/**
 * Checks if a default admin user exists, and creates one if not.
 */
async function ensureDefaultAdmin() {
    try {
        const existingAdmins = await User.findAll({
            where: { role: 'admin' },
            limit: 1
        });

        if (existingAdmins.length === 0) {
            logger.info('Nessun admin trovato, creazione admin predefinito...');

            const ADMIN_CREDENTIALS = {
                email: process.env.ADMIN_EMAIL || 'admin@coworkspace.test',
                password: process.env.ADMIN_PASSWORD || 'Admin123',
                first_name: 'Admin',
                last_name: 'CoWorkSpace'
            };

            const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, 12);

            await User.create({
                email: ADMIN_CREDENTIALS.email,
                password_hash: hashedPassword,
                first_name: ADMIN_CREDENTIALS.first_name,
                last_name: ADMIN_CREDENTIALS.last_name,
                role: 'admin',
                status: 'active',
                email_verified: true,
                company: 'CoWorkSpace System',
                google_id: null,
                avatar_url: null
            });

            logger.info('✅ Admin predefinito creato con email:', ADMIN_CREDENTIALS.email);
        } else {
            logger.info('Admin già esistente nel sistema');
        }
    } catch (error) {
        logger.error('❌ Errore durante la verifica/creazione dell\'admin:', error);
        throw error;
    }
}

/**
 * Validates OAuth configuration
 */
function validateOAuthConfig() {
    const requiredVars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        logger.warn('⚠️  Google OAuth configuration incomplete:');
        missing.forEach(varName => {
            logger.warn(`   - ${varName}: Missing`);
        });
        logger.warn('   Google OAuth will not work until these are configured.');
        return false;
    }

    logger.info('✅ Google OAuth configuration validated');
    logger.info('   - Client ID: Set');
    logger.info('   - Client Secret: Set');
    logger.info('   - Redirect URI:', process.env.GOOGLE_REDIRECT_URI || '/api/auth/google/callback');
    return true;
}

/**
 * Initializes database and starts the Express server.
 */
const startServer = async () => {
    try {
        // 1. Initialize database connection
        logger.info('🔄 Initializing database connection...');
        await db.connectDatabase();
        logger.info('✅ Database connection successful');

        // 2. Validate OAuth configuration
        const oauthConfigOk = validateOAuthConfig();

        // 3. Ensure default admin exists
        await ensureDefaultAdmin();

        // 4. Start HTTP server
        const PORT = process.env.PORT || 3000;
        const HOST = process.env.HOST || '0.0.0.0';

        const server = app.listen(PORT, HOST, () => {
            logger.info('🚀 CoWorkSpace API Server started successfully!');
            logger.info(`🔗 Listening on: http://${HOST}:${PORT}`);
            logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

            if (oauthConfigOk) {
                logger.info('🔐 Google OAuth: Ready');
                logger.info(`   Login URL: http://${HOST}:${PORT}/api/auth/google`);
            } else {
                logger.warn('🔐 Google OAuth: Not configured (see warnings above)');
            }

            logger.info('🏥 Health check: /api/health');
            logger.info('🔧 OAuth status: /api/oauth/status');
        });

        // Graceful shutdown handling
        const gracefulShutdown = (signal) => {
            logger.info(`🔴 Received ${signal}. Starting graceful shutdown...`);
            server.close(() => {
                logger.info('✅ HTTP server closed');
                db.closeDatabase().then(() => {
                    logger.info('✅ Database connection closed');
                    process.exit(0);
                });
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions globally
process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    process.exit(1); // Exit immediately on uncaught exceptions
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;