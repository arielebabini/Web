// api/src/services/analyticsService.js
const db = require('../config/database');
const logger = require('../config/logger');
const moment = require('moment');
const _ = require('lodash');

class AnalyticsService {
    /**
     * Dashboard generale per admin
     */
    static async getDashboardStats(timeRange = '30d') {
        try {
            const { startDate, endDate } = this.getDateRange(timeRange);

            const [
                generalStats,
                revenueStats,
                bookingTrends,
                topSpaces,
                userGrowth,
                paymentMethods
            ] = await Promise.all([
                this.getGeneralStats(startDate, endDate),
                this.getRevenueStats(startDate, endDate),
                this.getBookingTrends(startDate, endDate),
                this.getTopSpaces(startDate, endDate),
                this.getUserGrowth(startDate, endDate),
                this.getPaymentMethodStats(startDate, endDate)
            ]);

            return {
                timeRange,
                period: { startDate, endDate },
                general: generalStats,
                revenue: revenueStats,
                bookings: bookingTrends,
                topSpaces,
                userGrowth,
                paymentMethods
            };
        } catch (error) {
            logger.error('Error getting dashboard stats:', error);
            throw error;
        }
    }

    /**
     * Statistiche per gestori di spazi
     */
    static async getSpaceManagerStats(managerId, spaceIds = [], timeRange = '30d') {
        try {
            const { startDate, endDate } = this.getDateRange(timeRange);

            // Se non specificati spaceIds, prendi tutti quelli del manager
            if (spaceIds.length === 0 && managerId) {
                const spacesQuery = `
                    SELECT id FROM spaces 
                    WHERE manager_id = $1 AND deleted_at IS NULL
                `;
                const spacesResult = await db.query(spacesQuery, [managerId]);
                spaceIds = spacesResult.rows.map(row => row.id);
            }

            if (spaceIds.length === 0) {
                return {
                    message: 'Nessuno spazio trovato per questo manager',
                    timeRange,
                    period: { startDate, endDate },
                    general: {},
                    bookings: {},
                    revenue: {},
                    occupancy: [],
                    reviews: {}
                };
            }

            const [
                spaceStats,
                bookingStats,
                revenueStats,
                occupancyStats,
                reviewStats
            ] = await Promise.all([
                this.getSpaceGeneralStats(spaceIds, startDate, endDate),
                this.getSpaceBookingStats(spaceIds, startDate, endDate),
                this.getSpaceRevenueStats(spaceIds, startDate, endDate),
                this.getOccupancyStats(spaceIds, startDate, endDate),
                this.getSpaceReviewStats(spaceIds, startDate, endDate)
            ]);

            return {
                timeRange,
                period: { startDate, endDate },
                spaceIds,
                general: spaceStats,
                bookings: bookingStats,
                revenue: revenueStats,
                occupancy: occupancyStats,
                reviews: reviewStats
            };
        } catch (error) {
            logger.error('Error getting space manager stats:', error);
            throw error;
        }
    }

    /**
     * Statistiche per utenti
     */
    static async getUserStats(userId, timeRange = '30d') {
        try {
            const { startDate, endDate } = this.getDateRange(timeRange);

            const [
                bookingStats,
                spendingStats,
                favoriteSpaces,
                bookingHistory
            ] = await Promise.all([
                this.getUserBookingStats(userId, startDate, endDate),
                this.getUserSpendingStats(userId, startDate, endDate),
                this.getUserFavoriteSpaces(userId),
                this.getUserBookingHistory(userId, 10)
            ]);

            return {
                timeRange,
                period: { startDate, endDate },
                bookings: bookingStats,
                spending: spendingStats,
                favoriteSpaces,
                recentBookings: bookingHistory
            };
        } catch (error) {
            logger.error('Error getting user stats:', error);
            throw error;
        }
    }

    // =============================================
    // METODI PRIVATI - STATISTICHE GENERALI
    // =============================================

