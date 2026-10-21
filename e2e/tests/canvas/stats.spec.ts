import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, caretSettled, openEditor } from '../../support/editor';
import { pasteEvent } from '../../support/synthetic-events';

const footer = (page: Page) => page.locator('[data-quoin-stats]');
const count = (page: Page) => footer(page).locator('span').nth(1);
const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const markdownOf = async (page: Page) => (await blocks(page)).map((block) => String(block.data.markdown));

async function openStats(page: Page, extra = '', doc = 'sample', block = 'b') {
  await openEditor(page, doc, `stats=1${extra}`);
  await host(page, block).click();
  await caretSettled(page, host(page, block));
  await page.keyboard.press('End');
}

test('counts the words, characters and blocks under the document as it changes', async ({ page }) => {
  await openStats(page);
  await expect(footer(page)).toHaveText(/3 words.*21 characters.*2 blocks/);
  await page.keyboard.type(' More');
  await expect(footer(page)).toHaveText(/4 words.*26 characters.*2 blocks/);
  await page.keyboard.press('Enter');
  await expect(footer(page)).toHaveText(/3 blocks$/);
});

test('refuses a paste that would overflow the limit, whole, and lets a deletion through', async ({ page }) => {
  await openStats(page, '&limit=25');
  await expect(count(page)).toHaveText('21 / 25 characters');
  await pasteEvent(page, { 'text/plain': ' extra' });
  await expect(page.getByRole('status')).toHaveText('Character limit of 25 reached');
  expect(await markdownOf(page)).toEqual(['# Title', 'First paragraph.']);
  await expect(host(page, 'b')).toHaveText('First paragraph.');
  await pasteEvent(page, { 'text/plain': ' ok' });
  await expect.poll(() => markdownOf(page)).toEqual(['# Title', 'First paragraph. ok']);
  await page.keyboard.type('abc');
  await expect.poll(() => markdownOf(page)).toEqual(['# Title', 'First paragraph. oka']);
  await expect(host(page, 'b')).toHaveText('First paragraph. oka');
  await expect(count(page)).toHaveText('25 / 25 characters');
  await page.keyboard.press('Backspace');
  await expect.poll(() => markdownOf(page)).toEqual(['# Title', 'First paragraph. ok']);
  await page.keyboard.type('Z');
  await expect.poll(() => markdownOf(page)).toEqual(['# Title', 'First paragraph. okZ']);
});

test.describe('a composition past the limit', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP IME input is Chromium only');

  test('is refused whole, the line is drawn again from the model and typing goes on', async ({ page }) => {
    await openStats(page, '&limit=22');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '\u306b', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: '\u306b\u307b', selectionStart: 2, selectionEnd: 2 });
    await cdp.send('Input.insertText', { text: '\u65e5\u672c' });
    await expect(host(page, 'b')).toHaveText('First paragraph.');
    expect(await markdownOf(page)).toEqual(['# Title', 'First paragraph.']);
    await page.keyboard.type('!');
    await expect.poll(() => markdownOf(page)).toEqual(['# Title', 'First paragraph.!']);
    await expect(host(page, 'b')).toHaveText('First paragraph.!');
  });
});

test('focus mode dims every other block while the canvas holds focus', async ({ page }) => {
  await openStats(page, '&focus=1', 'large', 'p1');
  const opacity = (id: string) =>
    page.locator(`[data-block-id="${id}"]`).evaluate((shell) => Number(getComputedStyle(shell).opacity));
  await expect(page.locator('[data-block-id="p1"]')).not.toHaveAttribute('data-quoin-dimmed');
  await expect(page.locator('[data-block-id="p0"]')).toHaveAttribute('data-quoin-dimmed', '');
  await expect.poll(() => opacity('p0')).toBeCloseTo(0.4);
  expect(await opacity('p1')).toBe(1);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-block-id="p2"]')).not.toHaveAttribute('data-quoin-dimmed');
  await expect(page.locator('[data-block-id="p1"]')).toHaveAttribute('data-quoin-dimmed', '');
  await page.getByRole('textbox', { name: 'After the editor' }).focus();
  await expect.poll(() => opacity('p0')).toBe(1);
});

