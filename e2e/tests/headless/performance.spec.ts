import { expect, test } from '@playwright/test';
import { caretAt, openHeadless } from '../../support/headless';

test('typing in a 1,000 block document stays under one frame', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'the budget is set for Chromium');
  await openHeadless(page, 'large');
  await caretAt(page, 500, 0);
  await page.evaluate(() => (window.__quoin.timings = []));
  await page.keyboard.type('The quick brown fox jumps over the lazy dog again and again.');
  const timings = await page.evaluate(() => window.__quoin.timings as number[]);
  const sorted = [...timings].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  expect(timings.length).toBeGreaterThanOrEqual(60);
  expect(p95).toBeLessThan(16);
});

test('Enter near the top of a 1,000 block document stays under one frame', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'the budget is set for Chromium');
  test.skip(Boolean(process.env.CI), 'a shared runner is several times slower, so the frame budget is a gate for the development machine');
  await openHeadless(page, 'large');
  await caretAt(page, 2, 5);
  await page.evaluate(() => (window.__quoin.timings = []));
  for (let i = 0; i < 20; i++) await page.keyboard.press('Enter');
  const timings = await page.evaluate(() => window.__quoin.timings as number[]);
  const sorted = [...timings].sort((a, b) => a - b);
  expect(timings.length).toBeGreaterThanOrEqual(20);
  expect(sorted[Math.floor(sorted.length * 0.95)]).toBeLessThan(16);
});
