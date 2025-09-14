const jwt = require('jsonwebtoken');

const createTestToken = (payload = {}) => {
    const defaultPayload = {
        id: 1,
        email: 'test@example.com',
        role: 'client',
        ...payload
    };

    return jwt.sign(
        defaultPayload,
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '1h' }
    );
};

const createAdminToken = () => {
    return createTestToken({
        id: 1,
        email: 'admin@test.com',
        role: 'admin'
    });
};

const createClientToken = () => {
    return createTestToken({
        id: 2,
        email: 'client@test.com',
        role: 'client'
    });
};

const createManagerToken = () => {
    return createTestToken({
        id: 3,
        email: 'manager@test.com',
        role: 'manager'
    });
};

const authHeaders = (token) => {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

module.exports = {
    createTestToken,
    createAdminToken,
    createClientToken,
    createManagerToken,
    authHeaders
};
