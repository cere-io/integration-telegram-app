import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const env = process.env.TEST_ENV || 'dev';
const isCI = process.env.CI === 'true';
const isLambda = process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

const envConfigs = {
  dev: {
    baseURL: 'https://telegram-viewer-app.stage.cere.io',
    campaignId: '120',
  },
  stage: {
    baseURL: 'https://telegram-viewer-app.stage.cere.io',
    campaignId: '120',
  },
  prod: {
    baseURL: 'https://telegram-viewer-app.cere.io',
    campaignId: '40',
  },
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: !isLambda,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: isLambda ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { outputDir: './playwright-reports' }], ['json', { outputFile: 'test-results.json' }], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: envConfigs[env as keyof typeof envConfigs].baseURL,
    trace: 'on-first-retry',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 15000,
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: !isLambda
    ? {
        command: 'npm run start',
        url: envConfigs[env as keyof typeof envConfigs].baseURL,
        reuseExistingServer: !isCI,
        timeout: 120000,
      }
    : undefined,
});
