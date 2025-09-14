// tests/unit/middleware/routeAdapter.test.js

beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});

// Mock delle dipendenze
jest.mock('../../../src/controllers/userController', () => ({
    UserController: {
        getProfile: jest.fn(),
        updateProfile: jest.fn(),
        createUser: jest.fn(),
        deleteUser: jest.fn()
    }
}));
jest.mock('../../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));
jest.mock('express-validator', () => ({
    validationResult: jest.fn()
}));

const {
    adaptUserController,
    parameterMapper,
    responseAdapter,
    uuidValidator,
    adapterLogger,
    handleValidation
} = require('../../../src/middleware/routeAdapter');
const { UserController } = require('../../../src/controllers/userController');
const { validationResult } = require('express-validator');
const logger = require('../../../src/utils/logger');

describe('Route Adapter Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {},
            body: {},
            get: jest.fn()
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('adaptUserController', () => {
        test('getProfile should call UserController.getProfile and next on error', async () => {
            await adaptUserController.getProfile(req, res, next);
            expect(UserController.getProfile).toHaveBeenCalledWith(req, res);

            const error = new Error('Test Error');
            UserController.getProfile.mockRejectedValue(error);
            await adaptUserController.getProfile(req, res, next);
            expect(next).toHaveBeenCalledWith(error);
        });

        test('createUser should call UserController.createUser and handle error internally', async () => {
            await adaptUserController.createUser(req, res);
            expect(UserController.createUser).toHaveBeenCalledWith(req, res);

            const error = new Error('Database Error');
            UserController.createUser.mockRejectedValue(error);
            await adaptUserController.createUser(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Errore interno del server' });
            expect(logger.error).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('parameterMapper', () => {
        test('mapUserId should map req.params.userId to req.userId', () => {
            req.params.userId = 'testUser123';
            parameterMapper.mapUserId(req, res, next);
            expect(req.userId).toBe('testUser123');
            expect(next).toHaveBeenCalled();
        });

        test('mapSpaceId should not fail if param is missing', () => {
            parameterMapper.mapSpaceId(req, res, next);
            expect(req.spaceId).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });
    });

    describe('responseAdapter', () => {
        test('should attach apiResponse and apiError helpers to res object', () => {
            responseAdapter(req, res, next);
            expect(typeof res.apiResponse).toBe('function');
            expect(typeof res.apiError).toBe('function');
            expect(next).toHaveBeenCalled();
        });

        test('res.apiResponse should send a standardized success response', () => {
            responseAdapter(req, res, next);
            res.apiResponse({ id: 1 }, 'User found', 201);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'User found',
                data: { id: 1 }
            }));
        });
    });

    describe('uuidValidator', () => {
        test('should call next for a valid UUID', () => {
            req.params.userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
            uuidValidator(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        
        test('should call next for a numeric ID for compatibility', () => {
            req.params.spaceId = '12345';
            uuidValidator(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should return 400 for an invalid format', () => {
            req.params.bookingId = 'invalid-id-format';
            uuidValidator(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Formato bookingId non valido' }));
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('adapterLogger', () => {
        test('should log request and response', () => {
            const loggerMiddleware = adapterLogger('TestController.method');
            
            // Simula il ciclo richiesta-risposta
            loggerMiddleware(req, res, next);
            
            // Verifica log della richiesta
            expect(logger.info).toHaveBeenCalledWith('Calling TestController.method', expect.any(Object));
            expect(next).toHaveBeenCalled();

            // Simula la chiamata di risposta dal controller
            res.json({ success: true });

            // Verifica log della risposta
            expect(logger.info).toHaveBeenCalledWith('Response from TestController.method', expect.any(Object));
        });
    });

    describe('handleValidation', () => {
        test('should call next if validationResult is empty', () => {
            validationResult.mockReturnValue({ isEmpty: () => true });
            handleValidation(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should return 400 if validationResult has errors', () => {
            const errors = [{ field: 'email', msg: 'Invalid email' }];
            validationResult.mockReturnValue({ isEmpty: () => false, array: () => errors });
            
            handleValidation(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errori di validazione',
                errors: errors
            });
            expect(next).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalled();
        });
    });
});