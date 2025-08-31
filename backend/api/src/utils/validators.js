// src/utils/validators.js
const { body, param, query } = require('express-validator');

/**
 * Validatori riutilizzabili per l'applicazione
 */

// ===== VALIDATORI BASE =====

const emailValidation = body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email non valida');

const passwordValidation = body('password')
    .isLength({ min: 8 })
    .withMessage('La password deve essere di almeno 8 caratteri')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La password deve contenere almeno una lettera minuscola, una maiuscola e un numero');

const strongPasswordValidation = body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('La password deve essere tra 8 e 128 caratteri')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('La password deve contenere almeno: una minuscola, una maiuscola, un numero e un carattere speciale (@$!%*?&)');

const nameValidation = (field, required = false) => {
    const validation = body(field);

    if (!required) {
        validation.optional();
    }

    return validation
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage(`${field} deve essere tra 2 e 50 caratteri`)
        .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
        .withMessage(`${field} può contenere solo lettere, spazi, apostrofi e trattini`);
};

const phoneValidation = body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Numero di telefono non valido');

const uuidValidation = (field = 'id') => param(field)
    .isUUID()
    .withMessage(`${field} deve essere un UUID valido`);

// ===== VALIDATORI SPECIFICI =====

const userRoleValidation = body('role')
    .optional()
    .isIn(['client', 'manager', 'admin'])
    .withMessage('Ruolo non valido. Valori consentiti: client, manager, admin');

const userStatusValidation = body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Stato non valido. Valori consentiti: active, inactive, suspended');

const companyValidation = body('company')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Nome azienda troppo lungo (max 255 caratteri)')
    .matches(/^[a-zA-ZÀ-ÿ0-9\s.,-&()]+$/)
    .withMessage('Nome azienda contiene caratteri non validi');

// ===== VALIDATORI PER QUERY =====

const paginationValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Pagina deve essere un numero positivo')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit deve essere tra 1 e 100')
        .toInt()
];

const sortValidation = (allowedFields) => [
    query('sortBy')
        .optional()
        .isIn(allowedFields)
        .withMessage(`Campo di ordinamento non valido. Valori consentiti: ${allowedFields.join(', ')}`),
    query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('Direzione ordinamento non valida. Valori consentiti: ASC, DESC')
];

const searchValidation = query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Termine di ricerca deve essere tra 1 e 255 caratteri')
    .escape(); // Previene XSS

// ===== VALIDATORI PER SPAZI =====

const spaceTypeValidation = body('type')
    .isIn(['hot-desk', 'private-office', 'meeting-room', 'event-space'])
    .withMessage('Tipo spazio non valido');

const capacityValidation = body('capacity')
    .isInt({ min: 1, max: 500 })
    .withMessage('Capacità deve essere tra 1 e 500 persone')
    .toInt();

const priceValidation = body('hourlyPrice')
    .isFloat({ min: 0.01, max: 9999.99 })
    .withMessage('Prezzo orario deve essere tra 0.01 e 9999.99')
    .toFloat();

const locationValidation = [
    body('address')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Indirizzo deve essere tra 5 e 500 caratteri'),
    body('city')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Città deve essere tra 2 e 100 caratteri')
        .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
        .withMessage('Città può contenere solo lettere, spazi e apostrofi'),
    body('zipCode')
        .trim()
        .matches(/^[0-9]{5}$/)
        .withMessage('CAP deve essere di 5 cifre'),
    body('country')
        .optional()
        .isISO31661Alpha2()
        .withMessage('Codice paese non valido (ISO 3166-1 alpha-2)')
];

const coordinatesValidation = [
    body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitudine deve essere tra -90 e 90')
        .toFloat(),
    body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitudine deve essere tra -180 e 180')
        .toFloat()
];

// ===== VALIDATORI PER PRENOTAZIONI =====

const dateValidation = (field) => body(field)
    .isISO8601()
    .withMessage(`${field} deve essere una data valida (ISO 8601)`)
    .toDate();

const dateRangeValidation = [
    dateValidation('startDate'),
    dateValidation('endDate'),
    body('endDate').custom((endDate, { req }) => {
        const startDate = new Date(req.body.startDate);
        const end = new Date(endDate);

        if (end <= startDate) {
            throw new Error('Data fine deve essere successiva alla data inizio');
        }

        // Controlla che la prenotazione non sia nel passato
        if (startDate < new Date()) {
            throw new Error('Non puoi prenotare nel passato');
        }

        // Controlla durata massima (es. 30 giorni)
        const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 giorni in ms
        if (end - startDate > maxDuration) {
            throw new Error('Durata massima prenotazione: 30 giorni');
        }

        return true;
    })
];

const bookingStatusValidation = body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'completed'])
    .withMessage('Status prenotazione non valido');

// ===== VALIDATORI PER PAGAMENTI =====

