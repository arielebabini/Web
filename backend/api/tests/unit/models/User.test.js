// tests/unit/models/User.test.js

// Mock del database e logger
jest.mock('../../../src/config/database', () => ({
    query: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn()
}));

const User = require('../../../src/models/User');
const { query } = require('../../../src/config/database');

describe('User Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        test('should create user with valid data', async () => {
            const userData = {
                email: 'test@example.com',
                password_hash: 'hashed_password',
                first_name: 'Test',
                last_name: 'User',
                phone: '+39 123 456 7890',
                company: 'Test Company'
            };

            const mockResult = {
                rows: [{
                    id: 'user-123',
                    email: 'test@example.com',
                    first_name: 'Test',
                    last_name: 'User',
                    role: 'client',
                    status: 'active'
                }]
            };

            query.mockResolvedValue(mockResult);

            const result = await User.create(userData);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO users'),
                expect.arrayContaining([
                    userData.email,
                    userData.password_hash,
                    userData.first_name,
                    userData.last_name,
                    userData.phone,
                    userData.company,
                    'client', // default role
                    'active' // default status
                ])
            );

            expect(result).toEqual(mockResult.rows[0]);
        });

        test('should handle database error', async () => {
            const userData = {
                email: 'test@example.com',
                password_hash: 'hashed_password',
                first_name: 'Test',
                last_name: 'User'
            };

            const dbError = new Error('Database connection failed');
            query.mockRejectedValue(dbError);

            await expect(User.create(userData)).rejects.toThrow('Database connection failed');
        });
    });

    describe('findByEmail', () => {
        test('should find user by email', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User',
                role: 'client'
            };

            query.mockResolvedValue({ rows: [mockUser] });

            const result = await User.findByEmail('test@example.com');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id, email'),
                ['test@example.com']
            );
            expect(result).toEqual(mockUser);
        });

        test('should return null when user not found', async () => {
            query.mockResolvedValue({ rows: [] });

            const result = await User.findByEmail('nonexistent@example.com');

            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        test('should find user by ID', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User'
            };

            query.mockResolvedValue({ rows: [mockUser] });

            const result = await User.findById('user-123');

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id, email'),
                ['user-123']
            );
            expect(result).toEqual(mockUser);
        });
    });

    describe('updateRole', () => {
        test('should update user role with valid role', async () => {
            const mockUpdatedUser = {
                id: 'user-123',
                email: 'test@example.com',
                role: 'admin'
            };

            query.mockResolvedValue({ rows: [mockUpdatedUser] });

            const result = await User.updateRole('user-123', 'admin');

            // Verifica solo che query sia stata chiamata con i parametri corretti
            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                ['admin', 'user-123']
            );
            expect(result).toEqual(mockUpdatedUser);
        });

        test('should reject invalid role', async () => {
            await expect(User.updateRole('user-123', 'invalid_role'))
                .rejects.toThrow('Invalid role');

            expect(query).not.toHaveBeenCalled();
        });

        test('should throw error when user not found', async () => {
            query.mockResolvedValue({ rows: [] });

            await expect(User.updateRole('nonexistent', 'admin'))
                .rejects.toThrow('User not found');
        });
    });

    describe('updateStatus', () => {
        test('should update user status with valid status', async () => {
            const mockUpdatedUser = {
                id: 'user-123',
                status: 'suspended'
            };

            query.mockResolvedValue({ rows: [mockUpdatedUser] });

            const result = await User.updateStatus('user-123', 'suspended');

            expect(result).toEqual(mockUpdatedUser);
        });

        test('should reject invalid status', async () => {
            await expect(User.updateStatus('user-123', 'invalid_status'))
                .rejects.toThrow('Invalid status');
        });
    });

    describe('updateResetToken', () => {
        test('should update reset token successfully', async () => {
            query.mockResolvedValue({ rowCount: 1 });

            const testDate = new Date('2025-09-08T16:00:00.000Z');
            const result = await User.updateResetToken(
                'test@example.com',
                'reset_token_123',
                testDate
            );

            expect(result).toBe(true);
            // Verifica solo che query sia stata chiamata con i parametri corretti
            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                ['reset_token_123', testDate, 'test@example.com']
            );
        });

        test('should return false when user not found', async () => {
            query.mockResolvedValue({ rowCount: 0 });

            const result = await User.updateResetToken(
                'nonexistent@example.com',
                'token',
                new Date()
            );

            expect(result).toBe(false);
        });
    });
});