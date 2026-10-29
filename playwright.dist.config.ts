import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const smoke = [
  'smoke.spec.ts',
  'headless/typing.spec.ts',
  'canvas/bubble.spec.ts',
  'canvas/slash.spec.ts',
  'canvas/drag.spec.ts',
  'canvas/session.spec.ts',
  'canvas/table.spec.ts',
  'canvas/image-block.spec.ts',
  'canvas/platform-together.spec.ts',
  'canvas/emoji.spec.ts',
];

/** The harness over the built package: `smoke` runs a few specs of each kind, `chromium` the whole suite. */
export default defineConfig({
  ...base,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report-dist' }]] : 'list',
  use: { ...base.use, baseURL: 'http://localhost:5180' },
  projects: [
    { name: 'smoke', testMatch: smoke.map((spec) => `**/${spec}`), use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'vite --config e2e/vite.config.ts --mode dist',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
  },
});
