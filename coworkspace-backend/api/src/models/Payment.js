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
                WHERE id = $${valueIndex} AND deleted_at IS NULL
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
     * Ottiene statistiche pagamenti
     */
    static async getStats(startDate = null, endDate = null) {
        try {
            let dateFilter = '';
            const values = [];

            if (startDate && endDate) {
                dateFilter = 'AND p.created_at >= $1 AND p.created_at <= $2';
                values.push(startDate, endDate);
            }

            const query = `
                SELECT
                    COUNT(*) as total_payments,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_revenue,
                    COALESCE(AVG(CASE WHEN status = 'completed' THEN amount END), 0) as avg_payment_amount
                FROM payments p
                WHERE p.deleted_at IS NULL ${dateFilter}
            `;

            const result = await db.query(query, values);
            const stats = result.rows[0];

            // Converte stringhe in numeri
            Object.keys(stats).forEach(key => {
                if (stats[key] && !isNaN(stats[key])) {
                    stats[key] = parseFloat(stats[key]);
                }
            });

            return stats;
        } catch (error) {
            logger.error('Error getting payment stats:', error);
            throw error;
        }
    }

    /**
     * Ottiene revenue mensile
     */
    static async getMonthlyRevenue(year = new Date().getFullYear()) {
        try {
            const query = `
                SELECT
                    EXTRACT(MONTH FROM created_at) as month,
                    COALESCE(SUM(amount), 0) as revenue,
                    COUNT(*) as payment_count
                FROM payments
                WHERE EXTRACT(YEAR FROM created_at) = $1
                  AND status = 'completed'
                  AND deleted_at IS NULL
                GROUP BY EXTRACT(MONTH FROM created_at)
                ORDER BY month
            `;

            const result = await db.query(query, [year]);

            // Crea array con tutti i 12 mesi
            const monthlyData = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                revenue: 0,
                payment_count: 0
            }));

            // Popola con i dati effettivi
            result.rows.forEach(row => {
                const monthIndex = parseInt(row.month) - 1;
                monthlyData[monthIndex] = {
                    month: parseInt(row.month),
                    revenue: parseFloat(row.revenue),
                    payment_count: parseInt(row.payment_count)
                };
            });

            return monthlyData;
        } catch (error) {
            logger.error('Error getting monthly revenue:', error);
            throw error;
        }
    }
}

module.exports = Payment;