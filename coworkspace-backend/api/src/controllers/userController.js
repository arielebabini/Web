// src/controllers/userController.js - Controller Utenti Completo
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../utils/logger');

class UserController {
    /**
     * Ottieni profilo utente corrente
     */
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Profilo utente non trovato'
                });
            }

            // Rimuovi password dal response
            const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUser } = user;

            res.json({
                success: true,
                data: {
                    user: safeUser
                }
            });

        } catch (error) {
            logger.error('Errore recupero profilo:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    /**
     * Aggiorna profilo utente corrente
     */
    async updateProfile(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dati non validi',
                    errors: errors.array()
                });
            }

            const { firstName, lastName, phone, company } = req.body;
            const userId = req.user.id;

            const updateData = {};
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
            if (phone !== undefined) updateData.phone = phone;
            if (company !== undefined) updateData.company = company;

            const updatedUser = await User.updateProfile(userId, updateData);

            logger.info(`Profilo aggiornato: ${req.user.email}`);

            res.json({
                success: true,
                message: 'Profilo aggiornato con successo',
                data: {
                    user: updatedUser
                }
            });

        } catch (error) {
            logger.error('Errore aggiornamento profilo:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    /**
     * Cambia password utente corrente
     */
    async changePassword(req, res) {
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
            const userId = req.user.id;

            // Recupera utente con password hash
            const user = await User.findByEmail(req.user.email);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            // Verifica password corrente
            const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Password corrente non corretta'
                });
            }

            // Verifica che la nuova password sia diversa
            const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
            if (isSamePassword) {
                return res.status(400).json({
                    success: false,
                    message: 'La nuova password deve essere diversa da quella corrente'
                });
            }

            // Hash nuova password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // Aggiorna password
            await User.updatePassword(userId, newPasswordHash);

            logger.info(`Password cambiata: ${user.email}`);

            res.json({
                success: true,
                message: 'Password cambiata con successo'
            });

        } catch (error) {
            logger.error('Errore cambio password:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    /**
     * Ottieni dettagli utente specifico (Admin/Manager)
     */
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const currentUser = req.user;

            // Verifica autorizzazioni
            if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.id !== id) {
                return res.status(403).json({
                    success: false,
                    message: 'Non autorizzato ad accedere a questi dati'
                });
            }

            const user = await User.findById(id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            // Rimuovi dati sensibili
            const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUser } = user;

            res.json({
                success: true,
                data: {
                    user: safeUser
                }
            });

        } catch (error) {
            logger.error('Errore recupero utente:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    /**
     * Lista utenti con filtri (Admin/Manager)
     */
    async getUsers(req, res) {
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
                data: result
            });

        } catch (error) {
            logger.error('Errore lista utenti:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    /**
     * Aggiorna utente (Admin)
     */
    async updateUser(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dati non validi',
                    errors: errors.array()
                });
            }

            const { id } = req.params;
            const { firstName, lastName, phone, company, role, status } = req.body;
            const currentUser = req.user;

            // Verifica che l'utente esista
            const existingUser = await User.findById(id);
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            // Verifica autorizzazioni per modifica ruolo/status
            if ((role || status) && currentUser.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Solo gli admin possono modificare ruolo e stato'
                });
            }

            // Impedisce auto-modifica del proprio ruolo/status
            if (currentUser.id === id && (role || status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Non puoi modificare il tuo stesso ruolo o stato'
                });
            }

            const updateData = {};
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
            if (phone !== undefined) updateData.phone = phone;
            if (company !== undefined) updateData.company = company;

            let updatedUser;

            // Aggiorna profilo base
            if (Object.keys(updateData).length > 0) {
                updatedUser = await User.updateProfile(id, updateData);
            }

            // Aggiorna status se necessario
            if (status && status !== existingUser.status) {
                updatedUser = await User.updateStatus(id, status);
            }

            logger.info(`Utente aggiornato: ${existingUser.email} da ${currentUser.email}`);

            res.json({
                success: true,
                message: 'Utente aggiornato con successo',
                data: {
                    user: updatedUser || existingUser
                }
            });

        } catch (error) {
            logger.error('Errore aggiornamento utente:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    /**
     * Elimina utente (Admin)
     */
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const currentUser = req.user;

            // Impedisce auto-eliminazione
            if (currentUser.id === id) {
                return res.status(400).json({
                    success: false,
                    message: 'Non puoi eliminare il tuo stesso account'
                });
            }

            // Verifica che l'utente esista
            const existingUser = await User.findById(id);
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            // Soft delete
            await User.softDelete(id);

            logger.info(`Utente eliminato: ${existingUser.email} da ${currentUser.email}`);

            res.json({
                success: true,
                message: 'Utente eliminato con successo'
            });

        } catch (error) {
            logger.error('Errore eliminazione utente:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    /**
     * Statistiche utenti (Admin)
     */
    async getUserStats(req, res) {
        try {
            const stats = await User.getStats();

            res.json({
                success: true,
                data: {
                    stats
                }
            });

        } catch (error) {
            logger.error('Errore statistiche utenti:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }

    /**
     * Aggiorna stato utente (Admin)
     */
    async updateUserStatus(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dati non validi',
                    errors: errors.array()
                });
            }

            const { id } = req.params;
            const { status } = req.body;
            const currentUser = req.user;

            // Impedisce auto-modifica
            if (currentUser.id === id) {
                return res.status(400).json({
                    success: false,
                    message: 'Non puoi modificare il tuo stesso stato'
                });
            }

            // Verifica che l'utente esista
            const existingUser = await User.findById(id);
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            const updatedUser = await User.updateStatus(id, status);

            logger.info(`Stato utente aggiornato: ${existingUser.email} -> ${status} da ${currentUser.email}`);

            res.json({
                success: true,
                message: 'Stato utente aggiornato con successo',
                data: {
                    user: updatedUser
                }
            });

        } catch (error) {
            logger.error('Errore aggiornamento stato utente:', error);
            res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    }
}

module.exports = new UserController();