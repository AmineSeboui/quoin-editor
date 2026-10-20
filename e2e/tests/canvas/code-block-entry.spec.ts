import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const area = (page: Page) => page.getByRole('textbox', { name: 'Code', exact: true });
const paragraphs = (page: Page) => page.getByRole('textbox', { name: 'Paragraph' });
const shapes = async (page: Page) => (await blocks(page)).map((block) => [block.type, block.data.code ?? block.data.markdown]);

test('the fence and Enter make a code block that takes what is typed next', async ({ page }) => {
  await openEditor(page, 'empty');
  await page.locator('[data-quoin-host]').first().click();
  await page.keyboard.type('```ts');
  await page.keyboard.press('Enter');
  await expect(area(page)).toBeFocused();
  await page.keyboard.type('let');
  await expect.poll(async () => (await blocks(page)).map((block) => block.data)).toEqual([{ language: 'ts', code: 'let' }]);
});

test('the fence and a space make a code block that takes what is typed next', async ({ page }) => {
  await openEditor(page, 'empty');
  await page.locator('[data-quoin-host]').first().click();
  await page.keyboard.type('``` x');
  await expect.poll(() => shapes(page)).toEqual([['CODE', 'x']]);
});

test('Turn into Code keeps the text and the caret at its end', async ({ page }) => {
  await openEditor(page, 'sample');
  await paragraphs(page).click();
  await page.keyboard.press('ControlOrMeta+/');
  // A click can land while the submenu is still being placed, and on Firefox hit the menu under it.
  await page.getByRole('menuitem', { name: 'Turn into' }).press('ArrowRight');
  await page.getByRole('menuitem', { name: 'Code' }).press('Enter');
  await expect(area(page)).toBeFocused();
  await page.keyboard.type('x');
  await expect.poll(() => shapes(page)).toEqual([
    ['MARKDOWN', '# Title'],
    ['CODE', 'First paragraph.x'],
  ]);
});

test('a key typed on a code block the arrows selected goes into its code', async ({ page }) => {
  await openEditor(page, 'code');
  await paragraphs(page).first().click();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-block-id="k"]')).toHaveAttribute('data-selected', 'true');
  await page.keyboard.type('Q');
  await expect(area(page)).toBeFocused();
  await expect.poll(() => shapes(page)).toEqual([
    ['MARKDOWN', 'Above the code'],
    ['CODE', 'let a = 1;\nlet b = 2;Q'],
    ['MARKDOWN', 'Below the code'],
  ]);
});
