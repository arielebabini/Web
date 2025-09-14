// tests/unit/services/emailService.test.js

// Mock di nodemailer PRIMA di qualsiasi import
const mockSendMail = jest.fn().mockResolvedValue({
    messageId: 'test-message-id',
    accepted: ['test@example.com']
});

const mockTransporter = {
    sendMail: mockSendMail,
    verify: jest.fn().mockResolvedValue(true)
};

jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => mockTransporter)
}));

// Mock del logger
jest.mock('../../../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

describe('EmailService', () => {
    let emailService;
    let nodemailer;
    let logger;

    const originalEnv = process.env;

    beforeEach(() => {
        // Reset environment con le variabili CORRETTE che usa il servizio
        jest.resetModules();
        process.env = {
            ...originalEnv,
            NODE_ENV: 'test',
            EMAIL_FROM: 'test@coworkspace.com', // ✅ Variabile corretta
            EMAIL_PASSWORD: 'testpassword',     // ✅ Variabile corretta
            EMAIL_SERVICE: 'gmail',
            FRONTEND_URL: 'http://localhost:3000'
        };

        // Clear all mocks
        jest.clearAllMocks();
        mockSendMail.mockClear();

        // Import dependencies
        nodemailer = require('nodemailer');
        logger = require('../../../src/utils/logger');
        emailService = require('../../../src/services/emailService');
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    // Mock data con struttura CORRETTA che si aspetta il servizio
    const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        first_name: 'Mario',    // ✅ Struttura corretta
        last_name: 'Rossi'
    };

    const mockBooking = {
        id: 'booking-123',
        space_name: 'Sala Riunioni A',     // ✅ Struttura corretta
        location: 'Via Roma 1, Milano',
        start_date: '2025-09-15T09:00:00Z',
        end_date: '2025-09-15T17:00:00Z',
        total_price: 150.00                 // ✅ Struttura corretta
    };

    describe('Transporter Creation', () => {
        test('should create transporter with correct configuration in production', () => {
            expect(emailService.transporter).toBeDefined();
            expect(typeof emailService.transporter.sendMail).toBe('function');
            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                service: 'gmail',
                auth: {
                    user: undefined, // EMAIL_USER non è definita
                    pass: 'testpassword'
                }
            });
        });

        test('should use mock transporter in development', () => {
            jest.resetModules();
            process.env.NODE_ENV = 'development';

            const devEmailService = require('../../../src/services/emailService');

            // In development usa mock transporter
            expect(devEmailService.transporter.sendMail).toBeDefined();
        });

        test('should handle missing environment variables gracefully', () => {
            jest.resetModules();
            delete process.env.EMAIL_FROM;
            delete process.env.EMAIL_PASSWORD;

            expect(() => {
                require('../../../src/services/emailService');
            }).not.toThrow();
        });
    });

    describe('Email Sending Methods', () => {
        test('sendWelcomeEmail should send correct email', async () => {
            await emailService.sendWelcomeEmail(mockUser);

            expect(mockSendMail).toHaveBeenCalledWith({
                from: 'test@coworkspace.com',
                to: mockUser.email,
                subject: '🎉 Benvenuto in CoWorkSpace!',
                html: expect.stringContaining(mockUser.first_name)
            });

            expect(logger.info).toHaveBeenCalledWith(
                `Welcome email sent to ${mockUser.email}`
            );
        });

        test('sendBookingConfirmation should send correct email', async () => {
            await emailService.sendBookingConfirmation(mockUser, mockBooking);

            expect(mockSendMail).toHaveBeenCalledWith({
                from: 'test@coworkspace.com',
                to: mockUser.email,
                subject: `✅ Prenotazione Confermata - ${mockBooking.space_name}`,
                html: expect.stringContaining(mockUser.first_name)
            });

            expect(logger.info).toHaveBeenCalledWith(
                `Booking confirmation sent to ${mockUser.email} for booking ${mockBooking.id}`
            );
        });

        test('sendBookingReminder should send correct email', async () => {
            const hoursAhead = 24;
            await emailService.sendBookingReminder(mockUser, mockBooking, hoursAhead);

            expect(mockSendMail).toHaveBeenCalledWith({
                from: 'test@coworkspace.com',
                to: mockUser.email,
                subject: `⏰ Promemoria: La tua prenotazione inizia tra ${hoursAhead} ore`,
                html: expect.stringContaining(mockUser.first_name)
            });

            expect(logger.info).toHaveBeenCalledWith(
                `Booking reminder sent to ${mockUser.email} for booking ${mockBooking.id}`
            );
        });

        test('sendPasswordReset should send correct email', async () => {
            const resetToken = 'test-reset-token-123';
            await emailService.sendPasswordReset(mockUser, resetToken);

            expect(mockSendMail).toHaveBeenCalledWith({
                from: 'test@coworkspace.com',
                to: mockUser.email,
                subject: '🔐 Reset Password - CoWorkSpace',
                html: expect.stringContaining(resetToken)
            });

            expect(logger.info).toHaveBeenCalledWith(
                `Password reset sent to ${mockUser.email}`
            );
        });

        test('sendBookingCancellation should send correct email', async () => {
            const refundAmount = 75.00;
            await emailService.sendBookingCancellation(mockUser, mockBooking, refundAmount);

            expect(mockSendMail).toHaveBeenCalledWith({
                from: 'test@coworkspace.com',
                to: mockUser.email,
                subject: `🔄 Prenotazione Cancellata - ${mockBooking.space_name}`,
                html: expect.stringContaining(mockUser.first_name)
            });

            expect(logger.info).toHaveBeenCalledWith(
                `Booking cancellation sent to ${mockUser.email} for booking ${mockBooking.id}`
            );
        });

        test('sendDisputeNotification should send email to admin', async () => {
            const disputeData = {
                charge_id: 'ch_123456789',
                amount: 150.00,
                reason: 'fraudulent'
            };

            await emailService.sendDisputeNotification(disputeData);

            expect(mockSendMail).toHaveBeenCalledWith({
                from: 'test@coworkspace.com',
                to: 'test@coworkspace.com', // Usa EMAIL_FROM come default
                subject: '🚨 DISPUTA PAGAMENTO - Azione Richiesta',
                html: expect.stringContaining(disputeData.charge_id)
            });

            expect(logger.info).toHaveBeenCalledWith(
                `Dispute notification sent to admin for charge ${disputeData.charge_id}`
            );
        });
    });

    describe('Error Handling', () => {
        test('should log error and throw if sendMail fails', async () => {
            const error = new Error('Email provider is down');
            mockSendMail.mockRejectedValueOnce(error);

            await expect(emailService.sendWelcomeEmail(mockUser)).rejects.toThrow('Email provider is down');

            expect(logger.error).toHaveBeenCalledWith('Error sending welcome email:', error);
        });

        test('should handle transporter connection errors', async () => {
            const connectionError = new Error('SMTP connection failed');
            mockSendMail.mockRejectedValueOnce(connectionError);

            await expect(emailService.sendBookingConfirmation(mockUser, mockBooking))
                .rejects.toThrow('SMTP connection failed');

            expect(logger.error).toHaveBeenCalledWith('Error sending booking confirmation:', connectionError);
        });

        test('should handle missing user data gracefully', async () => {
            const incompleteUser = {
                email: 'test@example.com',
                first_name: '' // Nome vuoto
            };

            await expect(emailService.sendWelcomeEmail(incompleteUser)).resolves.not.toThrow();
            expect(mockSendMail).toHaveBeenCalled();
        });

        test('should handle missing booking data gracefully', async () => {
            const incompleteBooking = {
                id: 'booking-123',
                space_name: '',
                start_date: '2025-09-15T09:00:00Z',
                end_date: '2025-09-15T17:00:00Z'
            };

            await expect(emailService.sendBookingConfirmation(mockUser, incompleteBooking))
                .resolves.not.toThrow();
            expect(mockSendMail).toHaveBeenCalled();
        });
    });

    describe('Email Content Validation', () => {
        test('welcome email should contain all required information', async () => {
            await emailService.sendWelcomeEmail(mockUser);

            const [emailData] = mockSendMail.mock.calls[0];

            expect(emailData.html).toContain(mockUser.first_name);
            expect(emailData.html).toContain('CoWorkSpace');
            expect(emailData.html).toContain('🎉 Benvenuto in CoWorkSpace!');
            expect(emailData.to).toBe(mockUser.email);
            expect(emailData.from).toBe('test@coworkspace.com');
        });

        test('booking confirmation should contain booking details', async () => {
            await emailService.sendBookingConfirmation(mockUser, mockBooking);

            const [emailData] = mockSendMail.mock.calls[0];

            expect(emailData.html).toContain(mockUser.first_name);
            expect(emailData.html).toContain(mockBooking.space_name);
            expect(emailData.html).toContain('15/09/2025'); // Data formattata
            expect(emailData.html).toContain('€150.00'); // Prezzo formattato
            expect(emailData.html).toContain(mockBooking.id);
        });

        test('password reset should contain reset link', async () => {
            const resetToken = 'secure-reset-token-456';
            await emailService.sendPasswordReset(mockUser, resetToken);

            const [emailData] = mockSendMail.mock.calls[0];

            expect(emailData.html).toContain(resetToken);
            expect(emailData.html).toContain('reset-password');
            expect(emailData.html).toContain('http://localhost:3000');
            expect(emailData.subject).toContain('Reset Password');
        });

        test('booking reminder should include time information', async () => {
            const hoursAhead = 2;
            await emailService.sendBookingReminder(mockUser, mockBooking, hoursAhead);

            const [emailData] = mockSendMail.mock.calls[0];

            expect(emailData.html).toContain(mockUser.first_name);
            expect(emailData.html).toContain(mockBooking.space_name);
            expect(emailData.subject).toContain('2 ore');
        });
    });

    describe('Template Features', () => {
        test('should format dates correctly in booking emails', async () => {
            await emailService.sendBookingConfirmation(mockUser, mockBooking);

            const [emailData] = mockSendMail.mock.calls[0];

            expect(emailData.html).toContain('15/09/2025');
            expect(emailData.html).toContain('11:00');
            expect(emailData.html).toContain('19:00');
        });

        test('should include frontend URLs in templates', async () => {
            await emailService.sendWelcomeEmail(mockUser);

            const [emailData] = mockSendMail.mock.calls[0];

            expect(emailData.html).toContain('http://localhost:3000/dashboard');
        });

        test('should handle refund information in cancellation', async () => {
            const refundAmount = 100.50;
            await emailService.sendBookingCancellation(mockUser, mockBooking, refundAmount);

            const [emailData] = mockSendMail.mock.calls[0];

            expect(emailData.html).toContain('€100.50');
            expect(emailData.html).toContain('Informazioni Rimborso');
        });
    });

    describe('Environment Configuration', () => {
        test('should use correct email configuration variables', () => {
            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                service: 'gmail',
                auth: {
                    user: undefined, // Non usa EMAIL_USER
                    pass: 'testpassword'
                }
            });
        });

        test('should use mock transporter in development environment', () => {
            jest.resetModules();
            process.env.NODE_ENV = 'development';

            const devEmailService = require('../../../src/services/emailService');

            // Dovrebbe usare il mock transporter
            expect(typeof devEmailService.transporter.sendMail).toBe('function');
        });
    });

    describe('Multiple Email Scenarios', () => {
        test('should handle multiple email sends correctly', async () => {
            const users = [
                { ...mockUser, email: 'user1@example.com' },
                { ...mockUser, email: 'user2@example.com' },
                { ...mockUser, email: 'user3@example.com' }
            ];

            await Promise.all(users.map(user => emailService.sendWelcomeEmail(user)));

            expect(mockSendMail).toHaveBeenCalledTimes(3);
            expect(logger.info).toHaveBeenCalledTimes(3);
        });

        test('should handle booking flow emails', async () => {
            // Sequenza completa di email per una prenotazione
            await emailService.sendBookingConfirmation(mockUser, mockBooking);
            await emailService.sendBookingReminder(mockUser, mockBooking, 24);
            await emailService.sendBookingCancellation(mockUser, mockBooking, 50.00);

            expect(mockSendMail).toHaveBeenCalledTimes(3);
            expect(logger.info).toHaveBeenCalledTimes(3);

            // Verifica che ogni email abbia il subject corretto
            const calls = mockSendMail.mock.calls;
            expect(calls[0][0].subject).toContain('Confermata');
            expect(calls[1][0].subject).toContain('Promemoria');
            expect(calls[2][0].subject).toContain('Cancellata');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty space name', async () => {
            const bookingWithoutName = {
                ...mockBooking,
                space_name: ''
            };

            await emailService.sendBookingConfirmation(mockUser, bookingWithoutName);

            expect(mockSendMail).toHaveBeenCalled();
            const [emailData] = mockSendMail.mock.calls[0];
            expect(emailData.subject).toContain('Confermata - ');
        });

        test('should handle missing total_price', async () => {
            const bookingWithoutPrice = {
                ...mockBooking,
                total_price: undefined
            };

            await emailService.sendBookingConfirmation(mockUser, bookingWithoutPrice);

            const [emailData] = mockSendMail.mock.calls[0];
            expect(emailData.html).toContain('€0.00');
        });

        test('should handle admin email configuration', async () => {
            process.env.ADMIN_EMAIL = 'admin@coworkspace.com';

            const disputeData = {
                charge_id: 'ch_test',
                amount: 100,
                reason: 'test'
            };

            await emailService.sendDisputeNotification(disputeData);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'admin@coworkspace.com'
                })
            );
        });
    });
});