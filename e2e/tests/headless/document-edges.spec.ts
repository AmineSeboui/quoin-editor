import { expect, test, type Page } from '@playwright/test';
import { caretAt, markdown, modelSelection, openHeadless, selectText } from '../../support/headless';

const mac = process.platform === 'darwin';
const [toStart, toEnd] = mac ? ['Meta+ArrowUp', 'Meta+ArrowDown'] : ['Control+Home', 'Control+End'];

type Head = { block: string; offset: number };

const pos = (block: string, offset: number) => ({ block, region: 'text', offset });

// Where a model position is drawn and how wide the wider glyph beside it is, from the host's text rather than the
// browser's selection, which a cross-block selection keeps in its sink.
function xOf(page: Page, { block, offset }: Head) {
  return page.evaluate(
    ([id, at]) => {
      const host = document.querySelector(`[data-block-id="${id}"] [data-quoin-host]`)!;
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      let left = at;
      for (let text = walker.nextNode() as Text | null; text; text = walker.nextNode() as Text | null) {
        if (left <= text.length) {
          const range = document.createRange();
          range.setStart(text, left);
          const x = range.getClientRects()[0].left;
          const glyph = (from: number) => {
            if (from < 0 || from >= text.length) return 0;
            range.setStart(text, from);
            range.setEnd(text, from + 1);
            return range.getBoundingClientRect().width;
          };
          return { x, glyph: Math.max(glyph(left - 1), glyph(left)) };
        }
        left -= text.length;
      }
      throw new Error(`no offset ${at} in ${id}`);
    },
    [block, offset] as const,
  );
}

const head = async (page: Page) => ((await modelSelection(page)) as { head: Head }).head;

function caretInView(page: Page) {
  return page.evaluate(() => {
    const { block, offset } = (window.__quoin.controller!.editor.state.selection as unknown as { head: Head }).head;
    const text = document.querySelector(`[data-block-id="${block}"] [data-quoin-host]`)!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, Math.min(offset, text.length));
    const rect = range.getClientRects()[0];
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  });
}

test.describe('document edges', () => {
  test(`${toStart} goes to the start of the document and ${toEnd} to its end`, async ({ page }) => {
    await openHeadless(page, 'three');
    await caretAt(page, 2, 5);
    await page.keyboard.press(toStart);
    await expect.poll(() => modelSelection(page)).toEqual({ kind: 'text', anchor: pos('a', 0), head: pos('a', 0) });
    await caretAt(page, 0, 5);
    await page.keyboard.press(toEnd);
    await expect.poll(() => modelSelection(page)).toEqual({ kind: 'text', anchor: pos('c', 14), head: pos('c', 14) });
    await page.keyboard.type('!');
    expect(await markdown(page)).toEqual(['Alpha beta gamma', 'Delta epsilon', 'Zeta eta theta!']);
  });

  test('the document edges are reached from across blocks and bring the caret into view', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    await page.setViewportSize({ width: 800, height: 400 });
    await openHeadless(page, 'forty');
    await caretAt(page, 0, 0);
    await page.keyboard.press(toStart);
    await expect.poll(() => head(page)).toMatchObject({ block: 'p0', offset: 0 });
    await selectText(page, [1, 4], [2, 4]);
    await page.keyboard.press(toEnd);
    await expect.poll(() => modelSelection(page)).toMatchObject({ head: pos('p39', 56), anchor: pos('p39', 56) });
    expect(await caretInView(page)).toBe(true);
    await page.keyboard.press(toEnd);
    expect(await head(page)).toMatchObject({ block: 'p39', offset: 56 });
    expect(await caretInView(page)).toBe(true);
    await page.keyboard.press(toStart);
    await expect.poll(() => head(page)).toMatchObject({ block: 'p0', offset: 0 });
    expect(await caretInView(page)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('Shift with Control+Home or Control+End extends the selection to the edge', async ({ page }) => {
    test.skip(mac, 'macOS has no Control+Home; Shift with Command and an arrow moves the block there');
    await openHeadless(page, 'three');
    await caretAt(page, 1, 5);
    await page.keyboard.press('Control+Shift+Home');
    await expect.poll(() => modelSelection(page)).toEqual({ kind: 'text', anchor: pos('b', 5), head: pos('a', 0) });
    await page.keyboard.press('Control+Shift+End');
    await expect.poll(() => modelSelection(page)).toEqual({ kind: 'text', anchor: pos('b', 5), head: pos('c', 14) });
  });

  test('Shift with Command and an arrow still moves the block on macOS', async ({ page }) => {
    test.skip(!mac, 'Command is a macOS key');
    await openHeadless(page, 'three');
    await caretAt(page, 1, 5);
    await page.keyboard.press('Meta+Shift+ArrowUp');
    await expect.poll(() => markdown(page)).toEqual(['Delta epsilon', 'Alpha beta gamma', 'Zeta eta theta']);
  });

  test('Shift+ArrowUp then Shift+ArrowDown across blocks comes back to the same offset', async ({ page }) => {
    await openHeadless(page, 'heading');
    await selectText(page, [2, 5], [1, 12]);
    await page.keyboard.press('Shift+ArrowUp');
    await expect.poll(async () => (await head(page)).block).toBe('h');
    await page.keyboard.press('Shift+ArrowDown');
    await expect.poll(() => modelSelection(page)).toEqual({ kind: 'text', anchor: pos('q', 5), head: pos('p', 12) });
  });

  test('Shift+ArrowUp across blocks moves the head one line up inside a wrapped paragraph', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await openHeadless(page, 'wrapped');
    const end = (await page.locator('[data-block-id="p"] [data-quoin-host]').textContent())!.length;
    await selectText(page, [1, 5], [0, end]);
    const start = await xOf(page, { block: 'p', offset: end });
    await page.keyboard.press('Shift+ArrowUp');
    await expect.poll(async () => (await head(page)).offset).toBeLessThan(end);
    const moved = await head(page);
    expect(moved.block).toBe('p');
    const landed = await xOf(page, moved);
    expect(Math.abs(landed.x - start.x)).toBeLessThanOrEqual(landed.glyph / 2 + 1);
  });

  for (const [name, from, to] of [
    ['a selection that stays across blocks', [2, 5], [1, 12]],
    ['a selection that ends in one block', [0, 2], [1, 12]],
  ] as const) {
    test(`Shift+ArrowUp keeps the caret's x into a heading above, from ${name}`, async ({ page }) => {
      await openHeadless(page, 'heading');
      await selectText(page, from, to);
      const start = await xOf(page, { block: 'p', offset: to[1] });
      await page.keyboard.press('Shift+ArrowUp');
      await expect.poll(async () => (await head(page)).block).toBe('h');
      expect(await modelSelection(page)).toMatchObject({ anchor: pos(['h', 'p', 'q'][from[0]], from[1]) });
      const landed = await xOf(page, await head(page));
      expect(Math.abs(landed.x - start.x)).toBeLessThanOrEqual(landed.glyph / 2 + 1);
    });
  }
});
