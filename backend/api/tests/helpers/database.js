// tests/helpers/database.js

const { pool, query } = require('../../src/config/database'); // Importa il pool e la funzione query del tuo progetto!
const logger = require('../../src/utils/logger');

/**
 * Pulisce tutte le tabelle di test in ordine inverso di dipendenza
 * per rispettare i vincoli di foreign key.
 */
const cleanTestDB = async () => {
    logger.info('🔄 Cleaning test database...');
    try {
        // Le tabelle con foreign key verso altre tabelle vengono prima.
        await query('DELETE FROM bookings WHERE TRUE');
        await query('DELETE FROM payments WHERE TRUE');
        await query('DELETE FROM reviews WHERE TRUE');
        await query('DELETE FROM notifications WHERE TRUE');
        await query('DELETE FROM audit_logs WHERE TRUE');
        await query('DELETE FROM space_availability WHERE TRUE');

        // Ora le tabelle principali.
        await query('DELETE FROM spaces WHERE TRUE');

        // Infine, la tabella degli utenti (solo quelli di test).
        await query("DELETE FROM users WHERE email LIKE '%@test.com'");

        logger.info('✅ Test database cleaned successfully.');
    } catch (error) {
        logger.error('❌ Cleaning test database failed:', error);
        // Lancia l'errore per far fallire il test e capire subito il problema
        throw error;
    }
};

/**
 * Funzione di setup globale (eseguita una volta prima di tutti i test).
 * NOTA: La creazione e migrazione del DB via docker-compose è OK qui,
 * ma la pulizia tra i test deve usare il client pg.
 */
const setupGlobal = async () => {
    logger.info('🚀 Global setup for integration tests...');
    // Qui puoi mantenere la logica di creazione del db se necessario,
    // ma la pulizia e il seeding sono gestiti da TestDataSeeder.
};

/**
 * Funzione di teardown globale (eseguita una volta dopo tutti i test).
 * Chiude il pool di connessioni per permettere a Jest di terminare correttamente.
 */
const teardownGlobal = async () => {
    logger.info('🧹 Global teardown for integration tests...');
    try {
        await pool.end(); // Chiude tutte le connessioni nel pool
        logger.info('PostgreSQL pool has been closed.');
    } catch (error) {
        logger.error('Error during global teardown:', error);
    }
};

module.exports = {
    cleanTestDB,
    setupGlobal,
    teardownGlobal
};