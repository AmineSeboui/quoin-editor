import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, caretSettled, openEditor } from '../../support/editor';

const panel = (page: Page) => page.getByRole('search', { name: 'Find and replace' });
const query = (page: Page) => panel(page).getByRole('textbox', { name: 'Find' });
const status = (page: Page) => panel(page).locator('[data-quoin-find-status]');
const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const markdownOf = async (page: Page) => (await blocks(page)).map((block) => block.data.markdown);

async function openFind(page: Page, doc = 'find', extra = '') {
  await openEditor(page, doc, `find=1${extra}`);
  const first = host(page, doc === 'find' ? 'a' : 'p0');
  await first.click();
  await caretSettled(page, first);
  const block = doc === 'find' ? 'a' : 'p0';
  await page.evaluate((id) => window.__quoin.controller?.focus({ block: id, region: 'text', offset: 0 }), block);
  await page.keyboard.press('ControlOrMeta+Shift+F');
  await expect(query(page)).toBeFocused();
}

test('finds, steps through the matches and replaces them all in one undo step', async ({ page }) => {
  await openFind(page);
  await page.keyboard.type('cat');
  await expect(status(page)).toHaveText('1 of 4');
  await expect(page.locator('.quoin-find-match')).toHaveCount(4);
  await expect(host(page, 'a').locator('.quoin-find-current')).toHaveText('cat');

  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveText('2 of 4');
  await expect(host(page, 'a').locator('strong .quoin-find-current, .quoin-find-current strong').first()).toHaveText(
    'cat',
  );
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.press('Shift+Enter');
  await expect(status(page)).toHaveText('4 of 4');
  await expect(host(page, 'z').locator('.quoin-find-current')).toBeInViewport();
  await expect(query(page)).toBeFocused();

  await panel(page).getByRole('textbox', { name: 'Replace with' }).fill('dog');
  await panel(page).getByRole('button', { name: 'Replace all' }).click();
  await expect(status(page)).toHaveText('No results');
  const replaced = await markdownOf(page);
  expect([replaced[0], replaced[1], replaced.at(-1)]).toEqual([
    'A dog sat on the **dog** mat',
    'The dog came back',
    'The last dog',
  ]);

  await host(page, 'b').click();
  await caretSettled(page, host(page, 'b'));
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await markdownOf(page))[0]).toBe('A cat sat on the **cat** mat');
  const restored = await markdownOf(page);
  expect([restored[1], restored.at(-1)]).toEqual(['The cat came back', 'The last cat']);
});

test('undoes and redoes a Replace all from the panel, which keeps focus', async ({ page }) => {
  await openFind(page);
  await page.keyboard.type('cat');
  await panel(page).getByRole('textbox', { name: 'Replace with' }).fill('dog');
  await panel(page).getByRole('button', { name: 'Replace all' }).click();
  await expect(status(page)).toHaveText('No results');
  await expect(panel(page).getByRole('button', { name: 'Replace all' })).toBeFocused();
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await markdownOf(page))[0]).toBe('A cat sat on the **cat** mat');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect.poll(async () => (await markdownOf(page))[0]).toBe('A dog sat on the **dog** mat');
  await expect(panel(page)).toBeVisible();
});

test('replaces the current match on Enter in the replace field and moves to the next', async ({ page }) => {
  await openFind(page);
  await page.keyboard.type('cat');
  await panel(page).getByRole('textbox', { name: 'Replace with' }).fill('cow');
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveText('1 of 3');
  await expect.poll(async () => (await markdownOf(page))[0]).toBe('A cow sat on the **cat** mat');
});

test('Escape closes the panel, clears the marks and selects the current match', async ({ page }) => {
  await openFind(page);
  await page.keyboard.type('cat');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(page.locator('.quoin-find-match')).toHaveCount(0);
  await expect(host(page, 'b')).toBeFocused();
  await page.keyboard.type('dog');
  await expect.poll(async () => (await markdownOf(page))[1]).toBe('The dog came back');
});

test('has no axe violations with matches, without, with an invalid pattern, and read-only', async ({ page }) => {
  await openFind(page);
  await page.keyboard.type('cat');
  await expect(status(page)).toHaveText('1 of 4');
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await query(page).fill('dog');
  await expect(status(page)).toHaveText('No results');
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await panel(page).getByRole('button', { name: 'Regular expression' }).click();
  await query(page).fill('ca(');
  await expect(status(page)).toHaveText('Invalid regular expression');
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);

  await openFind(page, 'find', '&readonly=1');
  await page.keyboard.type('cat');
  await expect(status(page)).toHaveText('1 of 4');
  await expect(panel(page).getByRole('textbox', { name: 'Replace with' })).toHaveCount(0);
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
});

// The same measure as the typing budget of the headless suite: on a shared runner a 1,000 block document is judged
// against a 40 block one, here with the panel open on a query every block matches, and a round over the limit is
// measured again, since noise only adds time.
const SLOWDOWN_LIMIT = 4;
const ROUNDS = 6;
const SENTENCE = 'The quick brown fox jumps over the lazy dog again and again.';
const p95 = (timings: number[]) => [...timings].sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];

async function typingWithPanelOpen(page: Page, doc: string, block: string): Promise<number> {
  await openFind(page, doc);
  await page.keyboard.type('words');
  await expect(status(page)).toHaveText(/^1 of \d/);
  await host(page, block).click();
  await caretSettled(page, host(page, block));
  await page.evaluate(() => (window.__quoin.timings = []));
  await page.keyboard.type(SENTENCE);
  const timings = await page.evaluate(() => window.__quoin.timings ?? []);
  expect(timings.length).toBeGreaterThanOrEqual(60);
  await expect(panel(page)).toBeVisible();
  return p95(timings);
}

test('typing in a 1,000 block document with the panel open keeps the typing budget', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'the budget is set for Chromium');
  test.setTimeout(120_000);
  const large = await typingWithPanelOpen(page, 'large', 'p500');
  test.info().annotations.push({ type: 'p95 of 1,000 blocks', description: `${large.toFixed(1)} ms` });
  if (!process.env.CI) {
    expect(large).toBeLessThan(16);
    return;
  }
  const ratios: number[] = [];
  while (ratios.length < ROUNDS && !ratios.some((ratio) => ratio < SLOWDOWN_LIMIT)) {
    const small = await typingWithPanelOpen(page, 'forty', 'p20');
    ratios.push((await typingWithPanelOpen(page, 'large', 'p500')) / small);
  }
  test.info().annotations.push({ type: 'ratios', description: ratios.map((ratio) => ratio.toFixed(2)).join(', ') });
  expect(Math.min(...ratios)).toBeLessThan(SLOWDOWN_LIMIT);
});
