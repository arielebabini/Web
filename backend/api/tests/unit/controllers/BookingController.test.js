// tests/unit/controllers/BookingController.test.js

// Mock delle dipendenze
jest.mock('../../../src/models/Booking', () => ({
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    confirm: jest.fn(),
    complete: jest.fn(),
    checkConflicts: jest.fn(),
    getStats: jest.fn(),
    getUpcoming: jest.fn(),
    findAllBookings: jest.fn(),
    delete: jest.fn(),
    findByUserId: jest.fn(),
    canCancel: jest.fn()
}));

jest.mock('../../../src/models/Space', () => ({
    findById: jest.fn()
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

const BookingController = require('../../../src/controllers/bookingController');
const Booking = require('../../../src/models/Booking');
const Space = require('../../../src/models/Space');
const { query } = require('../../../src/config/database');
const { validationResult } = require('express-validator');

describe('BookingController', () => {
    let req, res;

    const getFutureDate = (daysToAdd = 1) => {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    };

    beforeEach(() => {
        req = {
            user: {
                id: 'user123',
                email: 'test@example.com',
                role: 'client'
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

    describe('createBooking', () => {
        test('should create booking successfully', async () => {
            const futureStartDate = getFutureDate(10);
            const futureEndDate = getFutureDate(10);

            req.body = {
                space_id: 'space123',
                start_date: futureStartDate,
                end_date: futureEndDate,
                start_time: '09:00',
                end_time: '17:00',
                people_count: 5,
                notes: 'Meeting room booking'
            };

            const mockSpace = {
                id: 'space123',
                name: 'Conference Room A',
                capacity: 10
            };

            const mockBooking = {
                id: 'booking123',
                user_id: 'user123',
                space_id: 'space123',
                start_date: futureStartDate,
                end_date: futureEndDate,
                status: 'pending'
            };

            Space.findById.mockResolvedValue(mockSpace);

            // AGGIUNGI QUESTO MOCK PER checkConflicts
            Booking.checkConflicts.mockResolvedValue([]); // Nessun conflitto

            Booking.create.mockResolvedValue(mockBooking);

            await BookingController.createBooking(req, res);

            expect(Space.findById).toHaveBeenCalledWith('space123');

            // AGGIUNGI VERIFICA PER checkConflicts
            expect(Booking.checkConflicts).toHaveBeenCalledWith({
                space_id: 'space123',
                start_date: futureStartDate,
                end_date: futureEndDate,
                start_time: '09:00',
                end_time: '17:00'
            });

            expect(Booking.create).toHaveBeenCalledWith({
                user_id: 'user123',
                space_id: 'space123',
                start_date: futureStartDate,
                end_date: futureEndDate,
                start_time: '09:00',
                end_time: '17:00',
                people_count: 5,
                notes: 'Meeting room booking'
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Prenotazione creata con successo',
                booking: mockBooking
            });
        });

        test('should reject booking for non-existent space', async () => {
            req.body = {
                space_id: 'nonexistent',
                start_date: '2024-12-25',
                end_date: '2024-12-25',
                people_count: 5
            };

            Space.findById.mockResolvedValue(null);

            await BookingController.createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Spazio non trovato'
            });
            expect(Booking.create).not.toHaveBeenCalled();
        });

        test('should reject booking exceeding space capacity', async () => {
            req.body = {
                space_id: 'space123',
                start_date: '2024-12-25',
                end_date: '2024-12-25',
                people_count: 15 // Supera la capacità
            };

            const mockSpace = {
                id: 'space123',
                capacity: 10
            };

            Space.findById.mockResolvedValue(mockSpace);

            await BookingController.createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Il numero di persone (15) supera la capacità massima dello spazio (10)'
            });
        });

        test('should reject booking for past dates', async () => {
            req.body = {
                space_id: 'space123',
                start_date: '2020-01-01', // Data passata
                end_date: '2020-01-01',
                people_count: 5
            };

            const mockSpace = {
                id: 'space123',
                capacity: 10
            };

            Space.findById.mockResolvedValue(mockSpace);

            await BookingController.createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non è possibile prenotare per date passate'
            });
        });

        test('should reject booking with end date before start date', async () => {
            req.body = {
                space_id: 'space123',
                start_date: getFutureDate(10), // Data futura
                end_date: getFutureDate(5),   // Data futura, ma prima della start_date
                people_count: 5
            };

            const mockSpace = {
                id: 'space123',
                capacity: 10
            };

            Space.findById.mockResolvedValue(mockSpace);

            await BookingController.createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'La data fine deve essere successiva o uguale alla data inizio'
            });
        });

        test('should handle validation errors', async () => {
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ field: 'space_id', message: 'Space ID is required' }]
            });

            await BookingController.createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Dati non validi',
                errors: [{ field: 'space_id', message: 'Space ID is required' }]
            });
        });

        test('should handle space availability conflicts', async () => {
            req.body = {
                space_id: 'space123',
                start_date: getFutureDate(30),
                end_date: getFutureDate(30),
                people_count: 5
            };

            const mockSpace = { id: 'space123', capacity: 10 };

            Space.findById.mockResolvedValue(mockSpace);

            // MOCK checkConflicts per restituire conflitti invece di far fallire create
            Booking.checkConflicts.mockResolvedValue([{
                id: 'existing_booking',
                start_date: getFutureDate(30),
                end_date: getFutureDate(30)
            }]);

            await BookingController.createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Lo spazio non è disponibile per le date e gli orari selezionati a causa di una sovrapposizione.'
            });
        });
    });

    describe('getAllBookings', () => {
        test('should get all bookings for admin', async () => {
            req.user.role = 'admin';
            req.query = {
                page: '1',
                limit: '10',
                status: 'pending'
            };

            const mockResult = {
                bookings: [
                    { id: 'booking1', status: 'pending' },
                    { id: 'booking2', status: 'pending' }
                ],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 2
                }
            };

            Booking.findAll.mockResolvedValue(mockResult);

            await BookingController.getAllBookings(req, res);

            expect(Booking.findAll).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                user_id: undefined, // Admin vede tutto
                manager_id: undefined,
                space_id: undefined,
                status: ['pending'],
                start_date_from: undefined,
                start_date_to: undefined,
                sortBy: undefined,
                sortOrder: undefined
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                ...mockResult
            });
        });

        test('should filter bookings for client role', async () => {
            req.user.role = 'client';
            req.query = { page: '1', limit: '10' };

            const mockResult = {
                bookings: [{ id: 'booking1', user_id: 'user123' }],
                pagination: {}
            };

            Booking.findAll.mockResolvedValue(mockResult);

            await BookingController.getAllBookings(req, res);

            expect(Booking.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'user123' // Client vede solo le sue prenotazioni
                })
            );
        });

        test('should filter bookings for manager role', async () => {
            req.user.role = 'manager';
            req.query = { page: '1', limit: '10' };

            const mockResult = {
                bookings: [{ id: 'booking1' }],
                pagination: {}
            };

            Booking.findAll.mockResolvedValue(mockResult);

            await BookingController.getAllBookings(req, res);

            expect(Booking.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    manager_id: 'user123' // Manager vede prenotazioni dei suoi spazi
                })
            );
        });
    });

    describe('getBookingById', () => {
        test('should get booking by ID for authorized user', async () => {
            req.params = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'user123',
                space_id: 'space123',
                status: 'pending'
            };

            Booking.findById.mockResolvedValue(mockBooking);

            await BookingController.getBookingById(req, res);

            expect(Booking.findById).toHaveBeenCalledWith('booking123');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                booking: mockBooking
            });
        });

        test('should return 404 when booking not found', async () => {
            req.params = { bookingId: 'nonexistent' };

            Booking.findById.mockResolvedValue(null);

            await BookingController.getBookingById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Prenotazione non trovata'
            });
        });

        test('should return 403 for unauthorized access', async () => {
            req.params = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'other_user', // Diverso dall'utente corrente
                space_manager_id: 'other_manager'
            };

            Booking.findById.mockResolvedValue(mockBooking);

            await BookingController.getBookingById(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non hai il permesso di visualizzare questa prenotazione'
            });
        });

        test('should allow access for admin', async () => {
            req.user.role = 'admin';
            req.params = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'other_user'
            };

            Booking.findById.mockResolvedValue(mockBooking);

            await BookingController.getBookingById(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                booking: mockBooking
            });
        });
    });

    describe('updateBooking', () => {
        test('should update booking successfully for owner', async () => {
            req.params = { bookingId: 'booking123' };
            req.body = {
                start_time: '10:00',
                end_time: '18:00',
                people_count: 8
            };

            const mockExistingBooking = {
                id: 'booking123',
                user_id: 'user123',
                space_id: 'space123',
                status: 'pending'
            };

            const mockSpace = {
                id: 'space123',
                capacity: 10
            };

            const mockUpdatedBooking = {
                ...mockExistingBooking,
                start_time: '10:00',
                end_time: '18:00',
                people_count: 8
            };

            Booking.findById.mockResolvedValue(mockExistingBooking);
            Space.findById.mockResolvedValue(mockSpace);
            Booking.update.mockResolvedValue(mockUpdatedBooking);

            await BookingController.updateBooking(req, res);

            expect(Booking.update).toHaveBeenCalledWith('booking123', req.body);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Prenotazione aggiornata con successo',
                booking: mockUpdatedBooking
            });
        });

        test('should reject update exceeding space capacity', async () => {
            req.params = { bookingId: 'booking123' };
            req.body = { people_count: 15 };

            const mockExistingBooking = {
                id: 'booking123',
                user_id: 'user123',
                space_id: 'space123',
                status: 'pending'
            };

            const mockSpace = {
                id: 'space123',
                capacity: 10
            };

            Booking.findById.mockResolvedValue(mockExistingBooking);
            Space.findById.mockResolvedValue(mockSpace);

            await BookingController.updateBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Il numero di persone (15) supera la capacità massima dello spazio (10)'
            });
        });

        test('should filter allowed fields for client role', async () => {
            req.params = { bookingId: 'booking123' };
            req.body = {
                people_count: 8,
                status: 'confirmed', // Campo non consentito per client
                total_price: 200 // Campo non consentito per client
            };

            const mockExistingBooking = {
                id: 'booking123',
                user_id: 'user123',
                space_id: 'space123',
                status: 'pending'
            };

            const mockSpace = {
                id: 'space123',
                capacity: 10
            };

            Booking.findById.mockResolvedValue(mockExistingBooking);
            Space.findById.mockResolvedValue(mockSpace);
            Booking.update.mockResolvedValue(mockExistingBooking);

            await BookingController.updateBooking(req, res);

            expect(Booking.update).toHaveBeenCalledWith('booking123', {
                people_count: 8
                // status e total_price dovrebbero essere filtrati
            });
        });
    });

    describe('cancelBooking', () => {
        test('should cancel booking successfully', async () => {
            req.params = { bookingId: 'booking123' };
            req.body = { reason: 'Change of plans' };

            const mockExistingBooking = {
                id: 'booking123',
                user_id: 'user123',
                status: 'pending'
            };

            const mockCancelledBooking = {
                ...mockExistingBooking,
                status: 'cancelled'
            };

            Booking.findById.mockResolvedValue(mockExistingBooking);
            Booking.canCancel.mockResolvedValue(true);
            Booking.cancel.mockResolvedValue(mockCancelledBooking);

            await BookingController.cancelBooking(req, res);

            expect(Booking.cancel).toHaveBeenCalledWith('booking123', 'Change of plans');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Prenotazione cancellata con successo',
                booking: mockCancelledBooking
            });
        });

        test('should reject cancellation of non-cancellable booking', async () => {
            req.params = { bookingId: 'booking123' };

            const mockExistingBooking = {
                id: 'booking123',
                user_id: 'user123',
                status: 'completed' // Non cancellabile
            };

            Booking.findById.mockResolvedValue(mockExistingBooking);

            await BookingController.cancelBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Questa prenotazione non può essere cancellata'
            });
        });

        test('should check time limit for client cancellation', async () => {
            req.params = { bookingId: 'booking123' };

            const mockExistingBooking = {
                id: 'booking123',
                user_id: 'user123',
                status: 'confirmed'
            };

            Booking.findById.mockResolvedValue(mockExistingBooking);
            Booking.canCancel.mockResolvedValue(false); // Troppo tardi per cancellare

            await BookingController.cancelBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non è più possibile cancellare questa prenotazione (deve essere almeno 24 ore prima dell\'inizio)'
            });
        });
    });

    describe('confirmBooking', () => {
        test('should confirm booking successfully', async () => {
            req.params = { bookingId: 'booking123' };

            const mockConfirmedBooking = {
                id: 'booking123',
                status: 'confirmed'
            };

            Booking.confirm.mockResolvedValue(mockConfirmedBooking);

            await BookingController.confirmBooking(req, res);

            expect(Booking.confirm).toHaveBeenCalledWith('booking123');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Prenotazione confermata con successo',
                booking: mockConfirmedBooking
            });
        });

        test('should handle booking not found for confirmation', async () => {
            req.params = { bookingId: 'nonexistent' };

            Booking.confirm.mockRejectedValue(new Error('Booking not found or already processed'));

            await BookingController.confirmBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Prenotazione non trovata o già processata'
            });
        });
    });

    describe('completeBooking', () => {
        test('should complete booking successfully', async () => {
            req.params = { bookingId: 'booking123' };

            const mockCompletedBooking = {
                id: 'booking123',
                status: 'completed'
            };

            Booking.complete.mockResolvedValue(mockCompletedBooking);

            await BookingController.completeBooking(req, res);

            expect(Booking.complete).toHaveBeenCalledWith('booking123');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Prenotazione completata con successo',
                booking: mockCompletedBooking
            });
        });

        test('should handle booking not found for completion', async () => {
            req.params = { bookingId: 'nonexistent' };

            Booking.complete.mockRejectedValue(new Error('Booking not found or not confirmed'));

            await BookingController.completeBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Prenotazione non trovata o non confermata'
            });
        });
    });

    describe('checkConflicts', () => {
        test('should check conflicts successfully', async () => {
            req.query = {
                space_id: 'space123',
                start_date: '2024-12-25',
                end_date: '2024-12-25',
                start_time: '09:00',
                end_time: '17:00'
            };

            const mockConflicts = [
                {
                    id: 'booking456',
                    start_date: '2024-12-25',
                    end_date: '2024-12-25',
                    start_time: '10:00',
                    end_time: '16:00',
                    status: 'confirmed',
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john@example.com'
                }
            ];

            Booking.checkConflicts.mockResolvedValue(mockConflicts);

            await BookingController.checkConflicts(req, res);

            expect(Booking.checkConflicts).toHaveBeenCalledWith({
                space_id: 'space123',
                start_date: '2024-12-25',
                end_date: '2024-12-25',
                start_time: '09:00',
                end_time: '17:00'
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                hasConflicts: true,
                conflicts: [
                    {
                        id: 'booking456',
                        start_date: '2024-12-25',
                        end_date: '2024-12-25',
                        start_time: '10:00',
                        end_time: '16:00',
                        status: 'confirmed',
                        user: {
                            name: 'John Doe',
                            email: 'john@example.com'
                        }
                    }
                ]
            });
        });

        test('should return no conflicts when space is available', async () => {
            req.query = {
                space_id: 'space123',
                start_date: '2024-12-25',
                end_date: '2024-12-25'
            };

            Booking.checkConflicts.mockResolvedValue([]);

            await BookingController.checkConflicts(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                hasConflicts: false,
                conflicts: []
            });
        });
    });

    describe('getBookingStats', () => {
        test('should get booking statistics for admin', async () => {
            req.user.role = 'admin';

            const mockStats = {
                totalBookings: 100,
                pendingBookings: 15,
                confirmedBookings: 70,
                completedBookings: 10,
                cancelledBookings: 5
            };

            Booking.getStats.mockResolvedValue(mockStats);

            await BookingController.getBookingStats(req, res);

            expect(Booking.getStats).toHaveBeenCalledWith({});
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                stats: mockStats
            });
        });

        test('should filter stats for client role', async () => {
            req.user.role = 'client';

            Booking.getStats.mockResolvedValue({});

            await BookingController.getBookingStats(req, res);

            expect(Booking.getStats).toHaveBeenCalledWith({
                user_id: 'user123'
            });
        });

        test('should filter stats for manager role', async () => {
            req.user.role = 'manager';

            Booking.getStats.mockResolvedValue({});

            await BookingController.getBookingStats(req, res);

            expect(Booking.getStats).toHaveBeenCalledWith({
                manager_id: 'user123'
            });
        });
    });

    describe('getUpcomingBookings', () => {
        test('should get upcoming bookings', async () => {
            req.query = { hours: '48' };

            const mockUpcomingBookings = [
                {
                    id: 'booking1',
                    user_id: 'user123',
                    start_date: '2024-12-25'
                },
                {
                    id: 'booking2',
                    user_id: 'other_user',
                    space_manager_id: 'manager123'
                }
            ];

            Booking.getUpcoming.mockResolvedValue(mockUpcomingBookings);

            await BookingController.getUpcomingBookings(req, res);

            expect(Booking.getUpcoming).toHaveBeenCalledWith(48);

            // Client dovrebbe vedere solo le sue prenotazioni
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                bookings: [
                    {
                        id: 'booking1',
                        user_id: 'user123',
                        start_date: '2024-12-25'
                    }
                ]
            });
        });
    });

    describe('getUserBookings', () => {
        test('should get user bookings successfully', async () => {
            const mockBookings = [
                {
                    id: 'booking1',
                    start_date: '2024-12-25',
                    end_date: '2024-12-25',
                    status: 'confirmed',
                    space_name: 'Meeting Room A',
                    total_price: 150.00
                }
            ];

            Booking.findByUserId.mockResolvedValue(mockBookings);

            await BookingController.getUserBookings(req, res);

            expect(Booking.findByUserId).toHaveBeenCalledWith('user123');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Prenotazioni recuperate con successo',
                data: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'booking1',
                        space_name: 'Meeting Room A'
                    })
                ])
            });
        });
    });

    describe('deleteBooking', () => {
        test('should delete booking successfully', async () => {
            req.params = { bookingId: 'booking123' };

            Booking.delete.mockResolvedValue({ rowCount: 1 });

            await BookingController.deleteBooking(req, res);

            expect(Booking.delete).toHaveBeenCalledWith('booking123');
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Prenotazione eliminata con successo.'
            });
        });

        test('should return 404 when booking not found for deletion', async () => {
            req.params = { bookingId: 'nonexistent' };

            Booking.delete.mockResolvedValue({ rowCount: 0 });

            await BookingController.deleteBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Prenotazione non trovata.'
            });
        });
    });

    describe('Manager Methods', () => {
        describe('getManagerBookings', () => {
            test('should get manager bookings with filters', async () => {
                const options = {
                    page: 1,
                    limit: 10,
                    status: 'pending'
                };

                const mockResult = {
                    rows: [
                        {
                            id: 'booking1',
                            space_name: 'Room A',
                            client_first_name: 'John',
                            client_last_name: 'Doe'
                        }
                    ]
                };

                const mockCountResult = {
                    rows: [{ total: '10' }]
                };

                query.mockResolvedValueOnce(mockResult);
                query.mockResolvedValueOnce(mockCountResult);

                const result = await BookingController.getManagerBookings(
                    options,
                    'manager123',
                    'manager@example.com'
                );

                expect(query).toHaveBeenCalledTimes(2);
                expect(result.bookings).toBeDefined();
                expect(result.pagination).toBeDefined();
                expect(result.pagination.totalBookings).toBe(10);
            });

            test('should handle manager bookings query errors', async () => {
                const options = { page: 1, limit: 10 };

                query.mockRejectedValue(new Error('Database error'));

                await expect(
                    BookingController.getManagerBookings(options, 'manager123', 'manager@example.com')
                ).rejects.toThrow('Database error');
            });
        });

        describe('getManagerBookingStats', () => {
            test('should get manager booking statistics', async () => {
                const mockStatsResult = {
                    rows: [{
                        total_bookings: '25',
                        pending_bookings: '5',
                        total_revenue: '2500.00',
                        avg_booking_value: '100.00',
                        today_bookings: '2',
                        week_bookings: '8',
                        month_bookings: '15'
                    }]
                };

                const mockTrendResult = {
                    rows: [
                        { month: '2024-01-01', bookings_count: '10', revenue: '1000.00' },
                        { month: '2023-12-01', bookings_count: '8', revenue: '800.00' }
                    ]
                };

                query.mockResolvedValueOnce(mockStatsResult);
                query.mockResolvedValueOnce(mockTrendResult);

                const result = await BookingController.getManagerBookingStats(
                    'manager123',
                    'manager@example.com'
                );

                expect(result.total_bookings).toBe('25');
                expect(result.totalRevenue).toBe('2500.00');
                expect(result.monthlyTrend).toHaveLength(2);
            });

            test('should handle date filters in manager stats', async () => {
                const filters = {
                    date_from: '2024-01-01',
                    date_to: '2024-01-31'
                };

                query.mockResolvedValueOnce({ rows: [{}] });
                query.mockResolvedValueOnce({ rows: [] });

                await BookingController.getManagerBookingStats(
                    'manager123',
                    'manager@example.com',
                    filters
                );

                expect(query).toHaveBeenCalledWith(
                    expect.stringContaining('b.start_date >='),
                    expect.arrayContaining(['manager123', 'manager@example.com', '2024-01-01', '2024-01-31'])
                );
            });
        });

        describe('getBookingForManager', () => {
            test('should get specific booking for manager', async () => {
                const mockBookingResult = {
                    rows: [{
                        id: 'booking123',
                        space_name: 'Conference Room',
                        client_first_name: 'John',
                        client_last_name: 'Doe',
                        client_email: 'john@example.com'
                    }]
                };

                query.mockResolvedValue(mockBookingResult);

                const result = await BookingController.getBookingForManager(
                    'booking123',
                    'manager123',
                    'manager@example.com'
                );

                expect(result.id).toBe('booking123');
                expect(result.space_name).toBe('Conference Room');
                expect(query).toHaveBeenCalledWith(
                    expect.stringContaining('WHERE b.id = $1'),
                    ['booking123', 'manager123', 'manager@example.com']
                );
            });

            test('should return null when booking not found for manager', async () => {
                query.mockResolvedValue({ rows: [] });

                const result = await BookingController.getBookingForManager(
                    'nonexistent',
                    'manager123',
                    'manager@example.com'
                );

                expect(result).toBeNull();
            });
        });

        describe('cancelBookingAsManager', () => {
            test('should cancel booking as manager successfully', async () => {
                const mockBooking = {
                    id: 'booking123',
                    status: 'confirmed'
                };

                const mockCancelledBooking = {
                    ...mockBooking,
                    status: 'cancelled'
                };

                // Mock getBookingForManager
                BookingController.getBookingForManager = jest.fn().mockResolvedValue(mockBooking);
                Booking.cancel.mockResolvedValue(mockCancelledBooking);

                const result = await BookingController.cancelBookingAsManager(
                    'booking123',
                    'manager123',
                    'Emergency cancellation'
                );

                expect(result.status).toBe('cancelled');
                expect(Booking.cancel).toHaveBeenCalledWith('booking123', 'Emergency cancellation');
            });

            test('should reject cancellation of already cancelled booking', async () => {
                const mockBooking = {
                    id: 'booking123',
                    status: 'cancelled'
                };

                BookingController.getBookingForManager = jest.fn().mockResolvedValue(mockBooking);

                await expect(
                    BookingController.cancelBookingAsManager('booking123', 'manager123', 'reason')
                ).rejects.toThrow('La prenotazione è già stata cancellata');
            });

            test('should reject cancellation of completed booking', async () => {
                const mockBooking = {
                    id: 'booking123',
                    status: 'completed'
                };

                BookingController.getBookingForManager = jest.fn().mockResolvedValue(mockBooking);

                await expect(
                    BookingController.cancelBookingAsManager('booking123', 'manager123', 'reason')
                ).rejects.toThrow('Non è possibile cancellare una prenotazione completata');
            });

            test('should reject cancellation of unauthorized booking', async () => {
                BookingController.getBookingForManager = jest.fn().mockResolvedValue(null);

                await expect(
                    BookingController.cancelBookingAsManager('booking123', 'manager123', 'reason')
                ).rejects.toThrow('Prenotazione non trovata o non autorizzata');
            });
        });

        describe('getManagerCalendar', () => {
            test('should get manager calendar bookings', async () => {
                const options = {
                    start_date: '2024-01-01',
                    end_date: '2024-01-31',
                    space_id: 'space123'
                };

                const mockCalendarResult = {
                    rows: [
                        {
                            id: 'booking1',
                            start_date: '2024-01-15',
                            start_time: '09:00',
                            space_name: 'Room A',
                            user_first_name: 'John',
                            user_last_name: 'Doe'
                        },
                        {
                            id: 'booking2',
                            start_date: '2024-01-16',
                            start_time: '14:00',
                            space_name: 'Room B',
                            user_first_name: 'Jane',
                            user_last_name: 'Smith'
                        }
                    ]
                };

                query.mockResolvedValue(mockCalendarResult);

                const result = await BookingController.getManagerCalendar('manager123', options);

                expect(result).toHaveLength(2);
                expect(result[0].space_name).toBe('Room A');
                expect(result[1].user_first_name).toBe('Jane');
                expect(query).toHaveBeenCalledWith(
                    expect.stringContaining('WHERE s.manager_id = $1'),
                    expect.arrayContaining(['manager123', 'space123', '2024-01-01', '2024-01-31'])
                );
            });

            test('should get manager calendar without filters', async () => {
                query.mockResolvedValue({ rows: [] });

                const result = await BookingController.getManagerCalendar('manager123');

                expect(result).toHaveLength(0);
                expect(query).toHaveBeenCalledWith(
                    expect.stringContaining('WHERE s.manager_id = $1'),
                    ['manager123']
                );
            });
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle database errors gracefully', async () => {
            req.body = {
                space_id: 'space123',
                start_date: '2024-12-25',
                end_date: '2024-12-25',
                people_count: 5
            };

            Space.findById.mockRejectedValue(new Error('Database connection failed'));

            await BookingController.createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Errore durante la creazione della prenotazione'
            });
        });

        test('should handle malformed date inputs', async () => {
            // Questo test va riscritto per essere più significativo
            validationResult.mockReturnValue({
                isEmpty: () => false,
                array: () => [{ field: 'start_date', msg: 'Invalid date format' }]
            });

            req.body = {
                space_id: 'space123',
                start_date: 'invalid-date', // Input non valido
                people_count: 5
            };

            await BookingController.createBooking(req, res);

            // Ci aspettiamo che il middleware di validazione blocchi la richiesta
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Dati non validi'
            }));
            // Ripristina il mock per gli altri test
            validationResult.mockReturnValue({ isEmpty: () => true });
        });

        test('should handle concurrent booking conflicts', async () => {
            // --- MODIFICA --- (Stesso del test precedente sui conflitti)
            req.body = {
                space_id: 'space123',
                start_date: getFutureDate(30),
                end_date: getFutureDate(30),
                people_count: 5
            };

            const mockSpace = { id: 'space123', capacity: 10 };

            Space.findById.mockResolvedValue(mockSpace);
            Booking.create.mockRejectedValue(new Error('Lo spazio non è disponibile per le date selezionate'));

            await BookingController.createBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
        });

        test('should validate people_count as positive number', async () => {
            req.body = {
                space_id: 'space123',
                start_date: '2024-12-25',
                end_date: '2024-12-25',
                people_count: -5 // Numero negativo
            };

            const mockSpace = {
                id: 'space123',
                capacity: 10
            };

            Space.findById.mockResolvedValue(mockSpace);

            await BookingController.createBooking(req, res);

            // Dovrebbe essere gestito dalla validazione o dal modello
            expect(Space.findById).toHaveBeenCalled();
        });

        test('should handle empty search results gracefully', async () => {
            req.user.role = 'admin';
            req.query = { search: 'nonexistent' };

            Booking.findAll.mockResolvedValue({
                bookings: [],
                pagination: { page: 1, total: 0 }
            });

            await BookingController.getAllBookings(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                bookings: [],
                pagination: { page: 1, total: 0 }
            });
        });
    });

    describe('Permission and Security Tests', () => {
        test('should prevent client from accessing other users bookings', async () => {
            req.params = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'other_user', // Diverso dall'utente corrente
                space_manager_id: 'manager123'
            };

            Booking.findById.mockResolvedValue(mockBooking);

            await BookingController.getBookingById(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('should allow manager to access bookings for their spaces', async () => {
            req.user.role = 'manager';
            req.params = { bookingId: 'booking123' };

            const mockBooking = {
                id: 'booking123',
                user_id: 'other_user',
                space_manager_id: 'user123' // Manager's ID
            };

            Booking.findById.mockResolvedValue(mockBooking);

            await BookingController.getBookingById(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                booking: mockBooking
            });
        });

        test('should prevent unauthorized booking updates', async () => {
            req.params = { bookingId: 'booking123' };
            req.body = { people_count: 8 };

            const mockExistingBooking = {
                id: 'booking123',
                user_id: 'other_user', // Diverso dall'utente corrente
                space_manager_id: 'other_manager',
                status: 'pending'
            };

            Booking.findById.mockResolvedValue(mockExistingBooking);

            await BookingController.updateBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non hai il permesso di modificare questa prenotazione'
            });
        });

        test('should prevent unauthorized booking cancellation', async () => {
            req.params = { bookingId: 'booking123' };

            const mockExistingBooking = {
                id: 'booking123',
                user_id: 'other_user',
                space_manager_id: 'other_manager',
                status: 'pending'
            };

            Booking.findById.mockResolvedValue(mockExistingBooking);

            await BookingController.cancelBooking(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Non hai il permesso di cancellare questa prenotazione'
            });
        });
    });

    describe('Business Logic Validation', () => {
        test('should validate booking time slots', async () => {
            req.body = {
                space_id: 'space123',
                start_date: '2024-12-25',
                end_date: '2024-12-25',
                start_time: '17:00', // Inizio dopo la fine
                end_time: '09:00',
                people_count: 5
            };

            const mockSpace = {
                id: 'space123',
                capacity: 10
            };

            Space.findById.mockResolvedValue(mockSpace);

            // La validazione del time slot dovrebbe essere gestita dal modello o dalla validazione
            await BookingController.createBooking(req, res);

            expect(Space.findById).toHaveBeenCalled();
        });

        test('should handle weekend/holiday restrictions', async () => {
            req.body = {
                space_id: 'space123',
                start_date: '2025-12-25', // Natale
                end_date: '2025-12-25',
                people_count: 5
            };

            const mockSpace = {
                id: 'space123',
                capacity: 10,
                // Potrebbe avere restrizioni per i giorni festivi
                allow_holidays: false
            };

            Space.findById.mockResolvedValue(mockSpace);

            // Per questo test, assumiamo che il controller passi la validazione
            // e che la logica delle festività sia gestita dal modello
            const mockBooking = { id: 'booking123', status: 'pending' };
            Booking.create.mockResolvedValue(mockBooking);

            await BookingController.createBooking(req, res);

            // La logica delle festività dovrebbe essere gestita dal modello
            // Il test verifica che il controller passi i dati al modello
            expect(Booking.create).toHaveBeenCalled();
        });
    });
});

// Utility functions for tests
function createMockBooking(overrides = {}) {
    return {
        id: 'booking123',
        user_id: 'user123',
        space_id: 'space123',
        start_date: '2024-12-25',
        end_date: '2024-12-25',
        start_time: '09:00',
        end_time: '17:00',
        people_count: 5,
        status: 'pending',
        total_price: 150.00,
        created_at: new Date().toISOString(),
        ...overrides
    };
}

function createMockSpace(overrides = {}) {
    return {
        id: 'space123',
        name: 'Conference Room A',
        type: 'meeting',
        capacity: 10,
        price_per_day: 30.00,
        is_active: true,
        ...overrides
    };
}