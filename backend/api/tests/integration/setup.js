const { setupTestDB } = require('../helpers/database');

// Setup globale prima di tutti i test di integrazione
beforeAll(async () => {
    console.log('🚀 Setting up integration test environment...');

    // Setup database di test
    await setupTestDB();

    console.log('✅ Integration test environment ready');
}, 60000); // 60 secondi timeout per setup

// tests/integration/teardown.js
const { teardownTestDB } = require('../helpers/database');

module.exports = async () => {
    console.log('🧹 Cleaning up integration test environment...');
    await teardownTestDB();
    console.log('✅ Integration test environment cleaned');
};