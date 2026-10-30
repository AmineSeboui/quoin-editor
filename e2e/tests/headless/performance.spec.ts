import { expect, test, type Page } from '@playwright/test';
import { BASELINE_MS, calibrationMs } from '../../support/calibration';
import { caretAt, openHeadless } from '../../support/headless';

// A shared runner is several times slower than the development machine, so there the 1,000 block document is judged
// against the same typing in a 40 block one from the same run. Twenty five times the blocks costs about 3.5 times the
// time, and a single round lands between 3 and 4.8, so a round that is over the limit is measured again: noise only
// adds time, and a cost that grows with the document is over the limit in every round. The 16 ms budget is also scaled
// by how much slower the runner is than the development machine at a fixed DOM workload, never below 1.
const SLOWDOWN_LIMIT = 4;
const ROUNDS = 6;
const CAP_MS = 80;
const FRAME_MS = 16;
const GATE =
  'The 16 ms p95 budget is enforced when CI is not set. A shared runner is held to 16 ms scaled by a calibration, ' +
  'to a ratio against a 40 block document and to a cap.';
const SENTENCE = 'The quick brown fox jumps over the lazy dog again and again.';

const p95 = (timings: number[]) => [...timings].sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];

async function typingP95(page: Page, doc: string, block: number, extra: string): Promise<number> {
  await openHeadless(page, doc, extra);
  await caretAt(page, block, 0);
  await page.evaluate(() => (window.__quoin.timings = []));
  await page.keyboard.type(SENTENCE);
  const timings = await page.evaluate(() => window.__quoin.timings as number[]);
  expect(timings.length).toBeGreaterThanOrEqual(60);
  return p95(timings);
}

const note = (type: string, description: string) => test.info().annotations.push({ type, description });

type Round = {
  readonly small: number;
  readonly large: number;
  readonly ratio: number;
  readonly scale: number;
  readonly budget: number;
};

const passes = ({ ratio, large, budget }: Round) => ratio < SLOWDOWN_LIMIT && large < budget;

async function measureRound(page: Page, extra: string): Promise<Round> {
  const small = await typingP95(page, 'forty', 20, extra);
  const large = await typingP95(page, 'large', 500, extra);
  const scale = Math.max(1, (await calibrationMs(page)) / BASELINE_MS);
  return { small, large, ratio: large / small, scale, budget: FRAME_MS * scale };
}

async function expectShared(page: Page, extra: string) {
  if (extra !== '') expect(await page.evaluate(() => window.__quoin.sharedText?.(500))).toContain(SENTENCE);
  if (extra.includes('presence')) await expect(page.locator('.quoin-presence-caret')).toHaveCount(5);
}

// With collaboration on, each keystroke is also written to a Yjs document that sends its update to a second one. Five
// collaborators shown add their selections and carets, one of them in the block being typed in, carried by each key.
const SETTINGS = [
  ['', ''],
  [' with collaboration on', 'collab=1'],
  [' with five collaborators shown', 'collab=1&presence=5'],
];

for (const [setting, extra] of SETTINGS) {
  test(`typing in a 1,000 block document${setting} stays under one frame`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the budget is set for Chromium');
    note('gate', GATE);
    if (!process.env.CI) {
      const large = await typingP95(page, 'large', 500, extra);
      note('p95 of 1,000 blocks', `${large.toFixed(1)} ms`);
      expect(large).toBeLessThan(FRAME_MS);
      await expectShared(page, extra);
      return;
    }
    test.setTimeout(120_000);
    await typingP95(page, 'forty', 20, extra);
    const rounds: Round[] = [];
    while (rounds.length < ROUNDS && !rounds.some(passes)) {
      rounds.push(await measureRound(page, extra));
    }
    rounds.forEach(({ small, large, ratio, scale, budget }, index) =>
      note(
        `round ${index + 1}`,
        `40 blocks ${small.toFixed(1)} ms, 1,000 blocks ${large.toFixed(1)} ms, ratio ${ratio.toFixed(2)}, ` +
          `scale ${scale.toFixed(2)}, budget ${budget.toFixed(1)} ms`,
      ),
    );
    const best = rounds.find(passes) ?? rounds.reduce((lowest, round) => (round.ratio < lowest.ratio ? round : lowest));
    note('p95 of 40 blocks', `${best.small.toFixed(1)} ms`);
    note('p95 of 1,000 blocks', `${best.large.toFixed(1)} ms`);
    note('ratio', best.ratio.toFixed(2));
    note('calibration scale', best.scale.toFixed(2));
    note('calibrated budget', `${best.budget.toFixed(1)} ms`);
    expect(best.ratio).toBeLessThan(SLOWDOWN_LIMIT);
    expect(best.large).toBeLessThan(CAP_MS);
    expect(best.large).toBeLessThan(best.budget);
    await expectShared(page, extra);
  });
}

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
