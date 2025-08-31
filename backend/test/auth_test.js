/**
 * @file Mock data for testing the AuthManager class of CoWorkSpace.
 * @version 1.0.0
 * @createdAt 2025-08-31
 */

// ==================== MOCK USERS ====================
export const users = {
    admin: {
        id: 'usr_admin_001',
        firstName: 'Admin',
        lastName: 'Istrator',
        email: 'admin@coworkspace.local',
        role: 'admin',
        company: 'CoWorkSpace Corp',
        phone: '+39021234567',
        avatar: 'https://i.pravatar.cc/150?u=admin@coworkspace.local',
    },
    manager: {
        id: 'usr_manager_002',
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'manager@coworkspace.local',
        role: 'manager',
        company: 'Rossi SRL',
        phone: '+39067654321',
        avatar: 'https://i.pravatar.cc/150?u=manager@coworkspace.local',
    },
    standard: {
        id: 'usr_user_003',
        firstName: 'Laura',
        lastName: 'Bianchi',
        email: 'user@coworkspace.local',
        role: 'user',
        company: null,
        phone: '+393331122333',
        avatar: 'https://i.pravatar.cc/150?u=user@coworkspace.local',
    },
    userWithoutAvatar: {
        id: 'usr_user_004',
        firstName: 'Luca',
        lastName: 'Verdi',
        email: 'luca.verdi@example.com',
        role: 'user',
        company: 'Freelancer',
        phone: '+393478899000',
        avatar: null,
    },
};

// ==================== MOCK API RESPONSES ====================
export const apiResponses = {
    login: {
        success_admin: {
            success: true,
            token: 'mock_jwt_token_admin.payload.signature',
            user: users.admin,
        },
        success_user: {
            success: true,
            token: 'mock_jwt_token_user.payload.signature',
            user: users.standard,
        },
        failure_invalidCredentials: {
            success: false,
            message: 'Invalid credentials',
        },
        failure_accountNotVerified: {
            success: false,
            message: 'Account not verified',
        },
    },
    register: {
        success: {
            success: true,
            message: "Registrazione completata! Controlla la tua email per confermare l'account.",
        },
        failure_emailExists: {
            success: false,
            message: 'User already exists',
        },
        failure_serverError: {
            success: false,
            message: 'Internal server error',
        },
    },
    getProfile: {
        success_updated: {
            success: true,
            data: { ...users.manager, company: 'Rossi Industries' }, // Example of updated data
        },
        failure_tokenExpired: {
            success: false,
            message: 'Invalid token',
        },
    },
};

// ==================== MOCK JWT TOKENS ====================
export const jwtTokens = {
    // Expires far in the future
    valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3OTE4MDI4MDAsInVzZXJJZCI6InVzcl91c2VyXzAwMyIsInJvbGUiOiJ1c2VyIn0.mockSignature1',
    // Expires soon (e.g., for testing refresh logic) - timestamp set to 5 mins from now
    expiringSoon: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOiJ${Math.floor(Date.now() / 1000) + 5 * 60}","userId":"usr_manager_002","role":"manager"}.mockSignature2`,
    // Expired in the past
    expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NTk4MDI4MDAsInVzZXJJZCI6InVzcl9hZG1pbl8wMDEiLCJyb2xlIjoiYWRtaW4ifQ.mockSignature3',
};

// ==================== LOGIN SCENARIOS ====================
export const loginScenarios = [
    {
        description: 'Admin successful login',
        email: 'admin@coworkspace.local',
        password: 'PasswordAdmin123',
        rememberMe: true,
        expectedOutcome: 'success',
    },
    {
        description: 'Manager successful login',
        email: 'manager@coworkspace.local',
        password: 'PasswordManager456',
        rememberMe: false,
        expectedOutcome: 'success',
    },
    {
        description: 'Standard user successful login',
        email: 'user@coworkspace.local',
        password: 'PasswordUser789',
        rememberMe: true,
        expectedOutcome: 'success',
    },
    {
        description: 'Login with wrong password',
        email: 'user@coworkspace.local',
        password: 'wrongpassword',
        rememberMe: false,
        expectedOutcome: 'failure',
    },
    {
        description: 'Login with non-existent email',
        email: 'nobody@coworkspace.local',
        password: 'anypassword',
        rememberMe: false,
        expectedOutcome: 'failure',
    },
    {
        description: 'Login with empty fields',
        email: '',
        password: '',
        rememberMe: false,
        expectedOutcome: 'validation_error',
    },
];

// ==================== REGISTRATION SCENARIOS ====================
export const registrationScenarios = [
    {
        description: 'Successful registration',
        formData: {
            firstName: 'Nuovo',
            lastName: 'Utente',
            email: 'nuovo.utente@example.com',
            password: 'PasswordValida1',
            confirmPassword: 'PasswordValida1',
            phone: '3334455666',
            company: 'New Co',
        },
        expectedOutcome: 'success',
    },
    {
        description: 'Registration with mismatching passwords',
        formData: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test.user@example.com',
            password: 'PasswordValida1',
            confirmPassword: 'PasswordDiversa1',
            phone: '',
            company: '',
        },
        expectedOutcome: 'validation_error',
        expectedMessage: 'Le password non coincidono',
    },
    {
        description: 'Registration with a weak password',
        formData: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test.user@example.com',
            password: 'weak',
            confirmPassword: 'weak',
            phone: '',
            company: '',
        },
        expectedOutcome: 'validation_error',
        expectedMessage: 'La password deve essere di almeno 8 caratteri',
    },
    {
        description: 'Registration with missing required fields (e.g., lastName)',
        formData: {
            firstName: 'Test',
            lastName: '',
            email: 'test.user@example.com',
            password: 'PasswordValida1',
            confirmPassword: 'PasswordValida1',
            phone: '',
            company: '',
        },
        expectedOutcome: 'validation_error',
        expectedMessage: 'Cognome richiesto (minimo 2 caratteri)',
    },
];

// ==================== LOCALSTORAGE STATES ====================
export const localStorageStates = {
    loggedInAdmin: {
        auth_token: jwtTokens.valid,
        refresh_token: 'mock_refresh_token_admin',
        user_data: JSON.stringify(users.admin),
        remember_user: 'admin@coworkspace.local',
    },
    loggedInUser: {
        auth_token: jwtTokens.valid,
        refresh_token: 'mock_refresh_token_user',
        user_data: JSON.stringify(users.standard),
    },
    loggedOut: {
        remember_user: 'user@coworkspace.local',
    },
    empty: {},
};

// ==================== ERROR MOCKS ====================
export const errorMocks = [
    { raw: 'Network request failed', expected: 'Problema di connessione. Verifica la tua rete.' },
    { raw: 'fetch failed', expected: 'Impossibile contattare il server.' },
    { raw: 'Invalid credentials', expected: 'Email o password non corrette.' },
    { raw: 'User already exists', expected: 'Un account con questa email esiste già.' },
    { raw: 'An unexpected error occurred', expected: 'An unexpected error occurred' },
];