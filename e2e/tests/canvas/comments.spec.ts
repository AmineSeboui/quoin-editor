import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, caretSettled, openEditor } from '../../support/editor';

const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const markdown = async (page: Page, id: string) =>
  String((await blocks(page)).find((block) => block.id === id)?.data.markdown);
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Text formatting' });
const rail = (page: Page) => page.getByRole('list', { name: 'Comments' });
const thread = (page: Page, text: string) => page.getByRole('dialog', { name: `Comment on "${text}"` });

async function openComments(page: Page, extra = '') {
  await openEditor(page, 'comments', `comments=seeded${extra}`);
}

test('comments on a word, replies to it and resolves it, leaving the text as it was', async ({ page }) => {
  await openComments(page, '&commentdelay=400');
  await host(page, 'p').dblclick({ position: { x: 4, y: 10 } });
  await expect(toolbar(page)).toBeVisible();
  await toolbar(page).getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(host(page, 'p').locator('.quoin-comment-pending')).toHaveText('A');
  const popover = thread(page, 'A');
  const first = popover.getByRole('textbox', { name: 'Add a comment' });
  await expect(first).toBeFocused();
  expect(await markdown(page, 'p')).toBe('<span data-comment="t1">A</span> first paragraph to comment on.');

  await page.keyboard.type('Why one letter?');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(popover.getByText('Why one letter?')).toBeVisible();
  const reply = popover.getByRole('textbox', { name: 'Reply' });
  await expect(reply).toHaveValue('');
  await reply.fill('It reads\nfine');
  await popover.getByRole('button', { name: 'Send' }).click();
  await expect(popover.getByText('It reads')).toHaveText('It reads\nfine');
  await expect(rail(page).getByRole('button', { name: /^A/ })).toContainText('2 comments');
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);

  await popover.getByRole('button', { name: 'Resolve' }).click();
  await expect(popover).toBeHidden();
  await expect.poll(() => markdown(page, 'p')).toBe('A first paragraph to comment on.');
  await expect(host(page, 'p')).toBeFocused();
  await expect(rail(page).getByRole('button', { name: /^A/ })).toHaveCount(0);

  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => markdown(page, 'p')).toBe('<span data-comment="t1">A</span> first paragraph to comment on.');
});

test('opens a thread from its text without taking focus, drawing its body as plain text', async ({ page }) => {
  await openComments(page);
  const anchor = host(page, 'q').locator('[data-comment="seeded"]');
  await anchor.click();
  await caretSettled(page, host(page, 'q'));
  const popover = thread(page, 'about this');
  await expect(popover).toBeVisible();
  await expect(popover.getByText('Is this')).toHaveText('Is this <b>right</b>?\nSecond line');
  await expect(host(page, 'q')).toBeFocused();
  await expect(host(page, 'q').locator('.quoin-comment-active')).toHaveText('about this');
  expect(await axeViolations(page, 'all', ['.quoin-editor', '[role="dialog"]'])).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(host(page, 'q')).toBeFocused();
  expect(await page.evaluate(() => window.__quoin.controller?.editor.state.selection?.kind)).toBe('text');
});

test('opens the thread at the caret with Mod+Alt+M, and Escape gives focus back to its text', async ({ page }) => {
  await openComments(page);
  await host(page, 'q').click();
  await page.evaluate(() => window.__quoin.controller?.focus({ block: 'q', region: 'text', offset: 6 }));
  await page.keyboard.press('ControlOrMeta+Alt+KeyM');
  const reply = thread(page, 'about this').getByRole('textbox', { name: 'Reply' });
  await expect(reply).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(host(page, 'q')).toBeFocused();
});

test('lists the threads beside a wide canvas, a thread whose text is gone after the others', async ({ page }) => {
  await openComments(page);
  const cards = rail(page).getByRole('button');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('about this');
  await expect(cards.nth(1)).toContainText('Text removed');
  const text = await host(page, 'q').boundingBox();
  const card = await cards.nth(0).boundingBox();
  expect(card!.x).toBeGreaterThanOrEqual(text!.x + text!.width);
  expect(Math.abs(card!.y - text!.y)).toBeLessThan(24);
  await cards.nth(1).click();
  await expect(cards.nth(1)).toHaveAttribute('aria-expanded', 'true');
  expect(await axeViolations(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
});

test('a narrow canvas lists the threads in a sheet opened from a marker beside the block', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await openComments(page);
  await expect(rail(page)).toHaveCount(0);
  const marker = page.locator('.quoin-comments-marker[data-block="q"]');
  await expect(marker).toHaveAccessibleName('Comments (1)');
  await marker.click();
  const sheet = page.getByRole('dialog', { name: 'Comments' });
  await expect(sheet.getByRole('button', { name: /^about this/ })).toHaveAttribute('aria-expanded', 'true');
  await expect(sheet.getByText('Text removed')).toBeVisible();
  expect(await axeViolations(page, 'all', ['.quoin-editor', '[role="dialog"]'])).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(marker).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(600);
});
