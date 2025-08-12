/**
 * CoWorkSpace - Configuration
 * Configurazione globale dell'applicazione
 */

// Configurazione globale
window.CoWorkSpaceConfig = {
    // API Configuration
    api: {
        baseUrl: 'https://api.coworkspace.it',
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 1000
    },

    // App Settings
    app: {
        name: 'CoWorkSpace',
        version: '1.0.0',
        environment: 'development', // development | staging | production
        debug: true,
        enableAnalytics: false
    },

    // UI Settings
    ui: {
        theme: 'light', // light | dark | auto
        animations: {
            enabled: true,
            duration: 300,
            easing: 'ease-out'
        },
        notifications: {
            position: 'top-right', // top-left | top-right | bottom-left | bottom-right
            duration: 4000,
            maxNotifications: 5
        },
        loading: {
            showAfter: 200, // ms
            minDuration: 500 // ms
        }
    },

    // Feature Flags
    features: {
        enableDashboard: true,
        enableBookings: true,
        enablePayments: false,
        enableChat: false,
        enableNotifications: true,
        enableAnalytics: false,
        enableExport: true,
        enableFilters: true,
        enableMap: true,
        enableOfflineMode: false
    },

    // Local Storage Keys
    storage: {
        user: 'coworkspace_user',
        theme: 'coworkspace_theme',
        language: 'coworkspace_language',
        preferences: 'coworkspace_preferences',
        cache: 'coworkspace_cache',
        cookies: 'coworkspace_cookies_accepted'
    },

    // Default Values
    defaults: {
        language: 'it',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        itemsPerPage: 12,
        searchMinLength: 2,
        debounceDelay: 300
    },

    // Validation Rules
    validation: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[\+]?[1-9][\d]{0,15}$/,
        password: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false
        },
        name: {
            minLength: 2,
            maxLength: 50
        }
    },

    // URLs
    urls: {
        privacyPolicy: '/privacy-policy',
        termsOfService: '/terms-of-service',
        cookiePolicy: '/cookie-policy',
        support: '/support',
        documentation: '/docs'
    },

    // Map Configuration
    map: {
        defaultZoom: 1,
        minZoom: 0.5,
        maxZoom: 2,
        zoomStep: 0.2,
        animationDuration: 300
    },

    // Booking Configuration
    booking: {
        minAdvanceBooking: 1, // hours
        maxAdvanceBooking: 30, // days
        cancellationDeadline: 24, // hours
        defaultDuration: 8, // hours
        workingHours: {
            start: '08:00',
            end: '20:00'
        }
    },

    // File Upload
    upload: {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        maxFiles: 10
    },

    // Error Messages
    errors: {
        network: 'Errore di connessione. Controlla la tua connessione internet.',
        server: 'Errore del server. Riprova più tardi.',
        validation: 'Alcuni campi contengono errori. Controlla e riprova.',
        authentication: 'Sessione scaduta. Effettua nuovamente il login.',
        authorization: 'Non hai i permessi per accedere a questa risorsa.',
        notFound: 'Risorsa non trovata.',
        timeout: 'Richiesta scaduta. Riprova più tardi.',
        generic: 'Si è verificato un errore. Riprova più tardi.'
    },

    // Success Messages
    success: {
        login: 'Login effettuato con successo!',
        register: 'Registrazione completata con successo!',
        logout: 'Logout effettuato con successo!',
        profileUpdate: 'Profilo aggiornato con successo!',
        bookingCreated: 'Prenotazione effettuata con successo!',
        bookingUpdated: 'Prenotazione aggiornata con successo!',
        bookingCancelled: 'Prenotazione cancellata con successo!',
        settingsSaved: 'Impostazioni salvate con successo!'
    },

    // Event Names
    events: {
        userLogin: 'user:login',
        userLogout: 'user:logout',
        userUpdate: 'user:update',
        bookingCreate: 'booking:create',
        bookingUpdate: 'booking:update',
        bookingCancel: 'booking:cancel',
        spaceSelect: 'space:select',
        filterApply: 'filter:apply',
        searchPerform: 'search:perform',
        navigationChange: 'navigation:change',
        themeChange: 'theme:change',
        notificationShow: 'notification:show',
        modalOpen: 'modal:open',
        modalClose: 'modal:close'
    },

    // CSS Classes
    cssClasses: {
        hidden: 'd-none',
        visible: 'd-block',
        loading: 'loading',
        active: 'active',
        disabled: 'disabled',
        error: 'error',
        success: 'success',
        warning: 'warning',
        info: 'info',
        fadeIn: 'animate-fadeIn',
        fadeOut: 'animate-fadeOut',
        slideUp: 'animate-slideInUp',
        slideDown: 'animate-slideInDown'
    },

    // Animation Settings
    animations: {
        page: {
            enter: 'animate-fadeInUp',
            exit: 'animate-fadeOut',
            duration: 300
        },
        modal: {
            enter: 'animate-zoomIn',
            exit: 'animate-zoomOut',
            duration: 250
        },
        notification: {
            enter: 'animate-slideInRight',
            exit: 'animate-slideOutRight',
            duration: 300
        },
        loading: {
            spinner: 'animate-spin',
            pulse: 'animate-pulse'
        }
    },

    // Performance Settings
    performance: {
        enableVirtualScrolling: false,
        enableLazyLoading: true,
        enableImageOptimization: true,
        debounceSearch: true,
        throttleScroll: true,
        cacheTimeout: 5 * 60 * 1000, // 5 minutes
        preloadImages: true
    },

    // Accessibility Settings
    accessibility: {
        focusRingVisible: true,
        highContrast: false,
        reducedMotion: false,
        screenReaderAnnouncements: true,
        keyboardNavigation: true
    },

    // SEO Settings
    seo: {
        siteName: 'CoWorkSpace',
        description: 'Piattaforma per la prenotazione di spazi di coworking in Italia',
        keywords: 'coworking, spazi, uffici, prenotazioni, lavoro',
        author: 'CoWorkSpace Team',
        image: '/assets/images/og-image.jpg',
        twitterCard: 'summary_large_image'
    },

    // Social Media
    social: {
        facebook: 'https://facebook.com/coworkspace',
        twitter: 'https://twitter.com/coworkspace',
        linkedin: 'https://linkedin.com/company/coworkspace',
        instagram: 'https://instagram.com/coworkspace'
    },

    // Analytics
    analytics: {
        googleAnalytics: 'GA-XXXXXXXX-X',
        facebookPixel: 'XXXXXXXXXXXXXXXXX',
        trackPageViews: true,
        trackEvents: true,
        trackErrors: true,
        anonymizeIP: true
    },

    // Security Settings
    security: {
        enableCSP: true,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        passwordStrengthCheck: true,
        enableCaptcha: false,
        rateLimiting: {
            enabled: true,
            maxRequests: 100,
            windowMs: 15 * 60 * 1000 // 15 minutes
        }
    }
};

