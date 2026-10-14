import { expect, test } from '@playwright/test';
import { caretAt, markdown, modelSelection, openHeadless, selectionOverFrames } from '../../support/headless';

test('a toolbar button that takes focus formats the selection and keeps it', async ({ page }) => {
  await openHeadless(page);
  await caretAt(page, 1, 2);
  for (let i = 0; i < 9; i++) await page.keyboard.press('Shift+ArrowRight');
  const selected = { kind: 'text', anchor: { block: 'p', offset: 2 }, head: { block: 'p', offset: 11 } };
  await expect.poll(() => modelSelection(page)).toMatchObject(selected);
  await page.getByRole('button', { name: 'Bold' }).click();
  expect((await markdown(page))[1]).toBe('A **paragraph** with **bold**, _italic_ and `code`.');
  await expect.poll(() => selectionOverFrames(page, 5)).toMatchObject(Array(5).fill(selected));
});
