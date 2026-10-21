import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, caretSettled, openEditor } from '../../support/editor';

const PARTY_POPPER = '\u{1F389}';
const SMILEY = '\u{1F603}';
// The dataset module the dev server serves when the menu or the picker first loads the emoji.
const DATASET = /\/src\/emoji\/data\.ts/;

const menu = (page: Page) => page.getByRole('listbox', { name: 'Emoji' });
const popup = (page: Page) => menu(page).locator('..');
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose icon' });
const search = (page: Page) => picker(page).getByRole('textbox', { name: 'Search emoji' });
const dataOf = async (page: Page, id: string) => (await blocks(page)).find((block) => block.id === id)?.data;

async function typeIn(page: Page, doc = 'empty', extra = '') {
  await openEditor(page, doc, `emoji=1${extra}`);
  const host = page.locator('[data-quoin-host]').first();
  await host.click();
  await caretSettled(page, host);
  return host;
}

async function openPicker(page: Page) {
  await openEditor(page, 'text', 'emoji=1');
  const host = page.locator('[data-block-id="c"] [data-quoin-host]');
  await host.click();
  await caretSettled(page, host);
  await page.keyboard.press('ControlOrMeta+/');
  await page.getByRole('menuitem', { name: 'Choose icon' }).click();
  await expect(search(page)).toBeFocused();
  await expect(picker(page).getByRole('grid').first()).toBeVisible();
  return host;
}

test(':tada then Enter inserts the party popper character', async ({ page }) => {
  await typeIn(page);
  await page.keyboard.type(':tada');
  await expect(menu(page).getByRole('option', { selected: true })).toHaveAccessibleName('tada');
  await page.keyboard.press('Enter');
  await expect(menu(page)).toHaveCount(0);
  await page.keyboard.type('!');
  await expect.poll(async () => (await blocks(page))[0].data.markdown).toBe(`${PARTY_POPPER}!`);
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await blocks(page))[0].data.markdown).toBe(':tada');
});

test('a time and a web address type on without opening the menu, which then opens after a space', async ({ page }) => {
  await typeIn(page);
  await page.keyboard.type('At 10:30');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await page.keyboard.type(' see https://quoin.dev');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await page.keyboard.type(' :smi');
  await expect(menu(page).getByRole('option').first()).toContainText(SMILEY);
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  await expect.poll(async () => (await blocks(page))[0].data.markdown).toBe('At 10:30 see <https://quoin.dev> :smi');
});

test('the menu says it loads the emoji until they come', async ({ page }) => {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route(DATASET, async (route) => {
    await released;
    await route.continue();
  });
  await typeIn(page);
  await page.keyboard.type(':tada');
  await expect(popup(page).getByText('Loading emoji\u2026')).toBeVisible();
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  release();
  await expect(menu(page).getByRole('option').first()).toHaveAccessibleName('tada');
  await expect(popup(page).getByText('Loading emoji\u2026')).toHaveCount(0);
});

test('a dataset that cannot load says so, and the canvas goes on taking text', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(DATASET, (route) => route.abort());
  const host = await typeIn(page);
  await page.keyboard.type(':ta');
  await expect(popup(page).getByText('Emoji could not be loaded')).toBeVisible();
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await page.keyboard.type(' more');
  await expect(menu(page)).toHaveCount(0);
  await expect(host).toBeFocused();
  await expect.poll(async () => (await blocks(page))[0].data.markdown).toBe(':ta more');
  expect(errors).toEqual([]);
});

test('no menu opens while a composition is under way', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP IME input is Chromium only');
  await typeIn(page);
  const cdp = await page.context().newCDPSession(page);
  for (const text of [':', ':t', ':ta', ':tad']) {
    await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    await expect(page.getByRole('listbox')).toHaveCount(0);
  }
  await cdp.send('Input.insertText', { text: ':tad' });
  await expect.poll(async () => (await blocks(page))[0].data.markdown).toBe(':tad');
});

test('the picker a callout block menu opens writes the emoji found to its icon, in one undo step', async ({ page }) => {
  const host = await openPicker(page);
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(picker(page).getByRole('grid', { name: 'Smileys and emotion' })).toBeVisible();
  await page.keyboard.type('tada');
  await expect(picker(page).getByRole('grid', { name: 'Search results' })).toBeVisible();
  // Unsearched, the picker draws nearly two thousand cells of the same markup, which axe takes most of the timeout over.
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);
  await page.keyboard.press('Enter');
  await expect(picker(page)).toHaveCount(0);
  await expect(host).toBeFocused();
  await expect.poll(async () => (await dataOf(page, 'c'))?.icon).toBe(PARTY_POPPER);
  await expect(page.locator('[data-block-id="c"] .quoin-callout')).toContainText(PARTY_POPPER);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await dataOf(page, 'c'))?.icon).toBeUndefined();
});

test('the picker grid walks with the arrows, Home and End, and Escape hands focus back to the callout', async ({ page }) => {
  const host = await openPicker(page);
  const focused = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  await page.keyboard.press('Tab');
  await expect.poll(focused).toBe('grinning');
  await page.keyboard.press('ArrowRight');
  await expect.poll(focused).toBe('smiley');
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowUp');
  await expect.poll(focused).toBe('grinning');
  await page.keyboard.press('Tab');
  await expect(search(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(picker(page)).toHaveCount(0);
  await expect(host).toBeFocused();
  expect((await dataOf(page, 'c'))?.icon).toBeUndefined();
});

test('a press outside the picker closes it and leaves focus where the press puts it', async ({ page }) => {
  await openPicker(page);
  const heading = page.locator('[data-block-id="h"] [data-quoin-host]');
  await heading.click();
  await expect(picker(page)).toHaveCount(0);
  await expect(heading).toBeFocused();
  expect((await dataOf(page, 'c'))?.icon).toBeUndefined();
});
