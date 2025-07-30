/**
 * CoWorkSpace API Server
 * Entry point dell'applicazione
 */

require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Gestione graceful shutdown
 */
let server;

const gracefulShutdown = (signal) => {
    logger.info(`Ricevuto ${signal}. Avvio graceful shutdown...`);

    if (server) {
        server.close((err) => {
            if (err) {
                logger.error('Errore durante la chiusura del server:', err);
                process.exit(1);
            }

            logger.info('Server chiuso correttamente');
            process.exit(0);
        });

        // Force close dopo 30 secondi
        setTimeout(() => {
            logger.error('Timeout durante shutdown, forzo la chiusura');
            process.exit(1);
        }, 30000);
    } else {
        process.exit(0);
    }
};

/**
 * Gestione errori non catturati
 */
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Gestione segnali di sistema
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Inizializzazione dell'applicazione
 */
async function startServer() {
    try {
        // Connessione al database
        logger.info('🔌 Connessione al database...');
        await connectDatabase();
        logger.info('✅ Database connesso correttamente');

        // Connessione a Redis
        logger.info('🔌 Connessione a Redis...');
        await connectRedis();
        logger.info('✅ Redis connesso correttamente');

        // Avvio del server
        server = app.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 Server CoWorkSpace avviato!`);
            logger.info(`📍 Ambiente: ${NODE_ENV}`);
            logger.info(`🌐 URL: http://localhost:${PORT}`);
            logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
            logger.info(`💚 Health Check: http://localhost:${PORT}/api/health`);

            if (NODE_ENV === 'development') {
                logger.info('🔧 Modalità sviluppo attiva - Hot reload abilitato');
            }
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`❌ Porta ${PORT} già in uso`);
            } else {
                logger.error('❌ Errore del server:', err);
            }
            process.exit(1);
        });

    } catch (error) {
        logger.error('❌ Errore durante l\'avvio del server:', error);
        process.exit(1);
    }
}

// Avvio dell'applicazione
startServer();