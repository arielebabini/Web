/**
 * CoWorkSpace - Configuration Module
 */

// ===== CONFIGURAZIONE GLOBALE =====
const AppConfig = {
    // Info Applicazione
    appName: 'CoWorkSpace',
    appVersion: '1.0.0',
    appDescription: 'Piattaforma per la prenotazione di spazi di coworking in Italia',

    // URL e Percorsi
    baseUrl: window.location.origin,
    apiUrl: window.location.origin + '/api',
    assetsPath: '/assets',
    imagesPath: '/assets/images',

    // Percorsi pagine
    pages: {
        home: 'index.html',
        spaces: 'spaces.html',
        about: 'about.html',
        support: 'support.html',
        profile: 'profile.html',
        bookings: 'bookings.html',
        dashboard: 'dashboard.html'
    },

    // Configurazione Storage
    storage: {
        prefix: 'coworkspace_',
        userKey: 'coworkspace_user',
        settingsKey: 'coworkspace_settings',
        searchKey: 'coworkspace_search',
        bookingsKey: 'coworkspace_bookings'
    },

    // Configurazione Cookies
    cookies: {
        acceptedKey: 'cookiesAccepted',
        sessionKey: 'sessionId',
        expireDays: 30
    },

    // Configurazione Notifiche
    notifications: {
        duration: 4000,
        position: 'top-right',
        autoHide: true
    },

    // Configurazione Mappa
    map: {
        defaultZoom: 1,
        minZoom: 0.8,
        maxZoom: 2,
        animationDuration: 300
    },

    // Configurazione Prezzi
    pricing: {
        currency: 'EUR',
        locale: 'it-IT',
        vatRate: 0.22,
        serviceFee: 0.10
    },

    // Configurazione Date
    dates: {
        locale: 'it-IT',
        timezone: 'Europe/Rome',
        format: 'DD/MM/YYYY',
        timeFormat: 'HH:mm'
    },

    // Validazione Form
    validation: {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumber: true,
        phonePattern: /^(\+39)?\s?3\d{2}\s?\d{6,7}$/,
        emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    // Limiti
    limits: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxImages: 10,
        maxBookingDays: 365,
        minBookingHours: 1,
        maxCapacity: 100
    },

    // Città disponibili
    cities: [
        'Milano',
        'Roma',
        'Torino',
        'Napoli',
        'Bologna',
        'Firenze',
        'Venezia',
        'Genova',
        'Palermo',
        'Bari',
        'Catania',
        'Verona'
    ],

    // Tipi di spazio
    spaceTypes: {
        'hot-desk': 'Hot Desk',
        'private-office': 'Ufficio Privato',
        'meeting-room': 'Sala Riunioni',
        'event-space': 'Spazio Eventi',
        'conference-room': 'Sala Conferenze',
        'coworking': 'Spazio Coworking'
    },

    // Servizi disponibili
    amenities: {
        'wifi': { label: 'WiFi', icon: 'fas fa-wifi' },
        'parking': { label: 'Parcheggio', icon: 'fas fa-car' },
        'coffee': { label: 'Caffè', icon: 'fas fa-coffee' },
        'printer': { label: 'Stampante', icon: 'fas fa-print' },
        'projector': { label: 'Proiettore', icon: 'fas fa-video' },
        'kitchen': { label: 'Cucina', icon: 'fas fa-utensils' },
        'reception': { label: 'Reception', icon: 'fas fa-concierge-bell' },
        'locker': { label: 'Armadietti', icon: 'fas fa-lock' },
        'phone-booth': { label: 'Phone Booth', icon: 'fas fa-phone' },
        'meeting-room': { label: 'Sale Riunioni', icon: 'fas fa-users' },
        'event-space': { label: 'Spazio Eventi', icon: 'fas fa-calendar' },
        'accessible': { label: 'Accessibile', icon: 'fas fa-wheelchair' }
    },

    // Orari disponibili
    workingHours: {
        start: '08:00',
        end: '20:00',
        slots: [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00',
            '18:00', '19:00', '20:00'
        ]
    },

    // Messaggi di sistema
    messages: {
        loginSuccess: 'Login effettuato con successo',
        loginError: 'Email o password non corretti',
        registerSuccess: 'Registrazione completata con successo',
        registerError: 'Errore durante la registrazione',
        bookingSuccess: 'Prenotazione effettuata con successo',
        bookingError: 'Errore durante la prenotazione',
        updateSuccess: 'Aggiornamento completato',
        updateError: 'Errore durante l\'aggiornamento',
        deleteSuccess: 'Eliminazione completata',
        deleteError: 'Errore durante l\'eliminazione',
        networkError: 'Errore di connessione',
        genericError: 'Si è verificato un errore',
        loading: 'Caricamento in corso...',
        noResults: 'Nessun risultato trovato',
        confirmDelete: 'Sei sicuro di voler eliminare?',
        confirmLogout: 'Sei sicuro di voler uscire?'
    },

    // Configurazione API (mock per ora)
    api: {
        timeout: 30000,
        retryAttempts: 3,
        endpoints: {
            login: '/api/auth/login',
            register: '/api/auth/register',
            logout: '/api/auth/logout',
            profile: '/api/user/profile',
            spaces: '/api/spaces',
            bookings: '/api/bookings',
            reviews: '/api/reviews'
        }
    },

    // Feature Flags
    features: {
        enableChat: false,
        enablePayments: true,
        enableReviews: true,
        enableSocialLogin: false,
        enableNotifications: true,
        enableAnalytics: false,
        enableMaps: true,
        enableDarkMode: false
    },

    // Debug
    debug: {
        enabled: true,
        logLevel: 'info', // 'error', 'warn', 'info', 'debug'
        showNotifications: true
    }
};

// Funzione per ottenere configurazione
function getConfig(path) {
    const keys = path.split('.');
    let value = AppConfig;

    for (const key of keys) {
        value = value[key];
        if (value === undefined) return null;
    }

    return value;
}

// Funzione per aggiornare configurazione
function updateConfig(path, newValue) {
    const keys = path.split('.');
    let obj = AppConfig;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) {
            obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = newValue;
}

// Congela la configurazione per evitare modifiche accidentali
Object.freeze(AppConfig);

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppConfig,
        getConfig,
        updateConfig
    };
}