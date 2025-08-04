// api/src/services/emailService.js (Updated Logger Path)
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        this.transporter = this.createTransporter();
    }

    createTransporter() {
        // In sviluppo: usa mock transporter
        if (process.env.NODE_ENV === 'development') {
            return {
                sendMail: async (mailOptions) => {
                    logger.info('📧 EMAIL MOCK - Message would be sent:', {
                        to: mailOptions.to,
                        subject: mailOptions.subject,
                        preview: mailOptions.html ? mailOptions.html.substring(0, 100) + '...' : 'No HTML content'
                    });
                    return { messageId: 'mock-message-id-' + Date.now() };
                }
            };
        }

        // In produzione: usa servizio email reale
        return nodemailer.createTransporter({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    /**
     * Invia email di benvenuto
     */
    async sendWelcomeEmail(user) {
        const html = this.getWelcomeTemplate(user);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: '🎉 Benvenuto in CoWorkSpace!',
            html: html
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Welcome email sent to ${user.email}`);
            return result;
        } catch (error) {
            logger.error('Error sending welcome email:', error);
            throw error;
        }
    }

    /**
     * Invia email di conferma prenotazione
     */
    async sendBookingConfirmation(user, booking) {
        const html = this.getBookingConfirmationTemplate(user, booking);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: `✅ Prenotazione Confermata - ${booking.space_name}`,
            html: html
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Booking confirmation sent to ${user.email} for booking ${booking.id}`);
            return result;
        } catch (error) {
            logger.error('Error sending booking confirmation:', error);
            throw error;
        }
    }

    /**
     * Invia email di promemoria prenotazione
     */
    async sendBookingReminder(user, booking, hoursAhead = 24) {
        const html = this.getBookingReminderTemplate(user, booking, hoursAhead);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: `⏰ Promemoria: La tua prenotazione inizia tra ${hoursAhead} ore`,
            html: html
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Booking reminder sent to ${user.email} for booking ${booking.id}`);
            return result;
        } catch (error) {
            logger.error('Error sending booking reminder:', error);
            throw error;
        }
    }

    /**
     * Invia email di fallimento pagamento
     */
    async sendPaymentFailed(user, booking) {
        const html = this.getPaymentFailedTemplate(user, booking);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: `❌ Problema con il pagamento - ${booking.space_name}`,
            html: html
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Payment failed email sent to ${user.email} for booking ${booking.id}`);
            return result;
        } catch (error) {
            logger.error('Error sending payment failed email:', error);
            throw error;
        }
    }

    /**
     * Invia email di cancellazione prenotazione
     */
    async sendBookingCancellation(user, booking, refundAmount = null) {
        const html = this.getBookingCancellationTemplate(user, booking, refundAmount);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: `🔄 Prenotazione Cancellata - ${booking.space_name}`,
            html: html
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Booking cancellation sent to ${user.email} for booking ${booking.id}`);
            return result;
        } catch (error) {
            logger.error('Error sending booking cancellation:', error);
            throw error;
        }
    }

    /**
     * Invia notifica dispute agli admin
     */
    async sendDisputeNotification(disputeData) {
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
        const html = this.getDisputeNotificationTemplate(disputeData);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: adminEmail,
            subject: `🚨 DISPUTA PAGAMENTO - Azione Richiesta`,
            html: html
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Dispute notification sent to admin for charge ${disputeData.charge_id}`);
            return result;
        } catch (error) {
            logger.error('Error sending dispute notification:', error);
            throw error;
        }
    }

    /**
     * Invia reset password
     */
    async sendPasswordReset(user, resetToken) {
        const html = this.getPasswordResetTemplate(user, resetToken);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: '🔐 Reset Password - CoWorkSpace',
            html: html
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            logger.info(`Password reset sent to ${user.email}`);
            return result;
        } catch (error) {
            logger.error('Error sending password reset:', error);
            throw error;
        }
    }

    // =============================================
    // TEMPLATE HTML
    // =============================================

    getWelcomeTemplate(user) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Benvenuto in CoWorkSpace</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Benvenuto in CoWorkSpace!</h1>
                    <p>Ciao ${user.first_name}, benvenuto nella community</p>
                </div>
                <div class="content">
                    <h2>Il tuo account è stato creato con successo!</h2>
                    <p>Grazie per esserti unito a CoWorkSpace. Ora puoi iniziare a prenotare i migliori spazi di coworking della tua città.</p>
                    
                    <h3>Cosa puoi fare ora:</h3>
                    <ul>
                        <li>🔍 Esplorare gli spazi disponibili</li>
                        <li>📅 Prenotare il tuo primo spazio</li>
                        <li>💳 Gestire i tuoi pagamenti</li>
                        <li>⭐ Lasciare recensioni</li>
                    </ul>
                    
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Vai alla Dashboard</a>
                    </div>
                    
                    <p>Se hai domande, non esitare a contattarci. Siamo qui per aiutarti!</p>
                </div>
                <div class="footer">
                    <p>CoWorkSpace Team<br>
                    <small>Hai ricevuto questa email perché ti sei registrato su CoWorkSpace</small></p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getBookingConfirmationTemplate(user, booking) {
        const startDate = new Date(booking.start_date).toLocaleDateString('it-IT');
        const endDate = new Date(booking.end_date).toLocaleDateString('it-IT');
        const startTime = new Date(booking.start_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(booking.end_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Prenotazione Confermata</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
                .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
                .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Prenotazione Confermata!</h1>
                    <p>Il pagamento è stato elaborato con successo</p>
                </div>
                <div class="content">
                    <h2>Ciao ${user.first_name},</h2>
                    <p>La tua prenotazione è stata confermata! Ecco i dettagli:</p>
                    
                    <div class="booking-details">
                        <h3>📍 ${booking.space_name}</h3>
                        <div class="detail-row">
                            <strong>Data:</strong>
                            <span>${startDate === endDate ? startDate : `${startDate} - ${endDate}`}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Orario:</strong>
                            <span>${startTime} - ${endTime}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Prezzo Totale:</strong>
                            <span>€${booking.total_price?.toFixed(2) || '0.00'}</span>
                        </div>
                        ${booking.booking_id ? `
                        <div class="detail-row">
                            <strong>ID Prenotazione:</strong>
                            <span>#${booking.id || booking.booking_id}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <h3>📝 Cosa devi sapere:</h3>
                    <ul>
                        <li>Porta un documento d'identità valido</li>
                        <li>Arriva 10 minuti prima dell'orario prenotato</li>
                        <li>Rispetta le regole dello spazio</li>
                        <li>Goditi la tua esperienza di coworking!</li>
                    </ul>
                    
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL}/bookings/${booking.id}" class="button">Visualizza Prenotazione</a>
                    </div>
                </div>
                <div class="footer">
                    <p>Grazie per aver scelto CoWorkSpace!<br>
                    <small>ID Prenotazione: ${booking.id}</small></p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getBookingReminderTemplate(user, booking, hoursAhead) {
        const startDate = new Date(booking.start_date).toLocaleDateString('it-IT');
        const startTime = new Date(booking.start_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Promemoria Prenotazione</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ffc107 0%, #ff8c00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .reminder-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .button { display: inline-block; background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⏰ Promemoria Prenotazione</h1>
                    <p>La tua prenotazione inizia tra ${hoursAhead} ore!</p>
                </div>
                <div class="content">
                    <h2>Ciao ${user.first_name},</h2>
                    <p>Questo è un promemoria gentile per la tua prossima prenotazione:</p>
                    
                    <div class="reminder-box">
                        <h3>📍 ${booking.space_name}</h3>
                        <p><strong>Data:</strong> ${startDate}<br>
                        <strong>Orario di inizio:</strong> ${startTime}</p>
                        ${booking.location ? `<p><strong>Indirizzo:</strong> ${booking.location}</p>` : ''}
                    </div>
                    
                    <h3>✅ Preparati per il tuo arrivo:</h3>
                    <ul>
                        <li>Documento d'identità</li>
                        <li>Laptop e caricabatterie</li>
                        <li>Cuffie (se necessarie)</li>
                        <li>Qualsiasi materiale di lavoro</li>
                    </ul>
                    
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL}/bookings/${booking.id}" class="button">Dettagli Prenotazione</a>
                    </div>
                    
                    <p><small>💡 <strong>Suggerimento:</strong> Se hai bisogno di modificare o cancellare la prenotazione, fallo almeno 2 ore prima dell'orario di inizio.</small></p>
                </div>
                <div class="footer">
                    <p>Ci vediamo presto!<br>
                    <small>CoWorkSpace Team</small></p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getPaymentFailedTemplate(user, booking) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Problema con il Pagamento</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .error-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>❌ Problema con il Pagamento</h1>
                    <p>La tua prenotazione richiede attenzione</p>
                </div>
                <div class="content">
                    <h2>Ciao ${user.first_name},</h2>
                    <p>Abbiamo riscontrato un problema con il pagamento per la tua prenotazione:</p>
                    
                    <div class="error-box">
                        <h3>📍 ${booking.space_name}</h3>
                        <p><strong>Stato:</strong> Pagamento Fallito<br>
                        <strong>ID Prenotazione:</strong> #${booking.id}</p>
                    </div>
                    
                    <h3>🔧 Cosa puoi fare:</h3>
                    <ul>
                        <li>Verifica i dettagli della tua carta di credito</li>
                        <li>Assicurati di avere fondi sufficienti</li>
                        <li>Prova con un metodo di pagamento diverso</li>
                        <li>Contatta la tua banca se il problema persiste</li>
                    </ul>
                    
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL}/bookings/${booking.id}/retry-payment" class="button">Riprova Pagamento</a>
                    </div>
                    
                    <p><strong>⚠️ Attenzione:</strong> La tua prenotazione verrà cancellata automaticamente se il pagamento non viene completato entro 24 ore.</p>
                </div>
                <div class="footer">
                    <p>Bisogno di aiuto? Contattaci!<br>
                    <small>Email: support@coworkspace.com</small></p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getBookingCancellationTemplate(user, booking, refundAmount) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Prenotazione Cancellata</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .cancellation-box { background: #e2e3e5; border: 1px solid #d6d8db; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .refund-box { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 15px 0; }
                .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔄 Prenotazione Cancellata</h1>
                    <p>La cancellazione è stata elaborata</p>
                </div>
                <div class="content">
                    <h2>Ciao ${user.first_name},</h2>
                    <p>La tua prenotazione è stata cancellata con successo:</p>
                    
                    <div class="cancellation-box">
                        <h3>📍 ${booking.space_name}</h3>
                        <p><strong>ID Prenotazione:</strong> #${booking.id}<br>
                        <strong>Stato:</strong> Cancellata<br>
                        <strong>Data Cancellazione:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
                    </div>
                    
                    ${refundAmount ? `
                    <div class="refund-box">
                        <h3>💰 Informazioni Rimborso</h3>
                        <p><strong>Importo rimborsato:</strong> €${refundAmount.toFixed(2)}<br>
                        <strong>Metodo:</strong> Stesso metodo di pagamento<br>
                        <strong>Tempistiche:</strong> 3-5 giorni lavorativi</p>
                    </div>
                    ` : ''}
                    
                    <h3>📝 Cosa succede ora:</h3>
                    <ul>
                        <li>La prenotazione è stata rimossa dal tuo calendario</li>
                        ${refundAmount ? '<li>Il rimborso sarà elaborato automaticamente</li>' : ''}
                        <li>Puoi prenotare nuovamente quando vuoi</li>
                        <li>Riceverai un'email di conferma del rimborso</li>
                    </ul>
                    
                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL}/spaces" class="button">Esplora Altri Spazi</a>
                    </div>
                    
                    <p>Ci dispiace che tu abbia dovuto cancellare. Speriamo di rivederti presto!</p>
                </div>
                <div class="footer">
                    <p>Grazie per aver usato CoWorkSpace<br>
                    <small>Per assistenza: support@coworkspace.com</small></p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getDisputeNotificationTemplate(disputeData) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>DISPUTA PAGAMENTO - Azione Richiesta</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #dc3545 0%, #a71d2a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .alert-box { background: #f8d7da; border: 2px solid #dc3545; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚨 DISPUTA PAGAMENTO</h1>
                    <p>Azione immediata richiesta</p>
                </div>
                <div class="content">
                    <h2>Caro Amministratore,</h2>
                    <p>È stata aperta una disputa su Stripe per un pagamento. Ecco i dettagli:</p>
                    
                    <div class="alert-box">
                        <h3>⚠️ Dettagli Disputa</h3>
                        <p><strong>Charge ID:</strong> ${disputeData.charge_id}<br>
                        <strong>Importo:</strong> €${disputeData.amount?.toFixed(2) || '0.00'}<br>
                        <strong>Motivo:</strong> ${disputeData.reason}<br>
                        <strong>Data:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
                    </div>
                    
                    <h3>🔧 Azioni da intraprendere:</h3>
                    <ul>
                        <li>Accedi alla dashboard Stripe</li>
                        <li>Esamina i dettagli della disputa</li>
                        <li>Raccogli documentazione di supporto</li>
                        <li>Rispendi entro i termini stabiliti</li>
                    </ul>
                    
                    <div style="text-align: center;">
                        <a href="https://dashboard.stripe.com/disputes" class="button">Vai a Stripe Dashboard</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getPasswordResetTemplate(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Reset Password</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .reset-box { background: #cce5ff; border: 1px solid #99d1ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
                .token { font-family: monospace; font-size: 16px; background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Reset Password</h1>
                    <p>Richiesta di reset password</p>
                </div>
                <div class="content">
                    <h2>Ciao ${user.first_name},</h2>
                    <p>Hai richiesto il reset della tua password. Clicca sul pulsante qui sotto per impostare una nuova password:</p>
                    
                    <div style="text-align: center;">
                        <a href="${resetUrl}" class="button">Reset Password</a>
                    </div>
                    
                    <div class="reset-box">
                        <p><strong>⏰ Questo link è valido per 1 ora</strong></p>
                        <p>Se il pulsante non funziona, copia e incolla questo URL nel tuo browser:</p>
                        <div class="token">${resetUrl}</div>
                    </div>
                    
                    <p><strong>🔒 Sicurezza:</strong> Se non hai richiesto questo reset, ignora questa email. La tua password rimarrà invariata.</p>
                </div>
                <div class="footer">
                    <p>CoWorkSpace Security Team<br>
                    <small>Non rispondere a questa email</small></p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = new EmailService();