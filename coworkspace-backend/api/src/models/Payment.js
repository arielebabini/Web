// api/src/models/Payment.js
const db = require('../config/database');
const logger = require('../utils/logger');

class Payment {
    /**
     * Crea un nuovo pagamento
     */
    static async create(paymentData) {
        try {
            const query = `
                INSERT INTO payments (
                    booking_id, stripe_payment_intent_id, amount, currency,
                    status, payment_method, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
            `;

            const values = [
                paymentData.booking_id,
                paymentData.stripe_payment_intent_id,
                paymentData.amount,
                paymentData.currency || 'EUR',
                paymentData.status || 'pending',
                JSON.stringify(paymentData.payment_method || {}),
                new Date()
            ];

            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating payment:', error);
            throw error;
        }
    }

    /**
     * Trova pagamento per ID
     */
    static async findById(id) {
        try {
            const query = `
                SELECT p.*, b.space_id, b.user_id, b.start_date, b.end_date,
                       u.email as user_email, u.first_name, u.last_name,
                       s.name as space_name
                FROM payments p
                         LEFT JOIN bookings b ON p.booking_id = b.id
                         LEFT JOIN users u ON b.user_id = u.id
                         LEFT JOIN spaces s ON b.space_id = s.id
                WHERE p.id = $1 AND p.deleted_at IS NULL
            `;

            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error finding payment by ID:', error);
            throw error;
        }
    }

