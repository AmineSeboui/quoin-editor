/** A sub-image of a PNG: the whole picture, or one of the seven passes of an interlaced one. */
export type Pass = { readonly x0: number; readonly y0: number; readonly dx: number; readonly dy: number; readonly width: number; readonly height: number };

const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];

/** The passes the rows of a PNG come in, those of an interlaced picture that hold no pixel left out. */
export function passesOf(width: number, height: number, interlaced: boolean): Pass[] {
  if (!interlaced) return [{ x0: 0, y0: 0, dx: 1, dy: 1, width, height }];
  return ADAM7.map(([x0, y0, dx, dy]) => ({ x0, y0, dx, dy, width: Math.ceil((width - x0) / dx), height: Math.ceil((height - y0) / dy) })).filter(
    (pass) => pass.width > 0 && pass.height > 0,
  );
}

function paeth(left: number, up: number, corner: number): number {
  const estimate = left + up - corner;
  const [a, b, c] = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - corner)];
  return a <= b && a <= c ? left : b <= c ? up : corner;
}

export type Unfiltered = { readonly rows: Uint8Array; readonly stride: number; readonly end: number };

/**
 * The rows of a pass with their filters undone, read from `raw` at `start`, and where the next pass starts; null where
 * the data runs short or a row names no filter PNG defines.
 */
export function unfilterPass(raw: Uint8Array, start: number, pass: Pass, bitsPerPixel: number): Unfiltered | null {
  const stride = Math.ceil((pass.width * bitsPerPixel) / 8);
  const step = Math.max(1, bitsPerPixel >> 3);
  const rows = new Uint8Array(stride * pass.height);
  let at = start;
  for (let y = 0; y < pass.height; y++) {
    if (at + 1 + stride > raw.length) return null;
    const filter = raw[at++];
    if (filter > 4) return null;
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= step ? rows[row + x - step] : 0;
      const up = y > 0 ? rows[row - stride + x] : 0;
      const corner = x >= step && y > 0 ? rows[row - stride + x - step] : 0;
      const predicted = filter === 1 ? left : filter === 2 ? up : filter === 3 ? (left + up) >> 1 : filter === 4 ? paeth(left, up, corner) : 0;
      rows[row + x] = (raw[at + x] + predicted) & 0xff;
    }
    at += stride;
  }
  return { rows, stride, end: at };
}