    static async getGeneralStats(startDate, endDate) {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
                (SELECT COUNT(*) FROM users WHERE created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL) as new_users,
                (SELECT COUNT(*) FROM spaces WHERE deleted_at IS NULL) as total_spaces,
                (SELECT COUNT(*) FROM bookings WHERE deleted_at IS NULL) as total_bookings,
                (SELECT COUNT(*) FROM bookings WHERE created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL) as new_bookings,
                (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed' AND created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL) as confirmed_bookings,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL) as total_revenue,
                (SELECT COUNT(*) FROM payments WHERE status = 'completed' AND created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL) as completed_payments
        `;

        const result = await db.query(query, [startDate, endDate]);
        const stats = result.rows[0];

        // Calcola conversion rate
        const conversionRate = stats.new_bookings > 0
            ? (parseFloat(stats.confirmed_bookings) / parseFloat(stats.new_bookings)) * 100
            : 0;

        return {
            users: {
                total: parseInt(stats.total_users),
                new: parseInt(stats.new_users)
            },
            spaces: {
                total: parseInt(stats.total_spaces)
            },
            bookings: {
                total: parseInt(stats.total_bookings),
                new: parseInt(stats.new_bookings),
                confirmed: parseInt(stats.confirmed_bookings),
                conversionRate: Math.round(conversionRate * 100) / 100
            },
            revenue: {
                total: parseFloat(stats.total_revenue),
                payments: parseInt(stats.completed_payments),
                averageTransaction: stats.completed_payments > 0
                    ? parseFloat(stats.total_revenue) / parseInt(stats.completed_payments)
                    : 0
            }
        };
    }

    static async getRevenueStats(startDate, endDate) {
        const query = `
            SELECT 
                DATE(p.created_at) as date,
                COALESCE(SUM(p.amount), 0) as daily_revenue,
                COUNT(p.id) as daily_payments
            FROM payments p
            WHERE p.status = 'completed' 
              AND p.created_at >= $1 
              AND p.created_at <= $2 
              AND p.deleted_at IS NULL
            GROUP BY DATE(p.created_at)
            ORDER BY date ASC
        `;

        const result = await db.query(query, [startDate, endDate]);

        // Calcola crescita rispetto al periodo precedente
        const previousPeriod = this.getPreviousPeriod(startDate, endDate);
        const previousQuery = `
            SELECT COALESCE(SUM(amount), 0) as previous_revenue
            FROM payments 
            WHERE status = 'completed' 
              AND created_at >= $1 
              AND created_at <= $2 
              AND deleted_at IS NULL
        `;

        const previousResult = await db.query(previousQuery, [previousPeriod.startDate, previousPeriod.endDate]);
        const currentTotal = result.rows.reduce((sum, row) => sum + parseFloat(row.daily_revenue), 0);
        const previousTotal = parseFloat(previousResult.rows[0].previous_revenue);

        const growthRate = previousTotal > 0
            ? ((currentTotal - previousTotal) / previousTotal) * 100
            : 0;

        return {
            dailyRevenue: result.rows.map(row => ({
                date: row.date,
                revenue: parseFloat(row.daily_revenue),
                payments: parseInt(row.daily_payments)
            })),
            totals: {
                current: currentTotal,
                previous: previousTotal,
                growthRate: Math.round(growthRate * 100) / 100
            }
        };
    }

    static async getBookingTrends(startDate, endDate) {
        const query = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings
            FROM bookings 
            WHERE created_at >= $1 
              AND created_at <= $2 
              AND deleted_at IS NULL
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;

        const result = await db.query(query, [startDate, endDate]);

        return result.rows.map(row => ({
            date: row.date,
            total: parseInt(row.total_bookings),
            confirmed: parseInt(row.confirmed_bookings),
            cancelled: parseInt(row.cancelled_bookings),
            pending: parseInt(row.pending_bookings)
        }));
    }

    static async getTopSpaces(startDate, endDate, limit = 10) {
        const query = `
            SELECT 
                s.id,
                s.name,
                s.location,
                COUNT(b.id) as total_bookings,
                COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                COALESCE(SUM(p.amount), 0) as total_revenue,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(r.id) as review_count
            FROM spaces s
            LEFT JOIN bookings b ON s.id = b.space_id 
                AND b.created_at >= $1 
                AND b.created_at <= $2 
                AND b.deleted_at IS NULL
            LEFT JOIN payments p ON b.id = p.booking_id 
                AND p.status = 'completed' 
                AND p.deleted_at IS NULL
            LEFT JOIN reviews r ON s.id = r.space_id 
                AND r.created_at >= $1 
                AND r.created_at <= $2
            WHERE s.deleted_at IS NULL
            GROUP BY s.id, s.name, s.location
            ORDER BY total_revenue DESC, confirmed_bookings DESC
            LIMIT $3
        `;

        const result = await db.query(query, [startDate, endDate, limit]);

        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            location: row.location,
            bookings: {
                total: parseInt(row.total_bookings),
                confirmed: parseInt(row.confirmed_bookings)
            },
            revenue: parseFloat(row.total_revenue),
            rating: {
                average: Math.round(parseFloat(row.avg_rating) * 100) / 100,
                count: parseInt(row.review_count)
            }
        }));
    }

    static async getUserGrowth(startDate, endDate) {
        const query = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_users
            FROM users 
            WHERE created_at >= $1 
              AND created_at <= $2 
              AND deleted_at IS NULL
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;

        const result = await db.query(query, [startDate, endDate]);

        return result.rows.map(row => ({
            date: row.date,
            newUsers: parseInt(row.new_users)
        }));
    }

    static async getPaymentMethodStats(startDate, endDate) {
        const query = `
            SELECT 
                COALESCE(payment_method->>'type', 'card') as method_type,
                COUNT(*) as usage_count,
                COALESCE(SUM(amount), 0) as total_amount
            FROM payments 
            WHERE status = 'completed' 
              AND created_at >= $1 
              AND created_at <= $2 
              AND deleted_at IS NULL
            GROUP BY payment_method->>'type'
            ORDER BY usage_count DESC
        `;

        const result = await db.query(query, [startDate, endDate]);

        return result.rows.map(row => ({
            method: row.method_type,
            count: parseInt(row.usage_count),
            amount: parseFloat(row.total_amount)
        }));
    }

    // =============================================
    // METODI PRIVATI - STATISTICHE SPAZI
    // =============================================

    static async getSpaceGeneralStats(spaceIds, startDate, endDate) {
        if (spaceIds.length === 0) return {};

        const placeholders = spaceIds.map((_, i) => `$${i + 3}`).join(',');

        const query = `
            SELECT 
                COUNT(DISTINCT b.id) as total_bookings,
                COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
                COALESCE(SUM(p.amount), 0) as total_revenue,
                COUNT(DISTINCT b.user_id) as unique_customers,
                COALESCE(AVG(r.rating), 0) as avg_rating
            FROM bookings b
            LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'completed'
            LEFT JOIN reviews r ON b.space_id = r.space_id
            WHERE b.space_id IN (${placeholders})
              AND b.created_at >= $1 
              AND b.created_at <= $2 
              AND b.deleted_at IS NULL
        `;

        const result = await db.query(query, [startDate, endDate, ...spaceIds]);
        const stats = result.rows[0];

        return {
            bookings: {
                total: parseInt(stats.total_bookings),
                confirmed: parseInt(stats.confirmed_bookings),
                cancelled: parseInt(stats.cancelled_bookings)
            },
            revenue: parseFloat(stats.total_revenue),
            customers: parseInt(stats.unique_customers),
            rating: Math.round(parseFloat(stats.avg_rating) * 100) / 100
        };
    }

    static async getSpaceBookingStats(spaceIds, startDate, endDate) {
        if (spaceIds.length === 0) return [];

        const placeholders = spaceIds.map((_, i) => `$${i + 3}`).join(',');

        const query = `
            SELECT 
                DATE(b.created_at) as date,
                COUNT(*) as daily_bookings,
                COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings
            FROM bookings b
            WHERE b.space_id IN (${placeholders})
              AND b.created_at >= $1 
              AND b.created_at <= $2 
              AND b.deleted_at IS NULL
            GROUP BY DATE(b.created_at)
            ORDER BY date ASC
        `;

        const result = await db.query(query, [startDate, endDate, ...spaceIds]);

        return result.rows.map(row => ({
            date: row.date,
            total: parseInt(row.daily_bookings),
            confirmed: parseInt(row.confirmed_bookings),
            cancelled: parseInt(row.cancelled_bookings)
        }));
    }

    static async getSpaceRevenueStats(spaceIds, startDate, endDate) {
        if (spaceIds.length === 0) return [];

        const placeholders = spaceIds.map((_, i) => `$${i + 3}`).join(',');

        const query = `
            SELECT 
                DATE(p.created_at) as date,
                COALESCE(SUM(p.amount), 0) as daily_revenue,
                COUNT(p.id) as daily_payments
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            WHERE b.space_id IN (${placeholders})
              AND p.status = 'completed'
              AND p.created_at >= $1 
              AND p.created_at <= $2 
              AND p.deleted_at IS NULL
            GROUP BY DATE(p.created_at)
            ORDER BY date ASC
        `;

        const result = await db.query(query, [startDate, endDate, ...spaceIds]);

        return result.rows.map(row => ({
            date: row.date,
            revenue: parseFloat(row.daily_revenue),
            payments: parseInt(row.daily_payments)
        }));
    }

    static async getOccupancyStats(spaceIds, startDate, endDate) {
        if (spaceIds.length === 0) return [];

        const placeholders = spaceIds.map((_, i) => `$${i + 3}`).join(',');

        const query = `
            SELECT 
                s.id,
                s.name,
                COUNT(b.id) as total_bookings,
                COALESCE(SUM(
                    EXTRACT(EPOCH FROM (b.end_date - b.start_date)) / 3600
                ), 0) as total_hours_booked
            FROM spaces s
            LEFT JOIN bookings b ON s.id = b.space_id 
                AND b.status = 'confirmed'
                AND b.start_date >= $1 
                AND b.end_date <= $2 
                AND b.deleted_at IS NULL
            WHERE s.id IN (${placeholders})
              AND s.deleted_at IS NULL
            GROUP BY s.id, s.name
            ORDER BY total_hours_booked DESC
        `;

        const result = await db.query(query, [startDate, endDate, ...spaceIds]);

        // Calcola ore disponibili nel periodo (assumendo 12 ore/giorno per semplicità)
        const days = moment(endDate).diff(moment(startDate), 'days') + 1;
        const availableHours = days * 12; // 12 ore operative al giorno

        return result.rows.map(row => {
            const bookedHours = parseFloat(row.total_hours_booked);
            const occupancyRate = availableHours > 0 ? (bookedHours / availableHours) * 100 : 0;

            return {
                spaceId: row.id,
                spaceName: row.name,
                totalBookings: parseInt(row.total_bookings),
                hoursBooked: bookedHours,
                availableHours,
                occupancyRate: Math.round(occupancyRate * 100) / 100
            };
        });
    }

    static async getSpaceReviewStats(spaceIds, startDate, endDate) {
        if (spaceIds.length === 0) return {};

        const placeholders = spaceIds.map((_, i) => `$${i + 3}`).join(',');

        const query = `
            SELECT 
                COUNT(*) as total_reviews,
                COALESCE(AVG(rating), 0) as avg_rating,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_reviews,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_reviews,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_reviews,
                COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_reviews,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_reviews
            FROM reviews r
            WHERE r.space_id IN (${placeholders})
              AND r.created_at >= $1 
              AND r.created_at <= $2
        `;

        const result = await db.query(query, [startDate, endDate, ...spaceIds]);
        const stats = result.rows[0];

        return {
            total: parseInt(stats.total_reviews),
            average: Math.round(parseFloat(stats.avg_rating) * 100) / 100,
            distribution: {
                5: parseInt(stats.five_star_reviews),
                4: parseInt(stats.four_star_reviews),
                3: parseInt(stats.three_star_reviews),
                2: parseInt(stats.two_star_reviews),
                1: parseInt(stats.one_star_reviews)
            }
        };
    }

    // =============================================
    // METODI PRIVATI - STATISTICHE UTENTI
    // =============================================

    static async getUserBookingStats(userId, startDate, endDate) {
        const query = `
            SELECT 
                COUNT(*) as total_bookings,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                COALESCE(SUM(
                    EXTRACT(EPOCH FROM (end_date - start_date)) / 3600
                ), 0) as total_hours
            FROM bookings 
            WHERE user_id = $1 
              AND created_at >= $2 
              AND created_at <= $3 
              AND deleted_at IS NULL
        `;

        const result = await db.query(query, [userId, startDate, endDate]);
        const stats = result.rows[0];

        return {
            total: parseInt(stats.total_bookings),
            confirmed: parseInt(stats.confirmed_bookings),
            cancelled: parseInt(stats.cancelled_bookings),
            totalHours: parseFloat(stats.total_hours)
        };
    }

    static async getUserSpendingStats(userId, startDate, endDate) {
        const query = `
            SELECT 
                COALESCE(SUM(p.amount), 0) as total_spent,
                COUNT(p.id) as total_payments,
                COALESCE(AVG(p.amount), 0) as avg_payment
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            WHERE b.user_id = $1 
              AND p.status = 'completed'
              AND p.created_at >= $2 
              AND p.created_at <= $3 
              AND p.deleted_at IS NULL
        `;

        const result = await db.query(query, [userId, startDate, endDate]);
        const stats = result.rows[0];

        return {
            total: parseFloat(stats.total_spent),
            payments: parseInt(stats.total_payments),
            average: parseFloat(stats.avg_payment)
        };
    }

    static async getUserFavoriteSpaces(userId, limit = 5) {
        const query = `
            SELECT 
                s.id,
                s.name,
                s.location,
                COUNT(b.id) as visit_count,
                COALESCE(AVG(r.rating), 0) as avg_rating_given,
                MAX(b.created_at) as last_visit
            FROM spaces s
            JOIN bookings b ON s.id = b.space_id
            LEFT JOIN reviews r ON s.id = r.space_id AND r.user_id = $1
            WHERE b.user_id = $1 
              AND b.status = 'confirmed'
              AND b.deleted_at IS NULL
              AND s.deleted_at IS NULL
            GROUP BY s.id, s.name, s.location
            ORDER BY visit_count DESC, last_visit DESC
            LIMIT $2
        `;

        const result = await db.query(query, [userId, limit]);

        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            location: row.location,
            visitCount: parseInt(row.visit_count),
            avgRatingGiven: Math.round(parseFloat(row.avg_rating_given) * 100) / 100,
            lastVisit: row.last_visit
        }));
    }

    static async getUserBookingHistory(userId, limit = 10) {
        const query = `
            SELECT 
                b.id,
                b.start_date,
                b.end_date,
                b.status,
                b.total_price,
                s.name as space_name,
                s.location,
                p.status as payment_status
            FROM bookings b
            JOIN spaces s ON b.space_id = s.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.user_id = $1 
              AND b.deleted_at IS NULL
            ORDER BY b.created_at DESC
            LIMIT $2
        `;

        const result = await db.query(query, [userId, limit]);

        return result.rows.map(row => ({
            id: row.id,
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status,
            totalPrice: parseFloat(row.total_price || 0),
            space: {
                name: row.space_name,
                location: row.location
            },
            paymentStatus: row.payment_status
        }));
    }

    // =============================================
    // METODI UTILITY
    // =============================================

    static getDateRange(timeRange) {
        const endDate = moment();
        let startDate = moment();

        switch (timeRange) {
            case '7d':
                startDate = moment().subtract(7, 'days');
                break;
            case '30d':
                startDate = moment().subtract(30, 'days');
                break;
            case '90d':
                startDate = moment().subtract(90, 'days');
                break;
            case '1y':
                startDate = moment().subtract(1, 'year');
                break;
            default:
                startDate = moment().subtract(30, 'days');
        }

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };
    }

    static getPreviousPeriod(startDate, endDate) {
        const start = moment(startDate);
        const end = moment(endDate);
        const duration = end.diff(start);

        const previousEnd = moment(start);
        const previousStart = moment(start).subtract(duration);

        return {
            startDate: previousStart.toISOString(),
            endDate: previousEnd.toISOString()
        };
    }

    /**
     * Genera report CSV per export
     */
    static async generateCSVReport(type, filters = {}) {
        try {
            let query = '';
            let filename = '';
            let values = [];

            switch (type) {
                case 'bookings':
                    query = `
                        SELECT 
                            b.id,
                            b.created_at,
                            b.start_date,
                            b.end_date,
                            b.status,
                            b.total_price,
                            u.email as user_email,
                            u.first_name,
                            u.last_name,
                            s.name as space_name,
                            s.location
                        FROM bookings b
                        JOIN users u ON b.user_id = u.id
                        JOIN spaces s ON b.space_id = s.id
                        WHERE b.deleted_at IS NULL
                    `;
                    filename = 'bookings_report.csv';

                    if (filters.startDate && filters.endDate) {
                        query += ` AND b.created_at >= $1 AND b.created_at <= $2`;
                        values = [filters.startDate, filters.endDate];
                    }

                    query += ` ORDER BY b.created_at DESC`;

                    break;

                case 'payments':
                    query = `
                        SELECT 
                            p.id,
                            p.created_at,
                            p.amount,
                            p.currency,
                            p.status,
                            p.stripe_payment_intent_id,
                            b.id as booking_id,
                            u.email as user_email,
                            s.name as space_name
                        FROM payments p
                        JOIN bookings b ON p.booking_id = b.id
                        JOIN users u ON b.user_id = u.id
                        JOIN spaces s ON b.space_id = s.id
                        WHERE p.deleted_at IS NULL
                    `;
                    filename = 'payments_report.csv';

                    if (filters.startDate && filters.endDate) {
                        query += ` AND p.created_at >= $1 AND p.created_at <= $2`;
                        values = [filters.startDate, filters.endDate];
                    }

                    query += ` ORDER BY p.created_at DESC`;

                    break;

                case 'users':
                    query = `
                        SELECT 
                            u.id,
                            u.email,
                            u.first_name,
                            u.last_name,
                            u.role,
                            u.created_at,
                            COUNT(b.id) as total_bookings,
                            COALESCE(SUM(p.amount), 0) as total_spent
                        FROM users u
                        LEFT JOIN bookings b ON u.id = b.user_id AND b.deleted_at IS NULL
                        LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'completed'
                        WHERE u.deleted_at IS NULL
                        GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.created_at
                        ORDER BY u.created_at DESC
                    `;
                    filename = 'users_report.csv';
                    break;

                case 'spaces':
                    query = `
                        SELECT 
                            s.id,
                            s.name,
                            s.location,
                            s.capacity,
                            s.price_per_hour,
                            s.created_at,
                            COUNT(b.id) as total_bookings,
                            COALESCE(SUM(p.amount), 0) as total_revenue
                        FROM spaces s
                        LEFT JOIN bookings b ON s.id = b.space_id AND b.deleted_at IS NULL
                        LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'completed'
                        WHERE s.deleted_at IS NULL
                        GROUP BY s.id, s.name, s.location, s.capacity, s.price_per_hour, s.created_at
                        ORDER BY total_revenue DESC
                    `;
                    filename = 'spaces_report.csv';
                    break;

                default:
                    throw new Error('Report type not supported');
            }

            const result = await db.query(query, values);

            return {
                data: result.rows,
                filename,
                headers: Object.keys(result.rows[0] || {})
            };
        } catch (error) {
            logger.error('Error generating CSV report:', error);
            throw error;
        }
    }
}

module.exports = AnalyticsService;