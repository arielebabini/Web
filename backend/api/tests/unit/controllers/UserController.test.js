// tests/unit/controllers/UserController.test.js

// Mock delle dipendenze
jest.mock('../../../src/models/User', () => ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    updateProfile: jest.fn(),
    findAll: jest.fn(),
    updateRole: jest.fn(),
    updateStatus: jest.fn(),
    getStats: jest.fn(),
    verifyEmail: jest.fn()
}));

jest.mock('../../../src/config/database', () => ({
    query: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn()
}));

jest.mock('express-validator', () => ({
    validationResult: jest.fn()
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn(),
    compare: jest.fn()
}));

const { UserController } = require('../../../src/controllers/userController');
const User = require('../../../src/models/User');
const { query } = require('../../../src/config/database');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

describe('UserController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: {
                id: 'user123',
                email: 'admin@test.com',
                role: 'admin'
            },
            body: {},
            params: {},
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();

        // Mock validation to pass by default
        validationResult.mockReturnValue({ isEmpty: () => true });
    });

    describe('getProfile', () => {
        test('should get user profile successfully', async () => {
            const mockUser = {
                id: 'user123',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                role: 'client'
            };

            User.findById.mockResolvedValue(mockUser);

            await UserController.getProfile(req, res);

            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                user: mockUser
            });
        });

        test('should return 404 when user not found', async () => {
            User.findById.mockResolvedValue(null);

            await UserController.getProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Utente non trovato'
            });
        });

        test('should handle database errors', async () => {
            const dbError = new Error('Database error');
            User.findById.mockRejectedValue(dbError);

            await UserController.getProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errore interno del server'
            });
        });
    });

    describe('getUserByEmail', () => {
        test('should get user by email successfully', async () => {
            req.query = { email: 'test@example.com' };

            const mockUser = {
                id: 'user123',
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User'
            };

            query.mockResolvedValue({ rows: [mockUser] });

            await UserController.getUserByEmail(req, res);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                ['test@example.com']
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                user: mockUser
            });
        });

        test('should return 400 when email parameter is missing', async () => {
            req.query = {};

            await UserController.getUserByEmail(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Il parametro email è obbligatorio'
            });
        });

        test('should return 404 when user not found by email', async () => {
            req.query = { email: 'nonexistent@example.com' };
            query.mockResolvedValue({ rows: [] });

            await UserController.getUserByEmail(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Utente non trovato con questa email'
            });
        });
    });

    describe('updateProfile', () => {
        test('should update profile successfully', async () => {
            req.body = {
                first_name: 'Updated',
                last_name: 'Name',
                phone: '+39 123 456 789',
                company: 'New Company'
            };

            const mockUpdatedUser = {
                id: 'user123',
                first_name: 'Updated',
                last_name: 'Name'
            };

            User.updateProfile.mockResolvedValue(mockUpdatedUser);

            await UserController.updateProfile(req, res);

            expect(User.updateProfile).toHaveBeenCalledWith('user123', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Profilo aggiornato con successo',
                user: mockUpdatedUser
            });
        });

        test('should handle validation errors', async () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ field: 'first_name', message: 'First name is required' }]
            });

            await UserController.updateProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Dati non validi',
                errors: [{ field: 'first_name', message: 'First name is required' }]
            });
        });
    });

    describe('getAllUsers', () => {
        test('should get all users with pagination', async () => {
            req.query = {
                page: '2',
                limit: '10',
                role: 'client',
                search: 'John'
            };

            const mockResult = {
                users: [
                    { id: 'user1', first_name: 'John', role: 'client' },
                    { id: 'user2', first_name: 'Jane', role: 'client' }
                ],
                pagination: {
                    page: 2,
                    limit: 10,
                    total: 25
                }
            };

            User.findAll.mockResolvedValue(mockResult);

            await UserController.getAllUsers(req, res);

            expect(User.findAll).toHaveBeenCalledWith({
                page: 2,
                limit: 10,
                role: 'client',
                status: undefined,
                search: 'John',
                sortBy: undefined,
                sortOrder: undefined
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                ...mockResult
            });
        });

        test('should limit maximum results per page', async () => {
            req.query = { limit: '500' }; // Richiesta eccessiva

            User.findAll.mockResolvedValue({ users: [], pagination: {} });

            await UserController.getAllUsers(req, res);

            expect(User.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 100 }) // Limitato a 100
            );
        });
    });

    describe('createUser', () => {
        beforeEach(() => {
            bcrypt.hash.mockResolvedValue('hashed_password');
        });

        test('should create user successfully', async () => {
            req.body = {
                first_name: 'New',
                last_name: 'User',
                email: 'new@example.com',
                password: 'Password123!',
                phone: '+39 123 456 789',
                role: 'client'
            };

            // Mock email non esistente
            query.mockResolvedValueOnce({ rows: [] });
            // Mock creazione utente
            query.mockResolvedValueOnce({
                rows: [{
                    id: 'new_user_id',
                    first_name: 'New',
                    last_name: 'User',
                    email: 'new@example.com',
                    role: 'client'
                }]
            });

            await UserController.createUser(req, res);

            expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
            expect(query).toHaveBeenCalledTimes(2);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Utente creato con successo',
                data: expect.objectContaining({
                    email: 'new@example.com'
                })
            });
        });

        test('should reject missing required fields', async () => {
            req.body = { email: 'test@example.com' }; // Mancano altri campi

            await UserController.createUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Nome, cognome, email e password sono obbligatori'
            });
        });

        test('should reject invalid email format', async () => {
            req.body = {
                first_name: 'Test',
                last_name: 'User',
                email: 'invalid-email',
                password: 'Password123!'
            };

            await UserController.createUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Formato email non valido'
            });
        });

        test('should reject weak password', async () => {
            req.body = {
                first_name: 'Test',
                last_name: 'User',
                email: 'test@example.com',
                password: '123' // Troppo corta
            };

            await UserController.createUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'La password deve essere di almeno 8 caratteri'
            });
        });

        test('should reject password without complexity requirements', async () => {
            req.body = {
                first_name: 'Test',
                last_name: 'User',
                email: 'test@example.com',
                password: 'simplepassword' // Senza maiuscole/numeri
            };

            await UserController.createUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'La password deve contenere almeno una maiuscola, una minuscola e un numero'
            });
        });

        test('should reject existing email', async () => {
            req.body = {
                first_name: 'Test',
                last_name: 'User',
                email: 'existing@example.com',
                password: 'Password123!'
            };

            // Mock email già esistente
            query.mockResolvedValue({ rows: [{ id: 'existing_user' }] });

            await UserController.createUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email già esistente'
            });
        });

        test('should reject invalid role', async () => {
            req.body = {
                first_name: 'Test',
                last_name: 'User',
                email: 'test@example.com',
                password: 'Password123!',
                role: 'invalid_role'
            };

            await UserController.createUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Ruolo non valido'
            });
        });
    });

    describe('deleteUser', () => {
        test('should delete user successfully when no dependencies exist', async () => {
            req.params = { userId: 'user_to_delete' };

            // Mock utente esistente
            query.mockResolvedValueOnce({
                rows: [{
                    id: 'user_to_delete',
                    role: 'client',
                    email: 'delete@example.com'
                }]
            });

            // Mock nessuna prenotazione
            query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
            // Mock nessun pagamento
            query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
            // Mock eliminazione riuscita
            query.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{ id: 'user_to_delete', email: 'delete@example.com' }]
            });

            await UserController.deleteUser(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Utente eliminato con successo'
            });
        });

        test('should prevent deleting own account', async () => {
            req.params = { userId: 'user123' }; // Stesso ID dell'utente corrente

            await UserController.deleteUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non puoi eliminare il tuo account'
            });
        });

        test('should prevent deleting admin users', async () => {
            req.params = { userId: 'admin_user' };

            query.mockResolvedValue({
                rows: [{
                    id: 'admin_user',
                    role: 'admin',
                    email: 'admin@example.com'
                }]
            });

            await UserController.deleteUser(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non è possibile eliminare un utente amministratore'
            });
        });

        test('should prevent deleting user with bookings', async () => {
            req.params = { userId: 'user_with_bookings' };

            // Mock utente esistente
            query.mockResolvedValueOnce({
                rows: [{
                    id: 'user_with_bookings',
                    role: 'client'
                }]
            });

            // Mock utente con prenotazioni
            query.mockResolvedValueOnce({ rows: [{ count: '3' }] });

            await UserController.deleteUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: expect.stringContaining('ha 3 prenotazioni associate'),
                data: {
                    reason: 'HAS_BOOKINGS',
                    bookingsCount: 3,
                    suggestion: 'Disattiva l\'utente invece di eliminarlo'
                }
            });
        });

        test('should delete payments before deleting user', async () => {
            req.params = { userId: 'user_with_payments' };

            // Mock utente esistente
            query.mockResolvedValueOnce({
                rows: [{
                    id: 'user_with_payments',
                    role: 'client'
                }]
            });

            // Mock nessuna prenotazione ma pagamenti esistenti
            query.mockResolvedValueOnce({ rows: [{ count: '0' }] }); // bookings
            query.mockResolvedValueOnce({ rows: [{ count: '2' }] }); // payments

            // Mock eliminazione pagamenti
            query.mockResolvedValueOnce({ rowCount: 2 });
            // Mock eliminazione utente
            query.mockResolvedValueOnce({
                rowCount: 1,
                rows: [{ id: 'user_with_payments' }]
            });

            await UserController.deleteUser(req, res);

            expect(query).toHaveBeenCalledWith('DELETE FROM payments WHERE user_id = $1', ['user_with_payments']);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Utente eliminato con successo'
            });
        });
    });

    describe('updateUserStatus', () => {
        test('should update user status successfully', async () => {
            req.params = { userId: 'user123' };
            req.body = { status: 'suspended' };

            const mockUpdatedUser = {
                id: 'user123',
                status: 'suspended',
                updated_at: new Date()
            };

            query.mockResolvedValue({ rows: [mockUpdatedUser] });

            await UserController.updateUserStatus(req, res);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users'),
                ['suspended', 'user123']
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Status utente aggiornato',
                data: mockUpdatedUser
            });
        });

        test('should reject invalid status', async () => {
            req.params = { userId: 'user123' };
            req.body = { status: 'invalid_status' };

            await UserController.updateUserStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Status non valido'
            });
        });

        test('should return 404 when user not found for status update', async () => {
            req.params = { userId: 'nonexistent' };
            req.body = { status: 'active' };

            query.mockResolvedValue({ rows: [] });

            await UserController.updateUserStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Utente non trovato'
            });
        });
    });

    describe('updateUserRole', () => {
        test('should update user role successfully', async () => {
            req.params = { userId: 'other_user' };
            req.body = { role: 'manager' };

            const mockUpdatedUser = {
                id: 'other_user',
                role: 'manager'
            };

            User.updateRole.mockResolvedValue(mockUpdatedUser);

            await UserController.updateUserRole(req, res);

            expect(User.updateRole).toHaveBeenCalledWith('other_user', 'manager');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Ruolo utente aggiornato con successo',
                user: mockUpdatedUser
            });
        });

        test('should prevent updating own role', async () => {
            req.params = { userId: 'user123' }; // Stesso ID dell'utente corrente
            req.body = { role: 'admin' };

            await UserController.updateUserRole(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non puoi modificare il tuo stesso ruolo'
            });
        });

        test('should handle user not found error', async () => {
            req.params = { userId: 'nonexistent' };
            req.body = { role: 'manager' };

            User.updateRole.mockRejectedValue(new Error('User not found'));

            await UserController.updateUserRole(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Utente non trovato'
            });
        });
    });

    describe('changePassword', () => {
        test('should change password successfully', async () => {
            req.body = {
                currentPassword: 'oldPassword123!',
                newPassword: 'newPassword456!'
            };

            const mockUser = {
                id: 'user123',
                email: 'admin@test.com',
                password_hash: 'old_hashed_password'
            };

            User.findByEmail.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue('new_hashed_password');
            query.mockResolvedValue({ rowCount: 1 });

            await UserController.changePassword(req, res);

            expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword123!', 'old_hashed_password');
            expect(bcrypt.hash).toHaveBeenCalledWith('newPassword456!', 12);
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users'),
                ['new_hashed_password', 'user123']
            );
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Password aggiornata con successo'
            });
        });

        test('should reject incorrect current password', async () => {
            req.body = {
                currentPassword: 'wrongPassword',
                newPassword: 'newPassword456!'
            };

            const mockUser = {
                id: 'user123',
                password_hash: 'hashed_password'
            };

            User.findByEmail.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false); // Password sbagliata

            await UserController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Password corrente non corretta'
            });
        });

        test('should handle validation errors for password change', async () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ field: 'newPassword', message: 'Password too weak' }]
            });

            await UserController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Dati non validi',
                errors: [{ field: 'newPassword', message: 'Password too weak' }]
            });
        });
    });

    describe('getUserStats', () => {
        test('should get user statistics successfully', async () => {
            const mockStats = {
                totalUsers: 150,
                activeUsers: 120,
                newUsersThisMonth: 15,
                usersByRole: {
                    admin: 3,
                    manager: 12,
                    client: 135
                }
            };

            User.getStats.mockResolvedValue(mockStats);

            await UserController.getUserStats(req, res);

            expect(User.getStats).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                stats: mockStats
            });
        });
    });

    describe('verifyEmail', () => {
        test('should verify email successfully', async () => {
            req.params = { token: 'verification_token' };

            const mockUser = {
                id: 'user123',
                email: 'verified@example.com',
                email_verified: true
            };

            User.verifyEmail.mockResolvedValue(mockUser);

            await UserController.verifyEmail(req, res);

            expect(User.verifyEmail).toHaveBeenCalledWith('verification_token');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Email verificata con successo',
                user: mockUser
            });
        });

        test('should handle invalid verification token', async () => {
            req.params = { token: 'invalid_token' };

            User.verifyEmail.mockResolvedValue(null);

            await UserController.verifyEmail(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Token di verifica non valido'
            });
        });
    });

    describe('debugDatabaseStructure', () => {
        test('should return database structure information', async () => {
            const mockTables = { rows: [{ table_name: 'users' }, { table_name: 'bookings' }] };
            const mockUsersStructure = { rows: [{ column_name: 'id', data_type: 'uuid' }] };
            const mockForeignKeys = { rows: [{ table_name: 'bookings', column_name: 'user_id' }] };

            query.mockResolvedValueOnce(mockTables);
            query.mockResolvedValueOnce(mockUsersStructure);
            query.mockResolvedValueOnce(mockForeignKeys);

            await UserController.debugDatabaseStructure(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    tables: mockTables.rows,
                    usersStructure: mockUsersStructure.rows,
                    foreignKeys: mockForeignKeys.rows
                }
            });
        });
    });
});