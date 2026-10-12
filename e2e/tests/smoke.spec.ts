import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { blocks, openEditor } from '../support/editor';

test('typing into an empty document creates a block', async ({ page }) => {
  await openEditor(page);
  await page.keyboard.type('Hello');
  await expect.poll(async () => (await blocks(page)).length).toBe(1);
  expect((await blocks(page))[0].data.markdown).toContain('Hello');
});

test('the sample document has no serious accessibility violations', async ({ page }) => {
  await openEditor(page, 'sample');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});
