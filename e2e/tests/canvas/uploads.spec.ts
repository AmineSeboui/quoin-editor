import { expect, test, type Locator, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';
import { dropEvent, pasteFilesEvent } from '../../support/synthetic-events';

const png = { name: 'cat.png', type: 'image/png' };
const pdf = { name: 'notes.pdf', type: 'application/pdf' };

const shape = async (page: Page) =>
  (await blocks(page)).map((block) => `${block.type}:${String(block.data.markdown ?? block.data.storageKey ?? '')}`);

// The editor reads the caret of a click on the selectionchange that follows it. A drop made before then sees the writer
// move on during the upload, and leaves out the empty line after what it inserts.
async function clickAndSettle(page: Page, target: Locator) {
  const selection = await page.evaluateHandle(() => ({
    changed: new Promise<void>((resolve) => document.addEventListener('selectionchange', () => resolve(), { once: true })),
  }));
  await target.click();
  await selection.evaluate(({ changed }) => changed);
}

async function caretAtEndOfParagraph(page: Page, upload: number) {
  await openEditor(page, 'sample', `upload=${upload}`);
  const paragraph = page.getByRole('textbox', { name: 'Paragraph' });
  await paragraph.click();
  await page.keyboard.press('End');
  return paragraph;
}

test('typing on while a pasted image uploads keeps every key in the line being typed in', async ({ page }) => {
  const paragraph = await caretAtEndOfParagraph(page, 600);
  await pasteFilesEvent(page, [png]);
  await page.keyboard.type(' still typing during the upload', { delay: 40 });
  await expect.poll(() => shape(page)).toContain('IMAGE:key-cat.png');
  await page.keyboard.type(' and after', { delay: 20 });
  await expect.poll(() => shape(page)).toEqual([
    'MARKDOWN:# Title',
    'MARKDOWN:First paragraph. still typing during the upload and after',
    'IMAGE:key-cat.png',
  ]);
  await expect(paragraph).toBeFocused();
});

test('the first key after a pasted file lands goes into a new line under it, and the file stays', async ({ page }) => {
  await caretAtEndOfParagraph(page, 100);
  await pasteFilesEvent(page, [pdf]);
  await expect.poll(() => shape(page)).toContain('FILE:key-notes.pdf');
  await page.keyboard.type('abc');
  await expect.poll(() => shape(page)).toEqual([
    'MARKDOWN:# Title',
    'MARKDOWN:First paragraph.',
    'FILE:key-notes.pdf',
    'MARKDOWN:abc',
  ]);
});

test('a file dropped on the picture of an image goes in after that image', async ({ page }) => {
  await openEditor(page, 'image', 'upload=50');
  await clickAndSettle(page, page.getByRole('textbox', { name: 'Paragraph' }).first());
  const image = (await page.getByRole('img', { name: 'A red square' }).boundingBox())!;
  await dropEvent(page, { x: image.x + image.width / 2, y: image.y + image.height / 2 }, { files: [png] });
  await expect.poll(() => shape(page)).toEqual([
    'MARKDOWN:Above the image',
    'IMAGE:fixture.png',
    'IMAGE:key-cat.png',
    'MARKDOWN:',
    'DIVIDER:',
    'MARKDOWN:Below the image',
  ]);
});

test('an upload picked from an empty image keeps focus on its button, then hands it to the image it fills', async ({
  page,
}) => {
  await openEditor(page, 'media', 'upload=300');
  await page.locator('.quoin-image-upload').click({ position: { x: 4, y: 4 } });
  await page.keyboard.press('Enter');
  const picker = page.getByLabel('Upload image');
  await expect(picker).toBeFocused();
  await picker.setInputFiles({ name: 'cat.png', mimeType: 'image/png', buffer: Buffer.from('x') });
  await expect(picker).toHaveAttribute('aria-disabled', 'true');
  await expect(picker).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Image, no description' })).toBeFocused();
  await expect(page.locator('[data-block-id="img"]')).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('Enter');
  await page.keyboard.type('caption words');
  await expect.poll(async () => (await blocks(page))[1]).toMatchObject({
    id: 'img',
    type: 'IMAGE',
    data: { storageKey: 'key-cat.png', alt: '', caption: 'caption words' },
  });
  expect((await blocks(page)).map((block) => block.indent ?? 0)).toEqual([0, 0, 0]);
});

// Slows the measurement of a picture, which reads its size through window.Image, by the delay the page sets.
function slowMeasurement() {
  const Real = window.Image;
  window.Image = function SlowImage() {
    const image = new Real();
    let onload: ((event: Event) => void) | null = null;
    Object.defineProperty(image, 'onload', {
      get: () => onload,
      set(handler) {
        onload = handler;
        image.addEventListener('load', (event) =>
          setTimeout(() => onload?.(event), (window as unknown as { measureDelay?: number }).measureDelay ?? 0),
        );
      },
    });
    return image;
  } as unknown as typeof Image;
}

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const onPage = (page: Page) => page.evaluate(() => document.activeElement === document.body);

// A press on the page outside the editor leaves focus on its body.
async function leaveForPage(page: Page) {
  await page.mouse.click(5, 700);
  await expect.poll(() => onPage(page)).toBe(true);
}

test.describe('focus on the page while something lands in the editor', () => {
  test('stays there when an upload lands in an empty image, and when its size is measured', async ({ page }) => {
    await page.addInitScript(slowMeasurement);
    await openEditor(page, 'media', 'upload=1200');
    await page.evaluate(() => ((window as unknown as { measureDelay: number }).measureDelay = 1200));
    await page.locator('.quoin-image-upload').click({ position: { x: 4, y: 4 } });
    await page.keyboard.press('Enter');
    const picture = { name: 'cat.png', mimeType: 'image/png', buffer: Buffer.from(PNG_1PX, 'base64') };
    await page.getByLabel('Upload image').setInputFiles(picture);
    await leaveForPage(page);
    await expect.poll(async () => (await blocks(page))[1].data.storageKey).toBe('key-cat.png');
    expect(await onPage(page)).toBe(true);
    await expect.poll(async () => (await blocks(page))[1].data.width).toBe(1);
    expect(await onPage(page)).toBe(true);
  });

  test('stays there when an upload lands in an empty file block', async ({ page }) => {
    await openEditor(page, 'file', 'upload=1200');
    const picker = page.locator('[data-block-id="e"]').getByLabel('Upload file');
    await picker.focus();
    await picker.setInputFiles({ name: 'report.zip', mimeType: 'application/zip', buffer: Buffer.from('zip') });
    await leaveForPage(page);
    await expect.poll(async () => (await blocks(page))[2].data.storageKey).toBe('key-report.zip');
    expect(await onPage(page)).toBe(true);
  });

  test('stays there when files pasted in the text land as blocks', async ({ page }) => {
    await caretAtEndOfParagraph(page, 1200);
    await pasteFilesEvent(page, [pdf]);
    await leaveForPage(page);
    await expect.poll(() => shape(page)).toContain('FILE:key-notes.pdf');
    expect(await onPage(page)).toBe(true);
  });
});
