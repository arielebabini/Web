const User = require('../models/User');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

/**
 * Controller per la gestione degli utenti
 */
class UserController {

    /**
     * Ottiene il profilo dell'utente corrente
     */
    static async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            res.json({
                success: true,
                user
            });
        } catch (error) {
            logger.error('Error getting user profile:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    static async getUserByEmail(req, res) {
        try {
            const { email } = req.query; // Riceve l'email come parametro query (?email=...)

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Il parametro email è obbligatorio'
                });
            }

            // La query esclude campi sensibili come la password_hash
            const userResult = await query(`
                SELECT 
                    id, first_name, last_name, email, phone, 
                    company, role, status, created_at, updated_at 
                FROM users 
                WHERE email = $1
            `, [email.toLowerCase().trim()]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato con questa email'
                });
            }

            res.json({
                success: true,
                user: userResult.rows[0]
            });

        } catch (error) {
            logger.error('Error getting user by email:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server durante il recupero dell\'utente'
            });
        }
    }

    /**
     * Aggiorna il profilo dell'utente corrente
     */
    static async updateProfile(req, res) {
        try {
            // Validazione input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dati non validi',
                    errors: errors.array()
                });
            }

            const { first_name, last_name, phone, company } = req.body;

            const updatedUser = await User.updateProfile(req.user.id, {
                first_name,
                last_name,
                phone,
                company
            });

            res.json({
                success: true,
                message: 'Profilo aggiornato con successo',
                user: updatedUser
            });
        } catch (error) {
            logger.error('Error updating user profile:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante l\'aggiornamento del profilo'
            });
        }
    }

    /**
     * Lista tutti gli utenti (solo admin)
     */
    static async getAllUsers(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                role,
                status,
                search,
                sortBy,
                sortOrder
            } = req.query;

            const options = {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), 100), // Max 100 per pagina
                role,
                status,
                search,
                sortBy,
                sortOrder
            };

            const result = await User.findAll(options);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Error getting all users:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero degli utenti'
            });
        }
    }

    /**
     * Crea nuovo utente (solo per admin/manager)
     */
    static async createUser(req, res) {
        try {
            const { first_name, last_name, email, password, phone, role = 'client', status = 'active' } = req.body;

            // Validazione dati obbligatori
            if (!first_name || !last_name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome, cognome, email e password sono obbligatori'
                });
            }

            // Validazione email formato
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato email non valido'
                });
            }

            // Validazione password
            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'La password deve essere di almeno 8 caratteri'
                });
            }

            if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                return res.status(400).json({
                    success: false,
                    message: 'La password deve contenere almeno una maiuscola, una minuscola e un numero'
                });
            }

            // Validazione ruolo
            if (!['client', 'manager', 'admin'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Ruolo non valido'
                });
            }

            // Verifica se email già esiste
            const existingUser = await query(
                'SELECT id FROM users WHERE email = $1',
                [email.toLowerCase().trim()]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email già esistente'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12); // Aumentato da 10 a 12

            // Inserisci nuovo utente - CORREZIONE: usa password_hash invece di password
            const result = await query(`
            INSERT INTO users (first_name, last_name, email, password_hash, phone, role, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id, first_name, last_name, email, phone, role, status, created_at
        `, [
                first_name.trim(),
                last_name.trim(),
                email.toLowerCase().trim(),
                hashedPassword,
                phone || null,
                role,
                status
            ]);

            const newUser = result.rows[0];

            console.log('User created successfully:', { id: newUser.id, email: newUser.email });

            res.status(201).json({
                success: true,
                message: 'Utente creato con successo',
                data: newUser
            });

        } catch (error) {
            console.error('Error creating user:', error);

            // Gestione errori specifici PostgreSQL
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: 'Email già esistente'
                });
            }

            if (error.code === '23502') {
                return res.status(400).json({
                    success: false,
                    message: 'Campi obbligatori mancanti'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    /**
     * Elimina utente (solo per admin)
     */
    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const currentUserId = req.user.id;

            console.log('Delete user request:', { userId, currentUserId });

            if (userId == currentUserId) {
                return res.status(400).json({
                    success: false,
                    message: 'Non puoi eliminare il tuo account'
                });
            }

            // Verifica se utente esiste
            const userResult = await query(
                'SELECT id, role, email, first_name, last_name FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            const userToDelete = userResult.rows[0];

            if (userToDelete.role === 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Non è possibile eliminare un utente amministratore'
                });
            }

            // Controlla se l'utente ha dati collegati che impediscono l'eliminazione
            const bookingsCount = await query(
                'SELECT COUNT(*) as count FROM bookings WHERE user_id = $1',
                [userId]
            );

            const paymentsCount = await query(
                'SELECT COUNT(*) as count FROM payments WHERE user_id = $1',
                [userId]
            ).catch(() => ({ rows: [{ count: 0 }] })); // Ignora errore se tabella non esiste

            console.log('User has dependencies:', {
                bookings: bookingsCount.rows[0].count,
                payments: paymentsCount.rows[0].count
            });

            // Se l'utente ha prenotazioni, non può essere eliminato fisicamente
            if (parseInt(bookingsCount.rows[0].count) > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Impossibile eliminare l'utente: ha ${bookingsCount.rows[0].count} prenotazioni associate. Utilizzare la disattivazione invece dell'eliminazione.`,
                    data: {
                        reason: 'HAS_BOOKINGS',
                        bookingsCount: parseInt(bookingsCount.rows[0].count),
                        suggestion: 'Disattiva l\'utente invece di eliminarlo'
                    }
                });
            }

            // Se ha pagamenti ma non prenotazioni, elimina prima i pagamenti
            if (parseInt(paymentsCount.rows[0].count) > 0) {
                console.log('Deleting user payments...');
                await query('DELETE FROM payments WHERE user_id = $1', [userId]);
                console.log(`Deleted ${paymentsCount.rows[0].count} payments`);
            }

            // Ora elimina l'utente
            const deleteResult = await query(
                'DELETE FROM users WHERE id = $1 RETURNING id, email',
                [userId]
            );

            if (deleteResult.rowCount === 0) {
                return res.status(500).json({
                    success: false,
                    message: 'Errore durante l\'eliminazione'
                });
            }

            console.log('User deleted successfully:', deleteResult.rows[0]);

            res.json({
                success: true,
                message: 'Utente eliminato con successo'
            });

        } catch (error) {
            console.error('Error deleting user:', error);

            // Gestione errori specifici PostgreSQL
            if (error.code === '23503') {
                return res.status(400).json({
                    success: false,
                    message: 'Impossibile eliminare l\'utente: ha dati collegati (prenotazioni, pagamenti, etc.). Considerare la disattivazione invece dell\'eliminazione.',
                    data: {
                        reason: 'FOREIGN_KEY_CONSTRAINT',
                        suggestion: 'Disattiva l\'utente invece di eliminarlo'
                    }
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    static async debugDatabaseStructure(req, res) {
        try {
            // Lista tutte le tabelle
            const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

            console.log('📋 Database tables:', tables.rows);

            // Controlla la struttura della tabella users
            const usersStructure = await query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position;
        `);

            console.log('👤 Users table structure:', usersStructure.rows);

            // Controlla i vincoli foreign key
            const foreignKeys = await query(`
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND (ccu.table_name = 'users' OR tc.table_name = 'users');
        `);

            console.log('🔗 Foreign key constraints:', foreignKeys.rows);

            res.json({
                success: true,
                data: {
                    tables: tables.rows,
                    usersStructure: usersStructure.rows,
                    foreignKeys: foreignKeys.rows
                }
            });

        } catch (error) {
            console.error('❌ Error debugging database:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Aggiorna status utente
     */
    static async updateUserStatus(req, res) {
        try {
            const { userId } = req.params;
            const { status } = req.body;

            if (!['active', 'inactive', 'suspended'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Status non valido'
                });
            }

            const result = await query(`
                UPDATE users
                SET status = $1, updated_at = NOW()
                WHERE id = $2
                    RETURNING id, first_name, last_name, email, role, status, updated_at
            `, [status, userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            res.json({
                success: true,
                message: 'Status utente aggiornato',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    /**
     * Ottiene un utente specifico per ID (admin/manager)
     */
    static async getUserById(req, res) {
        try {
            const { userId } = req.params;

            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            res.json({
                success: true,
                user
            });
        } catch (error) {
            logger.error('Error getting user by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero dell\'utente'
            });
        }
    }

    /**
     * Aggiorna il ruolo di un utente (solo admin)
     */
    static async updateUserRole(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dati non validi',
                    errors: errors.array()
                });
            }

            const { userId } = req.params;
            const { role } = req.body;

            // Verifica che non sia l'utente stesso
            if (userId === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Non puoi modificare il tuo stesso ruolo'
                });
            }

            const updatedUser = await User.updateRole(userId, role);

            res.json({
                success: true,
                message: 'Ruolo utente aggiornato con successo',
                user: updatedUser
            });
        } catch (error) {
            logger.error('Error updating user role:', error);

            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            if (error.message === 'Invalid role') {
                return res.status(400).json({
                    success: false,
                    message: 'Ruolo non valido'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore durante l\'aggiornamento del ruolo'
            });
        }
    }

    /**
     * Ottiene statistiche degli utenti (solo admin)
     */
    static async getUserStats(req, res) {
        try {
            const stats = await User.getStats();

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            logger.error('Error getting user stats:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il recupero delle statistiche'
            });
        }
    }

    /**
     * Verifica email utente
     */
    static async verifyEmail(req, res) {
        try {
            const { token } = req.params;

            // Qui dovresti implementare la logica di verifica del token
            // Per ora assumiamo che il token sia l'ID dell'utente
            const user = await User.verifyEmail(token);

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Token di verifica non valido'
                });
            }

            res.json({
                success: true,
                message: 'Email verificata con successo',
                user
            });
        } catch (error) {
            logger.error('Error verifying email:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante la verifica dell\'email'
            });
        }
    }

    /**
     * Cambia password utente
     */
    static async changePassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dati non validi',
                    errors: errors.array()
                });
            }

            const { currentPassword, newPassword } = req.body;
            const bcrypt = require('bcryptjs');

            // Recupera utente con password
            const user = await User.findByEmail(req.user.email);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            // Verifica password corrente
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Password corrente non corretta'
                });
            }

            // Hash nuova password
            const saltRounds = 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // Aggiorna password nel database
            const { query } = require('../config/database');
            await query(`
                UPDATE users
                SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [newPasswordHash, req.user.id]);

            res.json({
                success: true,
                message: 'Password aggiornata con successo'
            });
        } catch (error) {
            logger.error('Error changing password:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante il cambio password'
            });
        }
    }
}

module.exports = {
    UserController
};