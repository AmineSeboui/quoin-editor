import { expect, test, type Locator, type Page } from '@playwright/test';
import { openEditor } from '../../support/editor';

const sink = (page: Page) => page.locator('[data-quoin-sink]');

async function inView(page: Page, element: Locator) {
  const box = (await element.boundingBox())!;
  const height = page.viewportSize()!.height;
  return box.y < height && box.y + box.height > 0;
}

test('a block the arrows select as a whole is scrolled into view and named by what it shows', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 120 });
  await openEditor(page, 'image');
  await page.getByRole('textbox', { name: 'Paragraph' }).first().click();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowDown');
  const image = page.locator('[data-block-id="img"]');
  await expect(image).toHaveAttribute('data-selected', 'true');
  await expect(sink(page)).toBeFocused();
  await expect(sink(page)).toHaveAccessibleName('A red square');
  await expect.poll(() => inView(page, image)).toBe(true);
  await page.keyboard.press('ArrowDown');
  const divider = page.locator('[data-block-id="d"]');
  await expect(divider).toHaveAttribute('data-selected', 'true');
  await expect(sink(page)).toHaveAccessibleName('Divider');
  await expect.poll(() => inView(page, divider)).toBe(true);
});

test('a block a click selects as a whole stays where it is on the page', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 200 });
  await openEditor(page, 'image');
  await page.evaluate(() => window.scrollTo(0, 100));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(100);
  await page.mouse.click(200, 100);
  await expect(page.locator('[data-block-id="img"]')).toHaveAttribute('data-selected', 'true');
  await expect(sink(page)).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(100);
});

test('a click that selects a block as a whole leaves a smoothly scrolled page where it is', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 200 });
  await openEditor(page, 'image');
  await page.addStyleTag({ content: 'html { scroll-behavior: smooth }' });
  await page.evaluate(() => window.scrollTo({ top: 100, behavior: 'instant' }));
  await page.mouse.click(200, 100);
  await expect(sink(page)).toBeFocused();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.scrollY)).toBe(100);
});

test('a click that selects a block as a whole leaves the host scroll container where it is, under a transform', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 300 });
  await openEditor(page, 'image');
  await page.addStyleTag({
    content:
      'html, body { height: 100%; margin: 0; overflow: hidden } #root { height: 300px; overflow: auto } ' +
      '#root::after { content: ""; display: block; height: 1200px } .quoin { transform: translateZ(0) }',
  });
  const root = page.locator('#root');
  await root.evaluate((scroller) => (scroller.scrollTop = 226));
  const divider = (await page.locator('[data-block-id="d"]').boundingBox())!;
  await page.mouse.click(divider.x + 60, divider.y + divider.height / 2);
  await expect(page.locator('[data-block-id="d"]')).toHaveAttribute('data-selected', 'true');
  await page.waitForTimeout(250);
  expect(await root.evaluate((scroller) => scroller.scrollTop)).toBe(226);
});
