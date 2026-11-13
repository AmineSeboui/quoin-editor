import { defineConfig, devices } from '@playwright/test';
import { harnessPort, harnessServer } from './e2e/harness-server';

// The right to left projects serve the harness turned round and run the whole canvas folder, so a regression anywhere
// in the canvas is caught both ways. The canvas specs say what they mean, the start of a line or the arrow that moves
// on, through the helpers in e2e/support rather than by a coordinate or a key. Code blocks read left to right whatever
// the page does, so their specs press and type as on a left to right page. The spec written for a page turned round
// alone runs only there, and the ordinary projects leave it out.
const RIGHT_TO_LEFT_ONLY = /canvas[\\/]right-to-left\.spec\.ts$/;
const CANVAS = /canvas[\\/].*\.spec\.ts$/;

export default defineConfig({
  testDir: 'e2e/tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${harnessPort()}`,
    // A run that traces every test pays for it on the ones that pass, and a flake is caught by the retry anyway.
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', testIgnore: RIGHT_TO_LEFT_ONLY, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: RIGHT_TO_LEFT_ONLY, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: RIGHT_TO_LEFT_ONLY, use: { ...devices['Desktop Safari'] } },
    { name: 'chromium-rtl', testMatch: CANVAS, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-rtl', testMatch: CANVAS, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-rtl', testMatch: CANVAS, use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run build:css && ${harnessServer()}`,
    url: `http://localhost:${harnessPort()}`,
    reuseExistingServer: !process.env.CI,
  },
});
