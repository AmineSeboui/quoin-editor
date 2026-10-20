import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';

const cell = (page: Page, row: number, col: number) =>
  page.getByRole('textbox', { name: `Row ${row}, column ${col}`, exact: true });

const tableData = async (page: Page) => (await blocks(page)).find((block) => block.type === 'TABLE')?.data;
const rowsOf = async (page: Page) => (await tableData(page))?.rows as string[][] | undefined;
const changes = (page: Page) => page.evaluate(() => window.__quoin.changes);

async function box(page: Page, row: number, col: number) {
  const found = await cell(page, row, col).locator('xpath=..').boundingBox();
  if (found === null) throw new Error(`no cell at row ${row}, column ${col}`);
  return found;
}

// The click places the caret through the browser, so its selectionchange has to reach the editor before a key does.
async function caretIn(page: Page, row: number, col: number) {
  await cell(page, row, col).click();
  await expect(cell(page, row, col)).toBeFocused();
  await page.waitForFunction(() => document.activeElement?.contains(document.getSelection()?.focusNode ?? null));
}

test('/table inserts a 3 by 3 table, and Tab types across its cells, adding a row from the last one', async ({ page }) => {
  await openEditor(page, 'empty', 'table=1');
  await page.locator('[data-quoin-host]').first().click();
  await page.keyboard.type('/table');
  await expect(page.getByRole('option', { name: /^Table/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(cell(page, 1, 1)).toBeFocused();
  expect(await tableData(page)).toEqual({ rows: Array(3).fill(['', '', '']), header: true, align: [null, null, null] });
  await expect(page.getByRole('columnheader')).toHaveCount(3);

  for (const text of ['a', 'b', 'c', 'd']) {
    await page.keyboard.type(text);
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.type('!');
  await expect.poll(() => rowsOf(page)).toEqual([['a', 'b', 'c'], ['d!', '', ''], ['', '', '']]);
  await caretIn(page, 3, 3);
  await page.keyboard.press('Tab');
  await expect(cell(page, 4, 1)).toBeFocused();
  await expect.poll(async () => (await rowsOf(page))?.length).toBe(4);
});

test('the arrows move between rows, and Enter in an empty cell of the last row adds a row', async ({ page }) => {
  await openEditor(page, 'table', 'table=1');
  await caretIn(page, 1, 2);
  await page.keyboard.press('ArrowDown');
  await expect(cell(page, 2, 2)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('textbox', { name: 'Paragraph' }).last()).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(cell(page, 3, 2)).toBeFocused();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  await expect(cell(page, 4, 2)).toBeFocused();
  await expect.poll(async () => (await rowsOf(page))?.at(-1)).toEqual(['', '', '']);
});

test('the + on the edge between two columns inserts a column there', async ({ page }) => {
  await openEditor(page, 'table', 'table=1');
  const second = await box(page, 1, 2);
  await page.mouse.move(second.x + 1, second.y + 2);
  await page.getByRole('button', { name: 'Insert column 2' }).click();
  await expect.poll(() => rowsOf(page)).toEqual([
    ['r0c0', '', 'r0c1', 'r0c2'],
    ['r1c0', '', 'r1c1', 'r1c2'],
    ['r2c0', '', 'r2c1', 'r2c2'],
  ]);
});

// The pointer rests on the + after the last column or row while the keyboard deletes that column or row.
for (const axis of ['column', 'row'] as const) {
  test(`deleting the last ${axis} under a pointer resting on the + after it keeps the canvas`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openEditor(page, 'table', 'table=1');
    await caretIn(page, axis === 'column' ? 2 : 3, axis === 'column' ? 3 : 1);
    const table = (await page.locator('.quoin-table table').boundingBox())!;
    if (axis === 'column') await page.mouse.move(table.x + table.width - 1, table.y + 4);
    else await page.mouse.move(table.x + 6, table.y + table.height - 1);
    await expect(page.getByRole('button', { name: axis === 'column' ? 'Insert column 4' : 'Insert row 4' })).toBeVisible();
    await page.keyboard.press('Alt+F10');
    if (axis === 'row') await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await page.getByRole('menu').getByRole('menuitem', { name: `Delete ${axis}` }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (axis === 'column' ? (await rowsOf(page))?.[0].length : (await rowsOf(page))?.length)).toBe(2);
    await page.waitForTimeout(100);
    await expect(page.getByRole('group', { name: 'Document' })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(`^Insert ${axis}`) })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('dragging the border of a column resizes it, written once when the drag ends', async ({ page }) => {
  await openEditor(page, 'table', 'table=1');
  const first = await box(page, 2, 1);
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  const border = page.getByRole('separator', { name: 'Resize column 1' });
  const handle = (await border.boundingBox())!;
  const before = await changes(page);
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 30, handle.y + 10, { steps: 3 });
  await page.mouse.move(handle.x + handle.width / 2 + 60, handle.y + 10, { steps: 3 });
  expect(await changes(page)).toBe(before);
  await page.mouse.up();
  await expect.poll(async () => ((await tableData(page))?.widths as number[] | undefined)?.length).toBe(3);
  const widths = (await tableData(page))!.widths as number[];
  expect(Math.abs(widths[0] - Math.round(first.width + 60))).toBeLessThanOrEqual(2);
  expect(await changes(page)).toBe(before + 1);
  expect(Math.abs((await box(page, 2, 1)).width - widths[0])).toBeLessThanOrEqual(2);
});

test('a drag across cells selects them as a range, and Backspace empties it', async ({ page }) => {
  await openEditor(page, 'table', 'table=1');
  const from = await box(page, 2, 1);
  const to = await box(page, 3, 2);
  await page.mouse.move(from.x + 8, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('[data-in-range]')).toHaveCount(4);
  await page.keyboard.press('Backspace');
  await expect.poll(() => rowsOf(page)).toEqual([
    ['r0c0', 'r0c1', 'r0c2'],
    ['', '', 'r1c2'],
    ['', '', 'r2c2'],
  ]);
  await expect(cell(page, 2, 1)).toBeFocused();
});

test('Alt+F10 reaches the handles, whose menus work from the keyboard and give focus back to the caret', async ({ page }) => {
  await openEditor(page, 'table', 'table=1');
  await caretIn(page, 2, 2);
  await page.keyboard.press('Alt+F10');
  await expect(page.getByRole('button', { name: 'Column 2 options' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: 'Row 2 options' })).toBeFocused();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu', { name: 'Row 2 options' });
  await expect(menu).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Insert row below' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(cell(page, 2, 2)).toBeFocused();
  await expect.poll(async () => (await rowsOf(page))?.[2]).toEqual(['', '', '']);
  await expect(page.getByRole('status')).toHaveText('Row inserted');
});

test('a press outside an open handle menu closes it and leaves focus where the press put it', async ({ page }) => {
  await openEditor(page, 'table', 'table=1');
  await caretIn(page, 1, 3);
  await page.keyboard.press('Alt+F10');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu', { name: 'Column 3 options' })).toBeVisible();
  await page.getByRole('textbox', { name: 'After the editor' }).click({ position: { x: 4, y: 4 } });
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'After the editor' })).toBeFocused();
});

test('a wide table scrolls inside its block, and brings the cell the caret moves into into view', async ({ page }) => {
  await openEditor(page, 'wide-table', 'table=1');
  const scroller = page.locator('.quoin-table-scroll');
  const sizes = await scroller.evaluate((element) => [element.scrollWidth, element.clientWidth]);
  expect(sizes[0]).toBeGreaterThan(sizes[1]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await caretIn(page, 2, 1);
  for (let i = 0; i < 15; i++) await page.keyboard.press('Tab');
  await expect(cell(page, 2, 16)).toBeFocused();
  await expect(cell(page, 2, 16)).toBeInViewport({ ratio: 0.9 });
  expect(await scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test('a table has no accessibility violations, with its controls or read-only, and read-only draws no controls', async ({ page }) => {
  await openEditor(page, 'table', 'table=1');
  await caretIn(page, 2, 2);
  await page.mouse.move(0, 0);
  await expect(page.getByRole('button', { name: 'Column 2 options' })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await openEditor(page, 'wide-table', 'table=1&readonly=1');
  await expect(page.getByRole('region', { name: 'Table' })).toBeVisible();
  const first = await box(page, 1, 1);
  await page.mouse.move(first.x + 5, first.y + 5);
  await expect(page.getByRole('toolbar')).toHaveCount(0);
  await expect(page.getByRole('separator', { name: /^Resize column/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Insert (row|column)/ })).toHaveCount(0);
  expect(await axeViolations(page)).toEqual([]);
});
