const User = require('../models/User');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

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
     * Aggiorna lo status di un utente (admin/manager)
     */
    static async updateUserStatus(req, res) {
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
            const { status } = req.body;

            // Verifica che non sia l'utente stesso
            if (userId === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Non puoi modificare il tuo stesso status'
                });
            }

            const updatedUser = await User.updateStatus(userId, status);

            res.json({
                success: true,
                message: 'Status utente aggiornato con successo',
                user: updatedUser
            });
        } catch (error) {
            logger.error('Error updating user status:', error);

            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            if (error.message === 'Invalid status') {
                return res.status(400).json({
                    success: false,
                    message: 'Status non valido'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Errore durante l\'aggiornamento dello status'
            });
        }
    }

    /**
     * Elimina un utente (soft delete, solo admin)
     */
    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;

            // Verifica che non sia l'utente stesso
            if (userId === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Non puoi eliminare il tuo stesso account'
                });
            }

            const deleted = await User.softDelete(userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            res.json({
                success: true,
                message: 'Utente eliminato con successo'
            });
        } catch (error) {
            logger.error('Error deleting user:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante l\'eliminazione dell\'utente'
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

module.exports = UserController;