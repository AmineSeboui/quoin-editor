import { expect, test, type Locator, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, caretSettled, openEditor } from '../../support/editor';

const menu = (page: Page) => page.getByRole('listbox', { name: 'Mentions' });
const popup = (page: Page) => menu(page).locator('..');
const chip = (page: Page) => page.locator('[data-quoin-atom="mention"]').first();
const selectedChip = (page: Page) => page.locator('[data-quoin-selected-atom] > [data-quoin-atom="mention"]');
const markdownOf = async (page: Page, id?: string) =>
  (await blocks(page)).find((block, index) => (id === undefined ? index === 0 : block.id === id))?.data.markdown;
const opened = (page: Page) => page.evaluate(() => window.__quoin.opened);
const ada = { id: '1', label: 'Ada Lovelace', kind: 'user' };

async function caretAtEnd(page: Page, host: Locator) {
  const box = (await host.boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await caretSettled(page, host);
}

test('type @ad, choose a result, and a chip of the mention appears', async ({ page }) => {
  await openEditor(page, 'empty', 'mention=1');
  const host = page.locator('[data-quoin-host]').first();
  await host.click();
  await caretSettled(page, host);
  await page.keyboard.type('Ask @ad');
  await expect(menu(page).getByRole('option', { selected: true })).toContainText('Ada Lovelace');
  await page.keyboard.press('Enter');
  await expect(menu(page)).toHaveCount(0);
  await expect(chip(page)).toHaveText('@Ada Lovelace');
  await expect(chip(page)).toHaveAttribute('data-kind', 'user');
  await page.keyboard.type('hi');
  await expect.poll(() => markdownOf(page)).toBe('Ask [@Ada Lovelace](mention:user:1) hi');
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => markdownOf(page)).toBe('Ask @ad');
});

test('the menu says it is searching, then that nothing matches, and Escape leaves the text', async ({ page }) => {
  await openEditor(page, 'empty', 'mention=1&mentiondelay=400');
  const host = page.locator('[data-quoin-host]').first();
  await host.click();
  await caretSettled(page, host);
  await page.keyboard.type('@zz');
  await expect(popup(page).getByText('Searching\u2026')).toBeVisible();
  await expect(popup(page).getByText('No matches')).toBeVisible();
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  await expect(host).toBeFocused();
  await expect.poll(() => markdownOf(page)).toBe('@zz');
});

test('a space closes the menu once nothing matches, and the words go on as text', async ({ page }) => {
  await openEditor(page, 'empty', 'mention=1');
  const host = page.locator('[data-quoin-host]').first();
  await host.click();
  await caretSettled(page, host);
  await page.keyboard.type('@zz');
  await expect(popup(page).getByText('No matches')).toBeVisible();
  await page.keyboard.type(' and more');
  await expect(menu(page)).toHaveCount(0);
  await expect.poll(() => markdownOf(page)).toBe('@zz and more');
});

test('@ and then / open one menu at a time, and the line is a text box again once both have closed', async ({ page }) => {
  await openEditor(page, 'empty', 'mention=1');
  const host = page.locator('[data-quoin-host]').first();
  await host.click();
  await caretSettled(page, host);
  await page.keyboard.type('Ask @Ada');
  await expect(menu(page).getByRole('option').first()).toBeVisible();
  await page.keyboard.type(' /');
  await expect(page.getByRole('listbox', { name: 'Commands' })).toBeVisible();
  await expect(page.getByRole('listbox')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(host).toHaveAttribute('role', 'textbox');
  await expect(host).toHaveAttribute('aria-multiline', 'true');
  await expect(host).not.toHaveAttribute('aria-expanded');
  expect(await axeViolations(page)).toEqual([]);
});

test('a click on a chip opens its mention, on an editable or a read-only canvas', async ({ page }) => {
  await openEditor(page, 'mention', 'mention=1');
  await chip(page).click();
  await expect.poll(() => opened(page)).toEqual([ada]);
  await chip(page).dblclick();
  await expect.poll(() => opened(page)).toEqual([ada, ada]);
  await openEditor(page, 'mention', 'mention=1&readonly=1');
  await chip(page).click();
  await expect.poll(() => opened(page)).toEqual([ada]);
});

test('on a read-only canvas a chip is a button in the tab order, which Enter and Space open', async ({ page }) => {
  await openEditor(page, 'mention', 'mention=1&readonly=1');
  await expect(chip(page)).toHaveAttribute('role', 'button');
  await page.getByRole('button', { name: '@Ada Lovelace' }).focus();
  await expect(chip(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect.poll(() => opened(page)).toEqual([ada, ada]);
  await expect(chip(page)).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('a click inside a chip leaves the caret beside it, on the side clicked, where the next key types', async ({ page }) => {
  await openEditor(page, 'mention', 'mention=1');
  const host = page.locator('[data-block-id="p"] [data-quoin-host]');
  const clickInside = async (share: number) => {
    const box = (await chip(page).boundingBox())!;
    await page.mouse.click(box.x + box.width * share, box.y + box.height / 2);
    await caretSettled(page, host);
  };
  await clickInside(0.2);
  await page.keyboard.type('Z');
  await expect.poll(() => markdownOf(page, 'p')).toBe('Ask Z[@Ada Lovelace](mention:user:1) today');
  await clickInside(0.8);
  await page.keyboard.type('Y');
  await expect.poll(() => markdownOf(page, 'p')).toBe('Ask Z[@Ada Lovelace](mention:user:1)Y today');
});

test('Backspace selects a chip with a highlight, Enter then opens it, and a second Backspace deletes it', async ({
  page,
}) => {
  await openEditor(page, 'mention', 'mention=1');
  const host = page.locator('[data-block-id="p"] [data-quoin-host]');
  await caretAtEnd(page, host);
  for (let step = 0; step < ' today'.length; step++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Backspace');
  await expect(selectedChip(page)).toHaveCount(1);
  expect(await selectedChip(page).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter');
  await expect.poll(() => opened(page)).toEqual([ada]);
  await page.keyboard.press('Backspace');
  await expect.poll(() => markdownOf(page, 'p')).toBe('Ask  today');
});

test('Shift+ArrowLeft right after a chip at the end of a line selects the chip alone', async ({ page }) => {
  await openEditor(page, 'mention', 'mention=1');
  const host = page.locator('[data-block-id="p"] [data-quoin-host]');
  await caretAtEnd(page, host);
  for (let step = 0; step < ' today'.length; step++) await page.keyboard.press('Backspace');
  await expect.poll(() => markdownOf(page, 'p')).toBe('Ask [@Ada Lovelace](mention:user:1)');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(selectedChip(page)).toHaveCount(1);
  await page.keyboard.press('Backspace');
  await expect(host.locator('[data-quoin-atom]')).toHaveCount(0);
  await expect.poll(() => markdownOf(page, 'p')).toBe('Ask&#32;');
});

test('mentions have no accessibility violations: the open menu, and a chip editable or read-only', async ({ page }) => {
  await openEditor(page, 'mention', 'mention=1');
  expect(await axeViolations(page)).toEqual([]);
  await caretAtEnd(page, page.locator('[data-block-id="q"] [data-quoin-host]'));
  await page.keyboard.type(' @a');
  await expect(menu(page).getByRole('option').first()).toBeVisible();
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);

  await openEditor(page, 'mention', 'mention=1&readonly=1');
  expect(await axeViolations(page)).toEqual([]);
});
