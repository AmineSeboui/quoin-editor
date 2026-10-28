import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const around = async (page: Page) => {
  const all = await blocks(page);
  return [all[0], all.at(-1)].map((block) => block?.data);
};

async function tickAndType(page: Page) {
  await page.getByRole('checkbox', { name: 'Done' }).click();
  await expect.poll(async () => (await blocks(page))[1].data).toEqual({ done: true });
  await expect(page.locator('[data-block-id="tk"]')).toHaveAttribute('data-selected', 'true');
  await page.keyboard.type('x');
  expect(await around(page)).toEqual([{ markdown: 'top' }, { markdown: 'bottom' }]);
}

test('a control in a preview that writes leaves the block node-selected, so the next key edits no other block', async ({ page }) => {
  await openEditor(page, 'tick');
  await tickAndType(page);
});

test('a write from a preview after a caret was placed in another block does not send the next key there', async ({ page }) => {
  await openEditor(page, 'tick');
  await page.getByText('bottom', { exact: true }).click();
  await tickAndType(page);
});
