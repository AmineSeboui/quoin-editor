import { expect, test, type Page } from '@playwright/test';
import { caretLineEnd, drawnCaret } from '../../support/drawn-caret';
import { host, modelSelection, openHeadless } from '../../support/headless';

type Line = { top: number; bottom: number; right: number; end: number };

const WIDTHS = [300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500];

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
