import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Digital Asset Due Diligence Tool
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration - generates HTML report
  reporter: [
    ['list'],
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never' // Change to 'always' to auto-open after tests
    }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // Test timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000
  },

  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
