// src/config/redis.js - CORREZIONE
const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.init();
    }

    async init() {
        try {
            // Configurazione Redis
            const config = {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                db: process.env.REDIS_DB || 0,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true
            };

            // Aggiungi password se configurata
            if (process.env.REDIS_PASSWORD) {
                config.password = process.env.REDIS_PASSWORD;
            }

            // Crea client Redis con URL o configurazione
            const redisUrl = `redis://${config.host}:${config.port}/${config.db}`;

            this.client = redis.createClient({
                url: redisUrl,
                password: config.password,
                socket: {
                    connectTimeout: 5000,
                    lazyConnect: true
                }
            });

            // Event handlers
            this.client.on('connect', () => {
                logger.info('Redis: Connecting...');
            });

            this.client.on('ready', () => {
                logger.info('Redis: Ready to use');
                this.isConnected = true;
            });

            this.client.on('error', (err) => {
                logger.error('Redis Error:', err.message);
                this.isConnected = false;
            });

            this.client.on('end', () => {
                logger.info('Redis: Connection ended');
                this.isConnected = false;
            });

            // Connetti con timeout
            await Promise.race([
                this.client.connect(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
                )
            ]);

        } catch (error) {
            logger.warn('Redis non disponibile:', error.message);
            this.isConnected = false;

            // Crea un client mock per sviluppo
            this.client = this.createMockClient();
        }
    }

    // Client mock per sviluppo quando Redis non è disponibile
    createMockClient() {
        const mockClient = {
            isConnected: false,

            // Metodi Redis mockati
            get: async (key) => null,
            set: async (key, value, options) => 'OK',
            setex: async (key, seconds, value) => 'OK',
            del: async (key) => 1,
            exists: async (key) => 0,
            expire: async (key, seconds) => 1,
            ping: async () => {
                throw new Error('Redis mock: not connected');
            },

            // Metodi per compatibilità
            quit: async () => 'OK',
            disconnect: () => {},

            // Event emitter mock
            on: () => {},
            off: () => {},
            emit: () => {}
        };

        logger.info('Redis: Usando client mock per sviluppo');
        return mockClient;
    }

    // Metodi wrapper per compatibilità
    async get(key) {
        try {
            if (!this.isConnected) return null;
            return await this.client.get(key);
        } catch (error) {
            logger.error('Redis GET error:', error.message);
            return null;
        }
    }

    async set(key, value, options = {}) {
        try {
            if (!this.isConnected) return 'OK';

            if (options.EX) {
                return await this.client.setEx(key, options.EX, value);
            }
            return await this.client.set(key, value);
        } catch (error) {
            logger.error('Redis SET error:', error.message);
            return 'OK';
        }
    }

    async setex(key, seconds, value) {
        try {
            if (!this.isConnected) return 'OK';
            return await this.client.setEx(key, seconds, value);
        } catch (error) {
            logger.error('Redis SETEX error:', error.message);
            return 'OK';
        }
    }

    async del(key) {
        try {
            if (!this.isConnected) return 1;
            return await this.client.del(key);
        } catch (error) {
            logger.error('Redis DEL error:', error.message);
            return 1;
        }
    }

    async ping() {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }
            return await this.client.ping();
        } catch (error) {
            throw error;
        }
    }

    async exists(key) {
        try {
            if (!this.isConnected) return 0;
            return await this.client.exists(key);
        } catch (error) {
            logger.error('Redis EXISTS error:', error.message);
            return 0;
        }
    }

    async expire(key, seconds) {
        try {
            if (!this.isConnected) return 1;
            return await this.client.expire(key, seconds);
        } catch (error) {
            logger.error('Redis EXPIRE error:', error.message);
            return 1;
        }
    }

    // Metodi per chiusura connessione
    async quit() {
        try {
            if (this.client && this.isConnected) {
                await this.client.quit();
            }
        } catch (error) {
            logger.error('Redis QUIT error:', error.message);
        }
    }

    disconnect() {
        try {
            if (this.client && this.client.disconnect) {
                this.client.disconnect();
            }
            this.isConnected = false;
        } catch (error) {
            logger.error('Redis DISCONNECT error:', error.message);
        }
    }

    // Getter per compatibilità
    get connected() {
        return this.isConnected;
    }

    // Health check
    async healthCheck() {
        try {
            await this.ping();
            return { status: 'connected', message: 'Redis is healthy' };
        } catch (error) {
            return { status: 'disconnected', message: error.message };
        }
    }
}

// Crea e esporta istanza singleton
const redisClient = new RedisClient();

module.exports = redisClient;