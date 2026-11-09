import { defineConfig, devices } from '@playwright/test';
import { harnessServer } from './e2e/harness-server';

// The canvas on a right to left page. A project named for the direction serves the harness turned round, so the canvas
// mounts that way rather than being flipped afterwards, which is what the menus read as they mount. The specs run
// there and nowhere else, so they are written once and never run against the direction they were not written for.
const RIGHT_TO_LEFT = /canvas[\\/]right-to-left\.spec\.ts$/;

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
    { name: 'chromium', testIgnore: RIGHT_TO_LEFT, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: RIGHT_TO_LEFT, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: RIGHT_TO_LEFT, use: { ...devices['Desktop Safari'] } },
    { name: 'chromium-rtl', testMatch: RIGHT_TO_LEFT, use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-rtl', testMatch: RIGHT_TO_LEFT, use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run build:css && ${harnessServer()}`,
    url: 'http://localhost:5179',
    reuseExistingServer: !process.env.CI,
  },
});
