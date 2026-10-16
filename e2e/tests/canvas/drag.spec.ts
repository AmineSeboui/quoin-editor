import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const handle = (page: Page) => page.getByRole('button', { name: 'Drag to move, click for options' });
const shell = (page: Page, id: string) => page.locator(`[data-block-id="${id}"]`);
const host = (page: Page, id: string) => shell(page, id).locator('[data-quoin-host]');
const dropLine = (page: Page) => page.locator('[data-quoin-drop-line]');
const order = async (page: Page) => (await blocks(page)).map((block) => block.id);

async function grab(page: Page, id: string) {
  await host(page, id).hover();
  const box = (await handle(page).boundingBox())!;
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y + 6, { steps: 2 });
  return start;
}

async function bottomOf(page: Page, id: string) {
  const box = (await shell(page, id).boundingBox())!;
  return box.y + box.height;
}

test('a block dragged by its handle lands at the drop line, and the move is announced', async ({ page }) => {
  await openEditor(page, 'drag');
  const start = await grab(page, 'a');
  await page.mouse.move(start.x, await bottomOf(page, 'c'), { steps: 8 });
  await expect(dropLine(page)).toBeVisible();
  await page.mouse.up();
  await expect.poll(() => order(page)).toEqual(['b', 'c', 'a', 'l', 'd']);
  await expect(page.getByRole('status')).toHaveText('Block moved to position 3 of 5');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(dropLine(page)).toBeHidden();
});

test('a drag that ends 48 px right of where it started nests the block under a list item', async ({ page }) => {
  await openEditor(page, 'drag');
  const start = await grab(page, 'a');
  await page.mouse.move(start.x + 48, await bottomOf(page, 'l'), { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => order(page)).toEqual(['b', 'c', 'l', 'a', 'd']);
  expect((await blocks(page)).find((block) => block.id === 'a')?.indent).toBe(1);
});

test('Escape in the middle of a drag leaves the order unchanged', async ({ page }) => {
  await openEditor(page, 'drag');
  const start = await grab(page, 'a');
  await page.mouse.move(start.x, await bottomOf(page, 'c'), { steps: 8 });
  await expect(dropLine(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dropLine(page)).toBeHidden();
  await page.mouse.up();
  await expect(page.getByRole('menu')).toHaveCount(0);
  expect(await order(page)).toEqual(['a', 'b', 'c', 'l', 'd']);
});

test('dragging either of two selected blocks moves both', async ({ page }) => {
  await openEditor(page, 'drag');
  await host(page, 'a').click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(shell(page, 'a')).toHaveAttribute('data-selected', 'true');
  await expect(shell(page, 'b')).toHaveAttribute('data-selected', 'true');
  const start = await grab(page, 'b');
  await page.mouse.move(start.x, (await bottomOf(page, 'd')) + 10, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => order(page)).toEqual(['c', 'l', 'd', 'a', 'b']);
});
