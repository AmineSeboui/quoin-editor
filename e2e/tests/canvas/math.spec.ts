import { expect, test, type Locator, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';

const popover = (page: Page) => page.getByRole('dialog', { name: 'Edit equation' });
const field = (page: Page) => page.getByRole('textbox', { name: 'LaTeX' });
const formula = (page: Page) => page.locator('[data-quoin-atom="math"]').first();
const equation = (page: Page) => page.getByRole('group', { name: 'Equation' });
const markdownOf = async (page: Page, id: string) => (await blocks(page)).find((block) => block.id === id)?.data.markdown;
const latexOf = async (page: Page) => (await blocks(page)).find((block) => block.type === 'MATH')?.data.latex;

// The click places the caret through the browser, so its selectionchange has to reach the editor before a key does.
async function caretIn(page: Page, host: Locator = page.locator('[data-quoin-host]').first()) {
  await host.click();
  await expect(host).toBeFocused();
  await page.waitForFunction(() => document.activeElement?.contains(document.getSelection()?.focusNode ?? null));
  return host;
}

async function caretAtEnd(page: Page, host: Locator) {
  const box = (await host.boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect(host).toBeFocused();
  await page.waitForFunction(() => document.activeElement?.contains(document.getSelection()?.focusNode ?? null));
}

test('type inline math and edit it', async ({ page }) => {
  await openEditor(page, 'empty', 'math=1');
  const host = await caretIn(page);
  await page.keyboard.type('Area $x^2$');
  await expect(formula(page).locator('.harness-math')).toHaveText('x^2');
  await expect.poll(async () => (await blocks(page))[0].data.markdown).toBe('Area $x^2$');

  await formula(page).click();
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue('x^2');
  await field(page).fill('y^3');
  await expect(popover(page).locator('.harness-math')).toHaveText('y^3');
  await page.keyboard.press('Enter');
  await expect(popover(page)).toHaveCount(0);
  await expect(host).toBeFocused();
  await expect.poll(async () => (await blocks(page))[0].data.markdown).toBe('Area $y^3$');
  await page.keyboard.type('!');
  await expect.poll(async () => (await blocks(page))[0].data.markdown).toBe('Area $y^3$!');
});

test('a price typed with dollars stays text', async ({ page }) => {
  await openEditor(page, 'empty', 'math=1');
  const host = await caretIn(page);
  await page.keyboard.type('It costs $5 and $10, not 4$.');
  await expect(host).toHaveText('It costs $5 and $10, not 4$.');
  await expect(page.locator('[data-quoin-atom]')).toHaveCount(0);
});

test('Backspace selects a formula with a highlight, Enter then edits it, and a second Backspace deletes it', async ({
  page,
}) => {
  await openEditor(page, 'math', 'math=1');
  const host = page.locator('[data-block-id="p"] [data-quoin-host]');
  await caretAtEnd(page, host);
  for (let step = 0; step < ' here'.length; step++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Backspace');
  const selected = page.locator('[data-quoin-selected-atom] > [data-quoin-atom="math"]');
  await expect(selected).toHaveCount(1);
  expect(await selected.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');

  await page.keyboard.press('Enter');
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(popover(page)).toHaveCount(0);
  await expect(host).toBeFocused();
  await page.keyboard.type('!');
  await expect.poll(() => markdownOf(page, 'p')).toBe('Area $x^2$! here');

  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(selected).toHaveCount(1);
  await page.keyboard.press('Backspace');
  await expect.poll(() => markdownOf(page, 'p')).toBe('Area  here');
});

test('a math block opens its editor on a click, stores on Mod+Enter and hands focus back to the block', async ({ page }) => {
  await openEditor(page, 'math', 'math=1');
  await equation(page).click();
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.type('+ 1');
  await expect(popover(page).locator('.harness-math')).toHaveAttribute('data-display', 'true');
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(popover(page)).toHaveCount(0);
  await expect.poll(() => latexOf(page)).toBe('\\int_0^1 x\\,dx\n+ 1');
  await expect(page.locator('[data-quoin-sink]')).toBeFocused();
  await expect(page.locator('[data-block-id="m"]')).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => latexOf(page)).toBe('\\int_0^1 x\\,dx');
});

test('$$ and a space make a math block whose editor opens at once', async ({ page }) => {
  await openEditor(page, 'empty', 'math=1');
  await caretIn(page);
  await page.keyboard.type('$$ ');
  await expect(field(page)).toBeFocused();
  await page.keyboard.type('\\sum_i i');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(equation(page).locator('.harness-math')).toHaveText('\\sum_i i');
});

test('a press in the text stores the formula and leaves the caret where it was pressed', async ({ page }) => {
  await openEditor(page, 'math', 'math=1');
  await formula(page).click();
  await field(page).fill('z');
  const below = page.locator('[data-block-id="q"] [data-quoin-host]');
  await caretAtEnd(page, below);
  await expect(popover(page)).toHaveCount(0);
  await expect.poll(() => markdownOf(page, 'p')).toBe('Area $z$ here');
  await page.keyboard.type('!');
  await expect.poll(() => markdownOf(page, 'q')).toBe('Below the equation!');
});

test('without renderMath the LaTeX shows as monospace text', async ({ page }) => {
  await openEditor(page, 'math', 'math=source');
  await expect(formula(page)).toHaveText('x^2');
  await expect(equation(page).locator('pre')).toHaveText('\\int_0^1 x\\,dx');
  const font = await equation(page).locator('pre').evaluate((element) => getComputedStyle(element).fontFamily);
  expect(font).toMatch(/mono/i);
});

test('math has no accessibility violations, editable or read-only', async ({ page }) => {
  await openEditor(page, 'math', 'math=1');
  expect(await axeViolations(page)).toEqual([]);
  await formula(page).click();
  await expect(field(page)).toBeFocused();
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);

  await openEditor(page, 'math', 'math=1&readonly=1');
  await formula(page).click();
  await equation(page).click();
  await expect(popover(page)).toHaveCount(0);
  expect(await axeViolations(page)).toEqual([]);
});
