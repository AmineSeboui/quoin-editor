import { expect, test, type Page } from '@playwright/test';
import { caretLineEnd, drawnCaret } from '../../support/drawn-caret';
import { host, modelSelection, openHeadless } from '../../support/headless';

type Line = { top: number; bottom: number; right: number; end: number };

const WIDTHS = [300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500];

// End on a Mac scrolls the page, and Command with the arrow towards the end of the line moves the caret there.
const LINE_END = process.platform === 'darwin' ? 'Meta+ArrowRight' : 'End';

function lines(page: Page): Promise<Line[]> {
  return page.evaluate(() => {
    const text = document.querySelector('[data-block-id="p"] [data-quoin-host]')!.firstChild as Text;
    const rows: { top: number; bottom: number; right: number; end: number }[] = [];
    for (let at = 0; at < text.length; at++) {
      const range = document.createRange();
      range.setStart(text, at);
      range.setEnd(text, at + 1);
      const rect = range.getBoundingClientRect();
      const row = rows.find((r) => Math.abs(r.top - rect.top) < rect.height / 2);
      if (row) [row.right, row.end] = [Math.max(row.right, rect.right), at + 1];
      else rows.push({ top: rect.top, bottom: rect.bottom, right: rect.right, end: at + 1 });
    }
    return rows;
  });
}

// Two presses cross a shorter line first, so that the second landing is the editor's and not the browser's.
async function sweepMiddleLines(
  { page, browserName }: { page: Page; browserName: string },
  doc: string,
  check: (line: Line, label: string) => Promise<void>,
) {
  let tried = 0;
  for (const width of WIDTHS) {
    await openHeadless(page, doc);
    await page.setViewportSize({ width, height: 800 });
    const rows = await lines(page);
    for (const [direction, presses] of [[1, 1], [-1, 1], [1, 2], [-1, 2]] as const) {
      const middle = rows.findIndex((_, i) => {
        const start = rows[i - direction * presses];
        const crossed = Array.from({ length: presses }, (_, k) => rows[i - k * direction]);
        return i > 0 && i < rows.length - 1 && start && crossed.every((row) => start.right > row.right + 8);
      });
      if (middle < 0) continue;
      tried++;
      const [from, line] = [rows[middle - direction * presses], rows[middle]];
      const key = direction > 0 ? 'ArrowDown' : 'ArrowUp';
      const label = `width ${width}, ${presses} ${key} to line ${middle}`;
      await page.mouse.click(from.right - 2, (from.top + from.bottom) / 2);
      for (let i = 0; i < presses; i++) await page.keyboard.press(key);
      // Firefox draws no caret in screenshots.
      if (browserName !== 'firefox') {
        const caret = await drawnCaret(page, (await host(page, 0).boundingBox())!);
        expect.soft(caret && Math.abs(caret.top + caret.bottom - line.top - line.bottom) / 2, label).toBeLessThan(6);
      }
      await check(line, label);
    }
  }
  expect(tried).toBeGreaterThanOrEqual(WIDTHS.length * 2);
}

test.describe('a soft wrap', () => {
  test.setTimeout(120_000);

  test('a goal past the end of a wrapped middle line keeps the caret and the typed text on that line', async ({
    page,
    browserName,
  }) => {
    const typed = () =>
      page.evaluate(() => {
        const text = document.querySelector('[data-block-id="p"] [data-quoin-host]')!.firstChild as Text;
        const top = (at: number) => {
          const range = document.createRange();
          range.setStart(text, at);
          range.setEnd(text, at + 1);
          return range.getBoundingClientRect().top;
        };
        const at = text.data.indexOf('Z');
        const next = text.data.slice(at + 1).search(/\S/);
        return { top: top(at), next: next < 0 ? Infinity : top(at + 1 + next) };
      });
    await sweepMiddleLines({ page, browserName }, 'middle', async (line, label) => {
      expect.soft([line.end - 1, line.end], label).toContain(await caretLineEnd(page));
      await page.keyboard.type('Z');
      const { top, next } = await typed();
      expect.soft(Math.abs(top - line.top), label).toBeLessThan(4);
      expect.soft(next, label).toBeGreaterThan(line.bottom - 4);
      await page.keyboard.press('ControlOrMeta+z');
      await expect.poll(() => host(page, 0).textContent()).not.toContain('Z');
    });
  });

  test('the line end key leaves the caret on its line, and the next vertical arrow moves one line from there', async ({
    page,
  }) => {
    let tried = 0;
    for (const doc of ['middle', 'hyphens']) {
      for (const width of [320, 400, 480]) {
        await openHeadless(page, doc);
        await page.setViewportSize({ width, height: 800 });
        const rows = await lines(page);
        const left = (await host(page, 0).boundingBox())!.x + 2;
        for (let i = 1; i < Math.min(rows.length - 1, 4); i++) {
          const label = `${doc} at width ${width}, line ${i}`;
          // Reading the line the caret is on moves the native selection, so it is read once the arrow has moved it.
          for (const [key, to] of [['ArrowDown', i + 1], ['ArrowUp', i - 1]] as const) {
            await page.mouse.click(left, (rows[i].top + rows[i].bottom) / 2);
            await page.keyboard.press(LINE_END);
            const end = { head: { offset: rows[i].end }, assoc: -1 };
            await expect.poll(() => modelSelection(page), label).toMatchObject(end);
            await page.keyboard.press(key);
            expect.soft(await caretLineEnd(page), `${label}, ${key}`).toBe(rows[to].end);
            tried++;
          }
        }
      }
    }
    expect(tried).toBeGreaterThanOrEqual(20);
  });

  test('a caret at the end of a wrapped line is drawn there again once a relayout puts the wrap back', async ({
    page,
  }) => {
    const settled = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    let tried = 0;
    for (const doc of ['middle', 'hyphens']) {
      for (const width of [320, 400, 480]) {
        await openHeadless(page, doc);
        await page.setViewportSize({ width, height: 800 });
        const rows = await lines(page);
        const left = (await host(page, 0).boundingBox())!.x + 2;
        await page.mouse.click(left, (rows[1].top + rows[1].bottom) / 2);
        await page.keyboard.press(LINE_END);
        await expect.poll(() => modelSelection(page)).toMatchObject({ head: { offset: rows[1].end }, assoc: -1 });
        for (const other of [width + 40, width - 40, width + 80]) {
          await page.setViewportSize({ width: other, height: 800 });
          if ((await lines(page)).some(({ end }) => end === rows[1].end)) continue;
          // Focus leaving and coming back writes the caret while no wrap falls where it is. A size the page never
          // draws is no relayout, so a frame is drawn at each.
          await settled();
          await page.evaluate(() => (document.activeElement as HTMLElement).blur());
          await page.evaluate(() => window.__quoin.controller!.focus());
          await page.setViewportSize({ width, height: 800 });
          await settled();
          expect.soft(await caretLineEnd(page), `${doc} at width ${width}, then ${other}`).toBe(rows[1].end);
          tried++;
          break;
        }
      }
    }
    expect(tried).toBeGreaterThanOrEqual(4);
  });

  test('a goal past the end of a line that wraps after a hyphen draws the caret after the hyphen', async ({
    page,
    browserName,
  }) => {
    await sweepMiddleLines({ page, browserName }, 'hyphens', async (line, label) => {
      expect.soft(await modelSelection(page), label).toMatchObject({ head: { offset: line.end }, assoc: -1 });
      expect.soft(await caretLineEnd(page), label).toBe(line.end);
    });
  });
});
