const Booking = require('../models/Booking');
const Space = require('../models/Space');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Controller per la gestione delle prenotazioni
 */
class BookingController {

    /**
     * Crea una nuova prenotazione
     */
    static async createBooking(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dati non validi',
                    errors: errors.array()
                });
            }

            const {
                space_id,
                start_date,
                end_date,
                start_time,
                end_time,
                people_count,
                notes
            } = req.body;

            // Verifica che lo spazio esista e sia attivo
            const space = await Space.findById(space_id);
            if (!space) {
                return res.status(404).json({
                    success: false,
                    message: 'Spazio non trovato'
                });
            }

            // Verifica che il numero di persone non superi la capacità
            if (people_count > space.capacity) {
                return res.status(400).json({
                    success: false,
                    message: `Il numero di persone (${people_count}) supera la capacità massima dello spazio (${space.capacity})`
                });
            }

            // Verifica che la data inizio non sia nel passato
            const startDate = new Date(start_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDate < today) {
                return res.status(400).json({
                    success: false,
                    message: 'Non è possibile prenotare per date passate'
                });
            }

            // Verifica che la data fine sia >= data inizio
            const endDate = new Date(end_date);
            if (endDate < startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'La data fine deve essere successiva o uguale alla data inizio'
                });
            }

            const bookingData = {
                user_id: req.user.id,
                space_id,
                start_date,
                end_date,
                start_time,
                end_time,
                people_count,
                notes
            };

            const newBooking = await Booking.create(bookingData);

            res.status(201).json({
                success: true,
                message: 'Prenotazione creata con successo',
                booking: newBooking
            });
        } catch (error) {
            logger.error('Error creating booking:', error);

            if (error.message === 'Lo spazio non è disponibile per le date selezionate') {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message === 'Numero di persone superiore alla capacità') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore durante la creazione della prenotazione'
            });
        }
    }

    /**
     * Ottiene tutte le prenotazioni con filtri
     */
    static async getAllBookings(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Parametri non validi',
                    errors: errors.array()
                });
            }

            const {
                page = 1,
                limit = 20,
                space_id,
                status,
                start_date_from,
                start_date_to,
                sortBy,
                sortOrder
            } = req.query;

            // Filtra in base al ruolo dell'utente
            let user_id, manager_id;

            if (req.user.role === 'client') {
                // I client vedono solo le proprie prenotazioni
                user_id = req.user.id;
            } else if (req.user.role === 'manager') {
                // I manager vedono le prenotazioni dei loro spazi
                manager_id = req.user.id;
            }
            // Gli admin vedono tutto

            const options = {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), 100),
                user_id,
                manager_id,
                space_id,
                status: status ? (Array.isArray(status) ? status : [status]) : undefined,
                start_date_from,
                start_date_to,
                sortBy,
                sortOrder
            };

            const result = await Booking.findAll(options);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Error getting bookings:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero delle prenotazioni'
            });
        }
    }

    /**
     * Ottiene una prenotazione specifica per ID
     */
    static async getBookingById(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findById(bookingId);

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: 'Prenotazione non trovata'
                });
            }

            // Verifica permessi
            const hasAccess =
                req.user.role === 'admin' ||
                (req.user.role === 'manager' && booking.space_manager_id === req.user.id) ||
                (req.user.role === 'client' && booking.user_id === req.user.id);

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Non hai il permesso di visualizzare questa prenotazione'
                });
            }

            res.json({
                success: true,
                booking
            });
        } catch (error) {
            logger.error('Error getting booking by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero della prenotazione'
            });
        }
    }

    /**
     * Aggiorna una prenotazione
     */
    static async updateBooking(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dati non validi',
                    errors: errors.array()
                });
            }

            const { bookingId } = req.params;
            let updateData = { ...req.body };

            // Verifica che la prenotazione esista
            const existingBooking = await Booking.findById(bookingId);
            if (!existingBooking) {
                return res.status(404).json({
                    success: false,
                    message: 'Prenotazione non trovata'
                });
            }

            // Verifica permessi
            const canUpdate =
                req.user.role === 'admin' ||
                (req.user.role === 'client' && existingBooking.user_id === req.user.id &&
                    ['pending'].includes(existingBooking.status)) ||
                (req.user.role === 'manager' && existingBooking.space_manager_id === req.user.id);

            if (!canUpdate) {
                return res.status(403).json({
                    success: false,
                    message: 'Non hai il permesso di modificare questa prenotazione'
                });
            }

            // I client possono modificare solo alcuni campi e solo se la prenotazione è pending
            if (req.user.role === 'client') {
                if (existingBooking.status !== 'pending') {
                    return res.status(400).json({
                        success: false,
                        message: 'Puoi modificare solo prenotazioni in stato pending'
                    });
                }

                // Limita i campi modificabili dai client
                const allowedFields = ['start_date', 'end_date', 'start_time', 'end_time', 'people_count', 'notes'];
                const filteredUpdateData = {};
                allowedFields.forEach(field => {
                    if (updateData[field] !== undefined) {
                        filteredUpdateData[field] = updateData[field];
                    }
                });
                updateData = filteredUpdateData;
            }

            // Validazioni aggiuntive se cambiano le date
            if (updateData.start_date || updateData.end_date) {
                const newStartDate = new Date(updateData.start_date || existingBooking.start_date);
                const newEndDate = new Date(updateData.end_date || existingBooking.end_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (newStartDate < today) {
                    return res.status(400).json({
                        success: false,
                        message: 'Non è possibile prenotare per date passate'
                    });
                }

                if (newEndDate < newStartDate) {
                    return res.status(400).json({
                        success: false,
                        message: 'La data fine deve essere successiva o uguale alla data inizio'
                    });
                }
            }

            // Verifica capacità se cambia il numero di persone
            if (updateData.people_count) {
                const space = await Space.findById(existingBooking.space_id);
                if (updateData.people_count > space.capacity) {
                    return res.status(400).json({
                        success: false,
                        message: `Il numero di persone (${updateData.people_count}) supera la capacità massima dello spazio (${space.capacity})`
                    });
                }
            }

            const updatedBooking = await Booking.update(bookingId, updateData);

            res.json({
                success: true,
                message: 'Prenotazione aggiornata con successo',
                booking: updatedBooking
            });
        } catch (error) {
            logger.error('Error updating booking:', error);

            if (error.message === 'Booking not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Prenotazione non trovata'
                });
            }

            if (error.message === 'Lo spazio non è disponibile per le nuove date') {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message === 'No valid fields to update') {
                return res.status(400).json({
                    success: false,
                    message: 'Nessun campo valido da aggiornare'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore durante l\'aggiornamento della prenotazione'
            });
        }
    }

    /**
     * Cancella una prenotazione
     */
    static async cancelBooking(req, res) {
        try {
            const { bookingId } = req.params;
            const { reason } = req.body;

            // Verifica che la prenotazione esista
            const existingBooking = await Booking.findById(bookingId);
            if (!existingBooking) {
                return res.status(404).json({
                    success: false,
                    message: 'Prenotazione non trovata'
                });
            }

            // Verifica permessi
            const canCancel =
                req.user.role === 'admin' ||
                (req.user.role === 'manager' && existingBooking.space_manager_id === req.user.id) ||
                (req.user.role === 'client' && existingBooking.user_id === req.user.id);

            if (!canCancel) {
                return res.status(403).json({
                    success: false,
                    message: 'Non hai il permesso di cancellare questa prenotazione'
                });
            }

            // Verifica che la prenotazione sia cancellabile
            if (!['pending', 'confirmed'].includes(existingBooking.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Questa prenotazione non può essere cancellata'
                });
            }

            // Per i client, verifica il tempo limite di cancellazione
            if (req.user.role === 'client') {
                const canCancelResult = await Booking.canCancel(bookingId, req.user.id);
                if (!canCancelResult) {
                    return res.status(400).json({
                        success: false,
                        message: 'Non è più possibile cancellare questa prenotazione (deve essere almeno 24 ore prima dell\'inizio)'
                    });
                }
            }

            const cancelledBooking = await Booking.cancel(bookingId, reason);

            res.json({
                success: true,
                message: 'Prenotazione cancellata con successo',
                booking: cancelledBooking
            });
        } catch (error) {
            logger.error('Error cancelling booking:', error);

            if (error.message === 'Booking not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Prenotazione non trovata'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore durante la cancellazione della prenotazione'
            });
        }
    }

    /**
     * Conferma una prenotazione (solo manager/admin)
     */
    static async confirmBooking(req, res) {
        try {
            const { bookingId } = req.params;

            const confirmedBooking = await Booking.confirm(bookingId);

            res.json({
                success: true,
                message: 'Prenotazione confermata con successo',
                booking: confirmedBooking
            });
        } catch (error) {
            logger.error('Error confirming booking:', error);

            if (error.message === 'Booking not found or already processed') {
                return res.status(404).json({
                    success: false,
                    message: 'Prenotazione non trovata o già processata'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore durante la conferma della prenotazione'
            });
        }
    }

    /**
     * Completa una prenotazione (solo manager/admin)
     */
    static async completeBooking(req, res) {
        try {
            const { bookingId } = req.params;

            const completedBooking = await Booking.complete(bookingId);

            res.json({
                success: true,
                message: 'Prenotazione completata con successo',
                booking: completedBooking
            });
        } catch (error) {
            logger.error('Error completing booking:', error);

            if (error.message === 'Booking not found or not confirmed') {
                return res.status(404).json({
                    success: false,
                    message: 'Prenotazione non trovata o non confermata'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore durante il completamento della prenotazione'
            });
        }
    }

    /**
     * Verifica conflitti per una nuova prenotazione
     */
    static async checkConflicts(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Parametri non validi',
                    errors: errors.array()
                });
            }

            const {
                space_id,
                start_date,
                end_date,
                start_time,
                end_time
            } = req.query;

            const conflicts = await Booking.checkConflicts({
                space_id,
                start_date,
                end_date,
                start_time,
                end_time
            });

            res.json({
                success: true,
                hasConflicts: conflicts.length > 0,
                conflicts: conflicts.map(conflict => ({
                    id: conflict.id,
                    start_date: conflict.start_date,
                    end_date: conflict.end_date,
                    start_time: conflict.start_time,
                    end_time: conflict.end_time,
                    status: conflict.status,
                    user: {
                        name: `${conflict.first_name} ${conflict.last_name}`,
                        email: conflict.email
                    }
                }))
            });
        } catch (error) {
            logger.error('Error checking conflicts:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante la verifica dei conflitti'
            });
        }
    }

    /**
     * Ottiene statistiche delle prenotazioni
     */
    static async getBookingStats(req, res) {
        try {
            const filters = {};

            // Filtra in base al ruolo
            if (req.user.role === 'manager') {
                filters.manager_id = req.user.id;
            } else if (req.user.role === 'client') {
                filters.user_id = req.user.id;
            }

            // Aggiungi filtri dalla query string
            if (req.query.space_id) filters.space_id = req.query.space_id;
            if (req.query.date_from) filters.date_from = req.query.date_from;
            if (req.query.date_to) filters.date_to = req.query.date_to;

            const stats = await Booking.getStats(filters);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            logger.error('Error getting booking stats:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero delle statistiche'
            });
        }
    }

    /**
     * Ottiene prenotazioni in arrivo
     */
    static async getUpcomingBookings(req, res) {
        try {
            const { hours = 24 } = req.query;

            const upcomingBookings = await Booking.getUpcoming(parseInt(hours));

            // Filtra in base al ruolo
            let filteredBookings = upcomingBookings;
            if (req.user.role === 'client') {
                filteredBookings = upcomingBookings.filter(booking => booking.user_id === req.user.id);
            } else if (req.user.role === 'manager') {
                filteredBookings = upcomingBookings.filter(booking => booking.space_manager_id === req.user.id);
            }

            res.json({
                success: true,
                bookings: filteredBookings
            });
        } catch (error) {
            logger.error('Error getting upcoming bookings:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero delle prenotazioni in arrivo'
            });
        }
    }

    /**
     * Ottiene tutte le prenotazioni (per l'amministratore)
     */
    static async getAllBookingsDashboard(req, res) {
        try {
            const bookings = await Booking.findAllBookings();
            res.status(200).json({
                success: true,
                bookings
            });
        } catch (error) {
            logger.error('Error getting all bookings:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero delle prenotazioni'
            });
        }
    }

    /**
     * Elimina una prenotazione
     */
    static async deleteBooking(req, res) {
        try {
            const { bookingId } = req.params;
            const result = await Booking.delete(bookingId);

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Prenotazione non trovata.'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Prenotazione eliminata con successo.'
            });

        } catch (error) {
            logger.error('Error deleting booking:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante l\'eliminazione della prenotazione.'
            });
        }
    }

    /**
     * @route   GET /api/bookings/me
     * @desc    Ottieni tutte le prenotazioni dell'utente loggato
     * @access  Private
     */
    static async getUserBookings(req, res) {
        try {
            const userId = req.user.id;
            const bookings = await Booking.findByUserId(userId);

            const formattedBookings = bookings.map(booking => ({
                id: booking.id,
                start_date: booking.start_date,
                end_date: booking.end_date,
                start_time: booking.start_time,
                end_time: booking.end_time,
                status: booking.status,
                total_price: booking.total_price,
                space_id: booking.space_id,
                space_name: booking.space_name || 'Nome Spazio Sconosciuto',
                space_city: booking.space_city,
                space_address: booking.space_address,
                people_count: booking.people_count,
                created_at: booking.created_at,
                total_days: booking.total_days
            }));

            res.status(200).json({
                success: true,
                message: 'Prenotazioni recuperate con successo',
                data: formattedBookings
            });

        } catch (error) {
            logger.error('Errore nel recupero delle prenotazioni utente:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    //===================== GESTIONE MANAGER =====================

    /**
     * Ottiene prenotazioni per manager con controllo proprietà spazio + email
     * @param {Object} options - Filtri e opzioni
     * @param {string} managerId - ID del manager
     * @param {string} managerEmail - Email del manager loggato
     */
    /**
     * Ottiene prenotazioni per manager con controllo proprietà spazio + email
     */
    static async getManagerBookings(options, managerId, managerEmail) {
        try {
            console.log('🔍 DEBUG getManagerBookings called with:');
            console.log('- options:', options);
            console.log('- managerId:', managerId);
            console.log('- managerEmail:', managerEmail);
            const {
                page = 1,
                limit = 10,
                status,
                space_id,
                start_date_from,
                start_date_to,
                search,
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = options;

            const offset = (page - 1) * limit;

            // Costruisci WHERE clause dinamicamente
            let whereClause = 'WHERE s.manager_id = $1 AND u.email = $2';
            const params = [managerId, managerEmail];
            let paramIndex = 3;

            // Filtro per status
            if (status && status !== 'all') {
                whereClause += ` AND b.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            // Filtro per spazio specifico
            if (space_id) {
                whereClause += ` AND b.space_id = $${paramIndex}`;
                params.push(space_id);
                paramIndex++;
            }

            // Filtro per data inizio
            if (start_date_from) {
                whereClause += ` AND b.start_date >= $${paramIndex}`;
                params.push(start_date_from);
                paramIndex++;
            }

            if (start_date_to) {
                whereClause += ` AND b.start_date <= $${paramIndex}`;
                params.push(start_date_to);
                paramIndex++;
            }

            // Filtro per ricerca
            if (search) {
                whereClause += ` AND (
                s.name ILIKE $${paramIndex} OR 
                s.city ILIKE $${paramIndex} OR
                c.first_name ILIKE $${paramIndex} OR
                c.last_name ILIKE $${paramIndex} OR
                c.email ILIKE $${paramIndex}
            )`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            // Query principale con JOIN per verificare proprietà
            const result = await query(`
                SELECT
                    b.id,
                    b.space_id,
                    b.user_id,
                    b.start_date,
                    b.end_date,
                    b.people_count,
                    b.total_price,
                    b.notes,
                    b.created_at,
                    b.updated_at,
                    s.name as space_name,
                    s.type as space_type,
                    s.address as space_address,
                    s.city as space_city,
                    c.first_name as client_first_name,
                    c.last_name as client_last_name,
                    c.email as client_email,
                    c.phone as client_phone
                FROM bookings b
                         INNER JOIN spaces s ON b.space_id = s.id
                         INNER JOIN users u ON s.manager_id = u.id
                         LEFT JOIN users c ON b.user_id = c.id
                    ${whereClause}
                ORDER BY b.${sortBy} ${sortOrder}
                    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, [...params, limit, offset]);

            // Query per contare il totale
            const countResult = await query(`
                SELECT COUNT(*) as total
                FROM bookings b
                         INNER JOIN spaces s ON b.space_id = s.id
                         INNER JOIN users u ON s.manager_id = u.id
                         LEFT JOIN users c ON b.user_id = c.id
                    ${whereClause}
            `, params);

            const totalBookings = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(totalBookings / limit);

            return {
                bookings: result.rows,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalBookings,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };

        } catch (error) {
            logger.error('Error getting manager bookings:', error);
            throw error;
        }
    }

    /**
     * Ottiene statistiche prenotazioni per manager con controllo email
     */
    static async getManagerBookingStats(managerId, managerEmail, filters = {}) {
        try {
            const { date_from, date_to } = filters;

            let whereClause = 'WHERE s.manager_id = $1 AND u.email = $2';
            const params = [managerId, managerEmail];
            let paramIndex = 3;

            if (date_from) {
                whereClause += ` AND b.start_date >= $${paramIndex}`;
                params.push(date_from);
                paramIndex++;
            }

            if (date_to) {
                whereClause += ` AND b.start_date <= $${paramIndex}`;
                params.push(date_to);
                paramIndex++;
            }

            const result = await query(`
                SELECT
                    COUNT(b.id) as total_bookings,
                    COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
                    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
                    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
                    COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price END), 0) as total_revenue,
                    COALESCE(AVG(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price END), 0) as avg_booking_value,
                    COUNT(CASE WHEN b.start_date = CURRENT_DATE THEN 1 END) as today_bookings,
                    COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_bookings,
                    COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month_bookings
                FROM bookings b
                         INNER JOIN spaces s ON b.space_id = s.id
                         INNER JOIN users u ON s.manager_id = u.id
                    ${whereClause}
            `, params);

            // Trend mensile con controllo email
            const trendResult = await query(`
                SELECT
                    DATE_TRUNC('month', b.created_at) as month,
                COUNT(b.id) as bookings_count,
                COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price END), 0) as revenue
                FROM bookings b
                    INNER JOIN spaces s ON b.space_id = s.id
                    INNER JOIN users u ON s.manager_id = u.id
                WHERE s.manager_id = $1
                  AND u.email = $2
                  AND b.created_at >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', b.created_at)
                ORDER BY month DESC
                    LIMIT 12
            `, [managerId, managerEmail]);

            return {
                ...result.rows[0],
                monthlyTrend: trendResult.rows
            };
        } catch (error) {
            logger.error('Error getting manager booking stats:', error);
            throw error;
        }
    }

    /**
     * Ottiene prenotazione singola per manager con controllo proprietà e email
     */
    static async getBookingForManager(bookingId, managerId, managerEmail) {
        try {
            const result = await query(`
                SELECT b.*,
                       s.name as space_name,
                       s.type as space_type,
                       s.address as space_address,
                       s.city as space_city,
                       c.first_name as client_first_name,
                       c.last_name as client_last_name,
                       c.email as client_email,
                       c.phone as client_phone
                FROM bookings b
                         INNER JOIN spaces s ON b.space_id = s.id
                         INNER JOIN users u ON s.manager_id = u.id
                         LEFT JOIN users c ON b.user_id = c.id
                WHERE b.id = $1
                  AND s.manager_id = $2
                  AND u.email = $3
            `, [bookingId, managerId, managerEmail]);

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error getting booking for manager:', error);
            throw error;
        }
    }

    /**
     * Cancella prenotazione come manager
     */
    static async cancelBookingAsManager(bookingId, managerId, reason) {
        try {
            // Verifica che la prenotazione appartenga a uno spazio del manager
            const booking = await this.getBookingForManager(bookingId, managerId);
            if (!booking) {
                throw new Error('Prenotazione non trovata o non autorizzata');
            }

            if (booking.status === 'cancelled') {
                throw new Error('La prenotazione è già stata cancellata');
            }

            if (booking.status === 'completed') {
                throw new Error('Non è possibile cancellare una prenotazione completata');
            }

            return await Booking.cancel(bookingId, reason);
        } catch (error) {
            logger.error('Error cancelling booking as manager:', error);
            throw error;
        }
    }

    /**
     * Ottiene calendario prenotazioni per manager
     */
    static async getManagerCalendar(managerId, options = {}) {
        try {
            const { start_date, end_date, space_id } = options;

            let whereClause = 'WHERE s.manager_id = $1';
            const params = [managerId];
            let paramIndex = 2;

            if (space_id) {
                whereClause += ` AND s.id = $${paramIndex}`;
                params.push(space_id);
                paramIndex++;
            }

            if (start_date) {
                whereClause += ` AND b.start_date >= $${paramIndex}`;
                params.push(start_date);
                paramIndex++;
            }

            if (end_date) {
                whereClause += ` AND b.end_date <= $${paramIndex}`;
                params.push(end_date);
                paramIndex++;
            }

            const result = await query(`
            SELECT 
                b.id,
                b.start_date,
                b.end_date,
                b.start_time,
                b.end_time,
                b.people_count,
                b.total_price,
                s.id as space_id,
                s.name as space_name,
                s.type as space_type,
                u.first_name as user_first_name,
                u.last_name as user_last_name,
                u.email as user_email
            FROM bookings b
            INNER JOIN spaces s ON b.space_id = s.id
            LEFT JOIN users u ON b.user_id = u.id
            ${whereClause}
            AND b.status IN ('confirmed', 'pending', 'completed')
            ORDER BY b.start_date, b.start_time
        `, params);

            return result.rows;
        } catch (error) {
            logger.error('Error getting manager calendar:', error);
            throw error;
        }
    }
}

module.exports = BookingController;