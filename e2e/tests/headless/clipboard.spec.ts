import { expect, test, type Page } from '@playwright/test';
import { caretAt, host, markdown, modelSelection, openHeadless } from '../../support/headless';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

// One DataTransfer stands in for the system clipboard, so the round trips below do not depend on a browser's clipboard
// permissions. Each event goes to the focused element, as the browser's own would.
type Flavours = { prevented: boolean; plain: string; html: string; json: string };

function fire(page: Page, type: 'copy' | 'cut' | 'paste'): Promise<Flavours> {
  return page.evaluate((kind) => {
    const w = window as unknown as { __clip?: DataTransfer };
    w.__clip ??= new DataTransfer();
    const event = new ClipboardEvent(kind, { clipboardData: w.__clip, bubbles: true, cancelable: true });
    const prevented = !document.activeElement!.dispatchEvent(event);
    const dt = w.__clip;
    return { prevented, plain: dt.getData('text/plain'), html: dt.getData('text/html'), json: dt.getData('application/x-quoin+json') };
  }, type);
}

test.describe('clipboard', () => {
  test('copy and paste inside the editor keeps formatting and blocks', async ({ page, context, browserName }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openHeadless(page, 'three');
    await host(page, 0).click();
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press(`${mod}+c`);
    await caretAt(page, 2, 0);
    await page.keyboard.press(`${mod}+v`);
    expect((await markdown(page)).length).toBeGreaterThan(3);
  });

  test('pasting external HTML converts it', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('group', { name: 'Document' }).click();
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/html', '<h2>Head</h2><ul><li>one</li><li><b>two</b></li></ul>');
      dt.setData('text/plain', 'Head\none\ntwo');
      document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    expect(await markdown(page)).toEqual(['## Head', '- one', '- **two**']);
  });

  test('pasting a URL over a selection makes a link', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 0, 0);
    await page.keyboard.press('Shift+End');
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'https://quoin.dev');
      document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    expect((await markdown(page))[0]).toBe('[Alpha beta gamma](https://quoin.dev)');
  });

  test('dropping text inserts it where it lands', async ({ page }) => {
    await openHeadless(page, 'three');
    const box = (await host(page, 1).boundingBox())!;
    await page.evaluate(([x, y]) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'Dropped ');
      const target = document.elementFromPoint(x, y)!;
      target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    }, [box.x + 1, box.y + box.height / 2] as const);
    expect((await markdown(page))[1]).toMatch(/^Dropped /);
  });

  test('copy writes the plain text, the HTML with the slice marker and the Quoin JSON', async ({ page }) => {
    await openHeadless(page, 'sample');
    await host(page, 1).click();
    await page.keyboard.press(`${mod}+a`);
    const copied = await fire(page, 'copy');
    expect(copied.prevented).toBe(true);
    expect(copied.plain).toBe('A paragraph with bold, italic and code.');
    expect(copied.html).toMatch(/^<div data-quoin-slice="[A-Za-z0-9+/=]+">.*<strong>bold<\/strong>.*<\/div>$/);
    expect(JSON.parse(copied.json)).toMatchObject({ quoin: 1, slice: { openStart: true, openEnd: true } });
  });

  test('a copy with only a caret is left to the browser', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 0, 2);
    expect((await fire(page, 'copy')).prevented).toBe(false);
  });

  test('pasting a copied selection keeps its marks and puts the caret after it', async ({ page }) => {
    await openHeadless(page, 'sample');
    const source = (await markdown(page))[1];
    await host(page, 1).click();
    await page.keyboard.press(`${mod}+a`);
    await fire(page, 'copy');
    await caretAt(page, 5, 7);
    await fire(page, 'paste');
    await page.keyboard.type('!');
    expect((await markdown(page))[5]).toBe(`> a quote${source}!`);
  });

  test('cutting removes the selection and pasting brings it back', async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 1, 0);
    await page.keyboard.press('Shift+End');
    const cut = await fire(page, 'cut');
    expect(cut.plain).toBe('Delta epsilon');
    expect((await markdown(page))[1]).toBe('');
    await caretAt(page, 2, 0);
    await fire(page, 'paste');
    expect(await markdown(page)).toEqual(['Alpha beta gamma', '', 'Delta epsilonZeta eta theta']);
  });

  test('cutting a selection across blocks joins what is left', async ({ page }) => {
    await openHeadless(page, 'three');
    await host(page, 0).click();
    await page.keyboard.press('End');
    await page.keyboard.press('Shift+ArrowDown');
    const cut = await fire(page, 'cut');
    expect(cut.plain).toContain('Delta epsilon');
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Zeta eta theta']);
  });

  test('cutting selected blocks removes them whole', async ({ page }) => {
    await openHeadless(page, 'three');
    await host(page, 1).click();
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press(`${mod}+a`);
    expect(await modelSelection(page)).toMatchObject({ kind: 'blocks' });
    const cut = await fire(page, 'cut');
    expect(cut.plain).toBe('Alpha beta gamma\n\nDelta epsilon\n\nZeta eta theta');
    expect(await markdown(page)).toEqual([]);
  });

  test('typing continues in the block a paste into an empty document creates', async ({ page }) => {
    await openHeadless(page, 'empty');
    await page.getByRole('group', { name: 'Document' }).click();
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'First line');
      document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await page.keyboard.type('!');
    expect(await markdown(page)).toEqual(['First line!']);
  });

  test('a drag that starts in text is cancelled and a drop is only allowed for files, text and HTML', async ({ page }) => {
    await openHeadless(page, 'three');
    const results = await page.evaluate(() => {
      const target = document.querySelector('[data-quoin-host]')!;
      const over = (type: string) => {
        const dt = new DataTransfer();
        dt.setData(type, 'x');
        return !target.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
      };
      return {
        start: !target.firstChild!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true })),
        text: over('text/plain'),
        html: over('text/html'),
        other: over('text/uri-list'),
      };
    });
    expect(results).toEqual({ start: true, text: true, html: true, other: false });
  });

  test('dropping a file reports it with the position it landed on and changes nothing', async ({ page }) => {
    await openHeadless(page, 'three');
    const box = (await host(page, 2).boundingBox())!;
    await page.evaluate(([x, y]) => {
      const dt = new DataTransfer();
      dt.items.add(new File(['x'], 'cat.png', { type: 'image/png' }));
      const target = document.elementFromPoint(x, y)!;
      target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    }, [box.x + 1, box.y + box.height / 2] as const);
    const reported = await page.evaluate(() => window.__quoin.files);
    expect(reported).toEqual([{ names: ['cat.png'], at: { block: 'c', region: 'text', offset: 0 } }]);
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Delta epsilon', 'Zeta eta theta']);
  });
});
