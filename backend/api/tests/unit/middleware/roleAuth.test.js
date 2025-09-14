// tests/unit/middleware/roleAuth.test.js

beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});

// Mock delle dipendenze
jest.mock('../../../src/config/database', () => ({
    query: jest.fn()
}));
jest.mock('../../../src/utils/logger', () => ({
    warn: jest.fn(),
    error: jest.fn()
}));

const {
    requireRole,
    requireAdmin,
    requireManager,
    requireOwnershipOrRole,
    requireManagerOwnership,
    requireBookingOwnership
} = require('../../../src/middleware/roleAuth');
const { query } = require('../../../src/config/database');

describe('RoleAuth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { id: 'user123', role: 'client', status: 'active' },
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('requireRole', () => {
        test('should call next if user has an allowed role', () => {
            const middleware = requireRole(['client', 'admin']);
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should return 403 if user does not have an allowed role', () => {
            req.user.role = 'client';
            const middleware = requireRole(['admin', 'manager']);
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Permessi insufficienti per questa operazione' }));
            expect(next).not.toHaveBeenCalled();
        });

        test('should return 401 if user is not authenticated', () => {
            req.user = undefined;
            const middleware = requireRole(['client']);
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Accesso non autorizzato' }));
        });

        test('should return 403 if user account is not active', () => {
            req.user.status = 'suspended';
            const middleware = requireRole(['client']);
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Account non attivo' }));
        });
    });

    describe('requireAdmin and requireManager', () => {
        test('requireAdmin should only allow admin role', () => {
            req.user.role = 'admin';
            requireAdmin(req, res, next);
            expect(next).toHaveBeenCalled();

            req.user.role = 'manager';
            requireAdmin(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('requireManager should allow manager and admin roles', () => {
            req.user.role = 'manager';
            requireManager(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);

            req.user.role = 'admin';
            requireManager(req, res, next);
            expect(next).toHaveBeenCalledTimes(2);

            req.user.role = 'client';
            requireManager(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('requireOwnershipOrRole', () => {
        test('should call next if user is the owner of the resource', () => {
            req.params.userId = 'user123'; // Matches req.user.id
            const middleware = requireOwnershipOrRole('userId', ['admin']);
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should call next if user has an allowed role, even if not owner', () => {
            req.user.role = 'admin';
            req.params.userId = 'otherUser456';
            const middleware = requireOwnershipOrRole('userId', ['admin']);
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should return 403 if user is not owner and has no allowed role', () => {
            req.user.role = 'client';
            req.params.userId = 'otherUser456';
            const middleware = requireOwnershipOrRole('userId', ['admin', 'manager']);
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Non hai il permesso di accedere a questa risorsa' }));
        });
    });

    describe('requireManagerOwnership', () => {
        test('should call next if user is admin', async () => {
            req.user.role = 'admin';
            const middleware = requireManagerOwnership('space');
            await middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(query).not.toHaveBeenCalled();
        });

        test('should call next if manager owns the space', async () => {
            req.user = { id: 'manager123', role: 'manager' };
            req.params.spaceId = 'spaceABC';
            query.mockResolvedValue({ rows: [{ manager_id: 'manager123' }] });
            
            const middleware = requireManagerOwnership('space');
            await middleware(req, res, next);
            
            expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM spaces'), ['spaceABC']);
            expect(next).toHaveBeenCalled();
        });

        test('should return 403 if manager does not own the booking\'s space', async () => {
            req.user = { id: 'manager123', role: 'manager' };
            req.params.bookingId = 'bookingXYZ';
            query.mockResolvedValue({ rows: [{ manager_id: 'otherManager' }] });
            
            const middleware = requireManagerOwnership('booking');
            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Non hai il permesso di gestire questa prenotazione' }));
        });

        test('should return 404 if resource is not found', async () => {
            req.user = { id: 'manager123', role: 'manager' };
            req.params.spaceId = 'nonexistent';
            query.mockResolvedValue({ rows: [] });
            
            const middleware = requireManagerOwnership('space');
            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'space non trovato' }));
        });
    });

    describe('requireBookingOwnership', () => {
        test('should call next if client owns the booking', async () => {
            req.user = { id: 'client123', role: 'client' };
            req.params.bookingId = 'bookingABC';
            query.mockResolvedValue({ rows: [{ user_id: 'client123' }] });
            
            const middleware = requireBookingOwnership();
            await middleware(req, res, next);

            expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM bookings'), ['bookingABC']);
            expect(next).toHaveBeenCalled();
        });

        test('should return 403 if client tries to access another user\'s booking', async () => {
            req.user = { id: 'client123', role: 'client' };
            req.params.bookingId = 'bookingXYZ';
            query.mockResolvedValue({ rows: [{ user_id: 'otherClient' }] });
            
            const middleware = requireBookingOwnership();
            await middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Puoi accedere solo alle tue prenotazioni' }));
        });

        test('should call next if manager owns the space of the booking', async () => {
            req.user = { id: 'manager123', role: 'manager' };
            req.params.bookingId = 'bookingABC';
            query.mockResolvedValue({ rows: [{ user_id: 'client123', manager_id: 'manager123' }] });
            
            const middleware = requireBookingOwnership();
            await middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
        });
    });
});