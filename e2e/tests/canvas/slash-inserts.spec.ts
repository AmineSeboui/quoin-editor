import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const shape = async (page: Page) =>
  (await blocks(page)).map((block) => `${block.type}:${String(block.data.markdown ?? '')}`);

async function chooseInEmptyDocument(page: Page, query: string) {
  await openEditor(page, 'empty');
  await page.locator('[data-quoin-host]').first().click();
  await page.keyboard.type(query);
  await expect(page.getByRole('listbox', { name: 'Commands' })).toBeVisible();
  await page.keyboard.press('Enter');
}

test('typing after /divider goes on in a line under the divider', async ({ page }) => {
  await chooseInEmptyDocument(page, '/divider');
  await page.keyboard.type('xy');
  await expect.poll(() => shape(page)).toEqual(['DIVIDER:', 'MARKDOWN:xy']);
});

test('typing after /divider at the end of a line goes on in a new line under the divider', async ({ page }) => {
  await openEditor(page, 'sample');
  await page.getByRole('textbox', { name: 'Paragraph' }).click();
  await page.keyboard.press('End');
  await page.keyboard.type(' /divider');
  await page.keyboard.press('Enter');
  await page.keyboard.type('xy');
  await expect.poll(async () => (await shape(page)).slice(2)).toEqual(['DIVIDER:', 'MARKDOWN:xy']);
});

test('/code opens the code editor, so what is typed next goes into it', async ({ page }) => {
  await chooseInEmptyDocument(page, '/code');
  await expect(page.getByRole('textbox', { name: 'Language' })).toBeFocused();
  await page.keyboard.type('ts');
  await page.keyboard.press('Tab');
  await page.keyboard.type('let x = 1;');
  await expect.poll(async () => (await blocks(page)).map((block) => block.data)).toEqual([
    { language: 'ts', code: 'let x = 1;' },
  ]);
});

test('/image opens the image editor on the block, and a key typed next leaves the image in place', async ({ page }) => {
  await chooseInEmptyDocument(page, '/image');
  const image = page.getByRole('group', { name: 'Image' });
  await expect(image).toBeVisible();
  const focusInside = (group: Element) => group.contains(document.activeElement) && group !== document.activeElement;
  await expect.poll(() => image.evaluate(focusInside)).toBe(true);
  await page.keyboard.type('x');
  await expect.poll(async () => (await blocks(page)).map((block) => block.type)).toEqual(['IMAGE']);
});

test('a custom block from the slash menu opens its editor, so what is typed next goes into it', async ({ page }) => {
  await chooseInEmptyDocument(page, '/bookmark');
  await expect(page.getByRole('textbox', { name: 'Bookmark URL' })).toBeFocused();
  await page.keyboard.type('quoin.dev');
  await expect.poll(async () => (await blocks(page)).map((block) => block.data)).toEqual([{ url: 'quoin.dev' }]);
});
