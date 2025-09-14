module.exports = async () => {
    console.log('🚀 Global setup for integration tests...');
    // Non fare setup qui, lo faremo in beforeAll di ogni file test
    console.log('✅ Global setup completed');
};
