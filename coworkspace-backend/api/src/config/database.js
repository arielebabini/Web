// src/config/database.js - Configurazione PostgreSQL REALE
const { Pool } = require('pg');
const logger = require('../utils/logger');

// Configurazione database
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'coworkspace',
    user: process.env.DB_USER || 'coworkspace_user',
    password: process.env.DB_PASSWORD || 'coworkspace_password',

    // Configurazioni pool connessioni
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,

    // SSL configuration (per produzione)
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,

    // Query timeout
    statement_timeout: 30000,
    query_timeout: 30000,
};

// Crea pool di connessioni
const pool = new Pool(dbConfig);

// Event handlers per il pool
pool.on('connect', (client) => {
    logger.debug(`🔌 Nuova connessione database stabilita (PID: ${client.processID})`);
});

pool.on('acquire', (client) => {
    logger.debug(`🎣 Connessione acquisita dal pool (PID: ${client.processID})`);
});

pool.on('error', (err, client) => {
    logger.error('🚨 Errore connessione database:', err);
    // Non terminare il processo, lascia che il pool gestisca la riconnessione
});

pool.on('remove', (client) => {
    logger.debug(`🗑️ Connessione rimossa dal pool (PID: ${client.processID})`);
});

/**
 * Esegue una query con parametri
 * @param {string} text - Query SQL
 * @param {Array} params - Parametri per la query
 * @returns {Promise<Object>} Risultato della query
 */
const query = async (text, params = []) => {
    const start = Date.now();

    try {
        logger.debug('📝 Executing query:', {
            sql: text.replace(/\s+/g, ' ').trim(),
            params: params.length > 0 ? '***' : '(no params)',
            paramsCount: params.length
        });

        const result = await pool.query(text, params);
        const duration = Date.now() - start;

        logger.debug(`✅ Query completed in ${duration}ms`, {
            rowCount: result.rowCount,
            duration: `${duration}ms`
        });

        return result;
    } catch (error) {
        const duration = Date.now() - start;

        logger.error(`❌ Query failed after ${duration}ms:`, {
            error: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint,
            sql: text.replace(/\s+/g, ' ').trim(),
            duration: `${duration}ms`
        });

        // Rilancia l'errore per essere gestito dal chiamante
        throw error;
    }
};

/**
 * Esegue una transazione
 * @param {Function} callback - Funzione che esegue le operazioni nella transazione
 * @returns {Promise<any>} Risultato della transazione
 */
const transaction = async (callback) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        logger.debug('🔄 Transazione iniziata');

        const result = await callback(client);

        await client.query('COMMIT');
        logger.debug('✅ Transazione committata');

        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('🔄 Transazione rollback:', error);
        throw error;
    } finally {
        client.release();
        logger.debug('🔓 Client rilasciato alla pool');
    }
};

/**
 * Testa la connessione al database
 * @returns {Promise<boolean>} True se la connessione è riuscita
 */
const testConnection = async () => {
    try {
        const result = await query('SELECT NOW() as current_time, version() as pg_version');
        const { current_time, pg_version } = result.rows[0];

        logger.info('✅ Database connection successful:', {
            timestamp: current_time,
            version: pg_version.split(' ')[0] + ' ' + pg_version.split(' ')[1]
        });

        return true;
    } catch (error) {
        logger.error('❌ Database connection failed:', error);
        return false;
    }
};

/**
 * Connette al database e verifica la connessione
 * @returns {Promise<boolean>} True se la connessione è riuscita
 */
const connectDatabase = async () => {
    try {
        logger.info('🔄 Connecting to PostgreSQL database...');

        const isConnected = await testConnection();

        if (isConnected) {
            logger.info('🎉 Database connected successfully!');

            // Verifica che le tabelle esistano
            try {
                const tableCheck = await query(`
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('users', 'spaces', 'bookings', 'payments')
                    ORDER BY table_name
                `);

                const existingTables = tableCheck.rows.map(row => row.table_name);
                logger.info('📋 Existing tables:', existingTables);

                if (existingTables.length === 0) {
                    logger.warn('⚠️ No tables found. Run database migrations first.');
                }
            } catch (tableError) {
                logger.warn('⚠️ Could not check tables:', tableError.message);
            }

            return true;
        } else {
            throw new Error('Database connection test failed');
        }
    } catch (error) {
        logger.error('❌ Failed to connect to database:', error);
        throw error;
    }
};

/**
 * Chiude tutte le connessioni del pool
 * @returns {Promise<void>}
 */
const closePool = async () => {
    try {
        await pool.end();
        logger.info('🔌 Database pool closed');
    } catch (error) {
        logger.error('❌ Error closing database pool:', error);
        throw error;
    }
};

/**
 * Ottiene statistiche del pool di connessioni
 * @returns {Object} Statistiche del pool
 */
const getPoolStats = () => {
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    };
};

/**
 * Helper per costruire query WHERE dinamiche
 * @param {Object} filters - Filtri da applicare
 * @param {number} startIndex - Indice di partenza per i parametri
 * @returns {Object} Oggetto con whereClause e parametri
 */
const buildWhereClause = (filters, startIndex = 1) => {
    const conditions = [];
    const params = [];
    let paramIndex = startIndex;

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
                // Per array, usa IN clause
                const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
                conditions.push(`${key} IN (${placeholders})`);
                params.push(...value);
            } else if (typeof value === 'string' && value.includes('%')) {
                // Per ricerca con LIKE
                conditions.push(`${key} ILIKE $${paramIndex++}`);
                params.push(value);
            } else {
                // Uguaglianza normale
                conditions.push(`${key} = $${paramIndex++}`);
                params.push(value);
            }
        }
    });

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    return { whereClause, params, nextParamIndex: paramIndex };
};

/**
 * Helper per costruire query di paginazione
 * @param {number} page - Numero pagina (1-based)
 * @param {number} limit - Numero di risultati per pagina
 * @returns {Object} Oggetto con offset, limit e clausole SQL
 */
const buildPagination = (page = 1, limit = 10) => {
    const maxLimit = 100;
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 10));
    const offset = (safePage - 1) * safeLimit;

    return {
        offset,
        limit: safeLimit,
        page: safePage,
        limitClause: `LIMIT ${safeLimit} OFFSET ${offset}`
    };
};

// Export delle funzioni e oggetti
module.exports = {
    // Core functions
    query,
    transaction,
    connectDatabase,
    testConnection,
    closePool,

    // Pool access
    pool,
    getPoolStats,

    // Helper functions
    buildWhereClause,
    buildPagination,

    // Per backward compatibility
    end: closePool
};