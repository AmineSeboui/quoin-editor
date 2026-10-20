import { expect, test, type Locator, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const handle = (page: Page) => page.getByRole('button', { name: 'Drag to move, click for options' });
const addBelow = (page: Page) => page.getByRole('button', { name: 'Add block below' });
const shell = (page: Page, id: string) => page.locator(`[data-block-id="${id}"]`);
const host = (page: Page, id: string) => shell(page, id).locator('[data-quoin-host]');
const dropLine = (page: Page) => page.locator('[data-quoin-drop-line]');
const box = async (locator: Locator) => (await locator.boundingBox())!;

async function openRightToLeft(page: Page, doc: string) {
  await openEditor(page, doc);
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
}

test('on a right-to-left page the gutter sits on screen at the right of the block, and its handle opens the menu', async ({ page }) => {
  await openRightToLeft(page, 'sample');
  await host(page, 'b').hover();
  const line = await box(host(page, 'b'));
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  for (const control of [await box(handle(page)), await box(addBelow(page))]) {
    expect(control.x).toBeGreaterThanOrEqual(line.x + line.width);
    expect(control.x + control.width).toBeLessThanOrEqual(width);
  }
  await handle(page).click();
  await expect(page.getByRole('menu')).toHaveAccessibleName('Text block menu');
});

test('on a right-to-left page a drag that ends 48 px left of where it started nests the block under a list item', async ({ page }) => {
  await openRightToLeft(page, 'drag');
  await host(page, 'a').hover();
  const grip = await box(handle(page));
  const start = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y + 6, { steps: 2 });
  const list = await box(shell(page, 'l'));
  await page.mouse.move(start.x - 48, list.y + list.height, { steps: 8 });
  const line = await box(dropLine(page));
  expect(Math.abs(line.x + line.width - (list.x + list.width - 24))).toBeLessThanOrEqual(1);
  await page.mouse.up();
  await expect.poll(async () => (await blocks(page)).map((block) => block.id)).toEqual(['b', 'c', 'l', 'a', 'd']);
  expect((await blocks(page)).find((block) => block.id === 'a')?.indent).toBe(1);
});
