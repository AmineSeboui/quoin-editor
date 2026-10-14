import { expect, test, type Page } from '@playwright/test';
import { caretAt, openHeadless } from '../../support/headless';

// A shared runner is several times slower than the development machine, so there the 1,000 block document is judged
// against the same typing in a 40 block one from the same run. Healthy runs measure 3.5 to 4.5 times under the 6 times CPU
// slowdown that reproduces CI's 17 to 19 ms, so the allowance is wider than 4 to leave room for a noisy neighbour.
const SLOWDOWN_LIMIT = 8;
const CAP_MS = 80;
const GATE =
  'The 16 ms p95 budget is enforced when CI is not set. A shared runner is held to a ratio against a 40 block document and to a cap.';
const SENTENCE = 'The quick brown fox jumps over the lazy dog again and again.';

const p95 = (timings: number[]) => [...timings].sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];

async function typingP95(page: Page, doc: string, block: number): Promise<number> {
  await openHeadless(page, doc);
  await caretAt(page, block, 0);
  await page.evaluate(() => (window.__quoin.timings = []));
  await page.keyboard.type(SENTENCE);
  const timings = await page.evaluate(() => window.__quoin.timings as number[]);
  expect(timings.length).toBeGreaterThanOrEqual(60);
  return p95(timings);
}

const note = (type: string, description: string) => test.info().annotations.push({ type, description });

test('typing in a 1,000 block document stays under one frame', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'the budget is set for Chromium');
  note('gate', GATE);
  if (!process.env.CI) {
    const large = await typingP95(page, 'large', 500);
    note('p95 of 1,000 blocks', `${large.toFixed(1)} ms`);
    expect(large).toBeLessThan(16);
    return;
  }
  await typingP95(page, 'forty', 20);
  const small = await typingP95(page, 'forty', 20);
  const large = await typingP95(page, 'large', 500);
  note('p95 of 40 blocks', `${small.toFixed(1)} ms`);
  note('p95 of 1,000 blocks', `${large.toFixed(1)} ms`);
  note('ratio', (large / small).toFixed(2));
  expect(large).toBeLessThan(SLOWDOWN_LIMIT * small);
  expect(large).toBeLessThan(CAP_MS);
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
