import { expect, test, type Locator, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { firstLine, host } from '../../support/block';
import { forward, inlineX } from '../../support/direction';
import { blocks, openEditor } from '../../support/editor';
import { settled } from '../../support/settle';

const handle = (page: Page) => page.getByRole('button', { name: 'Drag to move, click for options' });
const addBelow = (page: Page) => page.getByRole('button', { name: 'Add block below' });
const menu = (page: Page) => page.getByRole('menu');
const ids = async (page: Page) => (await blocks(page)).map((block) => block.id);

// Radix opens a context menu two pixels from the pointer, and one more is room for sub-pixel rounding.
const MENU_GAP = 3;

type Watched = Window & { taken?: boolean | null };

/**
 * Whether the editor took the right-click for its own menu, which it says by preventing the default. Asked rather than
 * looking for the block menu afterwards: that check holds as soon as no menu is there, so it answers only for a menu
 * quick enough to beat the first poll, and a slower one would leave it passing. The default is prevented while the
 * event is being dispatched, so this says the same thing whatever the machine is doing.
 */
async function tookTheRightClick(page: Page, target: Locator): Promise<boolean | null> {
  await page.evaluate(() => {
    (window as Watched).taken = null;
    document.addEventListener('contextmenu', (event) => void ((window as Watched).taken = event.defaultPrevented), {
      once: true,
    });
  });
  await target.click({ button: 'right' });
  return page.evaluate(() => (window as Watched).taken ?? null);
}

// The handle sits on the page in the room before the start of the line, which a right to left page has on the right.
async function expectBeforeLine(page: Page, id: string, measured = handle(page)) {
  const line = await firstLine(page, id);
  const box = (await measured.boundingBox())!;
  const pageWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const at = inlineX(box, pageWidth);
  expect(at).toBeGreaterThanOrEqual(0);
  expect(at + box.width).toBeLessThanOrEqual(inlineX({ x: line.left, width: line.width }, pageWidth));
  return { box, line };
}

async function expectBesideFirstLine(page: Page, id: string) {
  await host(page, id).hover();
  await expect(handle(page)).toBeVisible();
  const { box, line } = await expectBeforeLine(page, id);
  expect(Math.abs(box.y + box.height / 2 - (line.top + line.height / 2))).toBeLessThanOrEqual(1);
}

test('hovering a block shows the handle beside its first line', async ({ page }) => {
  await openEditor(page, 'text');
  await expectBesideFirstLine(page, 'h');
  await expectBesideFirstLine(page, 'n');
  await expectBesideFirstLine(page, 'c');
  await expect(handle(page)).toHaveAttribute('tabindex', '-1');
  await expect(addBelow(page)).toHaveAttribute('tabindex', '-1');
});

test('a click on the handle opens the block menu, walked with the arrows and Enter', async ({ page }) => {
  await openEditor(page, 'sample');
  await host(page, 'b').hover();
  await handle(page).click();
  await expect(menu(page)).toHaveAccessibleName('Text block menu');
  for (const name of ['Turn into', 'Color', 'Duplicate']) {
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name })).toBeFocused();
  }
  await page.keyboard.press('Enter');
  await expect(menu(page)).toHaveCount(0);
  await expect.poll(async () => (await blocks(page)).map((block) => block.data.markdown)).toEqual([
    '# Title',
    'First paragraph.',
    'First paragraph.',
  ]);
  await expect(page.getByRole('textbox', { name: 'Paragraph' }).nth(1)).toBeFocused();
});

test('Mod+/ opens the block menu beside the block holding the caret, and Escape gives the caret back', async ({ page }) => {
  await openEditor(page, 'sample');
  await host(page, 'b').click();
  await page.keyboard.press('End');
  await host(page, 'a').hover();
  await page.keyboard.press('ControlOrMeta+/');
  await expect(menu(page)).toHaveAccessibleName('Text block menu');
  await expect(page.getByRole('menuitem', { name: 'Turn into' })).toBeFocused();
  const line = await firstLine(page, 'b');
  const top = (await menu(page).boundingBox())!.y;
  expect(top).toBeGreaterThan(line.top);
  expect(top).toBeLessThan(line.top + line.height + 24);
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  await expect(host(page, 'b')).toBeFocused();
  await page.keyboard.type('!');
  await expect.poll(async () => (await blocks(page))[1].data.markdown).toBe('First paragraph.!');
});

test('a click in another block closes the block menu and leaves the caret where it was clicked', async ({ page }) => {
  await openEditor(page, 'sample');
  await host(page, 'a').hover();
  await handle(page).click();
  await expect(menu(page)).toBeVisible();
  await host(page, 'b').click();
  await expect(menu(page)).toHaveCount(0);
  await expect(host(page, 'b')).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.type('!');
  await expect.poll(async () => (await blocks(page)).map((block) => block.data.markdown)).toEqual(['# Title', 'First paragraph.!']);
});

test('a second click on the handle closes the block menu, quick or held, and gives the caret back', async ({ page }) => {
  await openEditor(page, 'sample');
  await host(page, 'b').click();
  await page.keyboard.press('End');
  for (const delay of [0, 80]) {
    await host(page, 'b').hover();
    await handle(page).click();
    await expect(menu(page)).toBeVisible();
    await handle(page).click({ delay });
    await expect(menu(page)).toHaveCount(0);
  }
  await expect(host(page, 'b')).toBeFocused();
  await page.keyboard.type('!');
  await expect.poll(async () => (await blocks(page)).map((block) => block.data.markdown)).toEqual(['# Title', 'First paragraph.!']);
});

