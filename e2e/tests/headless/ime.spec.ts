import { expect, test } from '@playwright/test';
import { caretAt, markdown, openHeadless } from '../../support/headless';

test.describe('IME composition', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP IME input is Chromium only');

  test('a Japanese composition commits once into the model', async ({ page }) => {
    await openHeadless(page);
    await caretAt(page, 1, 0);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: 'に', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: 'にほ', selectionStart: 2, selectionEnd: 2 });
    await cdp.send('Input.imeSetComposition', { text: 'にほん', selectionStart: 3, selectionEnd: 3 });
    await cdp.send('Input.insertText', { text: '日本' });
    await expect.poll(async () => (await markdown(page))[1]).toMatch(/^日本/);
    await page.keyboard.type('!');
    await expect.poll(async () => (await markdown(page))[1]).toMatch(/^日本!/);
  });

  test('a composition inside bold text stays bold', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('group', { name: 'Document' }).click();
    await page.keyboard.type('**ab**');
    await page.keyboard.press('ArrowLeft');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: 'é', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.insertText', { text: 'é' });
    await expect.poll(async () => (await markdown(page))[0]).toBe('**aéb**');
  });
});
