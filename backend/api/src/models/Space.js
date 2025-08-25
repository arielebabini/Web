const { query } = require('../config/database');
const logger = require('../utils/logger');

class Space {
    /**
     * Crea un nuovo spazio
     * @param {Object} spaceData - Dati dello spazio
     * @returns {Promise<Object>} Spazio creato
     */
    static async create(spaceData) {
        const {
            name,
            description,
            type,
            city,
            address,
            capacity,
            price_per_day,
            manager_id,
            amenities = [],
            images = [],
            coordinates,
            is_featured = false
        } = spaceData;

        try {
            const result = await query(`
                INSERT INTO spaces (
                    name, description, type, city, address, capacity,
                    price_per_day, manager_id, amenities, images,
                    coordinates, is_featured
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
            `, [
                name, description, type, city, address, capacity,
                price_per_day, manager_id, JSON.stringify(amenities),
                JSON.stringify(images), coordinates ? JSON.stringify(coordinates) : null,
                is_featured
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating space:', error);
            throw error;
        }
    }

    /**
     * Trova spazio per ID
     * @param {string} spaceId - ID dello spazio
     * @returns {Promise<Object|null>} Spazio trovato
     */
    static async findById(spaceId) {
        try {
            const result = await query(`
                SELECT s.*,
                       u.first_name as manager_first_name,
                       u.last_name as manager_last_name,
                       u.email as manager_email,
                       u.phone as manager_phone
                FROM spaces s
                         LEFT JOIN users u ON s.manager_id = u.id
                WHERE s.id = $1 AND s.is_active = true
            `, [spaceId]);

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding space by ID:', error);
            throw error;
        }
    }

    /**
     * Aggiorna spazio
     * @param {string} spaceId - ID dello spazio
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Spazio aggiornato
     */
    static async update(spaceId, updateData) {
        const allowedFields = [
            'name', 'description', 'type', 'city', 'address',
            'capacity', 'price_per_day', 'amenities', 'images',
            'coordinates', 'is_featured'
        ];

        const updates = [];
        const values = [];
        let paramIndex = 1;

        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                if (key === 'amenities' || key === 'images') {
                    updates.push(`${key} = $${paramIndex}`);
                    values.push(JSON.stringify(updateData[key]));
                } else if (key === 'coordinates') {
                    updates.push(`${key} = $${paramIndex}`);
                    values.push(updateData[key] ? JSON.stringify(updateData[key]) : null);
                } else {
                    updates.push(`${key} = $${paramIndex}`);
                    values.push(updateData[key]);
                }
                paramIndex++;
            }
        });

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(spaceId);

