import { defineConfig, devices } from '@playwright/test'

const frontendPort = process.env.E2E_FRONTEND_PORT || '3041'
const backendPort = process.env.E2E_BACKEND_PORT || '3040'
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${frontendPort}`
const backendURL = process.env.BACKEND_URL || `http://127.0.0.1:${backendPort}`
const reuseExistingBackendServer = process.env.E2E_REUSE_BACKEND_SERVER === 'true'
const reuseExistingFrontendServer = process.env.E2E_REUSE_FRONTEND_SERVER === 'true'
const testMongoURI =
  process.env.TEST_MONGODB_URI ||
  'mongodb://admin:password@127.0.0.1:27038/e2e?authSource=admin'

process.env.TEST_MONGODB_URI = testMongoURI
const backendCommand =
  process.env.E2E_BACKEND_COMMAND ||
  `NODE_ENV=test TEST_MONGODB_URI=${testMongoURI} BACKEND_PORT=${backendPort} node backend/index.js`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    timezoneId: 'Europe/Helsinki',
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: backendCommand,
      url: `${backendURL}/`,
      reuseExistingServer: reuseExistingBackendServer,
      timeout: 120_000,
    },
    {
      command:
        `PORT=${frontendPort} BACKEND_PORT=${backendPort} DEV_FRONTEND_PROXY=http://127.0.0.1 yarn dev:ui --host 127.0.0.1`,
      url: baseURL,
      reuseExistingServer: reuseExistingFrontendServer,
      timeout: 120_000,
    },
  ],
  globalSetup: './e2e/global-setup.js',
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
})
