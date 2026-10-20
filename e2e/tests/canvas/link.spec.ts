import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';

const LINKED = 'Read [the docs](https://quoin.dev/docs) today';
const PLAIN = 'Plain words to link';

const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const link = (page: Page) => host(page, 'p').locator('a[data-quoin-link]');
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Link' });
const field = (page: Page) => page.getByRole('textbox', { name: 'Link address' });
const markdown = async (page: Page) => (await blocks(page)).map((block) => String(block.data.markdown));
const selectedText = (page: Page) => page.evaluate(() => getSelection()!.toString());

async function caretAt(page: Page, id: string, offset: number) {
  await host(page, id).click({ position: { x: 1, y: 12 } });
  for (let i = 0; i < offset; i++) await page.keyboard.press('ArrowRight');
}

test.beforeEach(async ({ context }) => {
  await context.route('https://quoin.dev/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Docs</title>' }),
  );
});

test('Mod+K on selected text opens the link popover, and Enter links the text', async ({ page }) => {
  await openEditor(page, 'link');
  await host(page, 'q').dblclick({ position: { x: 12, y: 12 } });
  await expect.poll(() => selectedText(page)).toBe('Plain');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(field(page)).toBeFocused();
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);
  await page.keyboard.type('https://example.com');
  await page.keyboard.press('Enter');
  await expect.poll(() => markdown(page)).toEqual([LINKED, '[Plain](https://example.com) words to link']);
  await expect(dialog(page)).toHaveCount(0);
  await expect(host(page, 'q')).toBeFocused();
  await expect.poll(() => selectedText(page)).toBe('Plain');
});

test('Escape closes the popover and gives the text back its selection, unchanged', async ({ page }) => {
  await openEditor(page, 'link');
  await host(page, 'q').dblclick({ position: { x: 12, y: 12 } });
  await page.keyboard.press('ControlOrMeta+k');
  await page.keyboard.type('https://example.com');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(host(page, 'q')).toBeFocused();
  await expect.poll(() => selectedText(page)).toBe('Plain');
  expect(await markdown(page)).toEqual([LINKED, PLAIN]);
});

test('an unsafe address keeps the popover open with its explanation', async ({ page }) => {
  await openEditor(page, 'link');
  await host(page, 'q').dblclick({ position: { x: 12, y: 12 } });
  await page.keyboard.press('ControlOrMeta+k');
  await page.keyboard.type('javascript:alert(1)');
  await page.keyboard.press('Enter');
  await expect(field(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(field(page)).toHaveAccessibleDescription('Enter a valid link, such as https://example.com');
  expect(await markdown(page)).toEqual([LINKED, PLAIN]);
});

test('a caret resting in a link shows its card without taking focus, and Unlink removes the link', async ({ page }) => {
  await openEditor(page, 'link');
  await caretAt(page, 'p', 8);
  const card = dialog(page);
  await expect(card).toBeVisible();
  await expect(card).toContainText('https://quoin.dev/docs');
  await expect(host(page, 'p')).toBeFocused();
  const open = card.getByRole('link', { name: 'Open link' });
  await expect(open).toHaveAttribute('target', '_blank');
  await expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  await card.getByRole('button', { name: 'Remove link' }).click();
  await expect.poll(() => markdown(page)).toEqual(['Read the docs today', PLAIN]);
  await expect(card).toHaveCount(0);
  await expect(host(page, 'p')).toBeFocused();
});

test('a pointer resting on a link shows its card, which stays on the card and goes once the pointer leaves', async ({
  page,
}) => {
  await openEditor(page, 'link');
  await link(page).hover();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).hover();
  await page.waitForTimeout(600);
  await expect(dialog(page)).toBeVisible();
  await host(page, 'q').hover();
  await expect(dialog(page)).toHaveCount(0);
});

test('Mod+click on a link opens it in a new page', async ({ page }) => {
  await openEditor(page, 'link');
  const popup = page.waitForEvent('popup');
  await link(page).click({ modifiers: ['ControlOrMeta'] });
  const opened = await popup;
  await expect.poll(() => opened.url()).toBe('https://quoin.dev/docs');
  expect(new URL(page.url()).search).toBe('?doc=link');
});

test('a plain click on a link places the caret in it and never navigates', async ({ page, context }) => {
  await openEditor(page, 'link');
  const pages = context.pages().length;
  const before = page.url();
  await link(page).click();
  await expect(host(page, 'p')).toBeFocused();
  const caret = await page.evaluate(() => {
    const selection = getSelection()!;
    return { collapsed: selection.isCollapsed, inLink: selection.anchorNode?.parentElement?.closest('a') != null };
  });
  expect(caret).toEqual({ collapsed: true, inLink: true });
  await expect(dialog(page)).toBeVisible();
  expect(page.url()).toBe(before);
  expect(context.pages()).toHaveLength(pages);
});

test.describe('on a Mac', () => {
  test.skip(
    ({ browserName }) => process.platform !== 'darwin' || browserName === 'firefox',
    'Ctrl+K is a macOS text binding that Playwright applies in Chromium and WebKit on a Mac only',
  );

  test('Ctrl+K still deletes to the end of the line and leaves the popover closed', async ({ page }) => {
    await openEditor(page, 'link');
    await caretAt(page, 'q', 6);
    await page.keyboard.press('Control+k');
    await expect.poll(async () => (await markdown(page))[1]).toBe('Plain&#32;');
    await expect(dialog(page)).toHaveCount(0);
  });
});
