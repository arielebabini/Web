/**
 * @file Mock data and browser environment for testing the `utils.js` module.
 * @description Provides test data for pure functions (validation, formatting) and
 * mock objects for browser-dependent APIs (DOM, localStorage, navigator, etc.).
 * @version 1.0.0
 */

// ==================== TEST DATA FOR PURE FUNCTIONS ====================

export const mockTestData = {
    /** Data for formatting functions. */
    formatting: {
        price: { input: 1234.56, expected: '1.234,56 €' },
        date: { input: '2025-08-31T12:00:00Z', expected: '31/08/2025' },
        dateTime: { input: '2025-08-31T15:30:00Z', expected: '31/08/2025, 17:30' }, // Assuming CEST timezone
    },

    /** Data for validation functions. */
    validation: {
        email: {
            valid: ['test@example.com', 'utente.nome@dominio.co.it'],
            invalid: ['test@example', 'test.com', 'test @example.com'],
        },
        password: {
            valid: ['Password123', 'aB1@$!%*?&'],
            invalid: ['pass', 'password', 'Password', '12345678'],
        },
        phone: {
            valid: ['+39 333 1234567', '333 1234567', '3331234567'],
            invalid: ['1234567', '+44 123456789', '333 123 456'],
        },
        codiceFiscale: {
            valid: ['RSSMRA80A01H501U', 'VRDLGI85B01F205Z'],
            invalid: ['RSSMRA80A01H501', '1234567890123456'],
        },
    },

    /** Data for date calculation functions. */
    dates: {
        daysBetween: { date1: '2025-09-01', date2: '2025-09-11', expected: 10 },
        addDays: { date: new Date('2025-09-01'), days: 5, expected: new Date('2025-09-06') },
        isPast: { past: '2024-01-01', future: '2026-01-01' },
    },

    /** Data for string utility functions. */
    strings: {
        capitalize: { input: 'ciao mondo', expected: 'Ciao mondo' },
        truncate: { input: 'Questo è un testo molto lungo da troncare.', maxLength: 20, expected: 'Questo è un testo m...' },
    },
};


// ==================== MOCK DOM ELEMENTS ====================

export const mockDomElements = {
    /** A mock HTML form element. */
    createMockForm: () => ({
        id: 'test-form',
        elements: {
            name: { value: 'Mario Rossi' },
            email: { value: 'mario@rossi.it' }
        },
        reset: jest.fn(),
        checkValidity: jest.fn(() => true),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
        },
        querySelectorAll: jest.fn(() => []),
        // FormData simulation
        _getFormData: function() {
            const formData = new Map();
            for(const key in this.elements) {
                formData.set(key, this.elements[key].value);
            }
            return formData;
        }
    }),

    /** A mock scrollable element. */
    createMockScrollElement: () => ({
        id: 'scroll-target',
        getBoundingClientRect: jest.fn(() => ({
            top: 500,
            left: 0,
            bottom: 600,
            right: 800
        })),
    }),

    /** A mock lazy-load image. */
    createMockLazyImage: () => ({
        dataset: { src: '/path/to/image.jpg' },
        src: '',
        removeAttribute: jest.fn()
    })
};


// ==================== MOCK BROWSER ENVIRONMENT ====================

export const globalMocks = {
    /** Mocks `localStorage`. */
    mockLocalStorage: (() => {
        let store = {};
        return {
            getItem: jest.fn((key) => store[key] || null),
            setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
            removeItem: jest.fn((key) => { delete store[key]; }),
            clear: jest.fn(() => { store = {}; }),
            _getStore: () => store,
        };
    })(),

    /** Mocks `navigator`. */
    mockNavigator: {
        clipboard: {
            writeText: jest.fn(() => Promise.resolve()),
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        maxTouchPoints: 0,
        // Helper to change user agent for tests
        setUserAgent(agent) { this.userAgent = agent; },
    },

    /** Mocks `document`. */
    mockDocument: {
        cookie: '',
        getElementById: jest.fn(),
        querySelectorAll: jest.fn(() => []),
    },

    /** Mocks `window`. */
    mockWindow: {
        location: {
            href: 'http://localhost:3000/spaces?city=milano',
            search: '?city=milano',
        },
        history: {
            pushState: jest.fn(),
        },
        scrollTo: jest.fn(),
        pageYOffset: 0,
        innerHeight: 800,
        innerWidth: 1200,
        // Mock Image constructor for preloadImages
        Image: class {
            constructor() {
                // Simulate async loading
                setTimeout(() => this.onload && this.onload(), 50);
            }
        },
        // Mock IntersectionObserver for setupLazyLoad
        IntersectionObserver: class {
            constructor(callback) {
                this.callback = callback;
            }
            observe(element) {
                // Simulate element becoming visible
                this.callback([{ isIntersecting: true, target: element }]);
            }
            unobserve() {}
        },
    },

    /** Mocks the `fetch` API. */
    mockFetch: jest.fn(() => Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<h1>Component Loaded</h1>'),
        json: () => Promise.resolve({ success: true }),
    })),
};