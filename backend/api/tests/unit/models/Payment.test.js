// tests/unit/models/Payment.test.js

// Mock delle dipendenze
jest.mock('../../../src/config/database', () => ({
    query: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
}));

const Payment = require('../../../src/models/Payment');
const db = require('../../../src/config/database');
const logger = require('../../../src/utils/logger');

describe('Payment Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        test('should create payment successfully', async () => {
            const paymentData = {
                booking_id: 'booking123',
                stripe_payment_intent_id: 'pi_test123',
                amount: 100.50,
                currency: 'EUR',
                status: 'pending',
                payment_method: { type: 'card', brand: 'visa' }
            };

            const mockCreatedPayment = {
                id: 'payment123',
                ...paymentData,
                payment_method: JSON.stringify(paymentData.payment_method),
                created_at: new Date()
            };

            db.query.mockResolvedValue({ rows: [mockCreatedPayment] });

            const result = await Payment.create(paymentData);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO payments'),
                expect.arrayContaining([
                    'booking123',
                    'pi_test123',
                    100.50,
                    'EUR',
                    'pending',
                    JSON.stringify(paymentData.payment_method),
                    expect.any(Date)
                ])
            );
            expect(result).toEqual(mockCreatedPayment);
        });

        test('should use default values for optional fields', async () => {
            const paymentData = {
                booking_id: 'booking123',
                stripe_payment_intent_id: 'pi_test123',
                amount: 100.50
            };

            db.query.mockResolvedValue({ rows: [{ id: 'payment123' }] });

            await Payment.create(paymentData);

            expect(db.query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    'booking123',
                    'pi_test123',
                    100.50,
                    'EUR', // default currency
                    'pending', // default status
                    JSON.stringify({}), // default payment_method
                    expect.any(Date)
                ])
            );
        });

        test('should handle database errors', async () => {
            const paymentData = {
                booking_id: 'booking123',
                stripe_payment_intent_id: 'pi_test123',
                amount: 100.50
            };

            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.create(paymentData)).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error creating payment:', expect.any(Error));
        });
    });

    describe('findById', () => {
        test('should find payment by ID with joined data', async () => {
            const mockPayment = {
                id: 'payment123',
                amount: 100.50,
                status: 'succeeded',
                user_email: 'user@example.com',
                space_name: 'Conference Room A'
            };

            db.query.mockResolvedValue({ rows: [mockPayment] });

            const result = await Payment.findById('payment123');

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT p.*, b.space_id, b.user_id'),
                ['payment123']
            );
            expect(result).toEqual(mockPayment);
        });

        test('should return undefined when payment not found', async () => {
            db.query.mockResolvedValue({ rows: [] });

            const result = await Payment.findById('nonexistent');

            expect(result).toBeUndefined();
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.findById('payment123')).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error finding payment by ID:', expect.any(Error));
        });
    });

    describe('findByStripeIntent', () => {
        test('should find payment by Stripe Payment Intent ID', async () => {
            const mockPayment = {
                id: 'payment123',
                stripe_payment_intent_id: 'pi_test123',
                amount: 100.50
            };

            db.query.mockResolvedValue({ rows: [mockPayment] });

            const result = await Payment.findByStripeIntent('pi_test123');

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE p.stripe_payment_intent_id = $1'),
                ['pi_test123']
            );
            expect(result).toEqual(mockPayment);
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.findByStripeIntent('pi_test123')).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error finding payment by Stripe intent:', expect.any(Error));
        });
    });

    describe('findByBookingId', () => {
        test('should find all payments for a booking', async () => {
            const mockPayments = [
                { id: 'payment1', booking_id: 'booking123', amount: 50.25 },
                { id: 'payment2', booking_id: 'booking123', amount: 50.25 }
            ];

            db.query.mockResolvedValue({ rows: mockPayments });

            const result = await Payment.findByBookingId('booking123');

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE booking_id = $1'),
                ['booking123']
            );
            expect(result).toEqual(mockPayments);
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.findByBookingId('booking123')).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error finding payments by booking ID:', expect.any(Error));
        });
    });

    describe('findByUserId', () => {
        test('should find payments by user ID with pagination', async () => {
            const mockPayments = [
                { id: 'payment1', amount: 100.00, space_name: 'Room A' },
                { id: 'payment2', amount: 150.00, space_name: 'Room B' }
            ];

            db.query.mockResolvedValue({ rows: mockPayments });

            const result = await Payment.findByUserId('user123', 10, 0);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE b.user_id = $1'),
                ['user123', 10, 0]
            );
            expect(result).toEqual(mockPayments);
        });

        test('should use default pagination values', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await Payment.findByUserId('user123');

            expect(db.query).toHaveBeenCalledWith(
                expect.any(String),
                ['user123', 50, 0] // default limit and offset
            );
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.findByUserId('user123')).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error finding payments by user ID:', expect.any(Error));
        });
    });

    describe('updateByStripeIntent', () => {
        test('should update payment by Stripe Intent ID', async () => {
            const updateData = {
                status: 'succeeded',
                payment_method: { type: 'card', last4: '4242' }
            };

            const mockUpdatedPayment = {
                id: 'payment123',
                stripe_payment_intent_id: 'pi_test123',
                ...updateData,
                updated_at: new Date()
            };

            db.query.mockResolvedValue({ rows: [mockUpdatedPayment] });

            const result = await Payment.updateByStripeIntent('pi_test123', updateData);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE payments'),
                expect.arrayContaining([
                    'succeeded',
                    JSON.stringify(updateData.payment_method),
                    expect.any(Date),
                    'pi_test123'
                ])
            );
            expect(result).toEqual(mockUpdatedPayment);
        });

        test('should handle non-JSON fields correctly', async () => {
            const updateData = {
                status: 'succeeded',
                amount: 200.00
            };

            db.query.mockResolvedValue({ rows: [{ id: 'payment123' }] });

            await Payment.updateByStripeIntent('pi_test123', updateData);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE payments'),
                expect.arrayContaining([
                    'succeeded',
                    200.00,
                    expect.any(Date),
                    'pi_test123'
                ])
            );
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.updateByStripeIntent('pi_test123', {})).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error updating payment by Stripe intent:', expect.any(Error));
        });
    });

    describe('updateStatus', () => {
        test('should update payment status successfully', async () => {
            const mockUpdatedPayment = {
                id: 'payment123',
                status: 'succeeded'
            };

            // Mock the update method
            Payment.update = jest.fn().mockResolvedValue(mockUpdatedPayment);

            const result = await Payment.updateStatus('payment123', 'succeeded');

            expect(Payment.update).toHaveBeenCalledWith('payment123', { status: 'succeeded' });
            expect(result).toEqual(mockUpdatedPayment);
        });

        test('should include additional data in update', async () => {
            Payment.update = jest.fn().mockResolvedValue({ id: 'payment123' });

            await Payment.updateStatus('payment123', 'succeeded', { transaction_id: 'tx123' });

            expect(Payment.update).toHaveBeenCalledWith('payment123', {
                status: 'succeeded',
                transaction_id: 'tx123'
            });
        });

        test('should handle errors', async () => {
            Payment.update = jest.fn().mockRejectedValue(new Error('Update error'));

            await expect(Payment.updateStatus('payment123', 'succeeded')).rejects.toThrow('Update error');
            expect(logger.error).toHaveBeenCalledWith('Error updating payment status:', expect.any(Error));
        });
    });


    describe('delete', () => {

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.delete('payment123')).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error deleting payment:', expect.any(Error));
        });
    });

    describe('getStats', () => {
        test('should get payment statistics without date filters', async () => {
            const mockStatsData = {
                total_payments: '100',
                completed_payments: '85',
                pending_payments: '10',
                failed_payments: '3',
                canceled_payments: '2',
                total_revenue: '8500.00',
                avg_payment_amount: '100.00',
                min_payment_amount: '25.00',
                max_payment_amount: '500.00'
            };

            const mockDailyData = [
                { date: '2025-01-15', payments_count: '10', completed_count: '8', daily_revenue: '800.00' },
                { date: '2025-01-14', payments_count: '12', completed_count: '10', daily_revenue: '1000.00' }
            ];

            const mockPaymentMethods = [
                { payment_method: 'card', usage_count: '80', success_count: '75' },
                { payment_method: 'bank_transfer', usage_count: '20', success_count: '18' }
            ];

            db.query
                .mockResolvedValueOnce({ rows: [mockStatsData] })
                .mockResolvedValueOnce({ rows: mockDailyData })
                .mockResolvedValueOnce({ rows: mockPaymentMethods });

            const result = await Payment.getStats();

            expect(result).toEqual({
                summary: {
                    total_payments: 100,
                    completed_payments: 85,
                    pending_payments: 10,
                    failed_payments: 3,
                    canceled_payments: 2,
                    total_revenue: 8500.00,
                    avg_payment_amount: 100.00,
                    min_payment_amount: 25.00,
                    max_payment_amount: 500.00,
                    success_rate: '85.00'
                },
                daily_stats: [
                    { date: '2025-01-15', payments_count: 10, completed_count: 8, daily_revenue: 800.00 },
                    { date: '2025-01-14', payments_count: 12, completed_count: 10, daily_revenue: 1000.00 }
                ],
                payment_methods: [
                    { method: 'card', usage_count: 80, success_count: 75, success_rate: '93.75' },
                    { method: 'bank_transfer', usage_count: 20, success_count: 18, success_rate: '90.00' }
                ]
            });
        });

        test('should include date filters in queries', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ total_payments: '0' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await Payment.getStats('2025-01-01', '2025-01-31');

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('p.created_at >= $1'),
                ['2025-01-01', '2025-01-31']
            );
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.getStats()).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error getting payment stats:', expect.any(Error));
        });
    });

    describe('getRevenue', () => {
        test('should get total revenue successfully', async () => {
            const mockRevenue = {
                total_revenue: '5000.00',
                payment_count: '50'
            };

            db.query.mockResolvedValue({ rows: [mockRevenue] });

            const result = await Payment.getRevenue();

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("p.status = 'succeeded'"),
                []
            );
            expect(result).toEqual({
                total_revenue: 5000.00,
                payment_count: 50
            });
        });

        test('should include date filters', async () => {
            db.query.mockResolvedValue({ rows: [{ total_revenue: '0', payment_count: '0' }] });

            await Payment.getRevenue('2025-01-01', '2025-01-31');

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('p.created_at >= $1'),
                ['2025-01-01', '2025-01-31']
            );
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.getRevenue()).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error getting revenue:', expect.any(Error));
        });
    });

    describe('findExpiring', () => {
        test('should find expiring payments', async () => {
            const mockExpiringPayments = [
                {
                    id: 'payment1',
                    status: 'pending',
                    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
                    user_email: 'user@example.com'
                }
            ];

            db.query.mockResolvedValue({ rows: mockExpiringPayments });

            const result = await Payment.findExpiring(24);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("p.status = 'pending'")
            );
            expect(result).toEqual(mockExpiringPayments);
        });

        test('should use default hours value', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await Payment.findExpiring();

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("INTERVAL '24 hours'")
            );
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.findExpiring()).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error finding expiring payments:', expect.any(Error));
        });
    });

    describe('countByStatus', () => {
        test('should count payments by status', async () => {
            const mockStatusCounts = [
                { status: 'succeeded', count: '85' },
                { status: 'pending', count: '10' },
                { status: 'failed', count: '5' }
            ];

            db.query.mockResolvedValue({ rows: mockStatusCounts });

            const result = await Payment.countByStatus();

            expect(result).toEqual({
                succeeded: 85,
                pending: 10,
                failed: 5
            });
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.countByStatus()).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error counting payments by status:', expect.any(Error));
        });
    });

    describe('findRecent', () => {
        test('should find recent payments with default limit', async () => {
            const mockRecentPayments = [
                { id: 'payment1', created_at: new Date() },
                { id: 'payment2', created_at: new Date() }
            ];

            db.query.mockResolvedValue({ rows: mockRecentPayments });

            const result = await Payment.findRecent();

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY p.created_at DESC'),
                [10] // default limit
            );
            expect(result).toEqual(mockRecentPayments);
        });

        test('should use custom limit', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await Payment.findRecent(25);

            expect(db.query).toHaveBeenCalledWith(
                expect.any(String),
                [25]
            );
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.findRecent()).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error finding recent payments:', expect.any(Error));
        });
    });

    describe('findAll', () => {
        test('should find all payments without filters', async () => {
            const mockPayments = [
                { id: 'payment1', amount: 100.00 },
                { id: 'payment2', amount: 150.00 }
            ];

            db.query.mockResolvedValue({ rows: mockPayments });

            const result = await Payment.findAll();

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE p.deleted_at IS NULL'),
                [50, 0] // default limit and offset
            );
            expect(result).toEqual(mockPayments);
        });

        test('should apply all filters correctly', async () => {
            const filters = {
                status: 'succeeded',
                userId: 'user123',
                startDate: '2025-01-01',
                endDate: '2025-01-31',
                minAmount: 50.00,
                maxAmount: 500.00
            };

            db.query.mockResolvedValue({ rows: [] });

            await Payment.findAll(filters, 20, 40);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('p.status = $1'),
                ['succeeded', 'user123', '2025-01-01', '2025-01-31', 50.00, 500.00, 20, 40]
            );
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.findAll()).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error finding payments:', expect.any(Error));
        });
    });

    describe('count', () => {
        test('should count payments without filters', async () => {
            db.query.mockResolvedValue({ rows: [{ count: '100' }] });

            const result = await Payment.count();

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT COUNT(*) as count'),
                []
            );
            expect(result).toBe(100);
        });

        test('should apply filters in count query', async () => {
            const filters = {
                status: 'succeeded',
                userId: 'user123'
            };

            db.query.mockResolvedValue({ rows: [{ count: '25' }] });

            const result = await Payment.count(filters);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('p.status = $1'),
                ['succeeded', 'user123']
            );
            expect(result).toBe(25);
        });

        test('should handle database errors', async () => {
            db.query.mockRejectedValue(new Error('Database error'));

            await expect(Payment.count()).rejects.toThrow('Database error');
            expect(logger.error).toHaveBeenCalledWith('Error counting payments:', expect.any(Error));
        });
    });

    describe('Edge Cases and Validation', () => {

        test('should handle zero division in success rate calculation', async () => {
            const mockPaymentMethods = [
                { payment_method: 'card', usage_count: '0', success_count: '0' }
            ];

            db.query
                .mockResolvedValueOnce({ rows: [{ total_payments: '0' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: mockPaymentMethods });

            const result = await Payment.getStats();

            expect(result.payment_methods[0].success_rate).toBe(0);
        });
    });
});