test('the tone of a callout is set from the keyboard through its block menu', async ({ page }) => {
  await openEditor(page, 'text');
  await page.getByRole('textbox', { name: 'Callout, warning' }).click();
  await page.keyboard.press('ControlOrMeta+/');
  await expect(page.getByRole('menuitem', { name: 'Turn into' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Tone' })).toBeFocused();
  await page.keyboard.press(forward());
  await expect(page.getByRole('menuitemradio', { name: 'info' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitemradio', { name: 'danger' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menu(page)).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Callout, danger' })).toBeFocused();
  expect((await blocks(page)).find((block) => block.id === 'c')?.data).toEqual({ tone: 'danger', body: 'Careful' });
});

test('a right-click on the handle opens the block menu at the pointer', async ({ page }) => {
  await openEditor(page, 'sample');
  await host(page, 'a').hover();
  const grip = (await handle(page).boundingBox())!;
  const pointer = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
  await handle(page).click({ button: 'right' });
  await expect(menu(page)).toHaveAccessibleName('Heading 1 block menu');
  await settled(menu(page));
  const opened = (await menu(page).boundingBox())!;
  const pageWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const [start, at] = [inlineX(opened, pageWidth), inlineX({ x: pointer.x, width: 0 }, pageWidth)];
  expect(start).toBeGreaterThanOrEqual(at - 1);
  expect(start).toBeLessThanOrEqual(at + MENU_GAP);
  expect(Math.abs(opened.y - pointer.y)).toBeLessThanOrEqual(MENU_GAP);
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect.poll(() => ids(page)).toEqual(['b']);
  await expect(host(page, 'b')).toBeFocused();
});

test('a right-click on the handle while its menu is open opens the menu again at the pointer', async ({ page }) => {
  await openEditor(page, 'sample');
  await host(page, 'a').hover();
  await handle(page).click();
  await expect(menu(page)).toHaveAccessibleName('Heading 1 block menu');
  const grip = (await handle(page).boundingBox())!;
  const pointer = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
  await page.mouse.click(pointer.x, pointer.y, { button: 'right' });
  await expect(menu(page)).toHaveAccessibleName('Heading 1 block menu');
  await settled(menu(page));
  const opened = (await menu(page).boundingBox())!;
  expect(Math.abs(opened.y - pointer.y)).toBeLessThanOrEqual(MENU_GAP);
});

test('a Ctrl+click on a Mac over selected blocks keeps them selected and opens their menu', async ({ page }) => {
  test.skip(process.platform !== 'darwin', 'Control with a click is a right-click on a Mac only');
  await openEditor(page, 'sample');
  await host(page, 'a').click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+ArrowDown');
  const selection = () => page.evaluate(() => window.__quoin.controller?.editor.state.selection);
  await expect.poll(selection).toEqual({ kind: 'blocks', anchor: 'a', head: 'b' });
  await host(page, 'b').click({ modifiers: ['Control'], position: { x: 20, y: 8 } });
  await expect(menu(page)).toBeVisible();
  expect(await selection()).toEqual({ kind: 'blocks', anchor: 'a', head: 'b' });
});

test('a right-click on a block with no text opens the block menu, and one in text leaves the browser its menu', async ({
  page,
}) => {
  await openEditor(page, 'custom');
  expect(await tookTheRightClick(page, host(page, 'above'))).toBe(false);
  await expect(menu(page)).toHaveCount(0);
  expect(await tookTheRightClick(page, page.getByText('https://quoin.dev', { exact: true }))).toBe(true);
  await expect(menu(page)).toHaveAccessibleName('Bookmark block menu');
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
});

test('Copy puts the markdown of the block on the clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'only Chromium lets a page read the clipboard back');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openEditor(page, 'sample');
  await host(page, 'a').hover();
  await handle(page).click();
  await page.getByRole('menuitem', { name: 'Copy', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('# Title\n');
});

test('+ adds a paragraph below the block with the caret in it', async ({ page }) => {
  await openEditor(page, 'sample');
  await host(page, 'a').hover();
  await addBelow(page).click();
  await expect.poll(async () => (await blocks(page)).length).toBe(3);
  const added = (await blocks(page))[1];
  expect(added.data).toEqual({ markdown: '/' });
  await expect(host(page, added.id)).toBeFocused();
});

test('+ opens the slash menu in the paragraph it adds', async ({ page }) => {
  await openEditor(page, 'sample');
  await host(page, 'a').hover();
  await addBelow(page).click();
  await expect(page.getByRole('listbox')).toBeVisible();
});

test('the open block menu has no accessibility violations', async ({ page }) => {
  await openEditor(page, 'sample');
  await host(page, 'a').hover();
  await handle(page).click();
  await page.getByRole('menuitem', { name: 'Color' }).click();
  await expect(page.getByRole('group', { name: 'Text color' })).toBeVisible();
  expect(await axeViolations(page, 'all', '[role="menu"]')).toEqual([]);
});

test.describe('on a touch screen', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox cannot emulate a mobile device');
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('the gutter shows beside the block being edited only, as one handle with a 44 px target', async ({ page }) => {
    const handle = (on: Page) => on.getByRole('button', { name: 'Block options' });
    await openEditor(page, 'sample');
    await expect(handle(page)).toBeHidden();
    await host(page, 'b').tap();
    await expect(handle(page)).toBeVisible();
    const gutter = page.locator('[data-quoin-gutter-block]');
    await expect(gutter.getByRole('button', { name: 'Add block below' })).toBeHidden();
    const { box } = await expectBeforeLine(page, 'b', handle(page));
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await handle(page).tap();
    await expect(menu(page)).toHaveAccessibleName('Text block menu');
  });
});
