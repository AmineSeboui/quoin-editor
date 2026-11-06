import { defineConfig, devices } from '@playwright/test';
import { harnessServer } from './e2e/harness-server';

export default defineConfig({
  testDir: 'e2e/tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5179',
    // A run that traces every test pays for it on the ones that pass, and a flake is caught by the retry anyway.
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run build:css && ${harnessServer()}`,
    url: 'http://localhost:5179',
    reuseExistingServer: !process.env.CI,
  },
});
