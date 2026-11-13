import { expect, test, type Locator, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { host, shell } from '../../support/block';
import { blocks, openEditor } from '../../support/editor';

const handle = (page: Page) => page.getByRole('button', { name: 'Drag to move, click for options' });
const addBelow = (page: Page) => page.getByRole('button', { name: 'Add block below' });
const dropLine = (page: Page) => page.locator('[data-quoin-drop-line]');
const box = async (locator: Locator) => (await locator.boundingBox())!;

// The project turns the harness round, so the canvas mounts on a right to left page rather than being flipped under
// one that has already mounted.
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

test('a page turned round under the gutter moves it to the other side at once, and the menus follow', async ({ page }) => {
  await openRightToLeft(page, 'sample');
  await host(page, 'b').hover();
  await expect(handle(page)).toBeVisible();
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'ltr'));
  const line = await box(shell(page, 'b'));
  await expect.poll(async () => (await box(handle(page))).x + (await box(handle(page))).width).toBeLessThanOrEqual(line.x);
  await handle(page).click();
  await expect(page.getByRole('menu')).toHaveAttribute('dir', 'ltr');
  expect(await alignedEdge(handle(page), page.getByRole('menu'))).toBe('left');
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

// The caret at the end of a line, put there through the editor: End scrolls the page in Chrome on macOS.
const caretAtEnd = (page: Page, id: string, offset: number) =>
  page.evaluate(([block, at]) => window.__quoin.controller!.focus({ block, region: 'text', offset: at }), [id, offset] as const);

async function openSlashMenu(page: Page) {
  await host(page, 'tc').click();
  await caretAtEnd(page, 'tc', 'Hidden detail'.length);
  await page.keyboard.type(' /');
  const menu = page.getByRole('listbox', { name: 'Commands' });
  await expect(menu).toBeVisible();
  return menu;
}

// The highlighted row of a menu is marked with a bar, an inset shadow whose offset says which side it is on.
const barSide = (row: Locator) =>
  row.evaluate((element) => {
    const offset = parseFloat(/(-?[\d.]+)px 0px 0px 0px inset/.exec(getComputedStyle(element).boxShadow)?.[1] ?? '0');
    return offset < 0 ? 'right' : offset > 0 ? 'left' : 'none';
  });

test('on a right-to-left page the highlighted row of a menu is marked on the right, where its text starts', async ({ page }) => {
  await openRightToLeft(page, 'rich');
  const row = (await openBlockMenu(page)).getByRole('menuitem').first();
  await row.hover();
  await expect(row).toHaveAttribute('data-highlighted', '');
  expect(await barSide(row)).toBe('right');
  await page.keyboard.press('Escape');
  const option = (await openSlashMenu(page)).getByRole('option').first();
  await expect(option).toHaveAttribute('aria-selected', 'true');
  expect(await barSide(option)).toBe('right');
});

test('on a right-to-left page a menu row ends on the left, with its shortcut and a chevron pointing that way', async ({ page }) => {
  await openRightToLeft(page, 'rich');
  const menu = await openBlockMenu(page);
  const row = await box(menu.getByRole('menuitem', { name: 'Duplicate' }));
  const shortcut = await box(menu.getByRole('menuitem', { name: 'Duplicate' }).locator('[data-slot$="shortcut"]'));
  expect(shortcut.x - row.x).toBeLessThanOrEqual(9);
  const trigger = menu.getByRole('menuitem', { name: 'Turn into' });
  const chevron = await box(trigger.locator('svg').last());
  expect(chevron.x - (await box(trigger)).x).toBeLessThanOrEqual(9);
  expect(await trigger.locator('svg').last().evaluate((svg) => getComputedStyle(svg).rotate)).toBe('180deg');
});

const direction = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).direction);
const editingTools = (page: Page) => page.getByRole('toolbar', { name: 'Editing tools' });

