import { defineConfig, devices } from '@playwright/test';
import { harnessServer } from './e2e/harness-server';

// The right to left projects serve the harness turned round and run the specs written for that, which is
// right-to-left.spec.ts. They do not run the rest of the canvas folder: those specs reach into the page by physical
// coordinate, tapping at x: 1 for the start of a line and pressing ArrowRight to move forward, and on a turned round
// page both mean the opposite. 195 of them fail that way, and none of the failures was the canvas being wrong.
// Growing the coverage means writing a spec in this file, not widening the match. See #151.
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
    { name: 'firefox-rtl', testMatch: RIGHT_TO_LEFT, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-rtl', testMatch: RIGHT_TO_LEFT, use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run build:css && ${harnessServer()}`,
    url: 'http://localhost:5179',
    reuseExistingServer: !process.env.CI,
  },
});
