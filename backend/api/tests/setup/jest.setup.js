// api/tests/setup/jest.setup.js


// Setup globale per ogni test
beforeEach(async () => {
    // Reset del database per ogni test
    if (global.testDB) {
        await global.testDB.resetDatabase();
    }
});

afterEach(async () => {
    // Cleanup dopo ogni test
    jest.clearAllMocks();
});
