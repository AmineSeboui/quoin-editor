import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { host } from '../../support/block';
import { openEditor } from '../../support/editor';
import { allMarkdown } from '../../support/markdown';
import { caretPoint, textPoint } from '../../support/text-point';

const LINKED = 'Read [the docs](https://quoin.dev/docs) today';
const PLAIN = 'Plain words to link';

const link = (page: Page) => host(page, 'p').locator('a[data-quoin-link]');
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Link' });
const linkCard = (page: Page) => page.getByRole('group', { name: 'Link' });
const field = (page: Page) => page.getByRole('textbox', { name: 'Link address' });
const selectedText = (page: Page) => page.evaluate(() => getSelection()!.toString());

const caretAt = async (page: Page, id: string, offset: number) =>
  host(page, id).click({ position: await caretPoint(host(page, id), offset) });

test.beforeEach(async ({ context }) => {
  await context.route('https://quoin.dev/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Docs</title>' }),
  );
});

test('Mod+K on selected text opens the link popover, and Enter links the text', async ({ page }) => {
  await openEditor(page, 'link');
  await host(page, 'q').dblclick({ position: await textPoint(host(page, 'q'), 'Plain') });
  await expect.poll(() => selectedText(page)).toBe('Plain');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(field(page)).toBeFocused();
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);
  await page.keyboard.type('https://example.com');
  await page.keyboard.press('Enter');
  await expect.poll(() => allMarkdown(page)).toEqual([LINKED, '[Plain](https://example.com) words to link']);
  await expect(dialog(page)).toHaveCount(0);
  await expect(host(page, 'q')).toBeFocused();
  await expect.poll(() => selectedText(page)).toBe('Plain');
});

test('Escape closes the popover and gives the text back its selection, unchanged', async ({ page }) => {
  await openEditor(page, 'link');
  await host(page, 'q').dblclick({ position: await textPoint(host(page, 'q'), 'Plain') });
  await page.keyboard.press('ControlOrMeta+k');
  await page.keyboard.type('https://example.com');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(host(page, 'q')).toBeFocused();
  await expect.poll(() => selectedText(page)).toBe('Plain');
  expect(await allMarkdown(page)).toEqual([LINKED, PLAIN]);
});

test('an unsafe address keeps the popover open with its explanation', async ({ page }) => {
  await openEditor(page, 'link');
  await host(page, 'q').dblclick({ position: await textPoint(host(page, 'q'), 'Plain') });
  await page.keyboard.press('ControlOrMeta+k');
  await page.keyboard.type('javascript:alert(1)');
  await page.keyboard.press('Enter');
  await expect(field(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(field(page)).toHaveAccessibleDescription('Enter a valid link, such as https://example.com');
  expect(await allMarkdown(page)).toEqual([LINKED, PLAIN]);
});

test('Tab past the last control of the popover gives focus back to the text', async ({ page, browserName }) => {
  await openEditor(page, 'link');
  await caretAt(page, 'p', 8);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(field(page)).toBeFocused();
  await dialog(page).getByRole('button', { name: 'Remove link' }).focus();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(dialog(page)).toHaveCount(0);
  await expect(host(page, 'p')).toBeFocused();
  expect(await allMarkdown(page)).toEqual([LINKED, PLAIN]);
});

test('a caret resting in a link shows its card without taking focus, and Unlink removes the link', async ({ page }) => {
  await openEditor(page, 'link');
  await caretAt(page, 'p', 8);
  const card = linkCard(page);
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Edit link' })).toHaveAttribute('aria-keyshortcuts', /^(Meta|Control)\+K$/);
  await expect(card).toContainText('https://quoin.dev/docs');
  await expect(host(page, 'p')).toBeFocused();
  const open = card.getByRole('link', { name: 'Open link' });
  await expect(open).toHaveAttribute('target', '_blank');
  await expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  await card.getByRole('button', { name: 'Remove link' }).click();
  await expect.poll(() => allMarkdown(page)).toEqual(['Read the docs today', PLAIN]);
  await expect(card).toHaveCount(0);
  await expect(host(page, 'p')).toBeFocused();
});

test('a pointer resting on a link shows its card, which stays on the card and goes once the pointer leaves', async ({
  page,
}) => {
  await openEditor(page, 'link');
  await link(page).hover();
  await expect(linkCard(page)).toBeVisible();
  await linkCard(page).hover();
  await page.waitForTimeout(600);
  await expect(linkCard(page)).toBeVisible();
  await host(page, 'q').hover();
  await expect(linkCard(page)).toHaveCount(0);
});

test('Mod+click on a link opens it in a new page', async ({ page }) => {
  await openEditor(page, 'link');
  const before = page.url();
  const popup = page.waitForEvent('popup');
  await link(page).click({ modifiers: ['ControlOrMeta'] });
  const opened = await popup;
  await expect.poll(() => opened.url()).toBe('https://quoin.dev/docs');
  expect(page.url()).toBe(before);
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
  await expect(linkCard(page)).toBeVisible();
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
    await expect.poll(async () => (await allMarkdown(page))[1]).toBe('Plain&#32;');
    await expect(dialog(page)).toHaveCount(0);
  });
});
