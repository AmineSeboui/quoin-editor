import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';
import { dropEvent } from '../../support/synthetic-events';

const fileData = async (page: Page, id: string) => (await blocks(page)).find((block) => block.id === id)?.data;
const shell = (page: Page, id: string) => page.locator(`[data-block-id="${id}"]`);
const sink = (page: Page) => page.locator('[data-quoin-sink]');
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'File tools' });
const types = async (page: Page) => (await blocks(page)).map((block) => block.type);

async function arriveFromAbove(page: Page) {
  await page.getByRole('textbox', { name: 'Paragraph' }).first().click();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowDown');
  await expect(shell(page, 'f')).toHaveAttribute('data-selected', 'true');
  await expect(sink(page)).toBeFocused();
}

test('a file card shows the name and size of the file and links its download through the host', async ({ page }) => {
  await openEditor(page, 'file');
  const card = shell(page, 'f');
  await expect(card).toContainText('notes.pdf');
  await expect(card).toContainText('1.5 KB');
  const download = card.getByRole('link', { name: 'Download notes.pdf' });
  await expect(download).toHaveAttribute('href', 'notes.pdf');
  await expect(download).toHaveAttribute('download', 'notes.pdf');
  await card.getByText('notes.pdf').click();
  await expect(card).toHaveAttribute('data-selected', 'true');
  await expect(sink(page)).toHaveAccessibleName('File, notes.pdf');
});

test('a file picked from an empty file block is uploaded into it and drawn as a card, which takes focus', async ({
  page,
}) => {
  await openEditor(page, 'file', 'upload=50');
  const picker = shell(page, 'e').getByLabel('Upload file');
  await picker.focus();
  await picker.setInputFiles({ name: 'report.zip', mimeType: 'application/zip', buffer: Buffer.from('zip') });
  await expect
    .poll(() => fileData(page, 'e'))
    .toEqual({ storageKey: 'key-report.zip', filename: 'report.zip', size: 3, mime: 'application/zip' });
  await expect(shell(page, 'e').getByRole('link', { name: 'Download report.zip' })).toBeVisible();
  await expect(shell(page, 'e')).toHaveAttribute('data-selected', 'true');
  await expect(sink(page)).toBeFocused();
});

test('a file dropped on an empty file block goes into it rather than into a block of its own', async ({ page }) => {
  await openEditor(page, 'file', 'upload=50');
  const area = (await shell(page, 'e').locator('.quoin-upload').boundingBox())!;
  const pdf = { name: 'slides.pdf', type: 'application/pdf' };
  await dropEvent(page, { x: area.x + area.width - 8, y: area.y + area.height / 2 }, { files: [pdf] });
  await expect.poll(() => fileData(page, 'e')).toMatchObject({ storageKey: 'key-slides.pdf', mime: 'application/pdf' });
  expect(await types(page)).toEqual(['MARKDOWN', 'FILE', 'FILE', 'MARKDOWN']);
});

test('the toolbar of a selected file is reached with Alt+F10, goes on to the download with Tab, and deletes the file', async ({
  page,
}) => {
  await openEditor(page, 'file', 'upload=50');
  await arriveFromAbove(page);
  await expect(toolbar(page)).toBeVisible();
  await page.keyboard.press('Alt+F10');
  await expect(toolbar(page).getByRole('button', { name: 'Replace file' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(shell(page, 'f').getByRole('link', { name: 'Download notes.pdf' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sink(page)).toBeFocused();
  await page.keyboard.press('Alt+F10');
  await page.keyboard.press('ArrowRight');
  await expect(toolbar(page).getByRole('button', { name: 'Delete' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => types(page)).toEqual(['MARKDOWN', 'FILE', 'MARKDOWN']);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(() => fileData(page, 'f')).toMatchObject({ filename: 'notes.pdf' });
});

test('the replace button of a selected file uploads another file in its place', async ({ page }) => {
  await openEditor(page, 'file', 'upload=50');
  await shell(page, 'f').getByText('notes.pdf').click();
  const chooser = page.waitForEvent('filechooser');
  await toolbar(page).getByRole('button', { name: 'Replace file' }).click();
  await (await chooser).setFiles({ name: 'song.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('mp3!') });
  await expect
    .poll(() => fileData(page, 'f'))
    .toEqual({ storageKey: 'key-song.mp3', filename: 'song.mp3', size: 4, mime: 'audio/mpeg' });
  await expect(shell(page, 'f').locator('svg.lucide-file-music')).toBeVisible();
});

test('/file opens the upload button of a new file block, and a key typed next leaves the block in place', async ({
  page,
}) => {
  await openEditor(page, 'empty', 'upload=50');
  await page.locator('[data-quoin-host]').first().click();
  await page.keyboard.type('/file');
  await expect(page.getByRole('listbox', { name: 'Commands' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Upload file')).toBeFocused();
  await page.keyboard.type('x');
  await expect.poll(() => blocks(page)).toEqual([expect.objectContaining({ type: 'FILE', data: { storageKey: '', filename: '' } })]);
});

test('a file block, empty or holding a file, and its toolbar have no accessibility violations', async ({ page }) => {
  await openEditor(page, 'file', 'upload=50');
  expect(await axeViolations(page)).toEqual([]);
  await shell(page, 'f').getByText('notes.pdf').click();
  await expect(toolbar(page)).toBeVisible();
  expect(await axeViolations(page, 'all', ['.quoin-editor', '[role="toolbar"]'])).toEqual([]);
});

test('a read-only file card offers its download to the keyboard and has no accessibility violations', async ({ page }) => {
  await openEditor(page, 'file', 'readonly=1');
  await expect(shell(page, 'e')).toContainText('No file chosen');
  await expect(shell(page, 'f').getByRole('link', { name: 'Download notes.pdf' })).not.toHaveAttribute('tabindex', '-1');
  expect(await axeViolations(page)).toEqual([]);
});
