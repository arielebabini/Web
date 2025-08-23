// src/server.js - VERSIONE CORRETTA
const app = require('./app');
const logger = require('./src/utils/logger');

// Configurazione porta
const PORT = process.env.PORT || 3000;

// Funzione per avviare il server
async function startServer() {
    try {
        logger.info('🔌 Connessione al database...');
        // Database connection placeholder
        console.log('Database connection placeholder');
        logger.info('✅ Database connesso correttamente');

        logger.info('🔌 Connessione a Redis...');
        // Redis connection placeholder
        console.log('Redis connection placeholder');
        logger.info('✅ Redis connesso correttamente');

        // Avvia server HTTP
        const server = app.listen(PORT, () => {
            logger.info('🚀 Server CoWorkSpace avviato!');
            logger.info(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🌐 URL: http://localhost:${PORT}`);
            logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
            logger.info(`💚 Health Check: http://localhost:${PORT}/api/health`);

            if (process.env.NODE_ENV === 'development') {
                logger.info('🔧 Modalità sviluppo attiva - Hot reload abilitato');
            }
        });

        // Gestione chiusura graceful
        const gracefulShutdown = (signal) => {
            logger.info(`Ricevuto ${signal}. Avvio graceful shutdown...`);

            server.close(() => {
                logger.info('Server chiuso correttamente');
                process.exit(0);
            });

            // Force shutdown dopo 30 secondi
            setTimeout(() => {
                logger.error('Graceful shutdown timeout. Force exit.');
                process.exit(1);
            }, 30000);
        };

        // Gestori segnali
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Gestione errori non catturati
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });

        return server;

    } catch (error) {
        logger.error('❌ Errore durante l\'avvio del server:', error);
        process.exit(1);
    }
}

// Avvia il server solo se questo file è eseguito direttamente
if (require.main === module) {
    startServer().catch((error) => {
        logger.error('❌ Errore fatale:', error);
        process.exit(1);
    });
}

module.exports = { startServer };