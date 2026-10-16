import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { blocks, openEditor } from '../support/editor';

test('typing into the placeholder host of an empty document creates a paragraph', async ({ page }) => {
  await openEditor(page);
  const host = page.getByRole('textbox', { name: 'Paragraph' });
  await expect(host).toHaveAttribute('data-placeholder', 'Write something');
  await host.click();
  await page.keyboard.type('Hello');
  await expect.poll(async () => (await blocks(page)).map((block) => block.data.markdown)).toEqual(['Hello']);
  await expect(page.getByRole('textbox', { name: 'Paragraph' })).toHaveText('Hello');
});

test('the sample document has no serious accessibility violations', async ({ page }) => {
  await openEditor(page, 'sample');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});
