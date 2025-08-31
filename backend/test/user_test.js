/**
 * @file Mock data and objects for testing the User management module.
 * @description Provides mock user profiles, bookings, settings, API responses,
 * and simulations of global dependencies like auth and localStorage.
 * @version 1.0.0
 */

// ==================== MOCK USER DATA ====================

/** Contains user objects as they should appear in the frontend state (camelCase). */
export const mockUsers = {
    // A standard, fully populated user
    standard: {
        id: 'usr_12345',
        firstName: 'Laura',
        lastName: 'Bianchi',
        email: 'laura.bianchi@example.com',
        phone: '+39 333 1122334',
        company: 'Digital Nomads Inc.',
        role: 'user',
        status: 'active',
        avatar: '/assets/images/avatars/laura.jpg',
        verified: true,
        createdAt: '2024-05-10T08:30:00Z',
        lastLogin: '2025-08-30T14:00:00Z',
        bio: 'Graphic designer appassionata di viaggi e coworking.',
    },
    // An admin user
    admin: {
        id: 'usr_67890',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@coworkspace.app',
        phone: '+39 02 1234567',
        company: 'CoWorkSpace HQ',
        role: 'admin',
        status: 'active',
        avatar: null,
        verified: true,
        createdAt: '2023-01-15T10:00:00Z',
        lastLogin: '2025-08-31T10:00:00Z',
        bio: null,
    },
    // A user with minimal information
    minimal: {
        id: 'usr_54321',
        firstName: 'Marco',
        lastName: null,
        email: 'marco@example.com',
        phone: null,
        company: null,
        role: 'user',
        status: 'pending_verification',
        avatar: null,
        verified: false,
        createdAt: '2025-08-28T18:00:00Z',
        lastLogin: '2025-08-28T18:00:00Z',
        bio: null,
    }
};

/** Contains user data as it would be returned from the backend API (snake_case). */
export const mockApiUserData = {
    'laura.bianchi@example.com': {
        id: 'usr_12345',
        first_name: 'Laura',
        last_name: 'Bianchi',
        email: 'laura.bianchi@example.com',
        phone: '+39 333 1122334',
        company: 'Digital Nomads Inc.',
        role: 'user',
        status: 'active',
        created_at: '2024-05-10T08:30:00Z',
        updated_at: '2025-08-30T14:00:00Z', // Mapped to lastLogin
    },
    'admin@coworkspace.app': {
        id: 'usr_67890',
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@coworkspace.app',
        phone: '+39 02 1234567',
        company: 'CoWorkSpace HQ',
        role: 'admin',
        status: 'active',
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2025-08-31T10:00:00Z',
    }
};


// ==================== MOCK BOOKINGS DATA ====================

export const mockBookings = [
    {
        id: 'BK001',
        spaceId: 'space_01',
        spaceName: 'Milano Central Coworking',
        spaceAddress: 'Via Dante 15, Milano',
        date: '2025-09-15', // Upcoming
        startTime: '09:00',
        endTime: '18:00',
        duration: 9,
        totalPrice: 45.00,
        status: 'confirmed',
        notes: 'Necessito di una postazione silenziosa.',
        reviewed: false,
        createdAt: '2025-08-25T11:00:00Z'
    },
    {
        id: 'BK002',
        spaceId: 'space_03',
        spaceName: 'Creative Hub Torino',
        spaceAddress: 'Via Po 24, Torino',
        date: '2025-08-20', // Past
        startTime: '10:00',
        endTime: '13:00',
        duration: 3,
        totalPrice: 40.00,
        status: 'completed',
        notes: '',
        reviewed: true,
        createdAt: '2025-08-10T16:30:00Z'
    },
    {
        id: 'BK003',
        spaceId: 'space_02',
        spaceName: 'Roma Business Lounge',
        spaceAddress: 'Piazza di Spagna 1, Roma',
        date: '2025-09-05',
        startTime: '14:00',
        endTime: '16:00',
        duration: 2,
        totalPrice: 300.00,
        status: 'pending',
        notes: 'In attesa di approvazione aziendale.',
        reviewed: false,
        createdAt: '2025-08-30T18:00:00Z'
    },
    {
        id: 'BK004',
        spaceId: 'space_04',
        spaceName: 'Napoli Tech Space',
        spaceAddress: 'Via Toledo 112, Napoli',
        date: '2025-07-30',
        startTime: '09:00',
        endTime: '13:00',
        duration: 4,
        totalPrice: 25.00,
        status: 'cancelled',
        notes: 'Cancellata a causa di un imprevisto.',
        reviewed: false,
        createdAt: '2025-07-20T09:00:00Z'
    }
];

// ==================== MOCK SETTINGS ====================

export const mockSettings = {
    default: {
        notifications: true,
        emailUpdates: true,
        language: 'it',
        timezone: 'Europe/Rome'
    },
    custom: {
        notifications: false,
        emailUpdates: false,
        language: 'en',
        timezone: 'America/New_York'
    }
};

// ==================== MOCK API RESPONSES ====================

export const apiResponses = {
    getUserByEmail: {
        /**
         * Simulates a successful API response.
         * @param {string} email - The email to look up.
         * @returns {object} The API response.
         */
        success: (email) => ({
            success: true,
            user: mockApiUserData[email] || null,
        }),
        /** Simulates a failure/error response. */
        failure: {
            success: false,
            message: 'Utente non trovato o errore del server.'
        }
    }
};


// ==================== GLOBAL DEPENDENCY MOCKS ====================

export const globalMocks = {
    /** Mocks the global authentication module (`window.auth`). */
    mockAuth: {
        _isAuthenticated: false,
        isAuthenticated() {
            return this._isAuthenticated;
        },
        setAuthenticated(status) {
            this._isAuthenticated = status;
        }
    },

    /** Mocks the global API client (`window.api`). */
    mockApi: {
        getUserByEmail: (email) => Promise.resolve(apiResponses.getUserByEmail.success(email)),
    },

    /** Mocks `window.localStorage`. */
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

    /** Mocks the navigation module (`window.Navigation`). */
    mockNavigation: {
        _lastSection: null,
        showSection(section) {
            console.log(`[MOCK NAVIGATION] Navigating to section: ${section}`);
            this._lastSection = section;
        }
    },

    /** Mocks the components module for notifications (`window.Components`). */
    mockComponents: {
        _notifications: [],
        showNotification({ message, type }) {
            console.log(`[MOCK NOTIFICATION | ${type.toUpperCase()}]: ${message}`);
            this._notifications.push({ message, type });
        },
        getLastNotification() {
            return this._notifications[this._notifications.length - 1];
        }
    },

    /** Mocks Bootstrap Modal. */
    mockBootstrap: {
        Modal: class {
            constructor(element) { this.element = element; }
            show() { console.log(`[MOCK BOOTSTRAP] Modal shown: #${this.element.id}`); }
            hide() { console.log(`[MOCK BOOTSTRAP] Modal hidden: #${this.element.id}`); }
            static getInstance(element) { return new this(element); }
        }
    }
};

// --- Example Initialization for a Test Scenario ---
// This shows how you might set up the mocks before a test.
export function setupMockEnvironment(isAuthenticated = true, user = mockUsers.standard) {
    globalMocks.mockAuth.setAuthenticated(isAuthenticated);
    if (isAuthenticated) {
        globalMocks.mockLocalStorage._populate({
            currentUser: JSON.stringify(user),
            authToken: 'mock_auth_token_12345',
            coworkspace_user_settings: JSON.stringify(mockSettings.default)
        });
    } else {
        globalMocks.mockLocalStorage.clear();
    }
}