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

  test('a composition in an empty document becomes its first paragraph', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('textbox', { name: 'Paragraph' }).click();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '\u306b', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: '\u306b\u307b', selectionStart: 2, selectionEnd: 2 });
    await cdp.send('Input.imeSetComposition', { text: '\u306b\u307b\u3093', selectionStart: 3, selectionEnd: 3 });
    await cdp.send('Input.insertText', { text: '\u65e5\u672c' });
    await expect.poll(() => markdown(page)).toEqual(['\u65e5\u672c']);
    expect(await page.evaluate(() => window.__quoin.changes)).toBe(1);
    await page.keyboard.type('!');
    await expect.poll(() => markdown(page)).toEqual(['\u65e5\u672c!']);
  });

  test('a dead key in an empty document keeps its accented letter', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('textbox', { name: 'Paragraph' }).click();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '\u00b4', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.insertText', { text: '\u00e9' });
    await expect.poll(() => markdown(page)).toEqual(['\u00e9']);
    await page.keyboard.type('t');
    await expect.poll(() => markdown(page)).toEqual(['\u00e9t']);
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
