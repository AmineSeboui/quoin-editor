import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const data = async (page: Page, id: string) => (await blocks(page)).find((block) => block.id === id)?.data;
const alt = async (page: Page) => (await data(page, 'img'))?.alt;
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Image tools' });
const field = (page: Page) => page.getByRole('textbox', { name: 'Alt text' });
const changes = (page: Page) => page.evaluate(() => window.__quoin.changes);

test('the Alt text button closes its open popover, storing the text and going back to the image', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 });
  await openEditor(page, 'image');
  await page.addStyleTag({ content: 'body { padding-top: 120px }' });
  await page.getByRole('img', { name: 'A red square' }).click();
  await toolbar(page).getByRole('button', { name: 'Alt text' }).click();
  await field(page).fill('Closed by its button');
  const before = await changes(page);
  await toolbar(page).getByRole('button', { name: 'Alt text' }).click();
  await expect.poll(() => alt(page)).toBe('Closed by its button');
  await expect(field(page)).toHaveCount(0);
  await expect(page.locator('[data-quoin-sink]')).toBeFocused();
  await expect(page.locator('[data-block-id="img"]')).toHaveAttribute('data-selected', 'true');
  await page.waitForTimeout(200);
  await expect(field(page)).toHaveCount(0);
  expect(await changes(page)).toBe(before + 1);
});

// The caret a press or a tap puts in the text stays there for the next key, the alt text being stored on the way.
async function keepsTheCaret(page: Page, below: ReturnType<Page['getByRole']>, stored: string) {
  await expect.poll(() => alt(page)).toBe(stored);
  await expect(field(page)).toHaveCount(0);
  await expect(below).toBeFocused();
  await page.keyboard.type('Q');
  await expect.poll(async () => (await data(page, 'q'))?.markdown).toContain('Q');
  expect(await data(page, 'img')).not.toHaveProperty('caption');
}

test('a click into the text stores the alt text and leaves the caret there for the next key', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 });
  await openEditor(page, 'image');
  await page.addStyleTag({ content: 'body { padding-top: 120px } [data-block-id="q"] { margin-top: 260px }' });
  await page.getByRole('img', { name: 'A red square' }).click();
  await toolbar(page).getByRole('button', { name: 'Alt text' }).click();
  await field(page).fill('Stored by a click');
  const below = page.getByRole('textbox', { name: 'Paragraph' }).last();
  await below.click();
  await keepsTheCaret(page, below, 'Stored by a click');
});

test.describe('on a touch screen', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox cannot emulate a mobile device');
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 700 } });

  async function editAlt(page: Page) {
    await openEditor(page, 'image');
    await page.addStyleTag({ content: 'body { padding: 200px 0 2000px }' });
    await page.getByRole('img', { name: 'A red square' }).tap();
    await toolbar(page).getByRole('button', { name: 'Alt text' }).tap();
    await expect(field(page)).toBeFocused();
    await field(page).fill('Typed on a phone');
    const popover = (await page.getByRole('dialog').boundingBox())!;
    return { x: 10, y: popover.y + popover.height + 60 };
  }

  test('a touch scroll that starts outside the alt text leaves it open with what was typed', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Only Chromium is driven through a touch scroll');
    const { x, y } = await editAlt(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 20 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.waitForTimeout(200);
    await expect(field(page)).toHaveValue('Typed on a phone');
    expect(await alt(page)).toBe('A red square');
  });

  test('a tap into the text stores the alt text and leaves the caret there for the next key', async ({ page }) => {
    await editAlt(page);
    await page.addStyleTag({ content: '[data-block-id="q"] { margin-top: 260px }' });
    const below = page.getByRole('textbox', { name: 'Paragraph' }).last();
    await below.tap();
    await keepsTheCaret(page, below, 'Typed on a phone');
  });

  test('a tap outside the alt text stores it and closes it', async ({ page }) => {
    const { x, y } = await editAlt(page);
    await page.touchscreen.tap(x, y);
    await expect.poll(() => alt(page)).toBe('Typed on a phone');
    await expect(field(page)).toHaveCount(0);
  });
});