// Environment-specific overrides
if (window.CoWorkSpaceConfig.app.environment === 'production') {
    window.CoWorkSpaceConfig.app.debug = false;
    window.CoWorkSpaceConfig.app.enableAnalytics = true;
    window.CoWorkSpaceConfig.api.baseUrl = 'https://api.coworkspace.it';
} else if (window.CoWorkSpaceConfig.app.environment === 'staging') {
    window.CoWorkSpaceConfig.api.baseUrl = 'https://staging-api.coworkspace.it';
} else {
    // Development
    window.CoWorkSpaceConfig.api.baseUrl = 'http://localhost:3000/api';
}

// Detect user preferences
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    window.CoWorkSpaceConfig.ui.theme = 'dark';
}

if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.CoWorkSpaceConfig.ui.animations.enabled = false;
    window.CoWorkSpaceConfig.accessibility.reducedMotion = true;
}

// Browser capabilities detection
window.CoWorkSpaceConfig.browser = {
    supportsWebP: (() => {
        const canvas = document.createElement('canvas');
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })(),
    supportsIntersectionObserver: 'IntersectionObserver' in window,
    supportsLocalStorage: (() => {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    })(),
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsTouchEvents: 'ontouchstart' in window,
    supportsGeolocation: 'geolocation' in navigator,
    supportsNotifications: 'Notification' in window
};

// Device type detection
window.CoWorkSpaceConfig.device = {
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isTablet: /iPad|Android|Silk|Kindle/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent),
    isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    isRetina: window.devicePixelRatio > 1
};

// Screen size detection
window.CoWorkSpaceConfig.screen = {
    width: window.innerWidth,
    height: window.innerHeight,
    isSmall: window.innerWidth < 768,
    isMedium: window.innerWidth >= 768 && window.innerWidth < 1200,
    isLarge: window.innerWidth >= 1200
};

// Update screen info on resize
window.addEventListener('resize', () => {
    window.CoWorkSpaceConfig.screen.width = window.innerWidth;
    window.CoWorkSpaceConfig.screen.height = window.innerHeight;
    window.CoWorkSpaceConfig.screen.isSmall = window.innerWidth < 768;
    window.CoWorkSpaceConfig.screen.isMedium = window.innerWidth >= 768 && window.innerWidth < 1200;
    window.CoWorkSpaceConfig.screen.isLarge = window.innerWidth >= 1200;
});

// Freeze configuration to prevent accidental modifications
Object.freeze(window.CoWorkSpaceConfig);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CoWorkSpaceConfig;
}