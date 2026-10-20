import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';

const area = (page: Page) => page.getByRole('textbox', { name: 'Code' });
const paragraphs = (page: Page) => page.getByRole('textbox', { name: 'Paragraph' });
const codeOf = async (page: Page) => String((await blocks(page))[1].data.code);
const texts = async (page: Page) => (await blocks(page)).map((block) => block.data.markdown ?? block.data.code);

async function caretAt(page: Page, offset: number | 'end') {
  await area(page).click();
  await area(page).evaluate((field: HTMLTextAreaElement, at) => {
    const offset = at === 'end' ? field.value.length : at;
    field.setSelectionRange(offset, offset);
  }, offset);
}

test('code typed in place is written to the block, Enter keeps the indentation and Tab indents', async ({ page }) => {
  await openEditor(page, 'code');
  await caretAt(page, 'end');
  await page.keyboard.press('Enter');
  await page.keyboard.type('if (b) {');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.type('go();');
  await page.keyboard.press('Enter');
  await page.keyboard.type('x');
  await expect.poll(() => codeOf(page)).toBe('let a = 1;\nlet b = 2;\nif (b) {\n  go();\n  x');
  await expect(area(page)).toBeFocused();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Tab');
  await expect.poll(() => codeOf(page)).toBe('  let a = 1;\n  let b = 2;\n  if (b) {\n    go();\n    x');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => codeOf(page)).toBe('let a = 1;\nlet b = 2;\nif (b) {\n  go();\n  x');
});

test('the code is drawn exactly under the text area, and a click lands the caret where it was pressed', async ({ page }) => {
  await openEditor(page, 'code');
  const field = (await area(page).boundingBox())!;
  const drawn = (await page.locator('[data-block-id="k"] pre').boundingBox())!;
  expect(drawn).toEqual(field);
  await area(page).click({ position: { x: 2, y: 4 } });
  await page.keyboard.type('X');
  await expect.poll(() => codeOf(page)).toBe('Xlet a = 1;\nlet b = 2;');
});

const SPACING = [
  'letter-spacing',
  'word-spacing',
  'font-variant-ligatures',
  'font-feature-settings',
  'text-transform',
  'tab-size',
  'text-indent',
  'text-align',
];

test('the text area keeps the spacing of the drawn code whatever the host sets on the editor', async ({ page }) => {
  await openEditor(page, 'code');
  await page.addStyleTag({
    content: `.quoin { letter-spacing: .06em; word-spacing: 4px; font-variant-ligatures: none;
      font-feature-settings: "tnum"; text-transform: uppercase; tab-size: 8; text-indent: 2em; text-align: right; }`,
  });
  const layers = page.locator('[data-block-id="k"]').locator('pre, textarea');
  const spacing = await layers.evaluateAll(
    (elements, names) => elements.map((element) => names.map((name) => getComputedStyle(element).getPropertyValue(name))),
    SPACING,
  );
  expect(spacing[0]).toEqual(spacing[1]);
  expect(spacing[0]).toEqual(['normal', '0px', 'none', 'normal', 'none', '2', '0px', 'left']);
});

test('ArrowDown on the last line goes on in the next block, ArrowUp on the first line in the previous one', async ({ page }) => {
  await openEditor(page, 'code');
  await caretAt(page, 'end');
  await page.keyboard.press('ArrowUp');
  await expect(area(page)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(paragraphs(page).nth(1)).toBeFocused();
  await page.keyboard.type('Z');
  await caretAt(page, 3);
  await page.keyboard.press('ArrowUp');
  await expect(paragraphs(page).first()).toBeFocused();
  await page.keyboard.type('Y');
  await expect.poll(() => texts(page)).toEqual(['Above the codeY', 'let a = 1;\nlet b = 2;', 'ZBelow the code']);
});

test("undo in the code goes to the editor's history, not to the browser's", async ({ page }) => {
  await openEditor(page, 'code');
  await paragraphs(page).first().click();
  await page.keyboard.press('End');
  await page.keyboard.type('!');
  await caretAt(page, 'end');
  await page.keyboard.type(' // done');
  await expect.poll(() => codeOf(page)).toBe('let a = 1;\nlet b = 2; // done');
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => texts(page)).toEqual(['Above the code!', 'let a = 1;\nlet b = 2;', 'Below the code']);
  await expect(area(page)).toBeFocused();
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => texts(page)).toEqual(['Above the code', 'let a = 1;\nlet b = 2;', 'Below the code']);
  await expect(paragraphs(page).first()).toBeFocused();
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect.poll(() => texts(page)).toEqual(['Above the code!', 'let a = 1;\nlet b = 2;', 'Below the code']);
});

test('a drag inside the code selects its text and never the blocks around it', async ({ page }) => {
  await openEditor(page, 'code');
  const box = (await area(page).boundingBox())!;
  await page.mouse.move(box.x + 2, box.y + 4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height - 4, { steps: 8 });
  await page.mouse.up();
  await expect(area(page)).toBeFocused();
  const selected = await area(page).evaluate((field: HTMLTextAreaElement) => [field.selectionStart, field.selectionEnd]);
  expect(selected[1] - selected[0]).toBeGreaterThan(10);
  await expect(page.locator('[data-block-id="p"]')).not.toHaveAttribute('data-selected');
  await expect(page.locator('[data-block-id="q"]')).not.toHaveAttribute('data-selected');
});

test('Backspace in an empty code block turns it into a paragraph', async ({ page }) => {
  await openEditor(page, 'empty');
  await page.locator('[data-quoin-host]').first().click();
  await page.keyboard.type('/code');
  await page.keyboard.press('Enter');
  await expect(area(page)).toBeFocused();
  await page.keyboard.press('Backspace');
  await expect(paragraphs(page)).toBeFocused();
  await page.keyboard.type('text');
  await expect.poll(async () => (await blocks(page)).map((block) => block.data)).toEqual([{ markdown: 'text' }]);
});

test('the language is picked from the keyboard after Alt+F10, and Escape then Tab leaves the editor', async ({ page }) => {
  await openEditor(page, 'code');
  await caretAt(page, 0);
  await page.keyboard.press('Alt+F10');
  const language = page.getByRole('combobox', { name: 'Language' });
  await expect(language).toBeFocused();
  await expect(language).toHaveValue('TypeScript');
  await page.keyboard.type('pyth');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await blocks(page))[1].data.language).toBe('python');
  await expect(area(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'After the editor' })).toBeFocused();
});

test('the copy button puts the code on the clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'only Chromium lets a page read the clipboard back');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openEditor(page, 'code');
  await page.locator('[data-block-id="k"]').hover();
  await page.getByRole('button', { name: 'Copy code' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('let a = 1;\nlet b = 2;');
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toHaveCount(1);
});

test('axe finds no violation with the code focused or the language list open', async ({ page }) => {
  await openEditor(page, 'code');
  await caretAt(page, 0);
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole('combobox', { name: 'Language' }).click();
  await expect(page.getByRole('listbox', { name: 'Language' })).toBeVisible();
  expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
});
