import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { blocks, openEditor } from '../../support/editor';

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Keyboard shortcuts' });
const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const markdown = async (page: Page) => (await blocks(page)).map((block) => block.data.markdown);

test('Mod+Shift+/ opens the shortcuts dialog, which lists the way out, and Escape gives the caret back', async ({ page }) => {
  await openEditor(page, 'sample');
  await host(page, 'b').click();
  await page.keyboard.press('End');
  await page.keyboard.press('ControlOrMeta+Shift+Slash');
  await expect(dialog(page)).toBeVisible();
  const leave = dialog(page).getByRole('term').filter({ hasText: 'Leave the editor' });
  await expect(leave.locator('xpath=following-sibling::dd')).toHaveText('Escape, then Tab');
  const { violations } = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(violations.map((violation) => violation.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(host(page, 'b')).toBeFocused();
  await page.keyboard.type('!');
  await expect.poll(() => markdown(page)).toEqual(['# Title', 'First paragraph.!']);
});

test('the slash menu opens the dialog once it has removed the slash and the query', async ({ page }) => {
  await openEditor(page, 'empty');
  await page.locator('[data-quoin-host]').first().click();
  await page.keyboard.type('/keyb');
  await expect(page.getByRole('option', { selected: true })).toContainText('Keyboard shortcuts');
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeVisible();
  await expect.poll(() => markdown(page)).toEqual(['']);
  await dialog(page).getByRole('button', { name: 'Close' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator('[data-quoin-host]').first()).toBeFocused();
});

test('a block moved with the keyboard and a block deleted are announced', async ({ page }) => {
  await openEditor(page, 'drag');
  await host(page, 'a').click();
  await page.keyboard.press('ControlOrMeta+Shift+ArrowDown');
  await expect(page.getByRole('status')).toHaveText('Block moved to position 2 of 5');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Backspace');
  await expect.poll(async () => (await blocks(page)).map((block) => block.id)).toEqual(['b', 'c', 'l', 'd']);
  await expect(page.getByRole('status')).toHaveText(/^Block deleted\. Press (\u2318Z|Ctrl\+Z) to undo$/);
});

test('a block duplicated from the block menu or with Mod+D is announced with the position of the copy', async ({
  page,
}) => {
  await openEditor(page, 'drag');
  await host(page, 'b').click();
  await page.keyboard.press('ControlOrMeta+/');
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect.poll(async () => (await blocks(page)).length).toBe(6);
  await expect(page.getByRole('status')).toHaveText('Block inserted at position 3 of 6');
  await page.keyboard.press('ControlOrMeta+d');
  await expect.poll(async () => (await blocks(page)).length).toBe(7);
  await expect(page.getByRole('status')).toHaveText('Block inserted at position 4 of 7');
});

test('an empty heading shows its level and the empty paragraph holding the caret shows the canvas placeholder', async ({
  page,
}) => {
  await openEditor(page, 'empty');
  const first = page.locator('[data-quoin-host]').first();
  await first.click();
  await page.keyboard.type('# ');
  const heading = page.getByRole('textbox', { name: 'Heading 1' });
  await expect(heading).toHaveAttribute('data-placeholder', 'Heading 1');
  const shown = await heading.evaluate((element) => getComputedStyle(element, '::before').content);
  expect(shown).toBe('"Heading 1"');
  await page.keyboard.type('Title');
  await page.keyboard.press('Enter');
  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });
  await expect(paragraph).toHaveAttribute('data-placeholder', 'Write something');
  await expect(heading).not.toHaveAttribute('data-placeholder');
});
