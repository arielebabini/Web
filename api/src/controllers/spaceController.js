const Space = require('../models/Space');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { query } = require('../config/database');

/**
 * Controller per la gestione degli spazi di coworking
 */
class SpaceController {

    /**
     * Crea un nuovo spazio
     */
    static async createSpace(req, res) {
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
                name,
                description,
                type,
                city,
                address,
                capacity,
                price_per_day,
                amenities,
                images,
                coordinates,
                is_featured
            } = req.body;

            // Per i manager, imposta automaticamente il loro ID
            const manager_id = req.user.role === 'admin' ?
                (req.body.manager_id || req.user.id) :
                req.user.id;

            const spaceData = {
                name,
                description,
                type,
                city,
                address,
                capacity,
                price_per_day,
                manager_id,
                amenities: amenities || [],
                images: images || [],
                coordinates,
                is_featured: req.user.role === 'admin' ? is_featured : false
            };

            const newSpace = await Space.create(spaceData);

            res.status(201).json({
                success: true,
                message: 'Spazio creato con successo',
                space: newSpace
            });
        } catch (error) {
            logger.error('Error creating space:', error);

            if (error.code === '23503') { // Foreign key violation
                return res.status(400).json({
                    success: false,
                    message: 'Manager non valido'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore durante la creazione dello spazio'
            });
        }
    }

    /**
     * Ottiene tutti gli spazi con filtri
     */
    static async getAllSpaces(req, res) {
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
                sortBy,
                sortOrder
            } = req.query;

            // Se l'utente è un manager, filtra solo i suoi spazi
            const filterManagerId = req.user && req.user.role === 'manager' ? req.user.id : manager_id;

            const options = {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), 100),
                city,
                type,
                manager_id: filterManagerId,
                is_featured: is_featured === 'true' ? true : is_featured === 'false' ? false : undefined,
                min_price: min_price ? parseFloat(min_price) : undefined,
                max_price: max_price ? parseFloat(max_price) : undefined,
                min_capacity: min_capacity ? parseInt(min_capacity) : undefined,
                max_capacity: max_capacity ? parseInt(max_capacity) : undefined,
                amenities: amenities ? (Array.isArray(amenities) ? amenities : [amenities]) : undefined,
                search,
                sortBy,
                sortOrder
            };

            const result = await Space.findAll(options);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Error getting spaces:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero degli spazi'
            });
        }
    }

    /**
     * Ottiene un spazio specifico per ID
     */
    static async getSpaceById(req, res) {
        try {
            const { spaceId } = req.params;

            const space = await Space.findById(spaceId);

            if (!space) {
                return res.status(404).json({
                    success: false,
                    message: 'Spazio non trovato'
                });
            }

            // ✅ SOLO controllo se lo spazio è attivo per visualizzazione pubblica
            if (!space.is_active) {
                return res.status(404).json({
                    success: false,
                    message: 'Spazio non disponibile'
                });
            }

            // ✅ Filtra informazioni sensibili per la visualizzazione pubblica
            const {
                manager_id,        // Non esporre l'ID del manager
                internal_notes,    // Non esporre note interne
                admin_notes,       // Non esporre note admin
                manager_email,     // Non esporre email manager
                ...publicSpaceData
            } = space;

            res.json({
                success: true,
                space: publicSpaceData
            });

        } catch (error) {
            logger.error('Error getting space by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero dello spazio'
            });
        }
    }

    /**
     * Aggiorna uno spazio
     */
    static async updateSpace(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dati non validi',
                    errors: errors.array()
                });
            }

            const { spaceId } = req.params;
            const updateData = { ...req.body };

            // I manager non possono modificare is_featured (solo admin)
            if (req.user.role !== 'admin') {
                delete updateData.is_featured;
                delete updateData.manager_id;
            }

            const updatedSpace = await Space.update(spaceId, updateData);

            if (!updatedSpace) {
                return res.status(404).json({
                    success: false,
                    message: 'Spazio non trovato'
                });
            }

            res.json({
                success: true,
                message: 'Spazio aggiornato con successo',
                space: updatedSpace
            });
        } catch (error) {
            logger.error('Error updating space:', error);

            if (error.message === 'No valid fields to update') {
                return res.status(400).json({
                    success: false,
                    message: 'Nessun campo valido da aggiornare'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore durante l\'aggiornamento dello spazio'
            });
        }
    }

    /**
     * Elimina uno spazio (soft delete)
     */
    static async deleteSpace(req, res) {
        try {
            const { spaceId } = req.params;

            const deleted = await Space.softDelete(spaceId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Spazio non trovato'
                });
            }

            res.json({
                success: true,
                message: 'Spazio eliminato con successo'
            });
        } catch (error) {
            logger.error('Error deleting space:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante l\'eliminazione dello spazio'
            });
        }
    }

    /**
     * Verifica disponibilità di uno spazio
     */
    static async checkAvailability(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Parametri non validi',
                    errors: errors.array()
                });
            }

            const { spaceId } = req.params;
            const { start_date, end_date, start_time, end_time } = req.query;

            const isAvailable = await Space.checkAvailability(
                spaceId,
                start_date,
                end_date,
                start_time,
                end_time
            );

            res.json({
                success: true,
                available: isAvailable,
                message: isAvailable ? 'Spazio disponibile' : 'Spazio non disponibile per le date selezionate'
            });
        } catch (error) {
            logger.error('Error checking availability:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante la verifica della disponibilità'
            });
        }
    }

    /**
     * Ottiene statistiche dashboard spazi
     */
    static async getDashboardStats(req, res) {
        try {
            // Se l'utente è un manager, filtra solo i suoi spazi
            const managerId = req.user && req.user.role === 'manager'
                ? req.user.id
                : null;

            const stats = await Space.getDashboardStats(managerId);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            logger.error('Error getting dashboard stats:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero delle statistiche dashboard'
            });
        }
    }

    /**
     * Ottiene il calendario di disponibilità
     */
    static async getAvailabilityCalendar(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Parametri non validi',
                    errors: errors.array()
                });
            }

            const { spaceId } = req.params;
            const { start_date, end_date } = req.query;

            const calendar = await Space.getAvailabilityCalendar(spaceId, start_date, end_date);

            res.json({
                success: true,
                calendar
            });
        } catch (error) {
            logger.error('Error getting availability calendar:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero del calendario'
            });
        }
    }

    /**
     * Calcola il prezzo per una prenotazione
     */
    static async calculatePrice(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Parametri non validi',
                    errors: errors.array()
                });
            }

            const { spaceId } = req.params;
            const { start_date, end_date, people_count } = req.query;

            const pricing = await Space.calculatePrice(
                spaceId,
                start_date,
                end_date,
                parseInt(people_count)
            );

            res.json({
                success: true,
                pricing
            });
        } catch (error) {
            logger.error('Error calculating price:', error);

            if (error.message === 'Space not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Spazio non trovato'
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
                message: 'Errore durante il calcolo del prezzo'
            });
        }
    }

    /**
     * Cerca spazi nelle vicinanze
     */
    static async findNearbySpaces(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Parametri non validi',
                    errors: errors.array()
                });
            }

            const { lat, lng, radius = 10, type, max_price, min_capacity, limit = 50 } = req.query;

            const options = {
                type,
                max_price: max_price ? parseFloat(max_price) : undefined,
                min_capacity: min_capacity ? parseInt(min_capacity) : undefined,
                limit: Math.min(parseInt(limit), 100)
            };

            const nearbySpaces = await Space.findNearby(
                parseFloat(lat),
                parseFloat(lng),
                parseFloat(radius),
                options
            );

            res.json({
                success: true,
                spaces: nearbySpaces,
                count: nearbySpaces.length
            });
        } catch (error) {
            logger.error('Error finding nearby spaces:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante la ricerca di spazi nelle vicinanze'
            });
        }
    }

    /**
     * Ottiene gli spazi più popolari
     */
    static async getPopularSpaces(req, res) {
        try {
            const { limit = 10 } = req.query;

            // Se l'utente è un manager, filtra solo i suoi spazi
            const managerId = req.user && req.user.role === 'manager' ? req.user.id : null;

            const popularSpaces = await Space.getPopularSpaces(
                Math.min(parseInt(limit), 50),
                managerId
            );

            res.json({
                success: true,
                spaces: popularSpaces
            });
        } catch (error) {
            logger.error('Error getting popular spaces:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero degli spazi popolari'
            });
        }
    }

    /**
     * Ottiene statistiche degli spazi
     */
    static async getSpaceStats(req, res) {
        try {
            // Se l'utente è un manager, filtra solo i suoi spazi
            const managerId = req.user && req.user.role === 'manager' ? req.user.id : null;

            const stats = await Space.getStats(managerId);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            logger.error('Error getting space stats:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero delle statistiche'
            });
        }
    }

    /**
     * @route   GET /api/spaces/all
     * @desc    Ottiene tutti gli spazi con filtri
     * @access  Private (tutti gli utenti autenticati)
     * @param {object} req - Oggetto request
     * @param {object} res - Oggetto response
     * @returns {Promise<void>}
     */
    static async getSpaces(req, res) {
        try {
            // Estrai i parametri di query dalla richiesta
            const { type, city, search } = req.query;

            // Logica per costruire i filtri per il database
            const filters = {};
            if (type) {
                // Aggiungi un controllo di validità per il tipo
                const validTypes = ['hot-desk', 'private-office', 'meeting-room', 'event-space'];
                if (validTypes.includes(type)) {
                    filters.type = type;
                } else {
                    // Se il tipo non è valido, restituisci un errore 400
                    return res.status(400).json({
                        success: false,
                        message: `Tipo di spazio non valido: ${type}. Tipi supportati: ${validTypes.join(', ')}`
                    });
                }
            }
            if (city) {
                filters.city = city;
            }
            if (search) {
                // Aggiunge la logica per la ricerca testuale
                // Nota: Assicurati che il tuo database supporti questa sintassi
                filters.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { address: { $regex: search, $options: 'i' } }
                ];
            }

            // Simula il recupero degli spazi dal database con i filtri
            // Sostituisci questo con la tua logica di database
            // Esempio: const spaces = await Space.find(filters);
            const spaces = [
                { id: '1', name: 'Ufficio Privato 1', type: 'private-office', city: 'Milano' },
                { id: '2', name: 'Sala Meeting 1', type: 'meeting-room', city: 'Roma' },
                { id: '3', name: 'Hot Desk 1', type: 'hot-desk', city: 'Milano' },
            ].filter(space => {
                let match = true;
                if (filters.type && space.type !== filters.type) {
                    match = false;
                }
                if (filters.city && space.city !== filters.city) {
                    match = false;
                }
                if (filters.$or) {
                    let searchMatch = false;
                    if (space.name.toLowerCase().includes(search.toLowerCase()) || space.address?.toLowerCase().includes(search.toLowerCase())) {
                        searchMatch = true;
                    }
                    if (!searchMatch) {
                        match = false;
                    }
                }
                return match;
            });

            res.json({
                success: true,
                spaces
            });
        } catch (error) {
            logger.error('Error getting spaces:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero degli spazi'
            });
        }
    }

    /**
     * Ottiene le statistiche complessive degli spazi per la dashboard
     */
    static async getStats(req, res) {
        try{
            const managerId = req.user && req.user.role === 'manager' ? req.user.id : null;
            const stats = await Space.getStats(managerId);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            logger.error('Error getting space stats:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero delle statistiche'
            });
        }
    }

    /**
     * Ottiene gli slot occupati per uno spazio
     */
    static async getOccupiedSlots(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Parametri non validi',
                    errors: errors.array()
                });
            }

            const { spaceId } = req.params;
            const { from_date, to_date } = req.query;

            const occupiedSlots = await Space.getOccupiedSlots(spaceId, from_date, to_date);

            res.json({
                success: true,
                occupiedSlots
            });
        } catch (error) {
            logger.error('Error getting occupied slots:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero degli slot occupati'
            });
        }
    }

    //================= GESTIONE MANAGER ==================
    /**
     * Ottiene spazi del manager con filtri
     */
    static async getManagerSpaces(options = {}) {
        const {
            manager_id,
            page = 1,
            limit = 20,
            city,
            type,
            search,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = options;

        try {
            // Forza il filtro per manager specifico
            const spaceOptions = {
                ...options,
                manager_id, // Questo è obbligatorio per i manager
            };

            return await Space.findAll(spaceOptions);
        } catch (error) {
            logger.error('Error getting manager spaces:', error);
            throw error;
        }
    }

    /**
     * Versione alternativa: usa solo l'email per identificare il manager
     * Più sicura perché non dipende dall'ID che potrebbe essere manipolato
     */
    static async getManagerSpaceStats(managerId, managerEmail) {
        try {
            console.log('Debug getManagerSpaceStats params:', { managerId, managerEmail });

            const result = await query(`
                SELECT
                    COUNT(*) as total_spaces,
                    COUNT(CASE WHEN s.is_active = true THEN 1 END) as active_spaces,
                    COUNT(CASE WHEN s.is_featured = true THEN 1 END) as featured_spaces,
                    AVG(s.price_per_day) as average_price,
                    SUM(s.capacity) as total_capacity,
                    COUNT(CASE WHEN s.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_spaces_month
                FROM spaces s
                         INNER JOIN users u ON s.manager_id = u.id
                WHERE s.manager_id = $1 AND u.email = $2
            `, [managerId, managerEmail]);

            console.log('Space stats query result:', result);

            if (!result || !result.rows || result.rows.length === 0) {
                console.warn('No space stats found for manager');
                return {
                    total_spaces: 0,
                    active_spaces: 0,
                    featured_spaces: 0,
                    average_price: 0,
                    total_capacity: 0,
                    new_spaces_month: 0,
                    bookings: {
                        total_bookings: 0,
                        confirmed_bookings: 0,
                        today_bookings: 0,
                        total_revenue: 0,
                        new_bookings_month: 0
                    }
                };
            }

            const bookingResult = await query(`
                SELECT
                    COUNT(b.id) as total_bookings,
                    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN b.start_date = CURRENT_DATE THEN 1 END) as today_bookings,
                    COALESCE(SUM(b.total_price), 0) as total_revenue,
                    COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_bookings_month
                FROM bookings b
                         INNER JOIN spaces s ON b.space_id = s.id
                         INNER JOIN users u ON s.manager_id = u.id
                WHERE s.manager_id = $1 AND u.email = $2
            `, [managerId, managerEmail]);

            console.log('Booking stats query result:', bookingResult);

            return {
                ...result.rows[0],
                bookings: bookingResult?.rows?.[0] || {
                    total_bookings: 0,
                    confirmed_bookings: 0,
                    today_bookings: 0,
                    total_revenue: 0,
                    new_bookings_month: 0
                }
            };
        } catch (error) {
            logger.error('Error getting manager space stats:', error);
            throw error;
        }
    }

    /**
     * Ottiene spazio per manager usando solo email (più sicuro)
     */
    static async getSpaceByIdForManager(spaceId, managerId, managerEmail) {
        try {
            const result = await query(`
                SELECT s.*,
                       u.first_name as manager_first_name,
                       u.last_name as manager_last_name,
                       u.email as manager_email
                FROM spaces s
                         INNER JOIN users u ON s.manager_id = u.id
                WHERE s.id = $1
                  AND s.manager_id = $2
                  AND u.email = $3
            `, [spaceId, managerId, managerEmail]);

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error getting space for manager:', error);
            throw error;
        }
    }

    /**
     * Aggiorna spazio del manager
     */
    static async updateManagerSpace(spaceId, updateData, managerId) {
        try {
            // Prima verifica che il manager sia proprietario
            const space = await this.getSpaceByIdForManager(spaceId, managerId);
            if (!space) {
                throw new Error('Spazio non trovato o non autorizzato');
            }

            // Rimuovi campi che il manager non può modificare
            const allowedFields = [
                'name', 'description', 'type', 'capacity', 'price_per_day',
                'amenities', 'images', 'coordinates'
            ];

            const filteredData = {};
            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredData[key] = updateData[key];
                }
            });

            return await Space.update(spaceId, filteredData);
        } catch (error) {
            logger.error('Error updating manager space:', error);
            throw error;
        }
    }
}

module.exports = SpaceController;