import { expect, test, type Page } from '@playwright/test';
import { caretAt, host, markdown, modelSelection, openHeadless } from '../../support/headless';
import { copyEvent, cutEvent, dragEvent, dropEvent, pasteEvent } from '../../support/synthetic-events';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

// What a block is, without the id the engine gives a pasted copy.
const shapes = async (page: Page) =>
  (await page.evaluate(() => window.__quoin.blocks())).map(({ type, data, indent }) => ({ type, data, indent: indent ?? 0 }));

test.describe('clipboard', () => {
  test('copy and paste inside the editor keeps formatting, block types and indents', async ({ page, context, browserName }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openHeadless(page, 'sample');
    const before = await shapes(page);
    expect(before.map((block) => block.type)).toEqual(['MARKDOWN', 'MARKDOWN', 'MARKDOWN', 'MARKDOWN', 'MARKDOWN', 'MARKDOWN', 'DIVIDER', 'CALLOUT']);
    expect(before[1].data).toEqual({ markdown: 'A paragraph with **bold**, _italic_ and `code`.' });
    expect(before[3].indent).toBe(1);
    await host(page, 1).click();
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press(`${mod}+c`);
    await caretAt(page, 7, 'A callout'.length);
    await page.keyboard.press(`${mod}+v`);
    await expect.poll(() => shapes(page)).toEqual([...before, ...before]);
  });

  test('pasting external HTML converts it', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('group', { name: 'Document' }).click();
    await pasteEvent(page, {
      'text/html': '<h2>Head</h2><ul><li>one</li><li><b>two</b></li></ul>',
      'text/plain': 'Head\none\ntwo',
    });
    await expect.poll(() => markdown(page)).toEqual(['## Head', '- one', '- **two**']);
  });

  test('pasting a URL over a selection makes a link', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 0, 0);
    await page.keyboard.press('Shift+End');
    await pasteEvent(page, { 'text/plain': 'https://quoin.dev' });
    await expect.poll(async () => (await markdown(page))[0]).toBe('[Alpha beta gamma](https://quoin.dev)');
  });

  test('dropping text inserts it where it lands', async ({ page }) => {
    await openHeadless(page, 'three');
    const box = (await host(page, 1).boundingBox())!;
    await dropEvent(page, { x: box.x + 1, y: box.y + box.height / 2 }, { data: { 'text/plain': 'Dropped ' } });
    await expect.poll(async () => (await markdown(page))[1]).toMatch(/^Dropped /);
  });

  test('copy writes the plain text, the HTML with the slice marker and the Quoin JSON', async ({ page }) => {
    await openHeadless(page, 'sample');
    await host(page, 1).click();
    await page.keyboard.press(`${mod}+a`);
    const copied = await copyEvent(page);
    expect(copied.prevented).toBe(true);
    expect(copied.plain).toBe('A paragraph with bold, italic and code.');
    expect(copied.html).toMatch(/^<div data-quoin-slice="[A-Za-z0-9+/=]+">.*<strong>bold<\/strong>.*<\/div>$/);
    expect(JSON.parse(copied.json)).toMatchObject({ quoin: 1, slice: { openStart: true, openEnd: true } });
  });

  test('a copy with only a caret is left to the browser', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 0, 2);
    expect((await copyEvent(page)).prevented).toBe(false);
  });

  test('pasting a copied selection keeps its marks and puts the caret after it', async ({ page }) => {
    await openHeadless(page, 'sample');
    const source = (await markdown(page))[1];
    await host(page, 1).click();
    await page.keyboard.press(`${mod}+a`);
    await copyEvent(page);
    await caretAt(page, 5, 7);
    await pasteEvent(page);
    await page.keyboard.type('!');
    expect((await markdown(page))[5]).toBe(`> a quote${source}!`);
  });

  test('cutting removes the selection and pasting brings it back', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 0);
    await page.keyboard.press('Shift+End');
    const cut = await cutEvent(page);
    expect(cut.plain).toBe('Delta epsilon');
    await expect.poll(async () => (await markdown(page))[1]).toBe('');
    await caretAt(page, 2, 0);
    await pasteEvent(page);
    await expect.poll(() => markdown(page)).toEqual(['Alpha beta gamma', '', 'Delta epsilonZeta eta theta']);
  });

  test('cutting a selection across blocks joins what is left', async ({ page }) => {
    await openHeadless(page, 'three');
    await host(page, 0).click();
    await page.keyboard.press('End');
    await page.keyboard.press('Shift+ArrowDown');
    const cut = await cutEvent(page);
    expect(cut.plain).toContain('Delta epsilon');
    await expect.poll(() => markdown(page)).toEqual(['Alpha beta gamma', 'Zeta eta theta']);
  });

  test('cutting selected blocks removes them whole', async ({ page }) => {
    await openHeadless(page, 'three');
    await host(page, 1).click();
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press(`${mod}+a`);
    expect(await modelSelection(page)).toMatchObject({ kind: 'blocks' });
    const cut = await cutEvent(page);
    expect(cut.plain).toBe('Alpha beta gamma\n\nDelta epsilon\n\nZeta eta theta');
    await expect.poll(() => markdown(page)).toEqual([]);
  });

  test('typing continues in the block a paste into an empty document creates', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('group', { name: 'Document' }).click();
    await pasteEvent(page, { 'text/plain': 'First line' });
    await page.keyboard.type('!');
    await expect.poll(() => markdown(page)).toEqual(['First line!']);
  });

  test('a drag that starts in text is cancelled and a drop is only allowed for files, text and HTML', async ({ page }) => {
    await openHeadless(page, 'three');
    const selector = '[data-quoin-host]';
    const over = async (type: string) => (await dragEvent(page, { type: 'dragover', selector, data: { [type]: 'x' } })).prevented;
    expect({
      start: (await dragEvent(page, { type: 'dragstart', selector, firstChild: true })).prevented,
      text: await over('text/plain'),
      html: await over('text/html'),
      other: await over('text/uri-list'),
    }).toEqual({ start: true, text: true, html: true, other: false });
  });

  test('dropping a file reports it with the position it landed on and changes nothing', async ({ page }) => {
    await openHeadless(page, 'three');
    const box = (await host(page, 2).boundingBox())!;
    await dropEvent(page, { x: box.x + 1, y: box.y + box.height / 2 }, { files: [{ name: 'cat.png', type: 'image/png' }] });
    await expect.poll(() => page.evaluate(() => window.__quoin.files)).toEqual([
      { names: ['cat.png'], at: { block: 'c', region: 'text', offset: 0 } },
    ]);
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Delta epsilon', 'Zeta eta theta']);
  });
});
