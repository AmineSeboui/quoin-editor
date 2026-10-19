import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';

const handle = (page: Page) => page.getByRole('button', { name: 'Drag to move, click for options' });
const addBelow = (page: Page) => page.getByRole('button', { name: 'Add block below' });
const menu = (page: Page) => page.getByRole('menu');
const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const ids = async (page: Page) => (await blocks(page)).map((block) => block.id);

const firstLine = (page: Page, id: string) =>
  host(page, id).evaluate((element) => {
    const { top, left } = element.getBoundingClientRect();
    return { top, left, height: parseFloat(getComputedStyle(element).lineHeight) };
  });

async function expectBesideFirstLine(page: Page, id: string) {
  await host(page, id).hover();
  await expect(handle(page)).toBeVisible();
  const line = await firstLine(page, id);
  const box = (await handle(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(line.left);
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
  await page.keyboard.press('ArrowRight');
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
  await handle(page).click({ button: 'right' });
  await expect(menu(page)).toHaveAccessibleName('Heading 1 block menu');
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect.poll(() => ids(page)).toEqual(['b']);
  await expect(host(page, 'b')).toBeFocused();
});

test('a right-click on a block with no text opens the block menu, and one in text leaves the browser its menu', async ({
  page,
}) => {
  await openEditor(page, 'custom');
  await host(page, 'above').click({ button: 'right' });
  await expect(menu(page)).toHaveCount(0);
  await page.getByText('https://quoin.dev', { exact: true }).click({ button: 'right' });
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
    await openEditor(page, 'sample');
    await expect(handle(page)).toBeHidden();
    await host(page, 'b').tap();
    await expect(handle(page)).toBeVisible();
    const gutter = page.locator('[data-quoin-gutter-block]');
    await expect(gutter.getByRole('button', { name: 'Add block below' })).toBeHidden();
    const line = await firstLine(page, 'b');
    const box = (await handle(page).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(line.left);
    await handle(page).tap();
    await expect(menu(page)).toHaveAccessibleName('Text block menu');
  });
});
