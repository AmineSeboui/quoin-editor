import { expect, test, type Page } from '@playwright/test';
import { FIXTURE_PNG } from '../../app/fixture-png';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';
import { dropEvent, pasteFilesEvent } from '../../support/synthetic-events';

const fixture = { name: 'cat.png', type: 'image/png', base64: FIXTURE_PNG.base64 };
const measured = { storageKey: 'key-cat.png', alt: '', width: FIXTURE_PNG.width, height: FIXTURE_PNG.height };

const imageData = async (page: Page, id = 'img') => (await blocks(page)).find((block) => block.id === id)?.data;
const shell = (page: Page, id = 'img') => page.locator(`[data-block-id="${id}"]`);
const sink = (page: Page) => page.getByRole('textbox', { name: 'Selected content' });
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Image tools' });
const changes = (page: Page) => page.evaluate(() => window.__quoin.changes);

async function arriveFromAbove(page: Page) {
  await page.getByRole('textbox', { name: 'Paragraph' }).first().click();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowDown');
  await expect(shell(page)).toHaveAttribute('data-selected', 'true');
  await expect(sink(page)).toBeFocused();
}

test('a PNG dropped on an empty image block is uploaded through the host and drawn at its measured size', async ({
  page,
}) => {
  await openEditor(page, 'media', 'upload=50');
  const area = (await page.locator('.quoin-image-upload').boundingBox())!;
  await dropEvent(page, { x: area.x + area.width - 8, y: area.y + area.height / 2 }, { files: [fixture] });
  await expect.poll(() => imageData(page)).toEqual(measured);
  const picture = shell(page).getByRole('img', { name: 'Image, no description' });
  await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(FIXTURE_PNG.width);
  expect((await blocks(page)).map((block) => block.type)).toEqual(['MARKDOWN', 'IMAGE', 'MARKDOWN']);
});

test('a PNG pasted into the text lands as an image block of its own, which gets its measured size', async ({ page }) => {
  await openEditor(page, 'sample', 'upload=50');
  await page.getByRole('textbox', { name: 'Paragraph' }).click();
  await pasteFilesEvent(page, [fixture]);
  await expect.poll(async () => (await blocks(page)).find((block) => block.type === 'IMAGE')?.data).toEqual(measured);
});

test('dragging a width handle shows the width as it goes and writes it once, when the drag ends', async ({ page }) => {
  await openEditor(page, 'image');
  await page.getByRole('img', { name: 'A red square' }).click();
  const frame = shell(page).locator('.quoin-image-frame');
  const handle = (await shell(page).getByRole('slider', { name: 'Image width' }).last().boundingBox())!;
  const before = await changes(page);
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 120, handle.y + handle.height / 2, { steps: 6 });
  await expect.poll(() => frame.evaluate((element) => element.style.width)).not.toBe('50%');
  expect(await imageData(page)).toMatchObject({ widthPercent: 50 });
  await page.mouse.up();
  await expect.poll(async () => (await imageData(page))?.widthPercent).toBeGreaterThan(50);
  const width = (await imageData(page))?.widthPercent as number;
  expect(width % 5).toBe(0);
  expect(await changes(page)).toBe(before + 1);
  await expect(frame).toHaveAttribute('style', `width: ${width}%;`);
});

test('the toolbar of a selected image is reached with Alt+F10 and aligns it, and Tab reaches its width', async ({
  page,
}) => {
  await openEditor(page, 'image');
  await arriveFromAbove(page);
  await expect(toolbar(page)).toBeVisible();
  await page.keyboard.press('Alt+F10');
  await expect(toolbar(page).getByRole('button', { name: 'Align left' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(() => imageData(page)).toMatchObject({ align: 'center' });
  await expect(toolbar(page).getByRole('button', { name: 'Align center' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  const handle = shell(page).getByRole('slider', { name: 'Image width' }).last();
  await expect(handle).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => imageData(page)).toMatchObject({ widthPercent: 45 });
  await expect(handle).toHaveAttribute('aria-valuenow', '45');
  await page.keyboard.press('Escape');
  await expect(sink(page)).toBeFocused();
});

test('the alt text of an image is asked for as required and stored on Enter', async ({ page }) => {
  await openEditor(page, 'image');
  await page.getByRole('img', { name: 'A red square' }).click();
  await toolbar(page).getByRole('button', { name: 'Alt text' }).click();
  const field = page.getByRole('textbox', { name: 'Alt text' });
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute('required', '');
  await field.fill('A small red square');
  await page.keyboard.press('Enter');
  await expect.poll(() => imageData(page)).toMatchObject({ alt: 'A small red square' });
  await expect(shell(page).getByRole('img', { name: 'A small red square' })).toBeVisible();
  await expect(sink(page)).toBeFocused();
});

test('Enter on a selected image takes the caret into its caption, and Left from the caption start selects it', async ({
  page,
}) => {
  await openEditor(page, 'image');
  await arriveFromAbove(page);
  await page.keyboard.press('Enter');
  const caption = shell(page).getByRole('textbox', { name: 'Image caption' });
  await expect(caption).toBeFocused();
  await page.keyboard.type('Sleepy');
  await expect.poll(() => imageData(page)).toMatchObject({ caption: 'Sleepy' });
  for (let n = 0; n <= 'Sleepy'.length; n++) await page.keyboard.press('ArrowLeft');
  await expect(shell(page)).toHaveAttribute('data-selected', 'true');
  await expect(sink(page)).toBeFocused();
  await page.keyboard.type('!');
  await expect.poll(() => imageData(page)).toMatchObject({ caption: 'Sleepy!' });
});

test('an image block, its toolbar, its alt text and its width handles have no accessibility violations', async ({
  page,
}) => {
  await openEditor(page, 'image');
  await page.getByRole('img', { name: 'A red square' }).click();
  await expect(toolbar(page)).toBeVisible();
  expect(await axeViolations(page, 'all', ['.quoin-editor', '[role="toolbar"]'])).toEqual([]);
  await toolbar(page).getByRole('button', { name: 'Alt text' }).click();
  await expect(page.getByRole('textbox', { name: 'Alt text' })).toBeFocused();
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);
});

test('an image block with no picture has no accessibility violations, with its link form open', async ({ page }) => {
  await openEditor(page, 'media', 'upload=50');
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Embed link' }).click();
  await expect(page.getByRole('textbox', { name: 'Image link' })).toBeFocused();
  expect(await axeViolations(page)).toEqual([]);
});
