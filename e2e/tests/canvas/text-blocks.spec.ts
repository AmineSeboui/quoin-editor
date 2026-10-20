import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';

const shell = (page: Page, id: string) => page.locator(`[data-block-id="${id}"]`);
const dataOf = async (page: Page, id: string) => (await blocks(page)).find((block) => block.id === id)?.data;

// Every colour read back as the red, green and blue a canvas paints, so an oklch() token and the rgb() the browser
// computes compare.
function paintedBlocks(page: Page) {
  return page.evaluate(() => {
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const paint = (value: string) => {
      context.fillStyle = '#000';
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
    };
    const tokens = getComputedStyle(document.documentElement);
    const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    const redText = style('[data-block-id="r"] [data-quoin-host]');
    return {
      text: [paint(redText.color), paint(tokens.getPropertyValue('--quoin-color-red'))],
      background: [paint(style('[data-block-id="y"]').backgroundColor), paint(tokens.getPropertyValue('--quoin-bg-yellow'))],
      align: redText.textAlign,
    };
  });
}

test('a block takes its text colour, background and alignment from its data', async ({ page }) => {
  await openEditor(page, 'text');
  const { text, background, align } = await paintedBlocks(page);
  expect(text[0]).toEqual(text[1]);
  expect(background[0]).toEqual(background[1]);
  expect(align).toBe('center');
});

test('headings follow the type scale, the first block without space above it', async ({ page }) => {
  await openEditor(page, 'text');
  const box = (level: number) =>
    page.getByRole('heading', { level }).evaluate((heading) => {
      const { fontSize, marginTop } = getComputedStyle(heading);
      return { fontSize: parseFloat(fontSize), marginTop: parseFloat(marginTop) };
    });
  const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(await box(1)).toEqual({ fontSize: 1.875 * rem, marginTop: 0 });
  const second = await box(2);
  expect(second.fontSize).toBe(1.5 * rem);
  expect(second.marginTop).toBeGreaterThan(0);
});

test('a toggle chevron turns, hides the blocks under it and counts them in its name', async ({ page }) => {
  await openEditor(page, 'text');
  const chevron = shell(page, 't').getByRole('button');
  const turn = () => chevron.locator('svg').evaluate((svg) => getComputedStyle(svg).transform);
  await expect(chevron).toHaveAccessibleName('Toggle');
  await expect(chevron).toHaveAttribute('aria-expanded', 'true');
  const controlled = (await chevron.getAttribute('aria-controls'))!;
  await expect(page.locator(`[id="${controlled}"]`)).toContainText('Hidden detail');
  await expect.poll(turn).not.toBe('none');
  await chevron.click();
  await expect(chevron).toHaveAccessibleName('Toggle, 1 block hidden');
  await expect(chevron).toHaveAttribute('aria-expanded', 'false');
  await expect(shell(page, 'tc')).toHaveCount(0);
  await expect.poll(turn).toBe('none');
  expect(await dataOf(page, 't')).toEqual({ markdown: 'Details', open: false });
});

test('a callout takes a tone from its tone menu and gives the caret back to its text', async ({ page }) => {
  await openEditor(page, 'text');
  await page.getByRole('textbox', { name: 'Callout, warning' }).click();
  await page.keyboard.press('End');
  await page.getByRole('button', { name: 'Callout tone: warning' }).click();
  await page.getByRole('menuitemradio', { name: 'danger' }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Callout, danger' })).toBeFocused();
  await page.keyboard.type('!');
  await expect.poll(() => dataOf(page, 'c')).toEqual({ tone: 'danger', body: 'Careful!' });
});

for (const control of ['Callout tone: warning', 'Callout icon']) {
  test(`a second click on ${control} closes its menu and gives the caret back to the callout text`, async ({ page }) => {
    await openEditor(page, 'text');
    const text = page.getByRole('textbox', { name: 'Callout, warning' });
    await text.click();
    await page.keyboard.press('End');
    const button = page.getByRole('button', { name: control });
    await button.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await button.click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(text).toBeFocused();
    await page.keyboard.type('!');
    await expect.poll(() => dataOf(page, 'c')).toEqual({ tone: 'warning', body: 'Careful!' });
  });
}

test('a task checkbox is named by the text of its task, and by its kind while the task is empty', async ({ page }) => {
  await openEditor(page, 'text');
  const box = shell(page, 'k').getByRole('checkbox');
  await expect(box).toHaveAccessibleName('Done');
  await shell(page, 'k').locator('[data-quoin-host]').click();
  await page.keyboard.press('End');
  for (let n = 0; n < 'Done'.length; n++) await page.keyboard.press('Backspace');
  await expect(box).toHaveAccessibleName('Task');
});

test('a divider is node-selected by a click', async ({ page }) => {
  await openEditor(page, 'text');
  await page.getByRole('separator').click();
  await expect(shell(page, 'd')).toHaveAttribute('data-selected', 'true');
  await expect(page.getByRole('textbox', { name: 'Selected content' })).toBeFocused();
});

test('the text blocks have no accessibility violations, with a toggle open or closed', async ({ page }) => {
  await openEditor(page, 'text');
  expect(await axeViolations(page)).toEqual([]);
  await shell(page, 't').getByRole('button').click();
  await expect(shell(page, 'tc')).toHaveCount(0);
  expect(await axeViolations(page)).toEqual([]);
});
