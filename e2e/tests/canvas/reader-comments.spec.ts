import { expect, test, type Page } from '@playwright/test';
import { host } from '../../support/block';
import { blocks, openEditor } from '../../support/editor';
import { markdownOf } from '../../support/markdown';
import { phoneTest } from '../../support/phone';
import { caretPoint } from '../../support/text-point';

const openReader = (page: Page) => openEditor(page, 'comments', 'readercomments=1');
const tools = (page: Page) => page.getByRole('toolbar', { name: 'Comment tools' });
const thread = (page: Page, text: string) => page.getByRole('dialog', { name: `Comment on "${text}"` });
const changes = (page: Page) => page.evaluate(() => window.__quoin.changes);
const selected = (page: Page) => page.evaluate(() => getSelection()!.toString());
const COMMENTED = 'A <span data-comment="t1">first</span> paragraph to comment on.';

async function buttonNames(page: Page) {
  return tools(page)
    .getByRole('button')
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
}

// A real press, move and release over the text, from one character offset of a block to another.
async function dragOver(page: Page, id: string, from: number, to: number) {
  const box = (await host(page, id).boundingBox())!;
  const [start, end] = [await caretPoint(host(page, id), from), await caretPoint(host(page, id), to)];
  await page.mouse.move(box.x + start.x, box.y + start.y);
  await page.mouse.down();
  await page.mouse.move(box.x + end.x, box.y + end.y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => selected(page)).toBe('first');
}

test('a drag over the text shows Comment alone, which starts a thread with focus in its field', async ({ page }) => {
  await openReader(page);
  await dragOver(page, 'p', 2, 7);
  await expect(tools(page)).toBeVisible();
  expect(await buttonNames(page)).toEqual(['Comment']);
  await tools(page).getByRole('button', { name: 'Comment', exact: true }).click();
  const popover = thread(page, 'first');
  await expect(popover.getByRole('textbox', { name: 'Add a comment' })).toBeFocused();
  expect(await markdownOf(page, 'p')).toBe(COMMENTED);
  await page.keyboard.type('Why first?');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(popover.locator('ol').getByText('Why first?')).toBeVisible();
  for (const name of ['Resolve', 'Delete']) await expect(popover.getByRole('button', { name })).toBeVisible();
});

test('Mod+Alt+M starts a thread on the text a drag selected', async ({ page }) => {
  await openReader(page);
  await dragOver(page, 'p', 2, 7);
  await page.keyboard.press('ControlOrMeta+Alt+KeyM');
  await expect(thread(page, 'first').getByRole('textbox', { name: 'Add a comment' })).toBeFocused();
  expect(await markdownOf(page, 'p')).toBe(COMMENTED);
});

test("Alt+F10 moves focus into the reader's toolbar, and Escape gives it back to the text", async ({ page }) => {
  await openReader(page);
  await dragOver(page, 'p', 2, 7);
  await expect(host(page, 'p')).toBeFocused();
  await page.keyboard.press('Alt+F10');
  await expect(tools(page).getByRole('button', { name: 'Comment', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(host(page, 'p')).toBeFocused();
});

test('typing over the selected text changes nothing', async ({ page }) => {
  await openReader(page);
  const before = await blocks(page);
  await dragOver(page, 'p', 2, 7);
  // Not Backspace: Playwright's WebKit goes back in history for it on any page without editable text.
  for (const key of ['x', 'Delete', 'Enter', 'ControlOrMeta+b', 'ControlOrMeta+z']) {
    await page.keyboard.press(key);
  }
  await page.keyboard.type('typed');
  expect(await changes(page)).toBe(0);
  expect(await blocks(page)).toEqual(before);
});

test("Resolve and Delete show only on the reader's own thread", async ({ page }) => {
  await openReader(page);
  await host(page, 'q').locator('[data-comment="seeded"]').click();
  const own = thread(page, 'about this');
  await expect(own.getByRole('textbox', { name: 'Reply' })).toBeVisible();
  for (const name of ['Resolve', 'Delete']) await expect(own.getByRole('button', { name })).toBeVisible();
  await page.keyboard.press('Escape');

  await host(page, 'r').locator('[data-comment="x1"]').first().click();
  const other = thread(page, 'last para');
  await expect(other.getByRole('textbox', { name: 'Reply' })).toBeVisible();
  for (const name of ['Resolve', 'Delete']) await expect(other.getByRole('button', { name })).toHaveCount(0);
});

phoneTest.describe('on a phone', () => {
  phoneTest.skip(({ browserName }) => browserName === 'firefox', 'Firefox cannot emulate a mobile device');

  // A long press selects the words under it and leaves focus where it was, which no Playwright gesture does.
  const longPress = (page: Page) =>
    host(page, 'p').evaluate((element) => {
      const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode()!;
      getSelection()!.setBaseAndExtent(text, 2, text, 7);
    });

  phoneTest('text a long press selects shows Comment alone, and a tap on it starts a thread', async ({ page }) => {
    await openReader(page);
    await longPress(page);
    await expect(tools(page)).toBeVisible();
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    expect(await buttonNames(page)).toEqual(['Comment']);
    await expect(page.getByRole('toolbar', { name: 'Editing tools' })).toHaveCount(0);
    await tools(page).getByRole('button', { name: 'Comment', exact: true }).tap();
    await expect(page.getByRole('textbox', { name: 'Add a comment' })).toBeFocused();
    expect(await markdownOf(page, 'p')).toBe(COMMENTED);
  });
});
