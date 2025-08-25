// api/src/services/analyticsService.js - Query Database REALI
const db = require('../config/database');
const moment = require('moment');
const logger = require('../utils/logger');

class AnalyticsService {
    /**
     * Statistiche dashboard admin - DATI REALI DAL DATABASE
     */
    static async getDashboardStats(timeRange = '30d') {
        const days = parseInt(timeRange.replace('d', ''));
        const startDate = moment().subtract(days, 'days').startOf('day').toISOString();
        const endDate = moment().endOf('day').toISOString();

        try {
            // Query parallele per performance migliori
            const [
                generalStats,
                revenueStats,
                userGrowth,
                topSpaces,
                dailyRevenue
            ] = await Promise.all([
                this.getGeneralStats(startDate, endDate),
                this.getRevenueStats(startDate, endDate),
                this.getUserGrowthStats(startDate, endDate),
                this.getTopSpaces(startDate, endDate),
                this.getDailyRevenue(startDate, endDate)
            ]);

            return {
                timeRange,
                period: {
                    startDate,
                    endDate
                },
                general: generalStats,
                revenue: {
                    dailyRevenue,
                    totals: revenueStats
                },
                topSpaces,
                userGrowth
            };

        } catch (error) {
            logger.error('Error getting dashboard stats:', error);
            throw error;
        }
    }

    /**
     * Statistiche generali (utenti, spazi, prenotazioni)
     */
    static async getGeneralStats(startDate, endDate) {
        const query = `
            SELECT 
                -- Utenti
                (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
                (SELECT COUNT(*) FROM users WHERE created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL) as new_users,
                
                -- Spazi
                (SELECT COUNT(*) FROM spaces WHERE deleted_at IS NULL) as total_spaces,
                
                -- Prenotazioni nel periodo
                (SELECT COUNT(*) FROM bookings WHERE created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL) as total_bookings,
                (SELECT COUNT(*) FROM bookings WHERE created_at >= $1 AND created_at <= $2 AND status = 'confirmed' AND deleted_at IS NULL) as confirmed_bookings,
                (SELECT COUNT(*) FROM bookings WHERE created_at >= $1 AND created_at <= $2 AND status = 'cancelled' AND deleted_at IS NULL) as cancelled_bookings,
                
                -- Revenue nel periodo
                (SELECT COALESCE(SUM(amount), 0) FROM payments p
                 JOIN bookings b ON p.booking_id = b.id 
                 WHERE p.status = 'completed' AND p.created_at >= $1 AND p.created_at <= $2 AND p.deleted_at IS NULL) as total_revenue,
                
                (SELECT COUNT(*) FROM payments p
                 JOIN bookings b ON p.booking_id = b.id 
                 WHERE p.status = 'completed' AND p.created_at >= $1 AND p.created_at <= $2 AND p.deleted_at IS NULL) as total_payments
        `;

        const result = await db.query(query, [startDate, endDate]);
        const stats = result.rows[0];

        const totalBookings = parseInt(stats.total_bookings);
        const confirmedBookings = parseInt(stats.confirmed_bookings);
        const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

        const totalRevenue = parseFloat(stats.total_revenue);
        const totalPayments = parseInt(stats.total_payments);
        const averageTransaction = totalPayments > 0 ? totalRevenue / totalPayments : 0;

        return {
            users: {
                total: parseInt(stats.total_users),
                new: parseInt(stats.new_users)
            },
            spaces: {
                total: parseInt(stats.total_spaces)
            },
            bookings: {
                total: totalBookings,
                new: totalBookings, // Nel periodo selezionato
                confirmed: confirmedBookings,
                conversionRate: Math.round(conversionRate * 100) / 100
            },
            revenue: {
                total: totalRevenue,
                payments: totalPayments,
                averageTransaction: Math.round(averageTransaction * 100) / 100
            }
        };
    }

    /**
     * Statistiche revenue con confronto periodo precedente
     */
    static async getRevenueStats(startDate, endDate) {
        const days = moment(endDate).diff(moment(startDate), 'days');
        const prevStartDate = moment(startDate).subtract(days, 'days').toISOString();
        const prevEndDate = moment(startDate).subtract(1, 'day').endOf('day').toISOString();

        const query = `
            SELECT 
                -- Revenue periodo corrente
                (SELECT COALESCE(SUM(amount), 0) FROM payments p
                 JOIN bookings b ON p.booking_id = b.id 
                 WHERE p.status = 'completed' AND p.created_at >= $1 AND p.created_at <= $2 AND p.deleted_at IS NULL) as current_revenue,
                
                -- Revenue periodo precedente
                (SELECT COALESCE(SUM(amount), 0) FROM payments p
                 JOIN bookings b ON p.booking_id = b.id 
                 WHERE p.status = 'completed' AND p.created_at >= $3 AND p.created_at <= $4 AND p.deleted_at IS NULL) as previous_revenue
        `;

        const result = await db.query(query, [startDate, endDate, prevStartDate, prevEndDate]);
        const stats = result.rows[0];

        const currentRevenue = parseFloat(stats.current_revenue);
        const previousRevenue = parseFloat(stats.previous_revenue);
        const growthRate = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        return {
            current: currentRevenue,
            previous: previousRevenue,
            growthRate: Math.round(growthRate * 100) / 100
        };
    }

