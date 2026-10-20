import { expect, test, type Page } from '@playwright/test';
import { blocks, openEditor } from '../../support/editor';

const alt = async (page: Page) => (await blocks(page)).find((block) => block.id === 'img')?.data.alt;
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Image tools' });
const field = (page: Page) => page.getByRole('textbox', { name: 'Alt text' });

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

  test('a tap outside the alt text stores it and closes it', async ({ page }) => {
    const { x, y } = await editAlt(page);
    await page.touchscreen.tap(x, y);
    await expect.poll(() => alt(page)).toBe('Typed on a phone');
    await expect(field(page)).toHaveCount(0);
  });
});
