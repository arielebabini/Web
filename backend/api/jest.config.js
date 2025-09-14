module.exports = {
    testEnvironment: 'node',

    projects: [
        {
            displayName: 'unit',
            testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
            setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
            collectCoverageFrom: [
                'src/**/*.js',
                '!src/**/*.test.js',
                '!src/config/**',
                '!src/utils/logger.js'
            ],
            coverageDirectory: 'coverage/unit'
        },
        {
            displayName: 'integration',
            testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
            setupFiles: ['<rootDir>/tests/setup/setEnvVars.js'],
            globalSetup: '<rootDir>/tests/setup/global.setup.js',
            globalTeardown: '<rootDir>/tests/setup/global.teardown.js',
            collectCoverageFrom: [
                'src/**/*.js',
                '!src/**/*.test.js',
                '!src/config/**',
                '!src/utils/logger.js'
            ],
            coverageDirectory: 'coverage/integration',
            maxWorkers: 1,
            maxConcurrency: 1,    // Solo 1 test suite alla volta
            testTimeout: 60000
        }
    ],

    collectCoverage: false,
    clearMocks: true,
    restoreMocks: true,
    verbose: true,
    coverageDirectory: 'coverage/combined',
    coverageReporters: ['text', 'lcov', 'html']
};
