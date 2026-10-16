import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';

const shell = (page: Page) => page.locator('[data-block-id="bm"]');
const urlField = (page: Page) => page.getByRole('textbox', { name: 'Bookmark URL' });
const paragraphs = (page: Page) => page.getByRole('textbox', { name: 'Paragraph' });

async function selectBookmarkFromAbove(page: Page) {
  await openEditor(page, 'custom');
  await paragraphs(page).first().click();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowDown');
  await expect(shell(page)).toHaveAttribute('data-selected', 'true');
  await expect(shell(page)).toBeFocused();
}

test('a custom block is node-selected by the arrows, edited on Enter, left on Escape and passed by the arrows', async ({ page }) => {
  await selectBookmarkFromAbove(page);
  await page.keyboard.press('Enter');
  await expect(urlField(page)).toBeFocused();
  await expect(urlField(page)).toHaveValue('https://quoin.dev');
  await page.keyboard.press('End');
  await page.keyboard.type('/docs');
  await expect.poll(async () => (await blocks(page)).map((block) => block.data)).toEqual([
    { markdown: 'Paragraph above' },
    { url: 'https://quoin.dev/docs' },
    { markdown: 'Paragraph below' },
  ]);
  await page.keyboard.press('Escape');
  await expect(urlField(page)).toHaveCount(0);
  await expect(shell(page)).toContainText('https://quoin.dev/docs');
  await expect(shell(page)).toBeFocused();
  await expect(shell(page)).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(paragraphs(page).nth(1)).toBeFocused();
  await expect(shell(page)).not.toHaveAttribute('data-selected');
  expect((await blocks(page)).map((block) => block.id)).toEqual(['above', 'bm', 'below']);
});

test('a click on the preview node-selects the block, and its Edit button opens the editor', async ({ page }) => {
  await openEditor(page, 'custom');
  await page.getByText('https://quoin.dev', { exact: true }).click();
  await expect(shell(page)).toHaveAttribute('data-selected', 'true');
  await expect(shell(page)).toBeFocused();
  await expect(urlField(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit Bookmark' }).click();
  await expect(urlField(page)).toBeFocused();
  await paragraphs(page).nth(1).click();
  await expect(urlField(page)).toHaveCount(0);
  await expect(paragraphs(page).nth(1)).toBeFocused();
});

test('a custom block has no accessibility violations at rest or while it is edited', async ({ page }) => {
  await selectBookmarkFromAbove(page);
  expect(await axeViolations(page)).toEqual([]);
  await page.keyboard.press('Enter');
  await expect(urlField(page)).toBeFocused();
  expect(await axeViolations(page)).toEqual([]);
});
