const { query } = require('../config/database');
const logger = require('../utils/logger');

class User {
    /**
     * Crea un nuovo utente
     * @param {Object} userData - Dati dell'utente
     * @returns {Promise<Object>} Utente creato
     */
    static async create(userData) {
        const {
            email,
            password_hash,
            first_name,
            last_name,
            phone,
            company,
            role = 'client',
            status = 'active'
        } = userData;

        try {
            const result = await query(`
                INSERT INTO users (
                    email, password_hash, first_name, last_name,
                    phone, company, role, status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id, email, first_name, last_name, phone, 
                         company, role, status, email_verified, 
                         created_at, updated_at
            `, [email, password_hash, first_name, last_name, phone, company, role, status]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Trova utente per email
     * @param {string} email - Email dell'utente
     * @returns {Promise<Object|null>} Utente trovato
     */
    static async findByEmail(email) {
        try {
            const result = await query(`
                SELECT id, email, password_hash, first_name, last_name,
                       phone, company, role, status, email_verified,
                       profile_image, created_at, updated_at, last_login
                FROM users
                WHERE email = $1 AND status != 'suspended'
            `, [email]);

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding user by email:', error);
            throw error;
        }
    }

    /**
     * Trova utente per ID
     * @param {string} userId - ID dell'utente
     * @returns {Promise<Object|null>} Utente trovato
     */
    static async findById(userId) {
        try {
            const result = await query(`
                SELECT id, email, first_name, last_name, phone,
                       company, role, status, email_verified,
                       profile_image, created_at, updated_at, last_login
                FROM users
                WHERE id = $1
            `, [userId]);

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding user by ID:', error);
            throw error;
        }
    }

    /**
     * Aggiorna profilo utente
     * @param {string} userId - ID dell'utente
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Utente aggiornato
     */
    static async updateProfile(userId, updateData) {
        const allowedFields = ['first_name', 'last_name', 'phone', 'company', 'profile_image', 'google_id', 'avatar_url'];
        const updates = [];
        const values = [];
        let paramIndex = 1;

        // Costruisce query dinamica solo per campi consentiti
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                updates.push(`${key} = $${paramIndex}`);
                values.push(updateData[key]);
                paramIndex++;
            }
        });

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(userId);

        try {
            const result = await query(`
            UPDATE users
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE id = $${paramIndex}
            RETURNING id, email, first_name, last_name, phone,
                     company, role, status, email_verified, google_id,
                     profile_image, created_at, updated_at
        `, values);

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating user profile:', error);
            throw error;
        }
    }