    /**
     * Revenue giornaliero per grafici
     */
    static async getDailyRevenue(startDate, endDate) {
        const query = `
            SELECT 
                DATE(p.created_at) as date,
                COALESCE(SUM(p.amount), 0) as revenue,
                COUNT(p.id) as payments
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            WHERE p.status = 'completed' 
              AND p.created_at >= $1 
              AND p.created_at <= $2 
              AND p.deleted_at IS NULL
            GROUP BY DATE(p.created_at)
            ORDER BY date ASC
        `;

        const result = await db.query(query, [startDate, endDate]);

        return result.rows.map(row => ({
            date: row.date,
            revenue: parseFloat(row.revenue),
            payments: parseInt(row.payments)
        }));
    }

    /**
     * Crescita utenti nel periodo
     */
    static async getUserGrowthStats(startDate, endDate) {
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

    /**
     * Top spazi per revenue e prenotazioni
     */
    static async getTopSpaces(startDate, endDate, limit = 5) {
        const query = `
            SELECT 
                s.id,
                s.name,
                s.location,
                COALESCE(SUM(p.amount), 0) as revenue,
                COUNT(DISTINCT b.id) as total_bookings,
                COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) as confirmed_bookings
            FROM spaces s
            LEFT JOIN bookings b ON s.id = b.space_id 
                AND b.created_at >= $1 
                AND b.created_at <= $2 
                AND b.deleted_at IS NULL
            LEFT JOIN payments p ON b.id = p.booking_id 
                AND p.status = 'completed' 
                AND p.deleted_at IS NULL
            WHERE s.deleted_at IS NULL
            GROUP BY s.id, s.name, s.location
            ORDER BY revenue DESC, total_bookings DESC
            LIMIT $3
        `;

        const result = await db.query(query, [startDate, endDate, limit]);

        return result.rows.map(row => ({
            id: row.id.toString(),
            name: row.name,
            location: row.location,
            revenue: parseFloat(row.revenue),
            bookings: {
                total: parseInt(row.total_bookings),
                confirmed: parseInt(row.confirmed_bookings)
            }
        }));
    }

    /**
     * Statistiche manager per spazi specifici
     */
    static async getManagerStats(managerId, spaceIds = null, startDate, endDate) {
        let spaceFilter = '';
        let params = [managerId, startDate, endDate];

        if (spaceIds && spaceIds.length > 0) {
            const placeholders = spaceIds.map((_, i) => `$${i + 4}`).join(',');
            spaceFilter = `AND s.id IN (${placeholders})`;
            params = [...params, ...spaceIds];
        }

        const query = `
            SELECT 
                COUNT(DISTINCT b.id) as total_bookings,
                COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) as confirmed_bookings,
                COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) as cancelled_bookings,
                COALESCE(SUM(p.amount), 0) as revenue,
                COUNT(DISTINCT b.user_id) as customers,
                COALESCE(AVG(r.rating), 0) as avg_rating
            FROM spaces s
            LEFT JOIN bookings b ON s.id = b.space_id 
                AND b.created_at >= $2 
                AND b.created_at <= $3 
                AND b.deleted_at IS NULL
            LEFT JOIN payments p ON b.id = p.booking_id 
                AND p.status = 'completed' 
                AND p.deleted_at IS NULL
            LEFT JOIN reviews r ON b.id = r.booking_id 
                AND r.deleted_at IS NULL
            WHERE s.manager_id = $1 
              AND s.deleted_at IS NULL
              ${spaceFilter}
        `;

        const result = await db.query(query, params);
        const stats = result.rows[0];

        return {
            general: {
                bookings: {
                    total: parseInt(stats.total_bookings),
                    confirmed: parseInt(stats.confirmed_bookings),
                    cancelled: parseInt(stats.cancelled_bookings)
                },
                revenue: parseFloat(stats.revenue),
                customers: parseInt(stats.customers),
                rating: Math.round(parseFloat(stats.avg_rating) * 10) / 10
            }
        };
    }

    /**
     * Statistiche utente
     */
    static async getUserStats(userId, startDate, endDate) {
        const query = `
            SELECT 
                -- Prenotazioni
                COUNT(DISTINCT b.id) as total_bookings,
                COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) as confirmed_bookings,
                COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) as cancelled_bookings,
                COALESCE(SUM(
                    EXTRACT(EPOCH FROM (b.end_date - b.start_date)) / 3600
                ), 0) as total_hours,
                
                -- Spese
                COALESCE(SUM(p.amount), 0) as total_spent,
                COUNT(DISTINCT p.id) as total_payments,
                COALESCE(AVG(p.amount), 0) as avg_payment
            FROM bookings b
            LEFT JOIN payments p ON b.id = p.booking_id 
                AND p.status = 'completed' 
                AND p.deleted_at IS NULL
            WHERE b.user_id = $1 
              AND b.created_at >= $2 
              AND b.created_at <= $3 
              AND b.deleted_at IS NULL
        `;

        const result = await db.query(query, [userId, startDate, endDate]);
        const stats = result.rows[0];

        return {
            bookings: {
                total: parseInt(stats.total_bookings),
                confirmed: parseInt(stats.confirmed_bookings),
                cancelled: parseInt(stats.cancelled_bookings),
                totalHours: parseFloat(stats.total_hours)
            },
            spending: {
                total: parseFloat(stats.total_spent),
                payments: parseInt(stats.total_payments),
                average: Math.round(parseFloat(stats.avg_payment) * 100) / 100
            }
        };
    }
}

module.exports = AnalyticsService;