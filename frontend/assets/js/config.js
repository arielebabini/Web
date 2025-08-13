/**
 * CoWorkSpace - Configuration
 * Configurazione generale dell'applicazione
 */

window.Config = {
    // Informazioni applicazione
    app: {
        name: 'CoWorkSpace',
        version: '1.0.0',
        description: 'Piattaforma per la gestione di spazi coworking',
        environment: window.location.hostname === 'localhost' ? 'development' : 'production'
    },

    // API Configuration (per futuro backend)
    api: {
        baseUrl: window.location.hostname === 'localhost'
            ? 'http://localhost:3000/api'
            : 'https://api.coworkspace.it',
        timeout: 10000,
        retryAttempts: 3,
        endpoints: {
            auth: {
                login: '/auth/login',
                register: '/auth/register',
                logout: '/auth/logout',
                refresh: '/auth/refresh'
            },
            spaces: {
                list: '/spaces',
                search: '/spaces/search',
                detail: '/spaces/:id',
                book: '/spaces/:id/book'
            },
            bookings: {
                list: '/bookings',
                create: '/bookings',
                update: '/bookings/:id',
                cancel: '/bookings/:id/cancel'
            },
            users: {
                profile: '/users/profile',
                update: '/users/profile'
            }
        }
    },

    // UI Configuration
    ui: {
        theme: 'light',
        language: 'it-IT',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        notifications: {
            position: 'top-right',
            duration: 4000,
            maxVisible: 5
        },
        animations: {
            enabled: true,
            duration: 300,
            easing: 'ease-out'
        }
    },

    // Feature Flags
    features: {
        authentication: true,
        booking: true,
        payments: false, // Disabilitato per demo
        reviews: false,  // Disabilitato per demo
        chat: false,     // Disabilitato per demo
        notifications: true,
        darkMode: false, // Per futuro sviluppo
        pwa: false,      // Per futuro sviluppo
        maps: true,
        analytics: window.location.hostname !== 'localhost'
    },

    // Storage Configuration
    storage: {
        prefix: 'coworkspace_',
        keys: {
            user: 'user',
            auth_token: 'auth_token',
            preferences: 'preferences',
            search_history: 'search_history',
            cookies_accepted: 'cookies_accepted'
        },
        expiry: {
            auth_token: 7 * 24 * 60 * 60 * 1000, // 7 giorni
            search_history: 30 * 24 * 60 * 60 * 1000, // 30 giorni
            preferences: 365 * 24 * 60 * 60 * 1000 // 1 anno
        }
    },

    // Validation Rules
    validation: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        password: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false
        },
        phone: /^[\+]?[1-9][\d]{0,15}$/,
        name: {
            minLength: 2,
            maxLength: 50,
            pattern: /^[a-zA-ZÀ-ÿ\s''-]*$/
        }
    },

    // Maps Configuration
    maps: {
        italy: {
            center: { lat: 41.8719, lng: 12.5674 }, // Roma
            zoom: 6,
            cities: [
                { name: 'Milano', lat: 45.4642, lng: 9.1900, spaces: 2 },
                { name: 'Roma', lat: 41.9028, lng: 12.4964, spaces: 1 },
                { name: 'Torino', lat: 45.0703, lng: 7.6869, spaces: 1 },
                { name: 'Bologna', lat: 44.4949, lng: 11.3426, spaces: 1 },
                { name: 'Firenze', lat: 43.7696, lng: 11.2558, spaces: 0 },
                { name: 'Napoli', lat: 40.8518, lng: 14.2681, spaces: 0 },
                { name: 'Venezia', lat: 45.4408, lng: 12.3155, spaces: 0 },
                { name: 'Genova', lat: 44.4056, lng: 8.9463, spaces: 0 }
            ]
        }
    },

    // Error Messages
    messages: {
        errors: {
            generic: 'Si è verificato un errore. Riprova più tardi.',
            network: 'Errore di connessione. Controlla la tua connessione internet.',
            validation: 'Controlla i dati inseriti e riprova.',
            authentication: 'Credenziali non valide.',
            authorization: 'Non hai i permessi per questa operazione.',
            notFound: 'Risorsa non trovata.',
            timeout: 'Richiesta scaduta. Riprova più tardi.'
        },
        success: {
            login: 'Login effettuato con successo!',
            register: 'Registrazione completata con successo!',
            logout: 'Logout effettuato con successo.',
            booking: 'Prenotazione effettuata con successo!',
            update: 'Aggiornamento completato con successo.',
            delete: 'Eliminazione completata con successo.'
        },
        info: {
            loading: 'Caricamento in corso...',
            noResults: 'Nessun risultato trovato.',
            demo: 'Questa è una versione demo dell\'applicazione.'
        }
    },

    // Performance Configuration
    performance: {
        lazyLoading: true,
        imageOptimization: true,
        caching: {
            enabled: true,
            duration: 5 * 60 * 1000 // 5 minuti
        },
        debounceDelay: 300,
        throttleDelay: 100
    },

    // Security Configuration
    security: {
        sessionTimeout: 30 * 60 * 1000, // 30 minuti
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minuti
        csrfProtection: true,
        xssProtection: true
    },

    // Analytics Configuration (per futuro)
    analytics: {
        enabled: false,
        provider: 'google',
        trackingId: 'GA_TRACKING_ID',
        events: {
            pageView: true,
            userInteraction: true,
            errors: true,
            performance: true
        }
    },

    // Social Media Links
    social: {
        facebook: 'https://facebook.com/coworkspace',
        twitter: 'https://twitter.com/coworkspace',
        linkedin: 'https://linkedin.com/company/coworkspace',
        instagram: 'https://instagram.com/coworkspace'
    },

    // Support Configuration
    support: {
        email: 'support@coworkspace.it',
        phone: '+39 02 1234567',
        hours: 'Lun-Ven 9:00-18:00',
        chat: false // Per futuro
    },

    // Debug Configuration
    debug: {
        enabled: window.location.hostname === 'localhost',
        logLevel: window.location.hostname === 'localhost' ? 'debug' : 'error',
        showPerformance: window.location.hostname === 'localhost',
        mockData: true
    }
};

// Freeze configuration per prevenire modifiche accidentali
Object.freeze(window.Config);

// Export per Node.js se necessario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Config;
}

// Log configurazione in development
if (window.Config.debug.enabled) {
    console.log('🔧 Configuration loaded:', window.Config);
}