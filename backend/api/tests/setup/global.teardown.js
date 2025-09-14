// tests/setup/global.teardown.js

module.exports = async () => {
    console.log('Cleaning up global test environment...');

    try {
        // NON chiamare teardownGlobal() qui perché causa conflitti
        // Il pool viene gestito individualmente da ogni file di test
        console.log('Global teardown completed');
    } catch (error) {
        console.error('Global teardown failed:', error);
    }
};