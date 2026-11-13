import { expect, test, type Locator, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { host } from '../../support/block';
import { forward } from '../../support/direction';
import { blocks, openEditor } from '../../support/editor';
import { allMarkdown } from '../../support/markdown';
import { selectFromStart } from '../../support/select-start';
import { firstWordPoint, textPoint } from '../../support/text-point';

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Text formatting' });
const control = (page: Page, name: string) => toolbar(page).getByRole('button', { name, exact: true });
const box = async (locator: Locator) => (await locator.boundingBox())!;

const selectionBox = (page: Page) =>
  page.evaluate(() => {
    const { top, bottom, left, right } = getSelection()!.getRangeAt(0).getBoundingClientRect();
    return { top, bottom, left, right };
  });

const domSelection = (page: Page) =>
  page.evaluate(() => {
    const selection = getSelection()!;
    return { text: selection.toString(), anchor: selection.anchorOffset, focus: selection.focusOffset };
  });

const doubleClickFirstWord = async (page: Page, id: string) =>
  host(page, id).dblclick({ position: await firstWordPoint(host(page, id)) });

test('double-clicking a word shows the toolbar above it, with no accessibility violations', async ({ page }) => {
  await openEditor(page, 'drag');
  await doubleClickFirstWord(page, 'd');
  await expect(toolbar(page)).toBeVisible();
  const word = await selectionBox(page);
  const bar = await box(toolbar(page));
  expect(bar.y + bar.height).toBeLessThanOrEqual(word.top);
  expect(bar.x).toBeLessThan(word.right);
  expect(bar.x + bar.width).toBeGreaterThan(word.left);
  await expect(host(page, 'd')).toBeFocused();
  expect(await axeViolations(page, 'all', '[role="toolbar"]')).toEqual([]);
});

test('the toolbar sits below a selection with no room above it', async ({ page }) => {
  await openEditor(page, 'sample');
  await doubleClickFirstWord(page, 'a');
  await expect(toolbar(page)).toBeVisible();
  const word = await selectionBox(page);
  expect(word.top).toBeLessThan(56);
  expect((await box(toolbar(page))).y).toBeGreaterThanOrEqual(word.bottom);
});

test('Bold toggles the selected word and shows whether it is on', async ({ page }) => {
  await openEditor(page, 'drag');
  await doubleClickFirstWord(page, 'd');
  await control(page, 'Bold').click();
  await expect.poll(() => allMarkdown(page)).toContain('**Delta**');
  await expect(control(page, 'Bold')).toHaveAttribute('aria-pressed', 'true');
  await expect(host(page, 'd')).toBeFocused();
  await control(page, 'Bold').click();
  await expect.poll(() => allMarkdown(page)).toContain('Delta');
  await expect(control(page, 'Bold')).toHaveAttribute('aria-pressed', 'false');
});

test('Alt+F10 moves focus into the toolbar and Escape takes it back with the same selection', async ({ page }) => {
  await openEditor(page, 'drag');
  await doubleClickFirstWord(page, 'b');
  await expect(toolbar(page)).toBeVisible();
  const before = await domSelection(page);
  expect(before.text).toBe('Bravo');
  await page.keyboard.press('Alt+F10');
  await expect(control(page, 'Turn into')).toBeFocused();
  await page.keyboard.press(forward());
  await expect(control(page, 'Bold')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(host(page, 'b')).toBeFocused();
  await expect.poll(() => domSelection(page)).toEqual(before);
  await expect(toolbar(page)).toBeVisible();
});

test('a drag across blocks shows the toolbar, and Italic applies to every block it crosses', async ({ page }) => {
  await openEditor(page, 'drag');
  const [a, c] = [await box(host(page, 'a')), await box(host(page, 'c'))];
  const [from, to] = [await textPoint(host(page, 'a'), 'Alpha'), await textPoint(host(page, 'c'), 'Charlie')];
  await page.mouse.move(a.x + from.x, a.y + from.y);
  await page.mouse.down();
  await page.mouse.move(c.x + to.x, c.y + to.y, { steps: 8 });
  await expect(toolbar(page)).toHaveCount(0);
  await page.mouse.up();
  await expect(toolbar(page)).toBeVisible();
  await control(page, 'Italic').click();
  await expect.poll(async () => (await allMarkdown(page)).slice(0, 3).every((line) => /[*_]/.test(line))).toBe(true);
  expect((await allMarkdown(page))[1]).toBe('_Bravo_');
});

test('the toolbar follows its selection when the editor scrolls inside a container', async ({ page }) => {
  await openEditor(page, 'text');
  await page.locator('#root').evaluate((element) => Object.assign(element.style, { height: '320px', overflowY: 'auto' }));
  await doubleClickFirstWord(page, 'b');
  await expect(toolbar(page)).toBeVisible();
  const gapAbove = async () => (await selectionBox(page)).top - ((await box(toolbar(page))).y + (await box(toolbar(page))).height);
  const resting = await gapAbove();
  await page.locator('#root').evaluate((element) => element.scrollBy(0, 40));
  await expect.poll(async () => Math.abs((await gapAbove()) - resting)).toBeLessThan(2);
});

test.describe('on a touch screen', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox cannot emulate a mobile device');
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('selected text shows no bubble toolbar', async ({ page }) => {
    await openEditor(page, 'drag');
    await selectFromStart(host(page, 'b'), 3, 'tap');
    await expect.poll(async () => (await domSelection(page)).text).toBe('Bra');
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(toolbar(page)).toHaveCount(0);
  });
});

const dataOf = async (page: Page, id: string) => (await blocks(page)).find((block) => block.id === id)?.data;

// The toolbar's three menus, which the other tests only tab to. Each is opened from the toolbar and used, because a
// control that opens is not the same as one that applies to the block the selection is in.
test('Turn into, Color and Align open from the toolbar and change the block the selection is in', async ({ page }) => {
  await openEditor(page, 'drag');

  await doubleClickFirstWord(page, 'd');
  await control(page, 'Turn into').click();
  await page.getByRole('menuitem', { name: 'Heading 2' }).click();
  await expect.poll(() => allMarkdown(page)).toContain('## Delta');

  const red = () => page.getByRole('group', { name: 'Text color' }).getByRole('menuitemradio', { name: 'Red' });
  await doubleClickFirstWord(page, 'd');
  await control(page, 'Color').click();
  await red().click();
  await doubleClickFirstWord(page, 'd');
  await control(page, 'Color').click();
  await expect(red()).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');

  await doubleClickFirstWord(page, 'd');
  await control(page, 'Align').click();
  await page.getByRole('menuitemradio', { name: 'Align center' }).click();
  await expect.poll(async () => (await dataOf(page, 'd'))?.align).toBe('center');
});
