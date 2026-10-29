import { expect, test } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const done = async (page: Parameters<typeof blocks>[0]) => (await blocks(page))[1].data.done;

test('undo and redo keys pressed on a control in a preview undo and redo the document', async ({ page }) => {
  await openEditor(page, 'tick');
  const checkbox = page.getByRole('checkbox', { name: 'Done' });
  await checkbox.click();
  await expect.poll(() => done(page)).toBe(true);
  await checkbox.focus();
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => done(page)).toBe(false);
  await expect(checkbox).not.toBeChecked();
  await checkbox.focus();
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect.poll(() => done(page)).toBe(true);
  await expect(checkbox).toBeChecked();
  expect((await blocks(page)).map((block) => block.data)).toEqual([
    { markdown: 'top' },
    { done: true },
    { markdown: 'bottom' },
  ]);
});
