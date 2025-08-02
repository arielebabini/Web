const { query } = require('../config/database');
const logger = require('../utils/logger');
const Space = require('./Space');

class Booking {
    /**
     * Crea una nuova prenotazione
     * @param {Object} bookingData - Dati della prenotazione
     * @returns {Promise<Object>} Prenotazione creata
     */
    static async create(bookingData) {
        const {
            user_id,
            space_id,
            start_date,
            end_date,
            start_time,
            end_time,
            people_count,
            notes
        } = bookingData;

        try {
            // Verifica disponibilità prima di creare
            const isAvailable = await Space.checkAvailability(
                space_id, start_date, end_date, start_time, end_time
            );

            if (!isAvailable) {
                throw new Error('Lo spazio non è disponibile per le date selezionate');
            }

            // Calcola il prezzo
            const pricing = await Space.calculatePrice(space_id, start_date, end_date, people_count);

            const start = new Date(start_date);
            const end = new Date(end_date);
            const total_days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            const result = await query(`
                INSERT INTO bookings (
                    user_id, space_id, start_date, end_date, start_time, end_time,
                    total_days, people_count, base_price, fees, total_price, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
            `, [
                user_id, space_id, start_date, end_date, start_time, end_time,
                total_days, people_count, pricing.basePrice, pricing.fees,
                pricing.totalPrice, notes
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating booking:', error);
            throw error;
        }
    }

    /**
     * Trova prenotazione per ID
     * @param {string} bookingId - ID della prenotazione
     * @returns {Promise<Object|null>} Prenotazione trovata
     */
    static async findById(bookingId) {
        try {
            const result = await query(`
                SELECT b.*,
                       s.name as space_name,
                       s.type as space_type,
                       s.address as space_address,
                       s.city as space_city,
                       s.manager_id as space_manager_id,
                       u.first_name as user_first_name,
                       u.last_name as user_last_name,
                       u.email as user_email,
                       u.phone as user_phone
                FROM bookings b
                         LEFT JOIN spaces s ON b.space_id = s.id
                         LEFT JOIN users u ON b.user_id = u.id
                WHERE b.id = $1
            `, [bookingId]);

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding booking by ID:', error);
            throw error;
        }
    }

    /**
     * Aggiorna prenotazione
     * @param {string} bookingId - ID della prenotazione
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Prenotazione aggiornata
     */
    static async update(bookingId, updateData) {
        const allowedFields = [
            'start_date', 'end_date', 'start_time', 'end_time',
            'people_count', 'notes', 'status'
        ];

        const updates = [];
        const values = [];
        let paramIndex = 1;

        // Se cambiano date o persone, ricalcola il prezzo
        const needsPriceRecalculation = [
            'start_date', 'end_date', 'people_count'
        ].some(field => updateData[field] !== undefined);

        if (needsPriceRecalculation) {
            // Recupera prenotazione corrente
            const currentBooking = await this.findById(bookingId);
            if (!currentBooking) {
                throw new Error('Booking not found');
            }

            // Verifica disponibilità con nuove date
            const newStartDate = updateData.start_date || currentBooking.start_date;
            const newEndDate = updateData.end_date || currentBooking.end_date;
            const newStartTime = updateData.start_time || currentBooking.start_time;
            const newEndTime = updateData.end_time || currentBooking.end_time;
            const newPeopleCount = updateData.people_count || currentBooking.people_count;

            const isAvailable = await Space.checkAvailability(
                currentBooking.space_id,
                newStartDate,
                newEndDate,
                newStartTime,
                newEndTime,
                bookingId // Escludi questa prenotazione dal controllo
            );

            if (!isAvailable) {
                throw new Error('Lo spazio non è disponibile per le nuove date');
            }

            // Ricalcola prezzo
            const pricing = await Space.calculatePrice(
                currentBooking.space_id,
                newStartDate,
                newEndDate,
                newPeopleCount
            );

            // Aggiorna anche i campi di prezzo
            updateData.base_price = pricing.basePrice;
            updateData.fees = pricing.fees;
            updateData.total_price = pricing.totalPrice;
            updateData.total_days = pricing.days;
        }

        Object.keys(updateData).forEach(key => {
            if ((allowedFields.includes(key) || needsPriceRecalculation) && updateData[key] !== undefined) {
                updates.push(`${key} = $${paramIndex}`);
                values.push(updateData[key]);
                paramIndex++;
            }
        });

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(bookingId);

        try {
            const result = await query(`
                UPDATE bookings
                SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex}
                    RETURNING *
            `, values);

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating booking:', error);
            throw error;
        }
    }

    /**
     * Lista prenotazioni con filtri e paginazione
     * @param {Object} options - Opzioni di ricerca
     * @returns {Promise<Object>} Lista prenotazioni paginata
     */
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            user_id,
            space_id,
            manager_id,
            status,
            start_date_from,
            start_date_to,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = options;

        const offset = (page - 1) * limit;
        const conditions = [];
        const values = [];
        let paramIndex = 1;

        // Filtri
        if (user_id) {
            conditions.push(`b.user_id = $${paramIndex}`);
            values.push(user_id);
            paramIndex++;
        }

        if (space_id) {
            conditions.push(`b.space_id = $${paramIndex}`);
            values.push(space_id);
            paramIndex++;
        }

        if (manager_id) {
            conditions.push(`s.manager_id = $${paramIndex}`);
            values.push(manager_id);
            paramIndex++;
        }

        if (status) {
            if (Array.isArray(status)) {
                const placeholders = status.map(() => `$${paramIndex++}`).join(', ');
                conditions.push(`b.status IN (${placeholders})`);
                values.push(...status);
            } else {
                conditions.push(`b.status = $${paramIndex}`);
                values.push(status);
                paramIndex++;
            }
        }

        if (start_date_from) {
            conditions.push(`b.start_date >= $${paramIndex}`);
            values.push(start_date_from);
            paramIndex++;
        }

        if (start_date_to) {
            conditions.push(`b.start_date <= $${paramIndex}`);
            values.push(start_date_to);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Validazione sortBy per sicurezza
        const validSortFields = [
            'created_at', 'updated_at', 'start_date', 'end_date',
            'total_price', 'status'
        ];
        const sortField = validSortFields.includes(sortBy) ? `b.${sortBy}` : 'b.created_at';
        const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        try {
            // Query principale
            const result = await query(`
                SELECT b.*,
                       s.name as space_name,
                       s.type as space_type,
                       s.address as space_address,
                       s.city as space_city,
                       s.manager_id as space_manager_id,
                       u.first_name as user_first_name,
                       u.last_name as user_last_name,
                       u.email as user_email
                FROM bookings b
                         LEFT JOIN spaces s ON b.space_id = s.id
                         LEFT JOIN users u ON b.user_id = u.id
                    ${whereClause}
                ORDER BY ${sortField} ${sortDirection}
                    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, [...values, limit, offset]);

            // Query per conteggio totale
            const countResult = await query(`
                SELECT COUNT(*) as total
                FROM bookings b
                         LEFT JOIN spaces s ON b.space_id = s.id
                    ${whereClause}
            `, values);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                bookings: result.rows,
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
            logger.error('Error fetching bookings:', error);
            throw error;
        }
    }

    /**
     * Cancella prenotazione
     * @param {string} bookingId - ID della prenotazione
     * @param {string} reason - Motivo cancellazione
     * @returns {Promise<Object>} Prenotazione cancellata
     */
    static async cancel(bookingId, reason = null) {
        try {
            const result = await query(`
                UPDATE bookings
                SET status = 'cancelled',
                    cancelled_at = CURRENT_TIMESTAMP,
                    cancellation_reason = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                    RETURNING *
            `, [bookingId, reason]);

            if (result.rows.length === 0) {
                throw new Error('Booking not found');
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error cancelling booking:', error);
            throw error;
        }
    }

    /**
     * Conferma prenotazione
     * @param {string} bookingId - ID della prenotazione
     * @returns {Promise<Object>} Prenotazione confermata
     */
    static async confirm(bookingId) {
        try {
            const result = await query(`
                UPDATE bookings
                SET status = 'confirmed',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND status = 'pending'
                    RETURNING *
            `, [bookingId]);

            if (result.rows.length === 0) {
                throw new Error('Booking not found or already processed');
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error confirming booking:', error);
            throw error;
        }
    }

    /**
     * Completa prenotazione
     * @param {string} bookingId - ID della prenotazione
     * @returns {Promise<Object>} Prenotazione completata
     */
    static async complete(bookingId) {
        try {
            const result = await query(`
                UPDATE bookings
                SET status = 'completed',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND status = 'confirmed'
                    RETURNING *
            `, [bookingId]);

            if (result.rows.length === 0) {
                throw new Error('Booking not found or not confirmed');
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error completing booking:', error);
            throw error;
        }
    }

    /**
     * Verifica se un utente può cancellare una prenotazione
     * @param {string} bookingId - ID della prenotazione
     * @param {string} userId - ID dell'utente
     * @returns {Promise<boolean>} True se può cancellare
     */
    static async canCancel(bookingId, userId) {
        try {
            const booking = await this.findById(bookingId);
            if (!booking) return false;

            // Solo l'utente che ha prenotato può cancellare
            if (booking.user_id !== userId) return false;

            // Solo prenotazioni pending o confirmed possono essere cancellate
            if (!['pending', 'confirmed'].includes(booking.status)) return false;

            // Verifica se la prenotazione è cancellabile (es. almeno 24h prima)
            const now = new Date();
            const startDate = new Date(booking.start_date);
            const hoursDiff = (startDate - now) / (1000 * 60 * 60);

            return hoursDiff >= 24; // Almeno 24 ore prima
        } catch (error) {
            logger.error('Error checking if booking can be cancelled:', error);
            return false;
        }
    }

    /**
     * Ottiene statistiche prenotazioni
     * @param {Object} filters - Filtri per le statistiche
     * @returns {Promise<Object>} Statistiche
     */
    static async getStats(filters = {}) {
        const { manager_id, space_id, user_id, date_from, date_to } = filters;

        const conditions = [];
        const values = [];
        let paramIndex = 1;

        if (manager_id) {
            conditions.push(`s.manager_id = $${paramIndex}`);
            values.push(manager_id);
            paramIndex++;
        }

        if (space_id) {
            conditions.push(`b.space_id = $${paramIndex}`);
            values.push(space_id);
            paramIndex++;
        }

        if (user_id) {
            conditions.push(`b.user_id = $${paramIndex}`);
            values.push(user_id);
            paramIndex++;
        }

        if (date_from) {
            conditions.push(`b.start_date >= $${paramIndex}`);
            values.push(date_from);
            paramIndex++;
        }

        if (date_to) {
            conditions.push(`b.start_date <= $${paramIndex}`);
            values.push(date_to);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        try {
            const result = await query(`
                SELECT
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
                    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
                    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
                    COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price END), 0) as total_revenue,
                    COALESCE(AVG(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price END), 0) as avg_booking_value,
                    COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_days END), 0) as total_days_booked
                FROM bookings b
                         LEFT JOIN spaces s ON b.space_id = s.id
                    ${whereClause}
            `, values);

            return result.rows[0];
        } catch (error) {
            logger.error('Error getting booking stats:', error);
            throw error;
        }
    }

    /**
     * Ottiene prenotazioni in scadenza per notifiche
     * @param {number} hoursFromNow - Ore da ora
     * @returns {Promise<Array>} Prenotazioni in scadenza
     */
    static async getUpcoming(hoursFromNow = 24) {
        try {
            const result = await query(`
                SELECT b.*,
                       s.name as space_name,
                       s.address as space_address,
                       u.first_name as user_first_name,
                       u.last_name as user_last_name,
                       u.email as user_email
                FROM bookings b
                         LEFT JOIN spaces s ON b.space_id = s.id
                         LEFT JOIN users u ON b.user_id = u.id
                WHERE b.status = 'confirmed'
                  AND b.start_date = CURRENT_DATE + INTERVAL '1 day' * ($1 / 24)
                ORDER BY b.start_date, b.start_time
            `, [hoursFromNow]);

            return result.rows;
        } catch (error) {
            logger.error('Error getting upcoming bookings:', error);
            throw error;
        }
    }

    /**
     * Verifica conflitti per una prenotazione
     * @param {Object} bookingData - Dati della prenotazione da verificare
     * @param {string} excludeBookingId - ID prenotazione da escludere
     * @returns {Promise<Array>} Conflitti trovati
     */
    static async checkConflicts(bookingData, excludeBookingId = null) {
        const { space_id, start_date, end_date, start_time, end_time } = bookingData;

        let queryText = `
            SELECT b.*, u.first_name, u.last_name, u.email
            FROM bookings b
                     LEFT JOIN users u ON b.user_id = u.id
            WHERE b.space_id = $1
              AND b.status IN ('confirmed', 'pending')
              AND (
                (b.start_date <= $3 AND b.end_date >= $2)
        `;

        const params = [space_id, start_date, end_date];
        let paramIndex = 4;

        // Se sono specificate ore, controlla anche sovrapposizioni orarie
        if (start_time && end_time) {
            queryText += ` AND (
                (b.start_time IS NULL OR b.end_time IS NULL) OR
                (b.start_time < $${paramIndex + 1} AND b.end_time > $${paramIndex})
            )`;
            params.push(start_time, end_time);
            paramIndex += 2;
        }

        queryText += ')';

        // Escludi una prenotazione specifica
        if (excludeBookingId) {
            queryText += ` AND b.id != $${paramIndex}`;
            params.push(excludeBookingId);
        }

        try {
            const result = await query(queryText, params);
            return result.rows;
        } catch (error) {
            logger.error('Error checking booking conflicts:', error);
            throw error;
        }
    }
}

module.exports = Booking;