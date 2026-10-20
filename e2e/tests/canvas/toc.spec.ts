import { expect, test, type Locator, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';

const toc = (page: Page) => page.getByRole('navigation', { name: 'Table of contents' });
const entry = (page: Page, name: string) => toc(page).getByRole('link', { name });
const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const sink = (page: Page) => page.locator('[data-quoin-sink]');
const tocShell = (page: Page) => page.locator('[data-block-id="toc"]');
const markdownOf = async (page: Page, id: string) =>
  (await blocks(page)).find((block) => block.id === id)?.data.markdown;

// The click places the caret through the browser, so its selectionchange has to reach the editor before a key does.
async function caretIn(page: Page, target: Locator = page.locator('[data-quoin-host]').first()) {
  await target.click();
  await expect(target).toBeFocused();
  await page.waitForFunction(() => document.activeElement?.contains(document.getSelection()?.focusNode ?? null));
}

test('the / menu inserts a table of contents, which lists the headings as they are typed', async ({ page }) => {
  await openEditor(page, 'empty', 'toc=1');
  await caretIn(page);
  await page.keyboard.type('/toc');
  await page.keyboard.press('Enter');
  await expect(toc(page)).toHaveText('Add headings to build the table of contents');
  expect(await axeViolations(page)).toEqual([]);

  await page.keyboard.type('# Intro');
  await expect(entry(page, 'Intro')).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.type('## Deep');
  await expect(toc(page).locator(':scope > ul > li > ul > li > a')).toHaveText('Deep');
  await expect(entry(page, 'Intro')).toHaveAttribute('href', `#block-${(await blocks(page))[1].id}`);
  expect(await axeViolations(page)).toEqual([]);
  expect((await blocks(page)).map((block) => block.type)).toEqual(['TOC', 'MARKDOWN', 'MARKDOWN']);
});

test('a click on an entry puts the caret at the end of its heading, and leaves the address as it was', async ({
  page,
}) => {
  await openEditor(page, 'toc', 'toc=1');
  await entry(page, 'Using it').click();
  await expect(host(page, 'usage')).toBeFocused();
  await page.keyboard.type('!');
  await expect.poll(() => markdownOf(page, 'usage')).toBe('### Using it!');
  expect(new URL(page.url()).hash).toBe('');
});

test('a press beside the entries selects the block, and a press on one goes to its heading', async ({ page }) => {
  await openEditor(page, 'toc', 'toc=1');
  const box = (await toc(page).boundingBox())!;
  await page.mouse.click(box.x + box.width - 4, box.y + 4);
  await expect(tocShell(page)).toHaveAttribute('data-selected', 'true');
  await expect(sink(page)).toBeFocused();

  await entry(page, 'Setting up').click();
  await expect(host(page, 'setup')).toBeFocused();
  await expect(tocShell(page)).not.toHaveAttribute('data-selected');
  await page.keyboard.type('!');
  await expect.poll(() => markdownOf(page, 'setup')).toBe('## Setting up!');
});

test('the keyboard reaches the entries from the block selected as a whole, walks them and goes back', async ({
  page,
}) => {
  await openEditor(page, 'toc', 'toc=1');
  await caretIn(page, host(page, 'intro'));
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowUp');
  await expect(tocShell(page)).toHaveAttribute('data-selected', 'true');
  for (const link of await toc(page).getByRole('link').all()) await expect(link).toHaveAttribute('tabindex', '-1');

  await page.keyboard.press('Enter');
  await expect(entry(page, 'Introduction')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(entry(page, 'Setting up')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(entry(page, 'Using it')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(sink(page)).toBeFocused();
  await expect(tocShell(page)).toHaveAttribute('data-selected', 'true');

  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(sink(page)).toBeFocused();

  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(host(page, 'intro')).toBeFocused();
  await page.keyboard.type('!');
  await expect.poll(() => markdownOf(page, 'intro')).toBe('# Introduction!');
});

test('Mod+click leaves the link to the browser, which opens the page at the heading', async ({ page }) => {
  await openEditor(page, 'toc', 'toc=1');
  const [opened] = await Promise.all([
    page.context().waitForEvent('page'),
    entry(page, 'Using it').click({ modifiers: ['ControlOrMeta'] }),
  ]);
  await opened.waitForLoadState();
  expect(new URL(opened.url()).hash).toBe('#block-usage');
  await expect(opened.locator('[data-block-id="usage"] [data-quoin-host]')).toBeInViewport();
  expect(new URL(page.url()).hash).toBe('');
});

test('on a read-only canvas the entries are in the tab order, and go to their heading without changing it', async ({
  page,
}) => {
  await openEditor(page, 'toc', 'toc=1&readonly=1');
  await expect(entry(page, 'Introduction')).not.toHaveAttribute('tabindex');
  expect(await axeViolations(page)).toEqual([]);
  await entry(page, 'Using it').focus();
  await page.keyboard.press('Enter');
  await expect(host(page, 'usage')).toBeFocused();
  await expect(host(page, 'usage')).toBeInViewport();
  expect(await page.evaluate(() => window.__quoin.changes)).toBe(0);
  expect(await markdownOf(page, 'usage')).toBe('### Using it');
});