    /**
     * Trova pagamento per Stripe Payment Intent ID
     */
    static async findByStripeIntent(stripePaymentIntentId) {
        try {
            const query = `
                SELECT p.*, b.space_id, b.user_id, b.start_date, b.end_date,
                       u.email as user_email, u.first_name, u.last_name,
                       s.name as space_name
                FROM payments p
                         LEFT JOIN bookings b ON p.booking_id = b.id
                         LEFT JOIN users u ON b.user_id = u.id
                         LEFT JOIN spaces s ON b.space_id = s.id
                WHERE p.stripe_payment_intent_id = $1 AND p.deleted_at IS NULL
            `;

            const result = await db.query(query, [stripePaymentIntentId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error finding payment by Stripe intent:', error);
            throw error;
        }
    }

    /**
     * Trova tutti i pagamenti per una prenotazione
     */
    static async findByBookingId(bookingId) {
        try {
            const query = `
                SELECT * FROM payments
                WHERE booking_id = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC
            `;

            const result = await db.query(query, [bookingId]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding payments by booking ID:', error);
            throw error;
        }
    }

    /**
     * Trova tutti i pagamenti per un utente
     */
    static async findByUserId(userId, limit = 50, offset = 0) {
        try {
            const query = `
                SELECT p.*, b.space_id, b.start_date, b.end_date,
                       s.name as space_name, s.location
                FROM payments p
                         LEFT JOIN bookings b ON p.booking_id = b.id
                         LEFT JOIN spaces s ON b.space_id = s.id
                WHERE b.user_id = $1 AND p.deleted_at IS NULL
                ORDER BY p.created_at DESC
                    LIMIT $2 OFFSET $3
            `;

            const result = await db.query(query, [userId, limit, offset]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding payments by user ID:', error);
            throw error;
        }
    }

    /**
     * Aggiorna pagamento per Stripe Payment Intent ID
     */
    static async updateByStripeIntent(stripePaymentIntentId, updateData) {
        try {
            const setClause = [];
            const values = [];
            let valueIndex = 1;

            // Costruisce dinamicamente la query di update
            Object.keys(updateData).forEach(key => {
                if (key === 'payment_method') {
                    setClause.push(`${key} = $${valueIndex}`);
                    values.push(JSON.stringify(updateData[key]));
                } else {
                    setClause.push(`${key} = $${valueIndex}`);
                    values.push(updateData[key]);
                }
                valueIndex++;
            });

            setClause.push(`updated_at = $${valueIndex}`);
            values.push(new Date());
            valueIndex++;

            values.push(stripePaymentIntentId);

            const query = `
                UPDATE payments
                SET ${setClause.join(', ')}
                WHERE stripe_payment_intent_id = $${valueIndex}
                    RETURNING *
            `;

            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            logger.error('Error updating payment by Stripe intent:', error);
            throw error;
        }
    }

    /**
     * Aggiorna stato pagamento
     */
    static async updateStatus(id, status, additionalData = {}) {
        try {
            const updateData = { status, ...additionalData };
            return await this.update(id, updateData);
        } catch (error) {
            logger.error('Error updating payment status:', error);
            throw error;
        }
    }

    /**
     * Aggiorna pagamento
     */
    static async update(id, updateData) {
        try {
            const setClause = [];
            const values = [];
            let valueIndex = 1;

            Object.keys(updateData).forEach(key => {
                if (key === 'payment_method') {
                    setClause.push(`${key} = $${valueIndex}`);
                    values.push(JSON.stringify(updateData[key]));
                } else {
                    setClause.push(`${key} = $${valueIndex}`);
                    values.push(updateData[key]);
                }
                valueIndex++;
            });

            setClause.push(`updated_at = $${valueIndex}`);
            values.push(new Date());
            valueIndex++;

            values.push(id);

            const query = `
                UPDATE payments
                SET ${setClause.join(', ')}
                WHERE id = $${valueIndex}
                    RETURNING *
            `;

            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            logger.error('Error updating payment:', error);
            throw error;
        }
    }

    /**
     * Elimina (soft delete) un pagamento
     */
    static async delete(id) {
        try {
            const query = `
                UPDATE payments
                SET deleted_at = $1, updated_at = $1
                WHERE id = $2
                RETURNING *
            `;

            const result = await db.query(query, [new Date(), id]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error deleting payment:', error);
            throw error;
        }
    }

    /**
     * Ottiene statistiche sui pagamenti per admin
     */
    static async getStats(startDate = null, endDate = null) {
        try {
            const conditions = ['p.deleted_at IS NULL'];
            const params = [];
            let paramIndex = 1;

            if (startDate) {
                conditions.push(`p.created_at >= $${paramIndex}`);
                params.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                conditions.push(`p.created_at <= $${paramIndex}`);
                params.push(endDate);
                paramIndex++;
            }

            const whereClause = conditions.join(' AND ');

            // Query principale per le statistiche
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_payments,
                    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_payments,
                    COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_payments,
                    COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments,
                    COUNT(CASE WHEN p.status = 'canceled' THEN 1 END) as canceled_payments,
                    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_revenue,
                    COALESCE(AVG(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as avg_payment_amount,
                    COALESCE(MIN(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as min_payment_amount,
                    COALESCE(MAX(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as max_payment_amount
                FROM payments p
                WHERE ${whereClause}
            `;

            const statsResult = await db.query(statsQuery, params);
            const stats = statsResult.rows[0];

            // Query per i pagamenti per giorno (ultimi 30 giorni o range specificato)
            const dailyQuery = `
                SELECT 
                    DATE(p.created_at) as date,
                    COUNT(*) as payments_count,
                    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_count,
                    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as daily_revenue
                FROM payments p
                WHERE ${whereClause}
                GROUP BY DATE(p.created_at)
                ORDER BY date DESC
                LIMIT 30
            `;

            const dailyResult = await db.query(dailyQuery, params);

            // Query per i metodi di pagamento più utilizzati
            const paymentMethodsQuery = `
                SELECT 
                    COALESCE(p.payment_method->>'type', 'unknown') as payment_method,
                    COUNT(*) as usage_count,
                    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as success_count
                FROM payments p
                WHERE ${whereClause}
                GROUP BY p.payment_method->>'type'
                ORDER BY usage_count DESC
                LIMIT 10
            `;

            const paymentMethodsResult = await db.query(paymentMethodsQuery, params);

            return {
                summary: {
                    total_payments: parseInt(stats.total_payments),
                    completed_payments: parseInt(stats.completed_payments),
                    pending_payments: parseInt(stats.pending_payments),
                    failed_payments: parseInt(stats.failed_payments),
                    canceled_payments: parseInt(stats.canceled_payments),
                    total_revenue: parseFloat(stats.total_revenue),
                    avg_payment_amount: parseFloat(stats.avg_payment_amount),
                    min_payment_amount: parseFloat(stats.min_payment_amount),
                    max_payment_amount: parseFloat(stats.max_payment_amount),
                    success_rate: stats.total_payments > 0
                        ? ((stats.completed_payments / stats.total_payments) * 100).toFixed(2)
                        : 0
                },
                daily_stats: dailyResult.rows.map(row => ({
                    date: row.date,
                    payments_count: parseInt(row.payments_count),
                    completed_count: parseInt(row.completed_count),
                    daily_revenue: parseFloat(row.daily_revenue)
                })),
                payment_methods: paymentMethodsResult.rows.map(row => ({
                    method: row.payment_method,
                    usage_count: parseInt(row.usage_count),
                    success_count: parseInt(row.success_count),
                    success_rate: row.usage_count > 0
                        ? ((row.success_count / row.usage_count) * 100).toFixed(2)
                        : 0
                }))
            };

        } catch (error) {
            logger.error('Error getting payment stats:', error);
            throw error;
        }
    }

    /**
     * Ottiene il totale dei ricavi per un periodo
     */
    static async getRevenue(startDate = null, endDate = null) {
        try {
            const conditions = [`p.status = 'completed'`, 'p.deleted_at IS NULL'];
            const params = [];
            let paramIndex = 1;

            if (startDate) {
                conditions.push(`p.created_at >= $${paramIndex}`);
                params.push(startDate);
                paramIndex++;
            }

            if (endDate) {
                conditions.push(`p.created_at <= $${paramIndex}`);
                params.push(endDate);
                paramIndex++;
            }

            const query = `
                SELECT 
                    COALESCE(SUM(amount), 0) as total_revenue,
                    COUNT(*) as payment_count
                FROM payments p
                WHERE ${conditions.join(' AND ')}
            `;

            const result = await db.query(query, params);
            return {
                total_revenue: parseFloat(result.rows[0].total_revenue),
                payment_count: parseInt(result.rows[0].payment_count)
            };

        } catch (error) {
            logger.error('Error getting revenue:', error);
            throw error;
        }
    }

    /**
     * Trova pagamenti in scadenza (per notifiche)
     */
    static async findExpiring(hours = 24) {
        try {
            const query = `
                SELECT p.*, b.start_date, b.end_date, b.user_id,
                       u.email, u.first_name, u.last_name,
                       s.name as space_name
                FROM payments p
                LEFT JOIN bookings b ON p.booking_id = b.id
                LEFT JOIN users u ON b.user_id = u.id
                LEFT JOIN spaces s ON b.space_id = s.id
                WHERE p.status = 'pending'
                  AND p.created_at < NOW() - INTERVAL '${hours} hours'
                  AND p.deleted_at IS NULL
                ORDER BY p.created_at ASC
            `;

            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            logger.error('Error finding expiring payments:', error);
            throw error;
        }
    }

    /**
     * Conta i pagamenti per stato
     */
    static async countByStatus() {
        try {
            const query = `
                SELECT 
                    status,
                    COUNT(*) as count
                FROM payments
                WHERE deleted_at IS NULL
                GROUP BY status
                ORDER BY count DESC
            `;

            const result = await db.query(query);
            return result.rows.reduce((acc, row) => {
                acc[row.status] = parseInt(row.count);
                return acc;
            }, {});
        } catch (error) {
            logger.error('Error counting payments by status:', error);
            throw error;
        }
    }

    /**
     * Trova pagamenti recenti
     */
    static async findRecent(limit = 10) {
        try {
            const query = `
                SELECT p.*, b.user_id, u.first_name, u.last_name, 
                       s.name as space_name
                FROM payments p
                LEFT JOIN bookings b ON p.booking_id = b.id
                LEFT JOIN users u ON b.user_id = u.id
                LEFT JOIN spaces s ON b.space_id = s.id
                WHERE p.deleted_at IS NULL
                ORDER BY p.created_at DESC
                LIMIT $1
            `;

            const result = await db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding recent payments:', error);
            throw error;
        }
    }

    /**
     * Trova tutti i pagamenti (con filtri opzionali)
     */
    static async findAll(filters = {}, limit = 50, offset = 0) {
        try {
            const conditions = ['p.deleted_at IS NULL'];
            const params = [];
            let paramIndex = 1;

            // Filtro per stato
            if (filters.status) {
                conditions.push(`p.status = $${paramIndex}`);
                params.push(filters.status);
                paramIndex++;
            }

            // Filtro per utente
            if (filters.userId) {
                conditions.push(`b.user_id = $${paramIndex}`);
                params.push(filters.userId);
                paramIndex++;
            }

            // Filtro per data inizio
            if (filters.startDate) {
                conditions.push(`p.created_at >= $${paramIndex}`);
                params.push(filters.startDate);
                paramIndex++;
            }

            // Filtro per data fine
            if (filters.endDate) {
                conditions.push(`p.created_at <= $${paramIndex}`);
                params.push(filters.endDate);
                paramIndex++;
            }

            // Filtro per importo minimo
            if (filters.minAmount) {
                conditions.push(`p.amount >= $${paramIndex}`);
                params.push(filters.minAmount);
                paramIndex++;
            }

            // Filtro per importo massimo
            if (filters.maxAmount) {
                conditions.push(`p.amount <= $${paramIndex}`);
                params.push(filters.maxAmount);
                paramIndex++;
            }

            params.push(limit);
            params.push(offset);

            const query = `
                SELECT p.*, b.user_id, b.start_date, b.end_date,
                       u.first_name, u.last_name, u.email,
                       s.name as space_name, s.location
                FROM payments p
                LEFT JOIN bookings b ON p.booking_id = b.id
                LEFT JOIN users u ON b.user_id = u.id
                LEFT JOIN spaces s ON b.space_id = s.id
                WHERE ${conditions.join(' AND ')}
                ORDER BY p.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Error finding payments:', error);
            throw error;
        }
    }

    /**
     * Conta il totale dei pagamenti (con filtri)
     */
    static async count(filters = {}) {
        try {
            const conditions = ['p.deleted_at IS NULL'];
            const params = [];
            let paramIndex = 1;

            // Applica gli stessi filtri della findAll
            if (filters.status) {
                conditions.push(`p.status = $${paramIndex}`);
                params.push(filters.status);
                paramIndex++;
            }

            if (filters.userId) {
                conditions.push(`b.user_id = $${paramIndex}`);
                params.push(filters.userId);
                paramIndex++;
            }

            if (filters.startDate) {
                conditions.push(`p.created_at >= $${paramIndex}`);
                params.push(filters.startDate);
                paramIndex++;
            }

            if (filters.endDate) {
                conditions.push(`p.created_at <= $${paramIndex}`);
                params.push(filters.endDate);
                paramIndex++;
            }

            if (filters.minAmount) {
                conditions.push(`p.amount >= $${paramIndex}`);
                params.push(filters.minAmount);
                paramIndex++;
            }

            if (filters.maxAmount) {
                conditions.push(`p.amount <= $${paramIndex}`);
                params.push(filters.maxAmount);
                paramIndex++;
            }

            const query = `
                SELECT COUNT(*) as count
                FROM payments p
                LEFT JOIN bookings b ON p.booking_id = b.id
                WHERE ${conditions.join(' AND ')}
            `;

            const result = await db.query(query, params);
            return parseInt(result.rows[0].count);
        } catch (error) {
            logger.error('Error counting payments:', error);
            throw error;
        }
    }
}

module.exports = Payment;