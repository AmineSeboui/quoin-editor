import { expect, type Locator, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';
import { phoneTest as test } from '../../support/phone';

test.skip(({ browserName }) => browserName === 'firefox', 'Firefox cannot emulate a mobile device');

const tools = (page: Page) => page.getByRole('toolbar', { name: 'Editing tools' });
const tool = (page: Page, name: string) => tools(page).getByRole('button', { name, exact: true });
const handle = (page: Page) => page.getByRole('button', { name: 'Drag to move, click for options' });
const gutterAdd = (page: Page) =>
  page.locator('[data-quoin-gutter-block]').getByRole('button', { name: 'Add block below' });
const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const box = async (locator: Locator) => (await locator.boundingBox())!;
const tapStart = (page: Page, id: string) => host(page, id).tap({ position: { x: 1, y: 12 } });

const visualViewport = (page: Page) =>
  page.evaluate(() => {
    const viewport = window.visualViewport!;
    return { bottom: viewport.offsetTop + viewport.height, width: viewport.width };
  });

const firstLine = (page: Page, id: string) =>
  host(page, id).evaluate((element) => {
    const { top, left } = element.getBoundingClientRect();
    return { top, left, height: parseFloat(getComputedStyle(element).lineHeight) };
  });

test('a tap shows the editing tools on the bottom edge, and selected text no bubble toolbar', async ({ page }) => {
  await openEditor(page, 'drag');
  await expect(tools(page)).toHaveCount(0);
  await tapStart(page, 'b');
  await expect(tools(page)).toBeVisible();
  const bar = await box(tools(page));
  const viewport = await visualViewport(page);
  expect(Math.abs(bar.y + bar.height - viewport.bottom)).toBeLessThanOrEqual(1);
  expect(bar.x).toBe(0);
  expect(Math.abs(bar.width - viewport.width)).toBeLessThanOrEqual(1);
  for (const button of await tools(page).getByRole('button').all()) {
    const target = await box(button);
    expect(Math.min(target.width, target.height)).toBeGreaterThanOrEqual(44);
  }
  const overflow = await tools(page).evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeGreaterThan(0);
  for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByRole('toolbar', { name: 'Text formatting' })).toHaveCount(0);
  await expect(tools(page)).toBeVisible();
  expect(await axeViolations(page, 'all', '[role="toolbar"]')).toEqual([]);
});

test('tapping Bold then typing writes bold text, with focus kept in the text', async ({ page }) => {
  await openEditor(page, 'sample');
  await tapStart(page, 'b');
  await tool(page, 'Bold').tap();
  await expect(tool(page, 'Bold')).toHaveAttribute('aria-pressed', 'true');
  await expect(host(page, 'b')).toBeFocused();
  await page.keyboard.type('Go');
  await expect.poll(async () => (await blocks(page))[1].data.markdown).toBe('**Go**First paragraph.');
});

test('Add block opens the slash menu in a new paragraph below the caret', async ({ page }) => {
  await openEditor(page, 'sample');
  await tapStart(page, 'a');
  await tool(page, 'Add block below').tap();
  await expect(page.getByRole('listbox', { name: 'Commands' })).toBeVisible();
  await expect.poll(async () => (await blocks(page)).map((block) => block.data.markdown)).toEqual([
    '# Title',
    '/',
    'First paragraph.',
  ]);
});

test('only the block holding the caret shows a handle, alone, which opens its block menu on tap', async ({ page }) => {
  await openEditor(page, 'sample');
  await expect(handle(page)).toBeHidden();
  for (const id of ['a', 'b']) {
    await tapStart(page, id);
    await expect(handle(page)).toHaveCount(1);
    await expect(handle(page)).toBeVisible();
    await expect(gutterAdd(page)).toBeHidden();
    const line = await firstLine(page, id);
    const middleGap = async () => {
      const target = await box(handle(page));
      return Math.abs(target.y + target.height / 2 - (line.top + line.height / 2));
    };
    await expect.poll(middleGap).toBeLessThanOrEqual(1);
  }
  await handle(page).tap();
  await expect(page.getByRole('menu')).toHaveAccessibleName('Text block menu');
});
