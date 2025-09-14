// tests/unit/middleware/auth.test.js
const { requireAuth, requireRole, requireAdmin } = require('../../../src/middleware/auth');

// Mock delle dipendenze
jest.mock('../../../src/models/User', () => ({
    findById: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn()
}));

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {},
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('test-agent'),
            originalUrl: '/test',
            method: 'GET'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('requireAuth', () => {
        test('should reject request without Authorization header', async () => {
            await requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Token di accesso richiesto'
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject invalid Bearer token format', async () => {
            req.headers.authorization = 'InvalidFormat token123';

            await requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        test('should authenticate valid token and user', async () => {
            const jwt = require('jsonwebtoken');
            const User = require('../../../src/models/User');

            req.headers.authorization = 'Bearer valid_token';

            // Mock JWT verification
            jwt.verify.mockReturnValue({
                id: 'user123',
                email: 'test@example.com',
                role: 'client'
            });

            // Mock user found
            User.findById.mockResolvedValue({
                id: 'user123',
                email: 'test@example.com',
                role: 'client',
                status: 'active'
            });

            await requireAuth(req, res, next);

            expect(jwt.verify).toHaveBeenCalledWith('valid_token', expect.any(String));
            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(req.user).toBeDefined();
            expect(req.user.id).toBe('user123');
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should reject expired token', async () => {
            const jwt = require('jsonwebtoken');

            req.headers.authorization = 'Bearer expired_token';

            const expiredError = new Error('Token expired');
            expiredError.name = 'TokenExpiredError';
            jwt.verify.mockImplementation(() => {
                throw expiredError;
            });

            await requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Token scaduto'
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject inactive user', async () => {
            const jwt = require('jsonwebtoken');
            const User = require('../../../src/models/User');

            req.headers.authorization = 'Bearer valid_token';

            jwt.verify.mockReturnValue({
                id: 'user123',
                email: 'test@example.com'
            });

            // Mock inactive user
            User.findById.mockResolvedValue({
                id: 'user123',
                email: 'test@example.com',
                status: 'suspended'
            });

            await requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Account non attivo'
                })
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('requireRole', () => {
        test('should allow user with correct role', () => {
            req.user = { id: '123', role: 'admin', email: 'admin@test.com' };

            const middleware = requireRole('admin');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should reject user with wrong role', () => {
            req.user = { id: '123', role: 'client', email: 'user@test.com' };

            const middleware = requireRole('admin');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Permessi insufficienti'
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        test('should allow user with one of multiple roles', () => {
            req.user = { id: '123', role: 'manager', email: 'manager@test.com' };

            const middleware = requireRole(['admin', 'manager']);
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('requireAdmin', () => {
        test('should allow admin user', () => {
            req.user = { id: '123', role: 'admin', email: 'admin@test.com' };

            requireAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should reject non-admin user', () => {
            req.user = { id: '123', role: 'client', email: 'user@test.com' };

            requireAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
});