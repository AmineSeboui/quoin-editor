import { expect, test } from '@playwright/test';
import { caretAt, domCaret, host, markdown, modelSelection, openHeadless } from '../../support/headless';

test.describe('navigation', () => {
  test('ArrowDown and ArrowUp cross blocks and keep the column', async ({ page }) => {
    await openHeadless(page, 'columns');
    await caretAt(page, 0, 4);
    await page.keyboard.press('ArrowDown');
    expect(await modelSelection(page)).toMatchObject({ head: { offset: 4 } });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await modelSelection(page)).toMatchObject({ head: { offset: 4 } });
  });

  test('the goal column survives a shorter block on the way and resets on a horizontal move', async ({ page }) => {
    await openHeadless(page, 'ragged');
    await caretAt(page, 0, 6);
    await page.keyboard.press('ArrowDown');
    expect(await modelSelection(page)).toMatchObject({ head: { block: 'r2', offset: 2 } });
    await page.keyboard.press('ArrowDown');
    expect(await modelSelection(page)).toMatchObject({ head: { block: 'r3', offset: 6 } });
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => modelSelection(page)).toMatchObject({ head: { block: 'r3', offset: 5 } });
    await page.keyboard.press('ArrowUp');
    expect(await modelSelection(page)).toMatchObject({ head: { block: 'r2', offset: 2 } });
    await page.keyboard.press('ArrowUp');
    expect(await modelSelection(page)).toMatchObject({ head: { block: 'r1', offset: 5 } });
  });

  test('the goal column survives the hard breaks inside a block and the short lines they make', async ({ page }) => {
    await openHeadless(page, 'breaks');
    await caretAt(page, 0, 20);
    const heads = [];
    for (const key of [...Array(5).fill('ArrowDown'), ...Array(5).fill('ArrowUp')]) {
      await page.keyboard.press(key);
      heads.push(await domCaret(page));
    }
    expect(heads.map((caret) => `${caret?.block}@${caret?.offset}`)).toEqual([
      'r2@2', 'r2@23', 'r3@20', 'r4@2', 'r5@20',
      'r4@2', 'r3@20', 'r2@23', 'r2@2', 'r1@20',
    ]);
    expect(await modelSelection(page)).toMatchObject({ head: { block: 'r1', offset: 20 } });
  });

  test('the goal column survives a wrapped paragraph whose last line is shorter', async ({ page }) => {
    await openHeadless(page, 'wrapped');
    const measure = () =>
      page.evaluate(() => {
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('[data-block-id="p"] [data-quoin-host]')!);
        const rects = Array.from(range.getClientRects());
        const box = (rect: DOMRect) => ({ top: rect.top, height: rect.height, left: rect.left, right: rect.right });
        return { first: box(rects[0]), last: box(rects[rects.length - 1]) };
      });
    let lines = await measure();
    for (const width of [420, 380, 460, 340, 500]) {
      await page.setViewportSize({ width, height: 800 });
      lines = await measure();
      const short = lines.last.right - lines.last.left < (lines.first.right - lines.first.left) / 2;
      if (lines.last.top > lines.first.top && short) break;
    }
    await page.mouse.click(lines.first.right - 8, lines.first.top + lines.first.height / 2);
    const caretX = () => page.evaluate(() => document.getSelection()!.getRangeAt(0).getClientRects()[0].left);
    const start = await caretX();
    expect(start).toBeGreaterThan(lines.last.right + 20);
    for (let i = 0; i < 12 && (await domCaret(page))?.block === 'p'; i++) await page.keyboard.press('ArrowDown');
    expect((await domCaret(page))?.block).toBe('q');
    const width = await page.evaluate(() => {
      const range = document.getSelection()!.getRangeAt(0).cloneRange();
      range.setEnd(range.startContainer, range.startOffset + 1);
      return range.getBoundingClientRect().width;
    });
    expect(Math.abs((await caretX()) - start)).toBeLessThanOrEqual(width);
  });

  test('ArrowDown and ArrowUp stay inside a wrapped paragraph until its last or first line', async ({ page }) => {
    await page.setViewportSize({ width: 240, height: 800 });
    await openHeadless(page);
    const head = async () => ((await modelSelection(page)) as { head: { block: string; offset: number } }).head;
    const end = (await host(page, 1).textContent())!.length;
    await caretAt(page, 1, 0);
    await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await head()).offset).toBeGreaterThan(0);
    expect((await head()).block).toBe('p');
    await caretAt(page, 1, end);
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await head()).offset).toBeLessThan(end);
    expect((await head()).block).toBe('p');
    await caretAt(page, 1, end);
    await page.keyboard.press('ArrowDown');
    expect((await head()).block).toBe('b');
    await caretAt(page, 1, 0);
    await page.keyboard.press('ArrowUp');
    expect((await head()).block).toBe('h');
  });

  test('ArrowLeft at the start goes to the end of the previous block', async ({ page }) => {
    await openHeadless(page, 'columns');
    await caretAt(page, 1, 0);
    await page.keyboard.press('ArrowLeft');
    const sel = (await modelSelection(page)) as { head: { offset: number } };
    expect(sel.head.offset).toBeGreaterThan(0);
  });

  test('a divider is node-selected by arrows and deleted by Backspace', async ({ page }) => {
    await openHeadless(page, 'divider');
    await caretAt(page, 0, 1);
    await page.keyboard.press('ArrowDown');
    expect(await modelSelection(page)).toEqual({ kind: 'node', block: expect.any(String) });
    await expect(page.locator('[data-type="DIVIDER"]')).toHaveAttribute('data-selected', 'true');
    await page.keyboard.press('Backspace');
    expect(await markdown(page)).toEqual(['a', 'b']);
  });

  test('an image drawn without a host is node-selected by arrows, which then move past it', async ({ page }) => {
    await openHeadless(page, 'image');
    const image = page.locator('[data-type="IMAGE"]');
    const onImage = async () => {
      expect(await modelSelection(page)).toEqual({ kind: 'node', block: 'i' });
      await expect(image).toHaveAttribute('data-selected', 'true');
      await expect(image).toBeFocused();
    };
    await caretAt(page, 0, 3);
    await page.keyboard.press('ArrowDown');
    await onImage();
    await page.keyboard.press('ArrowDown');
    expect(await modelSelection(page)).toMatchObject({ head: { block: 'b', offset: 0 } });
    await page.keyboard.press('ArrowUp');
    await onImage();
    await page.keyboard.press('ArrowUp');
    expect(await modelSelection(page)).toMatchObject({ head: { block: 'a', offset: 3 } });
    await page.keyboard.press('ArrowRight');
    await onImage();
    await page.keyboard.press('ArrowRight');
    expect(await modelSelection(page)).toMatchObject({ head: { block: 'b', offset: 0 } });
    await page.keyboard.press('ArrowLeft');
    await onImage();
    await page.keyboard.press('ArrowLeft');
    expect(await modelSelection(page)).toMatchObject({ head: { block: 'a', offset: 3 } });
  });

  test('Tab indents, Shift+Tab outdents, Escape then Tab leaves the editor', async ({ page }) => {
    await openHeadless(page, 'list');
    await caretAt(page, 1, 0);
    await page.keyboard.press('Tab');
    expect(await markdown(page)).toEqual(['- one', '- two', '- three']);
    expect(await page.evaluate(() => window.__quoin.blocks()[1].indent)).toBe(1);
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => window.__quoin.blocks()[1].indent ?? 0)).toBe(0);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => document.querySelector('.quoin-editor')!.contains(document.activeElement));
    expect(inside).toBe(false);
  });

  test('Tab leaves and Shift+Tab comes back when the selected blocks end inside a closed toggle', async ({ page }) => {
    await openHeadless(page, 'closed');
    const sink = page.getByRole('textbox', { name: 'Selected content' });
    await caretAt(page, 0, 1);
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+a');
    expect(await modelSelection(page)).toEqual({ kind: 'blocks', anchor: 'a', head: 'c' });
    await expect(sink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(sink).not.toBeFocused();
    expect(await page.evaluate(() => document.querySelector('.quoin-editor')!.contains(document.activeElement))).toBe(false);
    await page.keyboard.press('Shift+Tab');
    await expect(sink).toBeFocused();
  });
});
