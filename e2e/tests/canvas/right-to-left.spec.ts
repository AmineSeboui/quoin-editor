import { expect, test, type Locator, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';

const handle = (page: Page) => page.getByRole('button', { name: 'Drag to move, click for options' });
const addBelow = (page: Page) => page.getByRole('button', { name: 'Add block below' });
const shell = (page: Page, id: string) => page.locator(`[data-block-id="${id}"]`);
const host = (page: Page, id: string) => shell(page, id).locator('[data-quoin-host]');
const dropLine = (page: Page) => page.locator('[data-quoin-drop-line]');
const box = async (locator: Locator) => (await locator.boundingBox())!;

// The project turns the harness round, so the canvas mounts on a right to left page rather than being flipped under
// one that has already mounted. The menus read the direction as they mount and do not follow a later flip, so a page
// turned round afterwards would leave them resolving against a left to right default and prove nothing.
const openRightToLeft = (page: Page, doc: string, extra = '') => openEditor(page, doc, extra);

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

/**
 * Which edge of a menu is lined up with the control that opened it. A menu asking for the inline start lines its own
 * start up with the trigger's, and on a right to left page the inline start is the right edge. Measuring which edge is
 * nearer survives the shift the placer applies to keep a menu on the screen, where comparing one edge for equality
 * would not.
 */
async function alignedEdge(trigger: Locator, menu: Locator): Promise<'left' | 'right'> {
  const [a, b] = [await box(trigger), await box(menu)];
  const starts = Math.abs(b.x - a.x);
  return starts <= Math.abs(b.x + b.width - (a.x + a.width)) ? 'left' : 'right';
}

async function openBlockMenu(page: Page) {
  await host(page, 'p').hover();
  await handle(page).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}

test('on a right-to-left page the block menu opens from the inline start, which is the right edge', async ({ page }) => {
  await openRightToLeft(page, 'rich');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const menu = await openBlockMenu(page);
  expect(await alignedEdge(handle(page), menu)).toBe('right');
});

test('on a right-to-left page the block menu stays on the screen', async ({ page }) => {
  await openRightToLeft(page, 'rich');
  const placed = await box(await openBlockMenu(page));
  expect(placed.x).toBeGreaterThanOrEqual(0);
  expect(placed.x + placed.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('on a right-to-left page the slash menu opens from the inline start too', async ({ page }) => {
  await openRightToLeft(page, 'rich');
  const text = host(page, 'tc');
  await text.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' /');
  const menu = page.getByRole('listbox', { name: 'Commands' });
  await expect(menu).toBeVisible();
  expect(await alignedEdge(text, menu)).toBe('right');
});

// Arabic rather than English, because the contrast and the layout of real Arabic text are what a reader meets, and
// because the rest of the canvas specs cannot be run translated: they find almost everything by its English name.
for (const scheme of ['light', 'dark'] as const) {
  test.describe(`in Arabic, in ${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test('axe finds no serious violation at rest', async ({ page }) => {
      await openRightToLeft(page, 'rich', 'locale=ar');
      await expect(page.locator('html')).toHaveClass(scheme === 'dark' ? 'dark' : '');
      expect(await axeViolations(page, 'serious', '.quoin')).toEqual([]);
    });

    test('axe finds no serious violation with the slash menu open', async ({ page }) => {
      await openRightToLeft(page, 'rich', 'locale=ar');
      await host(page, 'tc').click();
      await page.keyboard.press('End');
      await page.keyboard.type(' /');
      await expect(page.getByRole('listbox')).toBeVisible();
      expect(await axeViolations(page, 'serious', '.quoin')).toEqual([]);
    });
  });
}