test('focus mode leaves a read-only canvas as it is', async ({ page }) => {
  await openEditor(page, 'sample', 'stats=1&focus=1&readonly=1');
  await host(page, 'b').click();
  const opacity = await page.locator('[data-block-id="a"]').evaluate((shell) => getComputedStyle(shell).opacity);
  expect(opacity).toBe('1');
});

test('turns typed forms into typographic ones when asked', async ({ page }) => {
  await openStats(page, '&typography=1');
  await page.keyboard.type(' ...');
  await expect.poll(async () => (await markdownOf(page))[1]).toBe('First paragraph. \u2026');
});

test('has no axe violations with and without a limit, near and at it, and in focus mode', async ({ page }) => {
  await openStats(page);
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await openStats(page, '&limit=100');
  await expect(count(page)).not.toHaveAttribute('aria-live');
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await openStats(page, '&limit=23');
  await expect(count(page)).toHaveAttribute('aria-live', 'polite');
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await page.keyboard.type('abc');
  await expect(count(page)).toHaveText('23 / 23 characters');
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await openStats(page, '&focus=1');
  await expect(page.locator('[data-block-id="a"]')).toHaveAttribute('data-quoin-dimmed', '');
  expect(await focusModeViolations(page)).toEqual([]);
});

// Dimming lowers the contrast of the blocks it fades, which is what it is for, so contrast is checked everywhere else.
async function focusModeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.allSettled(document.getAnimations().map((animation) => animation.finished)));
  const scan = () => new AxeBuilder({ page }).include('.quoin');
  const rest = await scan().disableRules(['color-contrast']).analyze();
  const contrast = await scan().exclude('[data-quoin-dimmed]').withRules(['color-contrast']).analyze();
  return [...rest.violations, ...contrast.violations].map((violation) => violation.id);
}

// The measure of the typing budget in find.spec.ts: a 1,000 block document judged against a 40 block one, here with
// the footer, a limit and focus mode all on.
const SLOWDOWN_LIMIT = 4;
const ROUNDS = 6;
const SENTENCE = 'The quick brown fox jumps over the lazy dog again and again.';
const p95 = (timings: number[]) => [...timings].sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];

async function typingWithEverythingOn(page: Page, doc: string, block: string): Promise<number> {
  await openStats(page, '&limit=1000000&focus=1', doc, block);
  await page.evaluate(() => (window.__quoin.timings = []));
  await page.keyboard.type(SENTENCE);
  const timings = await page.evaluate(() => window.__quoin.timings ?? []);
  expect(timings.length).toBeGreaterThanOrEqual(60);
  await expect(footer(page)).toBeVisible();
  return p95(timings);
}

test('typing in a 1,000 block document with stats, a limit and focus mode keeps the typing budget', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'the budget is set for Chromium');
  test.setTimeout(120_000);
  const large = await typingWithEverythingOn(page, 'large', 'p500');
  test.info().annotations.push({ type: 'p95 of 1,000 blocks', description: `${large.toFixed(1)} ms` });
  if (!process.env.CI) {
    expect(large).toBeLessThan(16);
    return;
  }
  const ratios: number[] = [];
  while (ratios.length < ROUNDS && !ratios.some((ratio) => ratio < SLOWDOWN_LIMIT)) {
    const small = await typingWithEverythingOn(page, 'forty', 'p20');
    ratios.push((await typingWithEverythingOn(page, 'large', 'p500')) / small);
  }
  test.info().annotations.push({ type: 'ratios', description: ratios.map((ratio) => ratio.toFixed(2)).join(', ') });
  expect(Math.min(...ratios)).toBeLessThan(SLOWDOWN_LIMIT);
});
