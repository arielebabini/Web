// tests/unit/middleware/errorHandler.test.js

// Mock delle dipendenze
jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn()
}));

jest.mock('express-validator', () => ({
    validationResult: jest.fn()
}));

const {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    validationHandler,
    handleValidationError,
    handleDatabaseError,
    handleJWTError
} = require('../../../src/middleware/errorHandler');
const logger = require('../../../src/utils/logger');
const { validationResult } = require('express-validator');

describe('Error Handling Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            originalUrl: '/test-route',
            method: 'GET',
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('Test User Agent'),
            user: { id: 'user123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            headersSent: false
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('errorHandler', () => {

        test('should handle unique violation database error (23505)', () => {
            const dbError = new Error('Duplicate key');
            dbError.code = '23505';

            errorHandler(dbError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Dato già esistente',
                    type: 'DUPLICATE_ENTRY'
                })
            );
        });


        test('should handle Multer file size limit error', () => {
            const multerError = new Error('File too large');
            multerError.name = 'MulterError';
            multerError.code = 'LIMIT_FILE_SIZE';

            errorHandler(multerError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'File troppo grande',
                    type: 'FILE_TOO_LARGE'
                })
            );
        });

        test('should handle invalid JSON error', () => {
            const jsonError = new Error('Unexpected token');
            jsonError.type = 'entity.parse.failed';

            errorHandler(jsonError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'JSON non valido',
                    type: 'INVALID_JSON'
                })
            );
        });

        test('should handle custom client errors (4xx)', () => {
            const clientError = new Error('Risorsa non trovata');
            clientError.statusCode = 404;
            clientError.type = 'NOT_FOUND';

            errorHandler(clientError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Risorsa non trovata',
                    type: 'NOT_FOUND'
                })
            );
        });

        test('should handle generic server error (5xx) with generic message in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const serverError = new Error('Something broke!');

            errorHandler(serverError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errore interno del server',
                type: 'INTERNAL_SERVER_ERROR'
            });

            process.env.NODE_ENV = originalEnv; // Ripristina
        });

        test('should include error details in development', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const serverError = new Error('Detailed error message');
            serverError.stack = 'Error stack trace...';

            errorHandler(serverError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Detailed error message',
                stack: expect.any(String),
                details: expect.any(Object)
            }));

            process.env.NODE_ENV = originalEnv; // Ripristina
        });

        test('should call next if headers are already sent', () => {
            res.headersSent = true;
            const error = new Error('Test error');

            errorHandler(error, req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        test('should log the error details', () => {
            const error = new Error('Logging test');

            errorHandler(error, req, res, next);

            expect(logger.error).toHaveBeenCalledWith('Request error:', expect.objectContaining({
                error: 'Logging test',
                url: '/test-route',
                method: 'GET',
                ip: '127.0.0.1'
            }));
        });
    });

    describe('Additional Error Types', () => {
        test('should handle CastError', () => {
            const castError = new Error('Cast to ObjectId failed');
            castError.name = 'CastError';

            errorHandler(castError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Formato ID non valido',
                    type: 'INVALID_ID_FORMAT'
                })
            );
        });

        test('should handle payload too large error', () => {
            const payloadError = new Error('Payload too large');
            payloadError.type = 'entity.too.large';

            errorHandler(payloadError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(413);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Richiesta troppo grande',
                    type: 'PAYLOAD_TOO_LARGE'
                })
            );
        });

        test('should handle different Multer errors', () => {
            const tooManyFilesError = new Error('Too many files');
            tooManyFilesError.name = 'MulterError';
            tooManyFilesError.code = 'LIMIT_FILE_COUNT';

            errorHandler(tooManyFilesError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Troppi file',
                    type: 'TOO_MANY_FILES'
                })
            );
        });

        test('should handle unexpected file error', () => {
            const unexpectedFileError = new Error('Unexpected file');
            unexpectedFileError.name = 'MulterError';
            unexpectedFileError.code = 'LIMIT_UNEXPECTED_FILE';

            errorHandler(unexpectedFileError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Campo file non previsto',
                    type: 'UNEXPECTED_FILE'
                })
            );
        });
    });

    describe('notFoundHandler', () => {
        test('should send a 404 response with correct details', () => {
            notFoundHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Endpoint non trovato',
                error: {
                    type: 'ROUTE_NOT_FOUND',
                    method: 'GET',
                    path: '/test-route'
                }
            });
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('404 - Route not found'),
                expect.any(Object)
            );
        });
    });

    describe('asyncHandler', () => {
        test('should call next with error if promise rejects', async () => {
            const error = new Error('Async error');
            const asyncFn = jest.fn().mockRejectedValue(error);
            const wrappedFn = asyncHandler(asyncFn);

            await wrappedFn(req, res, next);

            expect(asyncFn).toHaveBeenCalledWith(req, res, next);
            expect(next).toHaveBeenCalledWith(error);
        });

        test('should call the function if promise resolves', async () => {
            const asyncFn = jest.fn().mockResolvedValue('Success');
            const wrappedFn = asyncHandler(asyncFn);

            await wrappedFn(req, res, next);

            expect(asyncFn).toHaveBeenCalledWith(req, res, next);
            expect(next).not.toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('validationHandler', () => {
        test('should call next with a validation error if validation fails', () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: 'Invalid field', path: 'email' }]
            });

            validationHandler(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
            const error = next.mock.calls[0][0];
            expect(error.name).toBe('ValidationError');
            expect(error.errors).toBeDefined();
        });

        test('should call next without arguments if validation succeeds', () => {
            validationResult.mockReturnValue({
                isEmpty: () => true
            });

            validationHandler(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });
    });

    describe('Individual Error Handlers', () => {
        test('handleValidationError should format errors correctly', () => {
            const errors = {
                array: () => [
                    { path: 'field1', msg: 'Error 1', value: 'invalid' },
                    { param: 'field2', msg: 'Error 2' } // Test fallback param->field
                ]
            };

            const result = handleValidationError(errors);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Dati di validazione non validi');
            expect(result.errors).toEqual([
                { field: 'field1', message: 'Error 1', value: 'invalid' },
                { field: 'field2', message: 'Error 2', value: undefined }
            ]);
        });

        test('handleDatabaseError should map error codes correctly', () => {
            // Test multiple database error codes
            const testCases = [
                { code: '23505', expectedMessage: 'Dato già esistente', expectedType: 'DUPLICATE_ENTRY' },
                { code: '23503', expectedMessage: 'Riferimento non valido', expectedType: 'FOREIGN_KEY_VIOLATION' },
                { code: '23502', expectedMessage: 'Campo obbligatorio mancante', expectedType: 'NOT_NULL_VIOLATION' },
                { code: '22001', expectedMessage: 'Dati troppo lunghi', expectedType: 'DATA_TOO_LONG' },
                { code: '08006', expectedMessage: 'Errore di connessione al database', expectedType: 'CONNECTION_ERROR' },
                { code: '99999', expectedMessage: 'Errore interno del database', expectedType: 'DATABASE_ERROR' }
            ];

            testCases.forEach(({ code, expectedMessage, expectedType }) => {
                const dbError = { code };
                const result = handleDatabaseError(dbError);

                expect(result.success).toBe(false);
                expect(result.message).toBe(expectedMessage);
                expect(result.type).toBe(expectedType);
            });
        });

        test('handleJWTError should map error names correctly', () => {
            const testCases = [
                { name: 'TokenExpiredError', expectedMessage: 'Token scaduto', expectedType: 'TOKEN_EXPIRED' },
                { name: 'JsonWebTokenError', expectedMessage: 'Token non valido', expectedType: 'INVALID_TOKEN' },
                { name: 'NotBeforeError', expectedMessage: 'Token non ancora valido', expectedType: 'TOKEN_NOT_ACTIVE' },
                { name: 'UnknownError', expectedMessage: 'Errore di autenticazione', expectedType: 'AUTH_ERROR' }
            ];

            testCases.forEach(({ name, expectedMessage, expectedType }) => {
                const jwtError = { name };
                const result = handleJWTError(jwtError);

                expect(result.success).toBe(false);
                expect(result.message).toBe(expectedMessage);
                expect(result.type).toBe(expectedType);
            });
        });
    });

    describe('Environment-specific behavior', () => {
        test('should handle different NODE_ENV values', () => {
            const originalEnv = process.env.NODE_ENV;

            // Test production
            process.env.NODE_ENV = 'production';
            const prodError = new Error('Internal error');
            errorHandler(prodError, req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    stack: expect.any(String),
                    details: expect.any(Object)
                })
            );

            jest.clearAllMocks();

            // Test development
            process.env.NODE_ENV = 'development';
            errorHandler(prodError, req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    stack: expect.any(String),
                    details: expect.any(Object)
                })
            );

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Edge Cases', () => {
        test('should handle error without message', () => {
            const error = new Error();
            error.statusCode = 400;

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Richiesta non valida',
                    type: 'CLIENT_ERROR'
                })
            );
        });

        test('should handle error with status instead of statusCode', () => {
            const error = new Error('Test error');
            error.status = 403;

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('should handle request without user', () => {
            delete req.user;
            const error = new Error('Test error');

            errorHandler(error, req, res, next);

            expect(logger.error).toHaveBeenCalledWith(
                'Request error:',
                expect.objectContaining({
                    userId: undefined
                })
            );
        });
    });
});