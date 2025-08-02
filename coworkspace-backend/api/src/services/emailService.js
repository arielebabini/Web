// src/services/emailService.js - Servizio email CORRETTO
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.init();
    }

    init() {
        try {
            // Controlla se le credenziali email sono REALMENTE configurate
            const hasValidEmailConfig = process.env.EMAIL_USER &&
                process.env.EMAIL_PASSWORD &&
                process.env.EMAIL_USER.trim() !== '' &&
                process.env.EMAIL_PASSWORD.trim() !== '' &&
                !process.env.EMAIL_USER.includes('your-email') && // Evita placeholder
                !process.env.EMAIL_PASSWORD.includes('your-app-password'); // Evita placeholder

            // Se siamo in development OPPURE non abbiamo configurazione email valida, usa mock
            if (process.env.NODE_ENV !== 'production' || !hasValidEmailConfig) {
                this.initMockMode();
                return;
            }

            // Configurazione reale per produzione CON credenziali valide
            this.transporter = nodemailer.createTransporter({
                service: process.env.EMAIL_SERVICE || 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                },
                pool: true,
                maxConnections: 5,
                maxMessages: 100
            });

            // Verifica configurazione SENZA tentare connessione immediata
            this.transporter.verify((error, success) => {
                if (error) {
                    logger.error('Errore configurazione email:', error);
                    this.initMockMode();
                } else {
                    logger.info('✅ Email service configured successfully');
                    this.isConfigured = true;
                }
            });

        } catch (error) {
            logger.error('Errore inizializzazione servizio email:', error);
            this.initMockMode();
        }
    }

    initMockMode() {
        logger.info('📧 EmailService: Modalità MOCK attivata (sviluppo/testing)');

        // Crea un transporter fittizio per development (non tenta connessioni reali)
        this.transporter = {
            sendMail: async (mailOptions) => {
                // Simula invio senza connessioni esterne
                return {
                    messageId: 'mock-message-id-' + Date.now(),
                    response: 'Mock email sent successfully',
                    mock: true,
                    to: mailOptions.to,
                    subject: mailOptions.subject
                };
            },
            verify: (callback) => {
                if (callback) callback(null, true);
                return Promise.resolve(true);
            },
            close: () => {
                // Niente da chiudere in mock mode
            }
        };

        this.isConfigured = false; // Mock mode
    }

    /**
     * Invia email generica
     */
    async sendEmail(to, subject, htmlContent, textContent = null) {
        try {
            if (!this.transporter) {
                throw new Error('Email service not initialized');
            }

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@coworkspace.com',
                to,
                subject,
                html: htmlContent,
                text: textContent || this.stripHtml(htmlContent)
            };

            const result = await this.transporter.sendMail(mailOptions);

            if (result.mock) {
                logger.info(`📧 [MOCK] Email simulata inviata a ${to}: ${subject}`);
            } else {
                logger.info(`📧 Email inviata a ${to}: ${subject}`);
            }

            return result;

        } catch (error) {
            logger.error('Errore invio email:', error);

            // In development, non bloccare l'applicazione per errori email
            if (process.env.NODE_ENV !== 'production') {
                logger.info(`📧 [MOCK FALLBACK] Email fallback per ${to}: ${subject}`);
                return {
                    messageId: 'fallback-mock-' + Date.now(),
                    response: 'Fallback mock email',
                    mock: true,
                    error: error.message
                };
            }

            throw error;
        }
    }

    /**
     * Email di benvenuto
     */
    async sendWelcomeEmail(user) {
        const subject = '🏢 Benvenuto in CoWorkSpace!';
        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Benvenuto in CoWorkSpace!</h1>
            <p>Ciao ${user.firstName},</p>
            <p>Grazie per esserti registrato su CoWorkSpace. Il tuo account è stato creato con successo!</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Dettagli Account:</h3>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Nome:</strong> ${user.firstName} ${user.lastName}</p>
                <p><strong>Ruolo:</strong> ${user.role}</p>
                <p><strong>Modalità Email:</strong> ${this.isConfigured ?
            'Email reali' : 'Mock mode (sviluppo)'}</p>
            </div>

            ${!user.emailVerified ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>⚠️ Verifica Email:</strong></p>
                <p>Per completare la registrazione, verifica la tua email cliccando sul link che ti abbiamo inviato.</p>
            </div>
            ` : ''}

            <p>Puoi iniziare subito a esplorare i nostri spazi coworking e prenotare quello perfetto per te!</p>
            
            <div style="margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}" 
                   style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                   Accedi alla Dashboard
                </a>
            </div>

            <p>Se hai domande, non esitare a contattarci!</p>
            <p>Il team CoWorkSpace</p>
        </div>
        `;

        return await this.sendEmail(user.email, subject, htmlContent);
    }

    /**
     * Email di verifica account
     */
    async sendVerificationEmail(user, verificationToken) {
        const subject = '✅ Verifica il tuo account CoWorkSpace';
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}`;

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Verifica il tuo account</h1>
            <p>Ciao ${user.firstName},</p>
            <p>Per completare la registrazione su CoWorkSpace, devi verificare il tuo indirizzo email.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                   ✅ Verifica Account
                </a>
            </div>

            <p style="font-size: 14px; color: #666;">
                Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
                <a href="${verificationUrl}">${verificationUrl}</a>
            </p>

            <p style="font-size: 14px; color: #666;">
                Questo link scadrà tra 24 ore per motivi di sicurezza.
            </p>

            <p>Il team CoWorkSpace</p>
        </div>
        `;

        return await this.sendEmail(user.email, subject, htmlContent);
    }

    /**
     * Email di test per verificare configurazione
     */
    async sendTestEmail(to) {
        const subject = '🧪 Test Email CoWorkSpace';
        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Test Email</h1>
            <p>Questa è una email di test dal sistema CoWorkSpace.</p>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Informazioni Sistema:</h3>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <p><strong>Ambiente:</strong> ${process.env.NODE_ENV || 'development'}</p>
                <p><strong>Modalità Email:</strong> ${this.isConfigured ?
            'Email reali' : 'Mock mode'}</p>
            </div>

            <p>Se ricevi questa email, il servizio email funziona correttamente! ✅</p>
            <p>Il team CoWorkSpace</p>
        </div>
        `;

        return await this.sendEmail(to, subject, htmlContent);
    }

    /**
     * Email di prenotazione confermata
     */
    async sendBookingConfirmation(user, booking) {
        const subject = '✅ Prenotazione Confermata - CoWorkSpace';
        const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Prenotazione Confermata!</h1>
            <p>Ciao ${user.firstName},</p>
            <p>La tua prenotazione è stata confermata con successo!</p>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Dettagli Prenotazione:</h3>
                <p><strong>ID Prenotazione:</strong> ${booking.id}</p>
                <p><strong>Spazio:</strong> ${booking.spaceName}</p>
                <p><strong>Data:</strong> ${booking.date}</p>
                <p><strong>Orario:</strong> ${booking.startTime} - ${booking.endTime}</p>
                <p><strong>Prezzo:</strong> €${booking.totalPrice}</p>
            </div>

            <p>Ti aspettiamo! 🎉</p>
            <p>Il team CoWorkSpace</p>
        </div>
        `;

        return await this.sendEmail(user.email, subject, htmlContent);
    }

    /**
     * Utility: rimuove HTML tags
     */
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    /**
     * Verifica se il servizio è configurato
     */
    isReady() {
        return this.transporter !== null;
    }

    /**
     * Verifica se siamo in modalità mock
     */
    isMockMode() {
        return !this.isConfigured;
    }

    /**
     * Chiudi connessioni
     */
    async close() {
        if (this.transporter && this.isConfigured) {
            this.transporter.close();
            logger.info('Email service connections closed');
        }
    }
}

// Singleton instance
const emailService = new EmailService();

module.exports = emailService;