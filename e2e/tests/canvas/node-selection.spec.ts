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

test('a block selected as a whole comes into view again when the arrows come back to it after a click', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 400 });
  await openEditor(page, 'image');
  await page.addStyleTag({ content: 'body { padding-bottom: 2000px } [data-block-id="q"] { margin-top: 900px }' });
  const divider = page.locator('[data-block-id="d"]');
  const below = page.getByRole('textbox', { name: 'Paragraph' }).last();
  const clickStartOfBelow = async () => {
    await below.scrollIntoViewIfNeeded();
    const box = (await below.boundingBox())!;
    await page.mouse.click(box.x + 1, box.y + box.height / 2);
  };
  for (const arrival of ['first', 'again']) {
    await clickStartOfBelow();
    await expect(divider).not.toHaveAttribute('data-selected', 'true');
    expect(await inView(page, divider), `out of view before the ${arrival} arrival`).toBe(false);
    await page.keyboard.press('ArrowUp');
    await expect(divider).toHaveAttribute('data-selected', 'true');
    await expect.poll(() => inView(page, divider), `in view after the ${arrival} arrival`).toBe(true);
  }
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

test('the arrows onto an image or a divider, with the page going on below, leave the page where it is', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await openEditor(page, 'image');
  await page.addStyleTag({ content: 'body { padding-bottom: 2000px }' });
  const scrollY = () => page.evaluate(() => window.scrollY);
  const above = page.getByRole('textbox', { name: 'Paragraph' }).first();
  const box = (await above.boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  for (const [key, block] of [
    ['ArrowDown', 'img'],
    ['ArrowDown', 'd'],
    ['ArrowUp', 'img'],
  ] as const) {
    await page.keyboard.press(key);
    await expect(page.locator(`[data-block-id="${block}"]`)).toHaveAttribute('data-selected', 'true');
    await page.waitForTimeout(400);
    expect(await scrollY(), `${key} onto ${block}`).toBe(0);
  }
  const below = page.getByRole('textbox', { name: 'Paragraph' }).last();
  const start = (await below.boundingBox())!;
  await page.mouse.click(start.x + 1, start.y + start.height / 2);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-block-id="d"]')).toHaveAttribute('data-selected', 'true');
  await page.waitForTimeout(400);
  expect(await scrollY(), 'ArrowUp onto d').toBe(0);
});