    /**
     * Aggiorna ruolo utente (solo admin)
     * @param {string} userId - ID dell'utente
     * @param {string} newRole - Nuovo ruolo
     * @returns {Promise<Object>} Utente aggiornato
     */
    static async updateRole(userId, newRole) {
        const validRoles = ['client', 'manager', 'admin'];

        if (!validRoles.includes(newRole)) {
            throw new Error('Invalid role');
        }

        try {
            const result = await query(`
                UPDATE users
                SET role = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                    RETURNING id, email, first_name, last_name, role, status
            `, [newRole, userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating user role:', error);
            throw error;
        }
    }

    /**
     * Aggiorna status utente
     * @param {string} userId - ID dell'utente
     * @param {string} newStatus - Nuovo status
     * @returns {Promise<Object>} Utente aggiornato
     */
    static async updateStatus(userId, newStatus) {
        const validStatuses = ['active', 'inactive', 'suspended'];

        if (!validStatuses.includes(newStatus)) {
            throw new Error('Invalid status');
        }

        try {
            const result = await query(`
                UPDATE users
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                    RETURNING id, email, first_name, last_name, role, status
            `, [newStatus, userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating user status:', error);
            throw error;
        }
    }

    /**
     * Lista utenti con filtri e paginazione
     * @param {Object} options - Opzioni di ricerca
     * @returns {Promise<Object>} Lista utenti paginata
     */
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            role,
            status,
            search,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = options;

        const offset = (page - 1) * limit;
        const conditions = [];
        const values = [];
        let paramIndex = 1;

        // Filtri
        if (role) {
            conditions.push(`role = $${paramIndex}`);
            values.push(role);
            paramIndex++;
        }

        if (status) {
            conditions.push(`status = $${paramIndex}`);
            values.push(status);
            paramIndex++;
        }

        if (search) {
            conditions.push(`(
                first_name ILIKE $${paramIndex} OR 
                last_name ILIKE $${paramIndex} OR 
                email ILIKE $${paramIndex} OR
                company ILIKE $${paramIndex}
            )`);
            values.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Validazione sortBy per sicurezza
        const validSortFields = ['created_at', 'updated_at', 'first_name', 'last_name', 'email', 'role'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        try {
            // Query principale
            const result = await query(`
                SELECT id, email, first_name, last_name, phone,
                       company, role, status, email_verified,
                       profile_image, created_at, updated_at, last_login
                FROM users
                         ${whereClause}
                ORDER BY ${sortField} ${sortDirection}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, [...values, limit, offset]);

            // Query per conteggio totale
            const countResult = await query(`
                SELECT COUNT(*) as total
                FROM users
                         ${whereClause}
            `, values);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                users: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            logger.error('Error fetching users:', error);
            throw error;
        }
    }

    /**
     * Aggiorna ultimo login
     * @param {string} userId - ID dell'utente
     * @returns {Promise<void>}
     */
    static async updateLastLogin(userId) {
        try {
            await query(`
                UPDATE users
                SET last_login = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [userId]);
        } catch (error) {
            logger.error('Error updating last login:', error);
            throw error;
        }
    }

    /**
     * Verifica email utente
     * @param {string} userId - ID dell'utente
     * @returns {Promise<Object>} Utente aggiornato
     */
    static async verifyEmail(userId) {
        try {
            const result = await query(`
                UPDATE users
                SET email_verified = TRUE,
                    verification_token = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                    RETURNING id, email, email_verified
            `, [userId]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error verifying email:', error);
            throw error;
        }
    }

    /**
     * Elimina utente (soft delete)
     * @param {string} userId - ID dell'utente
     * @returns {Promise<boolean>} Successo operazione
     */
    static async softDelete(userId) {
        try {
            const result = await query(`
                UPDATE users
                SET status = 'inactive',
                    email = CONCAT(email, '_deleted_', extract(epoch from now())),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [userId]);

            return result.rowCount > 0;
        } catch (error) {
            logger.error('Error soft deleting user:', error);
            throw error;
        }
    }

    /**
     * Statistiche utenti
     * @returns {Promise<Object>} Statistiche
     */
    static async getStats() {
        try {
            const result = await query(`
                SELECT
                    role,
                    status,
                    COUNT(*) as count
                FROM users
                GROUP BY ROLLUP(role, status)
                ORDER BY role, status
            `);

            const stats = {
                total: 0,
                byRole: {},
                byStatus: {},
                active: 0
            };

            result.rows.forEach(row => {
                if (!row.role && !row.status) {
                    stats.total = parseInt(row.count);
                } else if (row.role && !row.status) {
                    stats.byRole[row.role] = parseInt(row.count);
                } else if (!row.role && row.status) {
                    stats.byStatus[row.status] = parseInt(row.count);
                    if (row.status === 'active') {
                        stats.active = parseInt(row.count);
                    }
                }
            });

            return stats;
        } catch (error) {
            logger.error('Error getting user stats:', error);
            throw error;
        }
    }

    /**
     * Aggiorna token reset password
     * @param {string} email - Email dell'utente
     * @param {string} resetToken - Token per reset
     * @param {Date} resetTokenExpiry - Scadenza del token
     * @returns {Promise<boolean>} Successo operazione
     */
    static async updateResetToken(email, resetToken, resetTokenExpiry) {
        try {
            const result = await query(`
                UPDATE users
                SET reset_token = $1, 
                    reset_token_expiry = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = $3
            `, [resetToken, resetTokenExpiry, email]);

            return result.rowCount > 0;
        } catch (error) {
            logger.error('Error updating reset token:', error);
            throw error;
        }
    }

    /**
     * Trova utente per token reset valido
     * @param {string} token - Token di reset
     * @returns {Promise<Object|null>} Utente trovato
     */
    static async findByValidResetToken(token) {
        try {
            const result = await query(`
                SELECT id, email, first_name, last_name, password_hash,
                       reset_token, reset_token_expiry
                FROM users
                WHERE reset_token = $1 
                  AND reset_token_expiry > NOW()
                  AND status = 'active'
            `, [token]);

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding user by reset token:', error);
            throw error;
        }
    }

    /**
     * Aggiorna password e rimuove token reset
     * @param {string} userId - ID dell'utente
     * @param {string} newPasswordHash - Nuova password hashata
     * @returns {Promise<boolean>} Successo operazione
     */
    static async updatePasswordAndClearResetToken(userId, newPasswordHash) {
        try {
            const result = await query(`
                UPDATE users
                SET password_hash = $1,
                    reset_token = NULL,
                    reset_token_expiry = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [newPasswordHash, userId]);

            return result.rowCount > 0;
        } catch (error) {
            logger.error('Error updating password and clearing reset token:', error);
            throw error;
        }
    }
}

module.exports = User;