// A double click on the first word, which on a turned round line is at its right end.
async function openFormatting(page: Page) {
  const line = await box(host(page, 'p'));
  await host(page, 'p').dblclick({ position: { x: line.width - 16, y: 12 } });
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  await expect(toolbar).toBeVisible();
  return toolbar;
}

const runsFromTheRight = async (row: Locator) =>
  (await box(row.getByRole('button').nth(1))).x < (await box(row.getByRole('button').first())).x;

test('on a right-to-left page the formatting toolbar runs from the right, and the left arrow walks on along it', async ({ page }) => {
  await openRightToLeft(page, 'rich');
  const toolbar = await openFormatting(page);
  expect(await runsFromTheRight(toolbar)).toBe(true);
  await page.keyboard.press('Alt+F10');
  await expect(toolbar.getByRole('button').first()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(toolbar.getByRole('button').nth(1)).toBeFocused();
});

// The harness turns round the element that holds the canvas and leaves the page itself, and so the body that the
// menus and toolbars are drawn into, running left to right.
const openTurnedRoundCanvas = async (page: Page) => {
  await page.goto('/?doc=rich&canvas-dir=rtl');
  await page.getByRole('group', { name: 'Document' }).waitFor();
  expect(await direction(page.locator('body'))).toBe('ltr');
};

test('on a page turned round around the canvas alone, what it draws over the page turns round with it', async ({ page }) => {
  await openTurnedRoundCanvas(page);
  expect(await direction(await openBlockMenu(page))).toBe('rtl');
  await page.keyboard.press('Escape');
  expect(await direction(await openSlashMenu(page))).toBe('rtl');
  await page.keyboard.press('Escape');
  const toolbar = await openFormatting(page);
  expect(await direction(toolbar)).toBe('rtl');
  expect(await runsFromTheRight(toolbar)).toBe(true);
});

test.describe('on a phone', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox cannot emulate a mobile device');
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('on a right-to-left page the editing tools run from the right', async ({ page }) => {
    await openRightToLeft(page, 'rich');
    await host(page, 'p').tap();
    await expect(editingTools(page)).toBeVisible();
    expect(await runsFromTheRight(editingTools(page))).toBe(true);
  });

  test('on a page turned round around the canvas alone, the editing tools run from the right', async ({ page }) => {
    await openTurnedRoundCanvas(page);
    await host(page, 'p').tap();
    await expect(editingTools(page)).toBeVisible();
    expect(await direction(editingTools(page))).toBe('rtl');
    expect(await runsFromTheRight(editingTools(page))).toBe(true);
  });
});

test('on a right-to-left page Tab indents a block, and the room is taken from the right', async ({ page }) => {
  await openRightToLeft(page, 'sample');
  await host(page, 'b').click();
  const before = await box(shell(page, 'b'));
  await page.keyboard.press('Tab');
  await expect.poll(async () => (await blocks(page)).find((block) => block.id === 'b')?.indent).toBe(1);
  const after = await box(shell(page, 'b'));
  // The indent is margin-inline-start, which on this page is the right. The block's right edge therefore comes in
  // and its left edge stays where it was, which is what tells the logical property apart from a physical one.
  expect(after.x + after.width).toBeLessThan(before.x + before.width - 8);
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
});

test('on a right-to-left page a closed toggle points the way the text runs on', async ({ page }) => {
  await openRightToLeft(page, 'rich');
  const chevron = page.locator('.quoin-toggle-button').first();
  await expect(chevron).toHaveAttribute('aria-expanded', 'true');
  await chevron.click();
  await expect(chevron).toHaveAttribute('aria-expanded', 'false');
  // A half turn, matrix(-1, 0, 0, -1, ...), is what points a chevron drawn towards the right at the left of the page.
  // Polled because the turn is animated, and read at once it is still the quarter turn the open state left behind.
  const turn = () => chevron.locator('svg').evaluate((svg) => getComputedStyle(svg).transform);
  await expect.poll(turn).toMatch(/^matrix\(-1,\s*0,\s*0,\s*-1/);
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
