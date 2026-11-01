import type { Page } from '@playwright/test';

export type DrawnCaret = { left: number; top: number; bottom: number };
type Clip = { x: number; y: number; width: number; height: number };

// A collapsed range has the same client rects on either side of a soft wrap, so where the browser draws the caret is
// read from the pixels that differ between a screenshot with the caret and one without. The caret blinks, so a few
// pairs are taken.
export async function drawnCaret(page: Page, clip: Clip): Promise<DrawnCaret | null> {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  for (let attempt = 0; attempt < 8; attempt++) {
    const hidden = (await page.screenshot({ caret: 'hide', clip })).toString('base64');
    const shown = (await page.screenshot({ caret: 'initial', clip })).toString('base64');
    const caret = await page.evaluate(
      async ([a, b, x0, y0]) => {
        const pixels = async (png: string) => {
          const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const context = canvas.getContext('2d')!;
          context.drawImage(bitmap, 0, 0);
          return context.getImageData(0, 0, bitmap.width, bitmap.height);
        };
        const [one, two] = [await pixels(a), await pixels(b)];
        let [left, top, bottom] = [Infinity, Infinity, -1];
        for (let i = 0; i < one.data.length; i += 4) {
          const diff = [0, 1, 2].reduce((sum, c) => sum + Math.abs(one.data[i + c] - two.data[i + c]), 0);
          if (diff <= 60) continue;
          const x = (i / 4) % one.width;
          const y = Math.floor(i / 4 / one.width);
          [left, top, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(bottom, y)];
        }
        const scale = window.devicePixelRatio;
        if (bottom < 0) return null;
        return { left: x0 + left / scale, top: y0 + top / scale, bottom: y0 + (bottom + 1) / scale };
      },
      [hidden, shown, clip.x, clip.y] as const,
    );
    if (caret) return caret;
  }
  return null;
}

// The offset in the host's text of the end of the line the browser takes the caret to be on, found by extending the
// selection to the line boundary and putting the caret back. Firefox draws no caret in screenshots, so this is how it
// tells which side of a soft wrap the caret is on.
export function caretLineEnd(page: Page): Promise<number> {
  return page.evaluate(() => {
    const selection = document.getSelection()!;
    const { focusNode, focusOffset } = selection;
    selection.modify('extend', 'forward', 'lineboundary');
    const range = document.createRange();
    range.setStart(focusNode!.parentElement!.closest('[data-quoin-host]')!, 0);
    range.setEnd(selection.focusNode!, selection.focusOffset);
    const moved = selection.focusNode !== focusNode || selection.focusOffset !== focusOffset;
    if (moved) selection.collapse(focusNode, focusOffset);
    return range.toString().length;
  });
}
