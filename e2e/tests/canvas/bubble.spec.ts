import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { blocks, openEditor } from '../../support/editor';

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Text formatting' });
const control = (page: Page, name: string) => toolbar(page).getByRole('button', { name, exact: true });
const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const markdown = async (page: Page) => (await blocks(page)).map((block) => String(block.data.markdown));
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

const doubleClickFirstWord = (page: Page, id: string) => host(page, id).dblclick({ position: { x: 12, y: 12 } });

async function selectStart(page: Page, id: string, characters: number) {
  await host(page, id).click({ position: { x: 1, y: 12 } });
  for (let i = 0; i < characters; i++) await page.keyboard.press('Shift+ArrowRight');
}

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
  const { violations } = await new AxeBuilder({ page }).include('[role="toolbar"]').analyze();
  expect(violations.map((violation) => violation.id)).toEqual([]);
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
  await expect.poll(() => markdown(page)).toContain('**Delta**');
  await expect(control(page, 'Bold')).toHaveAttribute('aria-pressed', 'true');
  await expect(host(page, 'd')).toBeFocused();
  await control(page, 'Bold').click();
  await expect.poll(() => markdown(page)).toContain('Delta');
  await expect(control(page, 'Bold')).toHaveAttribute('aria-pressed', 'false');
});

test('Alt+F10 moves focus into the toolbar and Escape takes it back with the same selection', async ({ page }) => {
  await openEditor(page, 'drag');
  await selectStart(page, 'b', 3);
  await expect(toolbar(page)).toBeVisible();
  const before = await domSelection(page);
  expect(before.text).toBe('Bra');
  await page.keyboard.press('Alt+F10');
  await expect(control(page, 'Turn into')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(control(page, 'Bold')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(host(page, 'b')).toBeFocused();
  await expect.poll(() => domSelection(page)).toEqual(before);
  await expect(toolbar(page)).toBeVisible();
});

test('a drag across blocks shows the toolbar, and Italic applies to every block it crosses', async ({ page }) => {
  await openEditor(page, 'drag');
  const from = await box(host(page, 'a'));
  const to = await box(host(page, 'c'));
  await page.mouse.move(from.x + 8, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 20, to.y + to.height / 2, { steps: 8 });
  await expect(toolbar(page)).toHaveCount(0);
  await page.mouse.up();
  await expect(toolbar(page)).toBeVisible();
  await control(page, 'Italic').click();
  await expect.poll(async () => (await markdown(page)).slice(0, 3).every((line) => /[*_]/.test(line))).toBe(true);
  expect((await markdown(page))[1]).toBe('_Bravo_');
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
    await host(page, 'b').tap({ position: { x: 1, y: 12 } });
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
    await expect.poll(async () => (await domSelection(page)).text).toBe('Bra');
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(toolbar(page)).toHaveCount(0);
  });
});