        try {
            const result = await query(`
                UPDATE spaces
                SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex} AND is_active = true
                    RETURNING *
            `, values);

            return result.rows[0];
        } catch (error) {
            logger.error('Error updating space:', error);
            throw error;
        }
    }

    /**
     * Lista spazi con filtri e paginazione
     * @param {Object} options - Opzioni di ricerca
     * @returns {Promise<Object>} Lista spazi paginata
     */
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            city,
            type,
            manager_id,
            is_featured,
            min_price,
            max_price,
            min_capacity,
            max_capacity,
            amenities,
            search,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = options;

        const offset = (page - 1) * limit;
        const conditions = ['s.is_active = true'];
        const values = [];
        let paramIndex = 1;

        // Filtri
        if (city) {
            conditions.push(`s.city ILIKE $${paramIndex}`);
            values.push(`%${city}%`);
            paramIndex++;
        }

        if (type) {
            conditions.push(`s.type = $${paramIndex}`);
            values.push(type);
            paramIndex++;
        }

        if (manager_id) {
            conditions.push(`s.manager_id = $${paramIndex}`);
            values.push(manager_id);
            paramIndex++;
        }

        if (is_featured !== undefined) {
            conditions.push(`s.is_featured = $${paramIndex}`);
            values.push(is_featured);
            paramIndex++;
        }

        if (min_price) {
            conditions.push(`s.price_per_day >= $${paramIndex}`);
            values.push(min_price);
            paramIndex++;
        }

        if (max_price) {
            conditions.push(`s.price_per_day <= $${paramIndex}`);
            values.push(max_price);
            paramIndex++;
        }

        if (min_capacity) {
            conditions.push(`s.capacity >= $${paramIndex}`);
            values.push(min_capacity);
            paramIndex++;
        }

        if (max_capacity) {
            conditions.push(`s.capacity <= $${paramIndex}`);
            values.push(max_capacity);
            paramIndex++;
        }

        if (amenities && amenities.length > 0) {
            conditions.push(`s.amenities @> $${paramIndex}`);
            values.push(JSON.stringify(amenities));
            paramIndex++;
        }

        if (search) {
            conditions.push(`(
                s.name ILIKE $${paramIndex} OR 
                s.description ILIKE $${paramIndex} OR
                s.address ILIKE $${paramIndex}
            )`);
            values.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        // Validazione sortBy per sicurezza
        const validSortFields = [
            'created_at', 'updated_at', 'name', 'city', 'type',
            'price_per_day', 'capacity', 'rating', 'total_reviews'
        ];
        const sortField = validSortFields.includes(sortBy) ? `s.${sortBy}` : 's.created_at';
        const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        try {
            // Query principale
            const result = await query(`
                SELECT s.*,
                       u.first_name as manager_first_name,
                       u.last_name as manager_last_name,
                       u.email as manager_email
                FROM spaces s
                         LEFT JOIN users u ON s.manager_id = u.id
                    ${whereClause}
                ORDER BY ${sortField} ${sortDirection}
                    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, [...values, limit, offset]);

            // Query per conteggio totale
            const countResult = await query(`
                SELECT COUNT(*) as total
                FROM spaces s
                    ${whereClause}
            `, values);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                spaces: result.rows,
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
            logger.error('Error fetching spaces:', error);
            throw error;
        }
    }

    /**
     * Soft delete di uno spazio
     * @param {string} spaceId - ID dello spazio
     * @returns {Promise<boolean>} Successo operazione
     */
    static async softDelete(spaceId) {
        try {
            const result = await query(`
                UPDATE spaces
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [spaceId]);

            return result.rowCount > 0;
        } catch (error) {
            logger.error('Error soft deleting space:', error);
            throw error;
        }
    }

    /**
     * Verifica disponibilità spazio per date
     * @param {string} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @param {string} startTime - Ora inizio (opzionale)
     * @param {string} endTime - Ora fine (opzionale)
     * @param {string} excludeBookingId - ID prenotazione da escludere (per aggiornamenti)
     * @returns {Promise<boolean>} True se disponibile
     */
    static async checkAvailability(spaceId, startDate, endDate, startTime = null, endTime = null, excludeBookingId = null) {
        try {
            let queryText = `
                SELECT COUNT(*) as conflicts
                FROM bookings
                WHERE space_id = $1
                  AND status IN ('confirmed', 'pending')
                  AND (
                    (start_date <= $3 AND end_date >= $2)
            `;

            const params = [spaceId, startDate, endDate];
            let paramIndex = 4;

            // Se sono specificate ore, controlla anche sovrapposizioni orarie
            if (startTime && endTime) {
                queryText += ` AND (
                    (start_time IS NULL OR end_time IS NULL) OR
                    (start_time < $${paramIndex + 1} AND end_time > $${paramIndex})
                )`;
                params.push(startTime, endTime);
                paramIndex += 2;
            }

            queryText += ')';

            // Escludi una prenotazione specifica (utile per aggiornamenti)
            if (excludeBookingId) {
                queryText += ` AND id != $${paramIndex}`;
                params.push(excludeBookingId);
            }

            const result = await query(queryText, params);
            return parseInt(result.rows[0].conflicts) === 0;
        } catch (error) {
            logger.error('Error checking space availability:', error);
            throw error;
        }
    }

    /**
     * Calcola prezzo per prenotazione
     * @param {string} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @param {number} peopleCount - Numero persone
     * @returns {Promise<Object>} Dettagli prezzo
     */
    static async calculatePrice(spaceId, startDate, endDate, peopleCount) {
        try {
            const space = await this.findById(spaceId);
            if (!space) {
                throw new Error('Space not found');
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            const basePrice = parseFloat(space.price_per_day) * daysDiff;

            // Calcola fees (es. commissioni, tasse)
            const feePercentage = 0.1; // 10% di commissioni
            const fees = basePrice * feePercentage;

            // Eventuali supplementi per persone extra
            let extraPersonFee = 0;
            if (peopleCount > space.capacity) {
                throw new Error('Numero di persone superiore alla capacità');
            }

            const totalPrice = basePrice + fees + extraPersonFee;

            return {
                basePrice: parseFloat(basePrice.toFixed(2)),
                fees: parseFloat(fees.toFixed(2)),
                extraPersonFee: parseFloat(extraPersonFee.toFixed(2)),
                totalPrice: parseFloat(totalPrice.toFixed(2)),
                days: daysDiff,
                pricePerDay: parseFloat(space.price_per_day)
            };
        } catch (error) {
            logger.error('Error calculating price:', error);
            throw error;
        }
    }

    /**
     * Ottiene statistiche spazi
     * @param {string} managerId - ID manager (opzionale, per filtrare)
     * @returns {Promise<Object>} Statistiche
     */
    static async getStats(managerId = null) {
        try {
            let whereClause = 'WHERE s.is_active = true';
            const params = [];

            if (managerId) {
                whereClause += ' AND s.manager_id = $1';
                params.push(managerId);
            }

            const result = await query(`
                SELECT 
                    COUNT(*) as total_spaces,
                    COUNT(CASE WHEN s.is_featured THEN 1 END) as featured_spaces,
                    AVG(s.rating) as avg_rating,
                    AVG(s.price_per_day) as avg_price,
                    s.type,
                    COUNT(*) as count_by_type
                FROM spaces s
                ${whereClause}
                GROUP BY ROLLUP(s.type)
                ORDER BY s.type
            `, params);

            const stats = {
                total: 0,
                featured: 0,
                avgRating: 0,
                avgPrice: 0,
                byType: {}
            };

            result.rows.forEach(row => {
                if (!row.type) {
                    stats.total = parseInt(row.total_spaces);
                    stats.featured = parseInt(row.featured_spaces);
                    stats.avgRating = parseFloat(row.avg_rating || 0);
                    stats.avgPrice = parseFloat(row.avg_price || 0);
                } else {
                    stats.byType[row.type] = parseInt(row.count_by_type);
                }
            });

            return stats;
        } catch (error) {
            logger.error('Error getting space stats:', error);
            throw error;
        }
    }

    /**
     * Ottiene disponibilità per un range di date
     * @param {string} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @returns {Promise<Array>} Calendario disponibilità
     */
    static async getAvailabilityCalendar(spaceId, startDate, endDate) {
        try {
            // Genera tutte le date nel range
            const result = await query(`
                WITH date_series AS (
                    SELECT generate_series($2::date, $3::date, '1 day'::interval)::date as date
                )
                SELECT 
                    ds.date,
                    CASE 
                        WHEN b.id IS NOT NULL THEN false 
                        ELSE true 
                    END as available,
                    b.status,
                    b.start_time,
                    b.end_time,
                    b.people_count
                FROM date_series ds
                LEFT JOIN bookings b ON b.space_id = $1 
                    AND b.status IN ('confirmed', 'pending')
                    AND ds.date BETWEEN b.start_date AND b.end_date
                ORDER BY ds.date
            `, [spaceId, startDate, endDate]);

            return result.rows;
        } catch (error) {
            logger.error('Error getting availability calendar:', error);
            throw error;
        }
    }

    /**
     * Ottiene le date occupate per uno spazio
     * @param {string} spaceId - ID dello spazio
     * @param {string} fromDate - Data inizio periodo
     * @param {string} toDate - Data fine periodo
     * @returns {Promise<Array>} Array di date/orari occupati
     */
    static async getOccupiedSlots(spaceId, fromDate, toDate) {
        try {
            const result = await query(`
                SELECT start_date, end_date, start_time, end_time,
                       status, people_count
                FROM bookings 
                WHERE space_id = $1 
                AND status IN ('confirmed', 'pending')
                AND start_date <= $3 
                AND end_date >= $2
                ORDER BY start_date, start_time
            `, [spaceId, fromDate, toDate]);

            return result.rows;
        } catch (error) {
            logger.error('Error getting occupied slots:', error);
            throw error;
        }
    }

    /**
     * Ottiene spazi con maggiori prenotazioni
     * @param {number} limit - Numero di spazi da restituire
     * @param {string} managerId - ID manager (opzionale)
     * @returns {Promise<Array>} Spazi popolari
     */
    static async getPopularSpaces(limit = 10, managerId = null) {
        try {
            let whereClause = 'WHERE s.is_active = true';
            const params = [limit];

            if (managerId) {
                whereClause += ' AND s.manager_id = $2';
                params.push(managerId);
            }

            const result = await query(`
                SELECT s.*, 
                       u.first_name as manager_first_name,
                       u.last_name as manager_last_name,
                       COUNT(b.id) as total_bookings,
                       COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
                       AVG(CASE WHEN b.status = 'completed' THEN b.total_price END) as avg_booking_price
                FROM spaces s
                LEFT JOIN users u ON s.manager_id = u.id
                LEFT JOIN bookings b ON s.id = b.space_id 
                    AND b.created_at >= CURRENT_DATE - INTERVAL '365 days'
                ${whereClause}
                GROUP BY s.id, u.first_name, u.last_name
                ORDER BY total_bookings DESC, s.rating DESC
                LIMIT $1
            `, params);

            return result.rows;
        } catch (error) {
            logger.error('Error getting popular spaces:', error);
            throw error;
        }
    }

    /**
     * Cerca spazi nelle vicinanze usando coordinate
     * @param {number} lat - Latitudine
     * @param {number} lng - Longitudine
     * @param {number} radius - Raggio in km
     * @param {Object} options - Altre opzioni di filtro
     * @returns {Promise<Array>} Spazi nelle vicinanze
     */
    static async findNearby(lat, lng, radius = 10, options = {}) {
        try {
            const conditions = ['s.is_active = true', 's.coordinates IS NOT NULL'];
            const values = [lat, lng, radius];
            let paramIndex = 4;

            // Filtri aggiuntivi
            if (options.type) {
                conditions.push(`s.type = ${paramIndex}`);
                values.push(options.type);
                paramIndex++;
            }

            if (options.max_price) {
                conditions.push(`s.price_per_day <= ${paramIndex}`);
                values.push(options.max_price);
                paramIndex++;
            }

            if (options.min_capacity) {
                conditions.push(`s.capacity >= ${paramIndex}`);
                values.push(options.min_capacity);
                paramIndex++;
            }

            const whereClause = `WHERE ${conditions.join(' AND ')}`;

            const result = await query(`
                SELECT s.*, 
                       u.first_name as manager_first_name,
                       u.last_name as manager_last_name,
                       (
                           6371 * acos(
                               cos(radians($1)) * 
                               cos(radians((s.coordinates->>'lat')::float)) * 
                               cos(radians((s.coordinates->>'lng')::float) - radians($2)) + 
                               sin(radians($1)) * 
                               sin(radians((s.coordinates->>'lat')::float))
                           )
                       ) AS distance
                FROM spaces s
                LEFT JOIN users u ON s.manager_id = u.id
                ${whereClause}
                HAVING (
                    6371 * acos(
                        cos(radians($1)) * 
                        cos(radians((s.coordinates->>'lat')::float)) * 
                        cos(radians((s.coordinates->>'lng')::float) - radians($2)) + 
                        sin(radians($1)) * 
                        sin(radians((s.coordinates->>'lat')::float))
                    )
                ) <= $3
                ORDER BY distance
                LIMIT ${options.limit || 50}
            `, values);

            return result.rows;
        } catch (error) {
            logger.error('Error finding nearby spaces:', error);
            throw error;
        }
    }
}

module.exports = Space;