/**
 * @file Mock data for testing the Spaces management module.
 * @description Provides mock spaces, API responses, filter states,
 * and global dependencies for comprehensive testing.
 * @version 1.0.0
 */

// ==================== STATIC DATA ====================

/** A map of amenity keys to their FontAwesome icon classes. */
export const amenityData = {
    icons: {
        wifi: 'fas fa-wifi',
        coffee: 'fas fa-coffee',
        printer: 'fas fa-print',
        parking: 'fas fa-parking',
        kitchen: 'fas fa-utensils',
        lounge_area: 'fas fa-couch',
        air_conditioning: 'fas fa-snowflake',
        projector: 'fas fa-video',
        whiteboard: 'fas fa-chalkboard',
    },
    labels: {
        wifi: 'Wi-Fi Veloce',
        coffee: 'Area Caffè',
        printer: 'Stampante/Scanner',
        parking: 'Parcheggio Privato',
    }
};

// ==================== MOCK SPACES ====================

/** A comprehensive array of mock space objects for testing. */
export const mockSpaces = [
    {
        id: 'space_01',
        name: 'Milano Central Coworking',
        city: 'Milano',
        type: 'hot-desk',
        description: 'Spazio moderno e luminoso vicino alla stazione centrale, ideale per professionisti in movimento.',
        images: ['/assets/images/spaces/milano-1.jpg'],
        price_per_day: 35.0,
        capacity: 50,
        rating: 4.8,
        is_featured: true,
        amenities: ['wifi', 'coffee', 'printer', 'air_conditioning'],
        created_at: '2025-08-20T10:00:00Z',
    },
    {
        id: 'space_02',
        name: 'Roma Business Lounge',
        city: 'Roma',
        type: 'private-office',
        description: 'Uffici privati eleganti nel cuore del quartiere degli affari di Roma. Massima privacy e comfort.',
        images: ['/assets/images/spaces/roma-1.jpg'],
        price_per_day: 150.0,
        capacity: 4,
        rating: 4.9,
        is_featured: true,
        amenities: ['wifi', 'coffee', 'printer', 'parking', 'kitchen'],
        created_at: '2025-07-15T12:30:00Z',
    },
    {
        id: 'space_03',
        name: 'Creative Hub Torino',
        city: 'Torino',
        type: 'meeting-room',
        description: 'Sala riunioni attrezzata con proiettore e lavagna interattiva, perfetta per brainstorming e presentazioni.',
        images: ['/assets/images/spaces/torino-1.jpg'],
        price_per_day: 80.0,
        capacity: 12,
        rating: 4.5,
        is_featured: false,
        amenities: ['wifi', 'coffee', 'projector', 'whiteboard'],
        created_at: '2025-08-25T09:00:00Z',
    },
    {
        id: 'space_04',
        name: 'Napoli Tech Space',
        city: 'Napoli',
        type: 'hot-desk',
        description: 'Un ambiente dinamico e tecnologico per startup e freelance. Ottima connessione e caffè illimitato.',
        images: ['/assets/images/spaces/napoli-1.jpg'],
        price_per_day: 25.0,
        capacity: 80,
        rating: 4.6,
        is_featured: false,
        amenities: ['wifi', 'coffee'],
        created_at: '2025-06-10T11:00:00Z',
    },
    {
        id: 'space_05',
        name: 'Milano Rooftop Events',
        city: 'Milano',
        type: 'event-space',
        description: 'Location esclusiva con terrazza panoramica per eventi aziendali e networking. Vista mozzafiato.',
        images: ['/assets/images/spaces/milano-2.jpg'],
        price_per_day: 500.0,
        capacity: 100,
        rating: 5.0,
        is_featured: true,
        amenities: ['wifi', 'projector', 'kitchen', 'lounge_area'],
        created_at: '2025-05-30T18:00:00Z',
    }
];

// ==================== MOCK API RESPONSES ====================

export const apiResponses = {
    getSpaces: {
        /** Simulates a successful full response with pagination. */
        success_full: {
            success: true,
            spaces: mockSpaces,
            pagination: {
                page: 1,
                totalPages: 1,
                totalItems: mockSpaces.length
            }
        },
        /** Simulates a successful response but with no results. */
        success_empty: {
            success: true,
            spaces: [],
            pagination: {
                page: 1,
                totalPages: 0,
                totalItems: 0
            }
        },
        /** Simulates a server error. */
        failure: {
            success: false,
            message: 'Errore interno del server. Riprova più tardi.',
        }
    },
    getSpace: {
        /**
         * Simulates a successful response for a single space.
         * @param {string} spaceId - The ID of the space to retrieve.
         * @returns {object} The API response object.
         */
        success: (spaceId) => {
            const space = mockSpaces.find(s => s.id === spaceId);
            if (space) {
                return { success: true, space };
            }
            return apiResponses.getSpace.failure_notFound;
        },
        /** Simulates a 404 Not Found error. */
        failure_notFound: {
            success: false,
            message: 'Spazio non trovato.'
        }
    }
};

// ==================== MOCK FILTER STATES ====================

/** Predefined filter objects to simulate user selections. */
export const mockFilterStates = {
    empty: {
        city: '',
        type: '',
        search: '',
        minPrice: 0,
        maxPrice: 999999,
        rating: 0,
        amenities: []
    },
    byCity_Milano: {
        city: 'Milano',
        type: '',
        search: '',
    },
    byType_Office: {
        city: '',
        type: 'private-office',
        search: '',
    },
    bySearch_Creative: {
        city: '',
        type: '',
        search: 'Creative',
    },
    complex: {
        city: 'Milano',
        type: 'hot-desk',
        search: 'centrale',
    }
};

// ==================== GLOBAL & BROWSER MOCKS ====================

export const globalMocks = {
    /** Mocks window.localStorage for favorites and auth tokens. */
    mockLocalStorage: (() => {
        let store = {};
        return {
            getItem: (key) => store[key] || null,
            setItem: (key, value) => { store[key] = value.toString(); },
            removeItem: (key) => { delete store[key]; },
            clear: () => { store = {}; },
            _populate: (data) => { store = { ...data }; },
            _getStore: () => store,
        };
    })(),

    /** Mocks a global notification system. */
    mockNotificationSystem: {
        log: [],
        showNotification(message, type = 'info', duration = 3000) {
            const notification = { message, type, duration, timestamp: new Date().toISOString() };
            console.log(`[MOCK NOTIFICATION | ${type.toUpperCase()}]: ${message}`);
            this.log.push(notification);
        },
        getLast() {
            return this.log.length > 0 ? this.log[this.log.length - 1] : null;
        },
        clearLog() {
            this.log = [];
        }
    }
};

// Example pre-population for a logged-in user with some favorites
globalMocks.mockLocalStorage._populate({
    auth_token: 'mock_jwt_for_spaces_test',
    spaceFavorites: JSON.stringify(['space_02', 'space_05'])
});