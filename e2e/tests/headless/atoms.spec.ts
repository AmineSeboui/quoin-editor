import { expect, test } from '@playwright/test';
import { host, markdown, openHeadless } from '../../support/headless';

test('an atom drawn by a custom renderer survives the next render of its block', async ({ page }) => {
  await openHeadless(page, 'atoms');
  const paragraph = host(page, 0);
  await expect(paragraph.locator('b')).toHaveText('@Ada');
  const box = (await paragraph.boundingBox())!;
  await page.mouse.click(box.x + box.width - 5, box.y + box.height / 2);
  await page.keyboard.type('!');
  await expect.poll(() => markdown(page)).toEqual(['Hi [@Ada](mention:u1) there!']);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
  expect(await markdown(page)).toEqual(['Hi [@Ada](mention:u1) there!']);
  expect(await page.evaluate(() => window.__quoin.changes)).toBe(1);
  await expect(paragraph.locator('b')).toHaveAttribute('data-quoin-atom', 'mention');
});