const amountValidation = body('amount')
    .isFloat({ min: 0.01, max: 99999.99 })
    .withMessage('Importo deve essere tra 0.01 e 99,999.99')
    .toFloat();

const currencyValidation = body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Codice valuta deve essere di 3 caratteri')
    .isAlpha()
    .withMessage('Codice valuta deve contenere solo lettere')
    .toUpperCase();

const paymentMethodValidation = body('paymentMethod')
    .isIn(['card', 'paypal', 'bank_transfer', 'apple_pay', 'google_pay'])
    .withMessage('Metodo di pagamento non valido');

// ===== VALIDATORI PERSONALIZZATI =====

const customValidators = {
    /**
     * Valida che un campo sia unico nel database
     */
    isUnique: (model, field, excludeId = null) => {
        return async (value) => {
            const existingRecord = await model.findBy(field, value);

            if (existingRecord && existingRecord.id !== excludeId) {
                throw new Error(`${field} già esistente`);
            }

            return true;
        };
    },

    /**
     * Valida orari di lavoro
     */
    isBusinessHours: (startTime, endTime) => {
        return (value, { req }) => {
            const start = parseInt(startTime);
            const end = parseInt(endTime);
            const hour = new Date(value).getHours();

            if (hour < start || hour >= end) {
                throw new Error(`Orario deve essere tra ${start}:00 e ${end}:00`);
            }

            return true;
        };
    },

    /**
     * Valida che la data sia in giorni lavorativi
     */
    isWorkingDay: (value) => {
        const date = new Date(value);
        const dayOfWeek = date.getDay();

        // 0 = Domenica, 6 = Sabato
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            throw new Error('Prenotazioni disponibili solo nei giorni lavorativi');
        }

        return true;
    },

    /**
     * Valida preavviso minimo per prenotazioni
     */
    hasMinimumNotice: (hours = 24) => {
        return (value) => {
            const bookingDate = new Date(value);
            const now = new Date();
            const minNoticeMs = hours * 60 * 60 * 1000;

            if (bookingDate.getTime() - now.getTime() < minNoticeMs) {
                throw new Error(`Richiesto preavviso minimo di ${hours} ore`);
            }

            return true;
        };
    },

    /**
     * Valida che non ci siano prenotazioni sovrapposte
     */
    noOverlappingBookings: (spaceId, excludeBookingId = null) => {
        return async (value, { req }) => {
            const startDate = new Date(req.body.startDate);
            const endDate = new Date(req.body.endDate);

            // Query per cercare prenotazioni sovrapposte
            // Questa logica sarà implementata nel modello Booking
            const overlapping = await BookingModel.findOverlapping(
                spaceId,
                startDate,
                endDate,
                excludeBookingId
            );

            if (overlapping.length > 0) {
                throw new Error('Slot temporale non disponibile');
            }

            return true;
        };
    }
};

// ===== SETS DI VALIDAZIONE COMBINATI =====

const userRegistrationValidation = [
    emailValidation,
    passwordValidation,
    nameValidation('firstName', true),
    nameValidation('lastName', true),
    phoneValidation,
    companyValidation
];

const userUpdateValidation = [
    nameValidation('firstName'),
    nameValidation('lastName'),
    phoneValidation,
    companyValidation
];

const userAdminUpdateValidation = [
    ...userUpdateValidation,
    userRoleValidation,
    userStatusValidation
];

const spaceCreationValidation = [
    nameValidation('name', true),
    body('description')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Descrizione deve essere tra 10 e 2000 caratteri'),
    spaceTypeValidation,
    capacityValidation,
    priceValidation,
    ...locationValidation,
    ...coordinatesValidation
];

const bookingCreationValidation = [
    uuidValidation('spaceId'),
    ...dateRangeValidation,
    body('numberOfPeople')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Numero persone deve essere tra 1 e 100')
        .toInt(),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Note non possono superare 500 caratteri')
];

const paginatedListValidation = [
    ...paginationValidation,
    searchValidation
];

module.exports = {
    // Validatori base
    emailValidation,
    passwordValidation,
    strongPasswordValidation,
    nameValidation,
    phoneValidation,
    uuidValidation,

    // Validatori specifici
    userRoleValidation,
    userStatusValidation,
    companyValidation,
    spaceTypeValidation,
    capacityValidation,
    priceValidation,
    locationValidation,
    coordinatesValidation,
    dateValidation,
    dateRangeValidation,
    bookingStatusValidation,
    amountValidation,
    currencyValidation,
    paymentMethodValidation,

    // Validatori query
    paginationValidation,
    sortValidation,
    searchValidation,

    // Validatori personalizzati
    customValidators,

    // Sets combinati
    userRegistrationValidation,
    userUpdateValidation,
    userAdminUpdateValidation,
    spaceCreationValidation,
    bookingCreationValidation,
    paginatedListValidation
};