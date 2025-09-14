// api/playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
    // Test directory
    testDir: './tests/e2e',

    // Run tests in files in parallel
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Opt out of parallel tests on CI
    workers: process.env.CI ? 1 : undefined,

    // Global test timeout
    timeout: 30 * 1000,

    // Expect timeout for assertions
    expect: {
        timeout: 5 * 1000,
    },

    // Reporter to use
    reporter: [
        ['html', {
            open: 'never',
            outputFolder: 'playwright-report'
        }],
        ['json', {
            outputFile: 'test-results/results.json'
        }],
        ['junit', {
            outputFile: 'test-results/junit.xml'
        }],
        process.env.CI ? ['github'] : ['list']
    ],

    // Shared settings for all the projects below
    use: {
        // Base URL to use in actions like `await page.goto('/')`
        baseURL: process.env.FRONTEND_URL || 'http://localhost:3001',

        // Collect trace when retrying the failed test
        trace: 'on-first-retry',

        // Record video on failure
        video: 'retain-on-failure',

        // Take screenshot on failure
        screenshot: 'only-on-failure',

        // Ignore HTTPS errors
        ignoreHTTPSErrors: true,

        // Default navigation timeout
        navigationTimeout: 15 * 1000,

        // Default action timeout
        actionTimeout: 10 * 1000,
    },

    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },

        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },

        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },

        // Test against mobile viewports
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },

        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },

        // Test against branded browsers
        {
            name: 'Microsoft Edge',
            use: { ...devices['Desktop Edge'], channel: 'msedge' },
        },

        {
            name: 'Google Chrome',
            use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        },
    ],

    // Global setup and teardown
    globalSetup: require.resolve('./tests/e2e/global-setup.js'),
    globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),

    // Run your local dev server before starting the tests
    webServer: process.env.CI ? undefined : {
        command: 'npm run dev',
        port: 3001,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },

    // Test output directory
    outputDir: 'test-results/',
});