import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';
import { phoneTest } from '../../support/phone';
import { copyEvent } from '../../support/synthetic-events';

const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const handle = (page: Page) => page.getByRole('button', { name: 'Drag to move, click for options' });
const openReadOnly = (page: Page) => openEditor(page, 'rich', 'readonly=1');
const changes = (page: Page) => page.evaluate(() => window.__quoin.changes);
// Twice the time a pointer rests on a link before an editable canvas shows the link's card.
const LINK_CARD_WAIT = 600;
const settle = (page: Page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function expectNoOverlay(page: Page) {
  await settle(page);
  for (const role of ['menu', 'listbox', 'dialog', 'toolbar'] as const) await expect(page.getByRole(role)).toHaveCount(0);
}

test('renders the formatted document with no editable host, gutter or block control', async ({ page }) => {
  await openReadOnly(page);
  const editor = page.getByRole('group', { name: 'Document' });
  await expect(editor.getByRole('heading', { level: 1 })).toHaveText('Release notes');
  await expect(host(page, 'p').locator('strong')).toHaveText('bold');
  await expect(host(page, 'p').locator('em')).toHaveText('italic');
  await expect(host(page, 'p').locator('code')).toHaveText('code');
  await expect(host(page, 'p').getByRole('link', { name: 'links' })).toHaveAttribute('href', 'https://quoin.dev/docs');
  await expect(editor.getByRole('textbox', { name: 'Callout, info' })).toHaveText('Read the guide first');
  await expect(editor.getByRole('separator')).toBeVisible();
  await expect(editor.getByText('https://quoin.dev', { exact: true })).toBeVisible();
  await expect(editor.getByText('const answer = 42;')).toBeVisible();

  await expect(page.locator('[contenteditable="true"]')).toHaveCount(0);
  for (const region of await page.locator('[data-quoin-host]').all()) await expect(region).toHaveAttribute('aria-readonly', 'true');
  await host(page, 'p').hover();
  await page.getByText('https://quoin.dev', { exact: true }).hover();
  await expect(handle(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add block below' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit Bookmark' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Callout tone/ })).toHaveCount(0);
});

test('a click on the task box leaves it as it is, and the box says it is read-only', async ({ page }) => {
  await openReadOnly(page);
  const box = page.getByRole('checkbox', { name: 'Ship it' });
  await expect(box).toHaveAttribute('aria-readonly', 'true');
  await box.click();
  await settle(page);
  await expect(box).toBeChecked();
  expect(await changes(page)).toBe(0);
});

test('no key, selection or click opens a menu, a toolbar or a dialog, or changes the document', async ({ page }) => {
  await openReadOnly(page);
  const before = await blocks(page);
  await host(page, 'p').click({ position: { x: 1, y: 12 } });
  for (const key of ['/', 'ControlOrMeta+/', 'ControlOrMeta+Shift+Slash', 'ControlOrMeta+k', 'x', 'Enter']) {
    await page.keyboard.press(key);
    await expectNoOverlay(page);
  }
  await host(page, 'h').dblclick({ position: { x: 12, y: 12 } });
  await expect.poll(() => page.evaluate(() => getSelection()!.toString().trim())).not.toBe('');
  await expectNoOverlay(page);
  await host(page, 'p').getByRole('link').hover();
  await page.waitForTimeout(LINK_CARD_WAIT);
  await expectNoOverlay(page);
  await page.getByText('https://quoin.dev', { exact: true }).click({ button: 'right' });
  await expectNoOverlay(page);
  expect(await changes(page)).toBe(0);
  expect(await blocks(page)).toEqual(before);
});

test('a reader opens and closes a closed toggle from its chevron, and the document stays as it was', async ({ page }) => {
  await openEditor(page, 'closed', 'readonly=1');
  const before = await blocks(page);
  const chevron = page.getByRole('button', { name: 'Toggle, 1 block hidden' });
  await expect(page.getByText('Hidden detail')).toHaveCount(0);
  await chevron.click();
  await expect(page.getByRole('button', { name: 'Toggle', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(host(page, 'tc')).toHaveText('Hidden detail');
  await page.getByRole('button', { name: 'Toggle', exact: true }).click();
  await expect(page.getByText('Hidden detail')).toHaveCount(0);
  await expect(chevron).toHaveAttribute('aria-expanded', 'false');
  expect(await changes(page)).toBe(0);
  expect(await blocks(page)).toEqual(before);
});

const COPIED = '# Release notes\n\nKeeps **bold**, _italic_, `code` and [links](https://quoin.dev/docs).';
const COPIED_PARAGRAPH = '<p>Keeps <strong>bold</strong>, <em>italic</em>, <code>code</code> and <a href="https://quoin.dev/docs"';

async function selectTitleAndParagraph(page: Page) {
  const from = (await host(page, 'h').boundingBox())!;
  const to = (await host(page, 'p').boundingBox())!;
  await page.mouse.move(from.x + 1, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width - 1, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => getSelection()!.toString().replace(/\s+/g, ' ').trim()))
    .toBe('Release notes Keeps bold, italic, code and links.');
}

test('text selected across blocks is copied as markdown and as HTML with its formatting', async ({ page }) => {
  await openReadOnly(page);
  await selectTitleAndParagraph(page);
  const copied = await copyEvent(page);
  expect(copied.prevented).toBe(true);
  expect(copied.plain).toBe(COPIED);
  expect(copied.html).toContain('>Release notes</h1>');
  expect(copied.html).toContain(COPIED_PARAGRAPH);
});

test('Mod+C puts the selected text on the system clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'only Chromium lets a page read the clipboard back');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openReadOnly(page);
  await selectTitleAndParagraph(page);
  await page.keyboard.press('ControlOrMeta+c');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(COPIED);
});

phoneTest.describe('on a phone', () => {
  phoneTest.skip(({ browserName }) => browserName === 'firefox', 'Firefox cannot emulate a mobile device');

  phoneTest('a tap in the text shows no editing tools and no handle', async ({ page }) => {
    await openReadOnly(page);
    await host(page, 'p').tap();
    await settle(page);
    await expect(page.getByRole('toolbar', { name: 'Editing tools' })).toHaveCount(0);
    await expect(handle(page)).toHaveCount(0);
  });
});
