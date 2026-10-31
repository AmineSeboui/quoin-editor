import { expect, test } from '@playwright/test';
import { caretAt, host, markdown, modelMarkdown, openHeadless } from '../../support/headless';

test.describe('IME composition', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP IME input is Chromium only');

  test('a Japanese composition commits once into the model', async ({ page }) => {
    await openHeadless(page);
    await caretAt(page, 1, 0);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '\u306b', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: '\u306b\u307b', selectionStart: 2, selectionEnd: 2 });
    await cdp.send('Input.imeSetComposition', { text: '\u306b\u307b\u3093', selectionStart: 3, selectionEnd: 3 });
    await cdp.send('Input.insertText', { text: '\u65e5\u672c' });
    const paragraph = 'A paragraph with **bold**, _italic_ and `code`.';
    await expect.poll(async () => (await markdown(page))[1]).toBe(`\u65e5\u672c${paragraph}`);
    await page.keyboard.type('!');
    await expect.poll(async () => (await markdown(page))[1]).toBe(`\u65e5\u672c!${paragraph}`);
  });

  test('a composition keeps what the page wrote into its block meanwhile, and the marks after it', async ({ page }) => {
    await openHeadless(page);
    await caretAt(page, 1, 2);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '\u304b', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: '\u304b\u3093', selectionStart: 2, selectionEnd: 2 });
    await page.evaluate(() =>
      window.__quoin.setBlocks!((blocks) =>
        blocks.map((b) => (b.id === 'p' ? { ...b, data: { markdown: `${String(b.data.markdown)} REMOTE` } } : b)),
      ),
    );
    await expect.poll(async () => (await modelMarkdown(page))[1]).toMatch(/ REMOTE$/);
    await cdp.send('Input.insertText', { text: '\u6f22\u5b57' });
    const expected = 'A \u6f22\u5b57paragraph with **bold**, _italic_ and `code`. REMOTE';
    await expect.poll(async () => (await modelMarkdown(page))[1]).toBe(expected);
    await expect(host(page, 1)).toHaveText('A \u6f22\u5b57paragraph with bold, italic and code. REMOTE');
    await page.keyboard.type('!');
    await expect.poll(async () => (await modelMarkdown(page))[1]).toBe(expected.replace('\u5b57', '\u5b57!'));
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
    await cdp.send('Input.imeSetComposition', { text: '\u00e9', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.insertText', { text: '\u00e9' });
    await expect.poll(async () => (await markdown(page))[0]).toBe('**a\u00e9b**');
  });

  test('a script that rewrites another block during a composition reaches the model once it commits', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 0, 5);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '\u304b', selectionStart: 1, selectionEnd: 1 });
    await host(page, 2).evaluate((element) => {
      (element.firstChild as Text).data = 'Zeta FIXED theta';
    });
    await cdp.send('Input.imeSetComposition', { text: '\u304b\u3093', selectionStart: 2, selectionEnd: 2 });
    await cdp.send('Input.insertText', { text: '\u6f22' });
    await expect
      .poll(() => modelMarkdown(page))
      .toEqual(['Alpha\u6f22 beta gamma', 'Delta epsilon', 'Zeta FIXED theta']);
    await page.keyboard.type('!');
    await expect.poll(async () => (await modelMarkdown(page))[0]).toBe('Alpha\u6f22! beta gamma');
  });
});
