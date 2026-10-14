import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { host, markdown, modelSelection, openHeadless } from '../../support/headless';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

async function dragAcross(page: Page, from: number, to: number) {
  const a = (await host(page, from).boundingBox())!;
  const b = (await host(page, to).boundingBox())!;
  await page.mouse.move(a.x + 8, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 8, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test.describe('cross-block selection', () => {
  test('dragging across blocks selects in the model and paints it', async ({ page, browserName }) => {
    await openHeadless(page, 'three');
    await dragAcross(page, 0, 2);
    const sel = (await modelSelection(page)) as { anchor: { block: string }; head: { block: string } };
    expect(sel.anchor.block).not.toBe(sel.head.block);
    await expect(page.locator('.quoin-editor')).toHaveAttribute('data-quoin-cross', '');
    const painted = await page.evaluate(() => ('highlights' in CSS ? (CSS as unknown as { highlights: Map<string, unknown> }).highlights.has('quoin-selection') : document.querySelectorAll('.quoin-selected').length > 0));
    expect(painted, browserName).toBe(true);
  });

  test('typing replaces a cross-block selection', async ({ page }) => {
    await openHeadless(page, 'three');
    await dragAcross(page, 0, 2);
    await page.keyboard.type('X');
    const md = await markdown(page);
    expect(md).toHaveLength(1);
    expect(md[0]).toContain('X');
  });

  test('formatting applies across blocks', async ({ page }) => {
    await openHeadless(page, 'three');
    await dragAcross(page, 0, 2);
    await page.keyboard.press(`${mod}+b`);
    const md = await markdown(page);
    expect(md.every((line) => line.includes('**'))).toBe(true);
  });

  test('Shift+ArrowDown extends into the next block', async ({ page }) => {
    await openHeadless(page, 'three');
    await host(page, 0).click();
    await page.keyboard.press('End');
    await page.keyboard.press('Shift+ArrowDown');
    const sel = (await modelSelection(page)) as { anchor: { block: string }; head: { block: string } };
    expect(sel.anchor.block).not.toBe(sel.head.block);
  });

  test('select all twice then Backspace empties the document', async ({ page }) => {
    await openHeadless(page, 'three');
    await host(page, 1).click();
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press(`${mod}+a`);
    expect(await modelSelection(page)).toMatchObject({ kind: 'blocks' });
    await page.keyboard.press('Backspace');
    expect(await markdown(page)).toEqual([]);
  });

  test('typing replaces selected blocks with a paragraph, and the caret stays in it', async ({ page }) => {
    await openHeadless(page, 'three');
    await host(page, 1).click();
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.type('XY');
    await expect.poll(() => markdown(page)).toEqual(['XY']);
    await expect(host(page, 0)).toBeFocused();
  });

  test('works without the highlight API', async ({ page }) => {
    await page.addInitScript(() => {
      delete (CSS as unknown as { highlights?: unknown }).highlights;
    });
    await openHeadless(page, 'three');
    await dragAcross(page, 0, 2);
    await expect(page.locator('.quoin-selected').first()).toBeVisible();
  });
});

test.describe('cross-block selection, beyond the basics', () => {
  const crossed = (page: Page) => page.locator('.quoin-editor[data-quoin-cross]');

  test('a plain arrow collapses the selection and hands the caret back to a host', async ({ page }) => {
    await openHeadless(page, 'three');
    await dragAcross(page, 0, 2);
    await page.keyboard.press('ArrowRight');
    await expect(crossed(page)).toHaveCount(0);
    const sel = (await modelSelection(page)) as { anchor: { block: string; offset: number }; head: { block: string; offset: number } };
    expect(sel.head).toEqual(sel.anchor);
    expect(sel.head.block).toBe('c');
    await expect(host(page, 2)).toBeFocused();
    await page.keyboard.type('Y');
    expect((await markdown(page))[2]).toContain('Y');
  });

  test('dragging back into the first block selects there natively', async ({ page }) => {
    await openHeadless(page, 'three');
    const a = (await host(page, 0).boundingBox())!;
    const c = (await host(page, 2).boundingBox())!;
    await page.mouse.move(a.x + 8, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(c.x + 8, c.y + c.height / 2, { steps: 8 });
    await expect(crossed(page)).toHaveCount(1);
    await page.mouse.move(a.x + 60, a.y + a.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(crossed(page)).toHaveCount(0);
    await expect(host(page, 0)).toBeFocused();
    expect(await page.evaluate(() => document.getSelection()!.toString().length)).toBeGreaterThan(0);
    expect(await modelSelection(page)).toMatchObject({ anchor: { block: 'a' }, head: { block: 'a' } });
  });

  test('Shift+click in another block extends the selection to it', async ({ page }) => {
    await openHeadless(page, 'three');
    await host(page, 0).click();
    const c = (await host(page, 2).boundingBox())!;
    await page.keyboard.down('Shift');
    await page.mouse.click(c.x + 40, c.y + c.height / 2);
    await page.keyboard.up('Shift');
    expect(await modelSelection(page)).toMatchObject({ anchor: { block: 'a' }, head: { block: 'c' } });
    await expect(crossed(page)).toHaveCount(1);
  });

  test('a drag that starts outside the text selects whole blocks', async ({ page }) => {
    await openHeadless(page, 'list');
    const marker = (await page.locator('[data-block-id="l1"] .quoin-marker').boundingBox())!;
    const last = (await host(page, 2).boundingBox())!;
    await page.mouse.move(marker.x + marker.width / 2, marker.y + marker.height / 2);
    await page.mouse.down();
    await page.mouse.move(marker.x + marker.width / 2, last.y + last.height / 2, { steps: 6 });
    await page.mouse.up();
    expect(await modelSelection(page)).toEqual({ kind: 'blocks', anchor: 'l1', head: 'l3' });
    await expect(page.locator('[data-selected="true"]')).toHaveCount(3);
  });

  test('a drag held near the bottom of the viewport scrolls and keeps selecting', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 400 });
    await openHeadless(page, 'large');
    const a = (await host(page, 0).boundingBox())!;
    await page.mouse.move(a.x + 8, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + 8, 395, { steps: 6 });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
    await page.mouse.up();
    const sel = (await modelSelection(page)) as { head: { block: string } };
    expect(Number(sel.head.block.slice(1))).toBeGreaterThan(10);
  });

  test('a selection across blocks has no serious accessibility violations', async ({ page }) => {
    await openHeadless(page, 'three');
    await dragAcross(page, 0, 2);
    await expect(page.getByRole('textbox', { name: 'Selected content' })).toBeFocused();
    await expect(page.getByRole('status')).toHaveText('3 blocks selected');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });

  test('a composition replaces the selection', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP IME input is Chromium only');
    await openHeadless(page, 'three');
    await dragAcross(page, 0, 2);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '\u306b', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.imeSetComposition', { text: '\u306b\u307b', selectionStart: 2, selectionEnd: 2 });
    await cdp.send('Input.insertText', { text: '\u65e5\u672c' });
    await expect.poll(() => markdown(page)).toEqual([expect.stringContaining('\u65e5\u672c')]);
    await page.keyboard.type('!');
    await expect.poll(async () => (await markdown(page))[0]).toContain('\u65e5\u672c!');
  });

  test('a composition after Home replaces only the selection', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP IME input is Chromium only');
    await openHeadless(page, 'three');
    await dragAcross(page, 0, 2);
    await page.keyboard.press('Home');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '\u306b', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.insertText', { text: '\u65e5' });
    await expect.poll(() => markdown(page)).toEqual([expect.stringContaining('\u65e5')]);
    expect((await markdown(page))[0]).not.toContain('Delta');
  });

  test('a click inside a selection painted without the highlight API puts the caret there', async ({ page }) => {
    await page.addInitScript(() => {
      delete (CSS as unknown as { highlights?: unknown }).highlights;
    });
    await openHeadless(page, 'three');
    await dragAcross(page, 0, 2);
    await expect(page.locator('.quoin-selected').first()).toBeVisible();
    const b = (await host(page, 1).boundingBox())!;
    await page.mouse.click(b.x + b.width - 4, b.y + b.height / 2);
    await expect(crossed(page)).toHaveCount(0);
    await page.keyboard.type('Z');
    expect((await markdown(page))[1]).toBe('Delta epsilonZ');
  });
});
