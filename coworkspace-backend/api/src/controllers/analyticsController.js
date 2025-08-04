// api/src/controllers/analyticsController.js
const AnalyticsService = require('../services/analyticsService');
const logger = require('../config/logger');

class AnalyticsController {
    /**
     * Dashboard admin - Statistiche generali
     */
    static async getAdminDashboard(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso riservato agli amministratori'
                });
            }

            const { timeRange = '30d' } = req.query;
            const stats = await AnalyticsService.getDashboardStats(timeRange);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error getting admin dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle statistiche dashboard'
            });
        }
    }

    /**
     * Dashboard manager - Statistiche spazi
     */
    static async getManagerDashboard(req, res) {
        try {
            if (!['admin', 'manager'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso riservato a manager e amministratori'
                });
            }

            const { timeRange = '30d', spaceIds } = req.query;
            const managerId = req.user.role === 'admin' ? null : req.user.id;

            // Converte spaceIds da stringa a array se fornito
            const spaceIdsArray = spaceIds ? spaceIds.split(',') : [];

            const stats = await AnalyticsService.getSpaceManagerStats(
                managerId,
                spaceIdsArray,
                timeRange
            );

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error getting manager dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle statistiche manager'
            });
        }
    }

    /**
     * Dashboard utente - Statistiche personali
     */
    static async getUserDashboard(req, res) {
        try {
            const { timeRange = '30d' } = req.query;
            const userId = req.params.userId || req.user.id;

            // Gli utenti normali possono vedere solo le proprie stats
            if (req.user.role === 'user' && userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Puoi visualizzare solo le tue statistiche'
                });
            }

            const stats = await AnalyticsService.getUserStats(userId, timeRange);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error getting user dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle statistiche utente'
            });
        }
    }

    /**
     * Esporta report in formato CSV
     */
    static async exportReport(req, res) {
        try {
            if (!['admin', 'manager'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso negato'
                });
            }

            const { type, startDate, endDate, spaceIds } = req.query;

            if (!type || !['bookings', 'payments', 'users', 'spaces'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo di report non valido. Usa: bookings, payments, users, spaces'
                });
            }

            const filters = {
                startDate,
                endDate,
                spaceIds: spaceIds ? spaceIds.split(',') : []
            };

            const report = await AnalyticsService.generateCSVReport(type, filters);

            // Genera CSV
            const csvContent = [
                report.headers.join(','),
                ...report.data.map(row =>
                    report.headers.map(header => {
                        const value = row[header];
                        // Escape delle virgole e virgolette nei valori
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value || '';
                    }).join(',')
                )
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
            res.send(csvContent);

        } catch (error) {
            logger.error('Error exporting report:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nell\'esportazione del report'
            });
        }
    }

    /**
     * Statistiche real-time per dashboard live
     */
    static async getLiveStats(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso riservato agli amministratori'
                });
            }

            // Statistiche degli ultimi 5 minuti
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const now = new Date();

            const stats = await AnalyticsService.getDashboardStats('7d');

            // Aggiungi metriche real-time
            const liveStats = {
                ...stats,
                realTime: {
                    timestamp: now.toISOString(),
                    onlineUsers: Math.floor(Math.random() * 50) + 10, // Simulato per demo
                    activeBookings: stats.general.bookings.new || 0,
                    recentPayments: stats.general.revenue.payments || 0
                }
            };

            res.json({
                success: true,
                data: liveStats
            });

        } catch (error) {
            logger.error('Error getting live stats:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle statistiche live'
            });
        }
    }

    /**
     * Confronto performance tra periodi
     */
    static async getPerformanceComparison(req, res) {
        try {
            if (!['admin', 'manager'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso negato'
                });
            }

            const { timeRange = '30d', compareWith = 'previous' } = req.query;

            const currentStats = await AnalyticsService.getDashboardStats(timeRange);

            // Calcola il periodo di confronto
            let comparisonTimeRange;
            switch (compareWith) {
                case 'previous':
                    comparisonTimeRange = timeRange; // Stesso periodo ma spostato indietro
                    break;
                case 'lastYear':
                    comparisonTimeRange = '1y';
                    break;
                default:
                    comparisonTimeRange = '30d';
            }

            // Per semplicità, usiamo le stesse stats come comparazione
            // In una implementazione reale, calcoleresti le stats del periodo precedente
            const comparisonStats = await AnalyticsService.getDashboardStats(comparisonTimeRange);

            const comparison = {
                current: currentStats,
                comparison: comparisonStats,
                metrics: {
                    revenueGrowth: this.calculateGrowth(
                        currentStats.general.revenue.total,
                        comparisonStats.general.revenue.total
                    ),
                    bookingGrowth: this.calculateGrowth(
                        currentStats.general.bookings.new,
                        comparisonStats.general.bookings.new
                    ),
                    userGrowth: this.calculateGrowth(
                        currentStats.general.users.new,
                        comparisonStats.general.users.new
                    )
                }
            };

            res.json({
                success: true,
                data: comparison
            });

        } catch (error) {
            logger.error('Error getting performance comparison:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nel confronto delle performance'
            });
        }
    }

    /**
     * Statistiche per widget specifici
     */
    static async getWidgetData(req, res) {
        try {
            const { widget, timeRange = '30d' } = req.params;

            let data;
            switch (widget) {
                case 'revenue-chart':
                    const revenueStats = await AnalyticsService.getDashboardStats(timeRange);
                    data = revenueStats.revenue;
                    break;

                case 'booking-trends':
                    const bookingStats = await AnalyticsService.getDashboardStats(timeRange);
                    data = bookingStats.bookings;
                    break;

                case 'top-spaces':
                    const topSpacesStats = await AnalyticsService.getDashboardStats(timeRange);
                    data = topSpacesStats.topSpaces;
                    break;

                case 'user-growth':
                    const userStats = await AnalyticsService.getDashboardStats(timeRange);
                    data = userStats.userGrowth;
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Widget non supportato'
                    });
            }

            res.json({
                success: true,
                data: {
                    widget,
                    timeRange,
                    data
                }
            });

        } catch (error) {
            logger.error(`Error getting widget data for ${widget}:`, error);
            res.status(500).json({
                success: false,
                message: 'Errore nel recupero dei dati del widget'
            });
        }
    }

    /**
     * Previsioni e trend analysis
     */
    static async getTrendAnalysis(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso riservato agli amministratori'
                });
            }

            const { metric = 'revenue', timeRange = '90d' } = req.query;

            const stats = await AnalyticsService.getDashboardStats(timeRange);

            // Analisi semplificata dei trend
            let trendData;
            switch (metric) {
                case 'revenue':
                    trendData = stats.revenue.dailyRevenue;
                    break;
                case 'bookings':
                    trendData = stats.bookings;
                    break;
                default:
                    trendData = stats.revenue.dailyRevenue;
            }

            // Calcolo trend semplificato (media mobile)
            const trendAnalysis = this.calculateTrend(trendData);

            res.json({
                success: true,
                data: {
                    metric,
                    timeRange,
                    trend: trendAnalysis.direction,
                    confidence: trendAnalysis.confidence,
                    prediction: trendAnalysis.prediction,
                    data: trendData
                }
            });

        } catch (error) {
            logger.error('Error getting trend analysis:', error);
            res.status(500).json({
                success: false,
                message: 'Errore nell\'analisi dei trend'
            });
        }
    }

    // =============================================
    // METODI UTILITY PRIVATI
    // =============================================

    static calculateGrowth(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100 * 100) / 100;
    }

    static calculateTrend(data) {
        if (!data || data.length < 3) {
            return {
                direction: 'stable',
                confidence: 0,
                prediction: null
            };
        }

        // Calcolo della tendenza usando regressione lineare semplificata
        const values = data.map(d => d.revenue || d.total || 0);
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

        let direction = 'stable';
        let confidence = 0;

        if (Math.abs(slope) > 0.1) {
            direction = slope > 0 ? 'growing' : 'declining';
            confidence = Math.min(Math.abs(slope) * 50, 95);
        }

        // Predizione semplice per il prossimo periodo
        const lastValue = values[values.length - 1];
        const prediction = lastValue + slope;

        return {
            direction,
            confidence: Math.round(confidence),
            prediction: Math.round(prediction * 100) / 100
        };
    }
}

module.exports = AnalyticsController;