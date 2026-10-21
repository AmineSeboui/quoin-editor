import { expect, test, type Page } from '@playwright/test';
import { everyBlock } from '../../app/every-block-doc';
import { axeViolations } from '../../support/axe';
import { blocks, caretSettled, openEditor } from '../../support/editor';
import { answerEveryRequest } from '../../support/network';

// WebKit logs an error for the allow-presentation flag of an embed's sandbox, which it does not know and ignores.
const SANDBOX_FLAG_UNKNOWN = /'allow-presentation' is an invalid sandbox flag/;

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !SANDBOX_FLAG_UNKNOWN.test(message.text())) errors.push(message.text());
  });
  return errors;
}

async function everyBlockDrawn(page: Page) {
  const editor = page.getByRole('group', { name: 'Document' });
  await expect(editor.getByRole('heading', { level: 1, name: 'Catalogue' })).toBeVisible();
  await expect(editor.getByRole('img', { name: 'A red square' })).toBeVisible();
  await expect(editor.getByRole('table')).toBeVisible();
  await expect(editor.getByTitle('YouTube video')).toBeVisible();
  await expect(editor.getByRole('group', { name: 'Bookmark' })).toContainText('Quoin docs');
  await expect(editor.locator('.harness-math')).toHaveCount(2);
  await expect(editor.getByRole('navigation', { name: 'Table of contents' }).getByRole('link')).toHaveCount(3);
  await expect(editor.getByText('@Ada Lovelace')).toBeVisible();
  await expect(page.locator('[data-quoin-stats]')).toBeVisible();
}

test.beforeEach(({ page }) => answerEveryRequest(page));

for (const readOnly of [false, true]) {
  test(`every block with the whole catalogue on, ${readOnly ? 'read-only' : 'editable'}, loads cleanly, passes axe and reads back as given`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await openEditor(page, 'every', `catalogue=1${readOnly ? '&readonly=1' : ''}`);
    await everyBlockDrawn(page);
    expect(await axeViolations(page, 'all', '.quoin')).toEqual([]);
    expect(await page.evaluate(() => window.__quoin.controller!.editor.getBlocks())).toStrictEqual(everyBlock);
    expect(await page.evaluate(() => window.__quoin.changes)).toBe(0);
    expect(errors).toEqual([]);
  });
}

test('a key typed and deleted again hands the document back through onChange exactly as it was given', async ({ page }) => {
  const errors = collectErrors(page);
  await openEditor(page, 'every', 'catalogue=1');
  await everyBlockDrawn(page);
  const last = page.locator(`[data-block-id="${everyBlock.at(-1)!.id}"] [data-quoin-host]`);
  await last.click();
  await caretSettled(page, last);
  await page.keyboard.press('End');
  await page.keyboard.type('x');
  await expect.poll(() => page.evaluate(() => window.__quoin.changes)).toBe(1);
  await page.keyboard.press('Backspace');
  await expect.poll(() => page.evaluate(() => window.__quoin.changes)).toBe(2);
  expect(await blocks(page)).toStrictEqual(everyBlock);
  expect(errors).toEqual([]);
});
