// src/models/User.js - Modello User COMPLETO
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../utils/logger');

class User {
    constructor(userData) {
        this.id = userData.id;
        this.email = userData.email;
        this.passwordHash = userData.password_hash || userData.passwordHash;
        this.firstName = userData.first_name || userData.firstName;
        this.lastName = userData.last_name || userData.lastName;
        this.phone = userData.phone;
        this.company = userData.company;
        this.role = userData.role || 'client';
        this.status = userData.status || 'active';
        this.emailVerified = userData.email_verified || userData.emailVerified || false;
        this.profileImage = userData.profile_image || userData.profileImage;
        this.createdAt = userData.created_at || userData.createdAt;
        this.updatedAt = userData.updated_at || userData.updatedAt;
        this.lastLogin = userData.last_login || userData.lastLogin;
        this.resetToken = userData.reset_token || userData.resetToken;
        this.resetTokenExpires = userData.reset_token_expires || userData.resetTokenExpires;
        this.emailVerificationToken = userData.verification_token || userData.emailVerificationToken;
    }

    /**
     * Crea un nuovo utente
     * @param {Object} userData - Dati dell'utente
     * @returns {Promise<User>} Nuovo utente creato
     */
    static async create(userData) {
        try {
            const {
                email,
                password,
                firstName,
                lastName,
                phone = null,
                company = null,
                role = 'client'
            } = userData;

            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Genera token di verifica email
            const emailVerificationToken = crypto.randomBytes(32).toString('hex');

            const query = `
                INSERT INTO users (
                    id, email, password_hash, first_name, last_name,
                    phone, company, role, email_verified, verification_token,
                    created_at, updated_at
                ) VALUES (
                             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
                         ) RETURNING *
            `;

            const userId = uuidv4();
            const values = [
                userId,
                email.toLowerCase(),
                passwordHash,
                firstName,
                lastName,
                phone,
                company,
                role,
                false, // email_verified
                emailVerificationToken
            ];

            const result = await db.query(query, values);
            const user = new User(result.rows[0]);

            logger.info(`User created: ${user.email} (${user.id})`);
            return user;

        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Trova utente per email
     * @param {string} email - Email dell'utente
     * @returns {Promise<User|null>} Utente trovato o null
     */
    static async findByEmail(email) {
        try {
            const query = 'SELECT * FROM users WHERE email = $1';
            const result = await db.query(query, [email.toLowerCase()]);

            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            logger.error('Error finding user by email:', error);
            throw error;
        }
    }

    /**
     * Trova utente per ID
     * @param {string} id - ID dell'utente
     * @returns {Promise<User|null>} Utente trovato o null
     */
    static async findById(id) {
        try {
            const query = 'SELECT * FROM users WHERE id = $1';
            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            logger.error('Error finding user by ID:', error);
            throw error;
        }
    }

    /**
     * Trova utente per token di reset password
     * @param {string} token - Token di reset
     * @returns {Promise<User|null>} Utente trovato o null
     */
    static async findByResetToken(token) {
        try {
            const query = `
                SELECT * FROM users
                WHERE reset_token = $1
                  AND reset_token_expires > NOW()
            `;
            const result = await db.query(query, [token]);

            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            logger.error('Error finding user by reset token:', error);
            throw error;
        }
    }

    /**
     * Trova utente per token di verifica email
     * @param {string} token - Token di verifica
     * @returns {Promise<User|null>} Utente trovato o null
     */
    static async findByVerificationToken(token) {
        try {
            const query = `
                SELECT * FROM users
                WHERE verification_token = $1
            `;
            const result = await db.query(query, [token]);

            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            logger.error('Error finding user by verification token:', error);
            throw error;
        }
    }

    /**
     * Aggiorna profilo utente
     * @param {string} userId - ID dell'utente
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<User>} Utente aggiornato
     */
    static async updateProfile(userId, updateData) {
        try {
            const allowedFields = ['first_name', 'last_name', 'phone', 'company', 'profile_image'];
            const updates = [];
            const values = [];
            let paramIndex = 1;

            // Costruisce dinamicamente la query di update
            Object.entries(updateData).forEach(([key, value]) => {
                // Converti camelCase a snake_case per il database
                const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();

                if (allowedFields.includes(dbField)) {
                    updates.push(`${dbField} = ${paramIndex++}`);
                    values.push(value);
                }
            });

            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }

            updates.push(`updated_at = NOW()`);
            values.push(userId); // Per la WHERE clause

            const query = `
                UPDATE users
                SET ${updates.join(', ')}
                WHERE id = ${paramIndex}
                    RETURNING *
            `;

            const result = await db.query(query, values);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            const updatedUser = new User(result.rows[0]);
            logger.info(`User profile updated: ${updatedUser.email}`);

            return updatedUser;
        } catch (error) {
            logger.error('Error updating user profile:', error);
            throw error;
        }
    }

    /**
     * Aggiorna password utente
     * @param {string} userId - ID dell'utente
     * @param {string} newPassword - Nuova password
     * @returns {Promise<boolean>} True se aggiornata con successo
     */
    static async updatePassword(userId, newPassword) {
        try {
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            const query = `
                UPDATE users
                SET password_hash = $1,
                    reset_token = NULL,
                    reset_token_expires = NULL,
                    updated_at = NOW()
                WHERE id = $2 AND status != 'deleted'
                RETURNING id
            `;

            const result = await db.query(query, [passwordHash, userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found or deleted');
            }

            logger.info(`Password updated for user: ${userId}`);
            return true;
        } catch (error) {
            logger.error('Error updating password:', error);
            throw error;
        }
    }

    /**
     * Genera token per reset password
     * @param {string} email - Email dell'utente
     * @returns {Promise<string|null>} Token generato o null se utente non trovato
     */
    static async generateResetToken(email) {
        try {
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpires = new Date();
            resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // Scade tra 1 ora

            const query = `
                UPDATE users
                SET reset_token = $1,
                    reset_token_expires = $2,
                    updated_at = NOW()
                WHERE email = $3 AND status != 'deleted'
                RETURNING id, email
            `;

            const result = await db.query(query, [resetToken, resetTokenExpires, email.toLowerCase()]);

            if (result.rows.length === 0) {
                return null;
            }

            logger.info(`Reset token generated for: ${email}`);
            return resetToken;
        } catch (error) {
            logger.error('Error generating reset token:', error);
            throw error;
        }
    }

    /**
     * Verifica email utente
     * @param {string} token - Token di verifica
     * @returns {Promise<User|null>} Utente verificato o null
     */
    static async verifyEmail(token) {
        try {
            const query = `
                UPDATE users
                SET email_verified = true,
                    verification_token = NULL,
                    updated_at = NOW()
                WHERE verification_token = $1 AND status != 'deleted'
                RETURNING *
            `;

            const result = await db.query(query, [token]);

            if (result.rows.length === 0) {
                return null;
            }

            const user = new User(result.rows[0]);
            logger.info(`Email verified for user: ${user.email}`);

            return user;
        } catch (error) {
            logger.error('Error verifying email:', error);
            throw error;
        }
    }

    /**
     * Aggiorna ultimo login
     * @param {string} userId - ID dell'utente
     * @returns {Promise<boolean>} True se aggiornato con successo
     */
    static async updateLastLogin(userId) {
        try {
            const query = `
                UPDATE users
                SET last_login = NOW(), updated_at = NOW()
                WHERE id = $1
                    RETURNING id
            `;

            const result = await db.query(query, [userId]);
            return result.rows.length > 0;
        } catch (error) {
            logger.error('Error updating last login:', error);
            throw error;
        }
    }

    /**
     * Aggiorna status utente (solo admin)
     * @param {string} userId - ID dell'utente
     * @param {string} status - Nuovo status
     * @returns {Promise<User>} Utente aggiornato
     */
    static async updateStatus(userId, status) {
        try {
            const validStatuses = ['active', 'inactive', 'suspended'];

            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const query = `
                UPDATE users
                SET status = $1, updated_at = NOW()
                WHERE id = $2 AND status != 'deleted'
                RETURNING *
            `;

            const result = await db.query(query, [status, userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found or deleted');
            }

            const user = new User(result.rows[0]);
            logger.info(`User status updated: ${user.email} -> ${status}`);

            return user;
        } catch (error) {
            logger.error('Error updating user status:', error);
            throw error;
        }
    }

    /**
     * Soft delete utente
     * @param {string} userId - ID dell'utente
     * @returns {Promise<boolean>} True se eliminato con successo
     */
    static async softDelete(userId) {
        try {
            const query = `
                UPDATE users
                SET status = 'deleted',
                    email = email || '_deleted_' || EXTRACT(EPOCH FROM NOW())::TEXT,
                    updated_at = NOW()
                WHERE id = $1 AND status != 'deleted'
                    RETURNING id
            `;

            const result = await db.query(query, [userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found or already deleted');
            }

            logger.info(`User soft deleted: ${userId}`);
            return true;
        } catch (error) {
            logger.error('Error soft deleting user:', error);
            throw error;
        }
    }

    /**
     * Lista utenti con filtri e paginazione
     * @param {Object} options - Opzioni di query
     * @returns {Promise<Object>} Risultati paginati
     */
    static async findAll(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                role,
                status,
                search,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = options;

            // Costruisce filtri
            const filters = {};
            if (role) filters.role = role;
            if (status) filters.status = status;
            if (search) {
                // Per ricerca, usa una query più complessa
            }

            const { whereClause, params, nextParamIndex } = db.buildWhereClause(filters);
            const { limitClause, offset, limit: safeLimit } = db.buildPagination(page, limit);

            // Query per il conteggio totale
            let countQuery = 'SELECT COUNT(*) as total FROM users';
            if (search) {
                countQuery += ` WHERE (first_name ILIKE $${nextParamIndex} OR last_name ILIKE $${nextParamIndex + 1} OR email ILIKE $${nextParamIndex + 2}) AND status != 'deleted'`;
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            } else if (whereClause) {
                countQuery += ` ${whereClause} AND status != 'deleted'`;
            } else {
                countQuery += ` WHERE status != 'deleted'`;
            }

            // Query per i dati
            let dataQuery = `
                SELECT id, email, first_name, last_name, phone, company,
                       role, status, email_verified, profile_image,
                       created_at, updated_at, last_login
                FROM users
            `;

            if (search) {
                dataQuery += ` WHERE (first_name ILIKE $${nextParamIndex} OR last_name ILIKE $${nextParamIndex + 1} OR email ILIKE $${nextParamIndex + 2}) AND status != 'deleted'`;
            } else if (whereClause) {
                dataQuery += ` ${whereClause} AND status != 'deleted'`;
            } else {
                dataQuery += ` WHERE status != 'deleted'`;
            }

            dataQuery += ` ORDER BY ${sortBy} ${sortOrder} ${limitClause}`;

            // Esegue le query
            const [countResult, dataResult] = await Promise.all([
                db.query(countQuery, search ? params.slice(0, -3).concat([`%${search}%`, `%${search}%`, `%${search}%`]) : params),
                db.query(dataQuery, search ? params.slice(0, -3).concat([`%${search}%`, `%${search}%`, `%${search}%`]) : params)
            ]);

            const total = parseInt(countResult.rows[0].total);
            const users = dataResult.rows.map(row => new User(row));

            return {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: safeLimit,
                    total,
                    pages: Math.ceil(total / safeLimit),
                    hasNext: offset + safeLimit < total,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error('Error finding users:', error);
            throw error;
        }
    }

    /**
     * Verifica password
     * @param {string} password - Password da verificare
     * @returns {Promise<boolean>} True se la password è corretta
     */
    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.passwordHash);
        } catch (error) {
            logger.error('Error verifying password:', error);
            return false;
        }
    }

    /**
     * Converte utente in formato JSON sicuro (senza password)
     * @returns {Object} Dati utente sicuri
     */
    toJSON() {
        const user = { ...this };
        delete user.passwordHash;
        delete user.resetToken;
        delete user.resetTokenExpires;
        delete user.emailVerificationToken;
        return user;
    }

    /**
     * Statistiche utenti (per admin)
     * @returns {Promise<Object>} Statistiche
     */
    static async getStats() {
        try {
            const query = `
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE role = 'client') as clients,
                    COUNT(*) FILTER (WHERE role = 'manager') as managers,
                    COUNT(*) FILTER (WHERE role = 'admin') as admins,
                    COUNT(*) FILTER (WHERE status = 'active') as active,
                    COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
                    COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
                    COUNT(*) FILTER (WHERE email_verified = true) as verified,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month
                FROM users
                WHERE status != 'deleted'
            `;

            const result = await db.query(query);
            return result.rows[0];
        } catch (error) {
            logger.error('Error getting user stats:', error);
            throw error;
        }
    }
}

module.exports = User;