/**
 * CoWorkSpace API Application
 * Configurazione principale dell'applicazione Express
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import delle rotte
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const spaceRoutes = require('./routes/spaces');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');

const app = express();

// ===== MIDDLEWARE DI SICUREZZA =====

// Helmet per headers di sicurezza
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3001', // Frontend React
            'http://localhost:3000', // Frontend alternativo
            'https://coworkspace.vercel.app', // Frontend produzione
            process.env.CORS_ORIGIN
        ].filter(Boolean);

        // Permetti richieste senza origin (Postman, mobile apps, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Non permesso da CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // max richieste per IP
    message: {
        error: 'Troppe richieste da questo IP, riprova più tardi.',
        retryAfter: '15 minuti'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// ===== MIDDLEWARE GENERALI =====

// Compressione gzip
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging delle richieste
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// ===== SWAGGER DOCUMENTATION =====

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CoWorkSpace API',
            version: '1.0.0',
            description: 'API per la gestione di spazi di coworking',
            contact: {
                name: 'CoWorkSpace Team',
                email: 'api@coworkspace.com'
            }
        },
        servers: [
            {
                url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
                description: 'Server di sviluppo'
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
    apis: ['./src/routes/*.js'], // Path ai file con annotazioni JSDoc
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ===== HEALTH CHECK =====

app.get('/api/health', (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services: {
            database: 'connected', // TODO: check database connection
            redis: 'connected', // TODO: check redis connection
        }
    };

    try {
        res.status(200).json(healthCheck);
    } catch (error) {
        healthCheck.status = 'ERROR';
        healthCheck.error = error.message;
        res.status(503).json(healthCheck);
    }
});

// ===== DOCUMENTAZIONE API =====

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CoWorkSpace API Docs'
}));

// Endpoint per il JSON schema di Swagger
app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// ===== ROTTE API =====

// Messaggio di benvenuto
app.get('/api', (req, res) => {
    res.json({
        message: '🏢 Benvenuto nell\'API CoWorkSpace!',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/api/health',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            spaces: '/api/spaces',
            bookings: '/api/bookings',
            payments: '/api/payments'
        }
    });
});

// Registrazione delle rotte
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);

// ===== ERROR HANDLING =====

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint non trovato',
        message: `La rotta ${req.method} ${req.originalUrl} non esiste`,
        availableEndpoints: '/api/docs'
    });
});

// Error handler globale
app.use(errorHandler);

// ===== EXPORT =====

module.exports = app;