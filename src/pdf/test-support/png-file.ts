import { crc32, deflateSync } from 'node:zlib';

export type PngSpec = {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly color: 0 | 2 | 3 | 4 | 6;
  /** Each row's bytes as the PNG packs them, before filtering. */
  readonly rows: readonly (readonly number[])[];
  readonly filter?: 0 | 1 | 2 | 3 | 4;
  readonly palette?: readonly number[];
  readonly transparency?: readonly number[];
  readonly interlaced?: boolean;
};

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];

const u32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];

function chunk(type: string, data: readonly number[]): number[] {
  const body = [...type].map((char) => char.charCodeAt(0)).concat(data);
  return [...u32(data.length), ...body, ...u32(crc32(Uint8Array.from(body)))];
}

function paeth(left: number, up: number, corner: number): number {
  const estimate = left + up - corner;
  const [a, b, c] = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - corner)];
  return a <= b && a <= c ? left : b <= c ? up : corner;
}

function filtered(rows: readonly (readonly number[])[], filter: number, step: number): number[] {
  return rows.flatMap((row, y) => {
    const above = y > 0 ? rows[y - 1] : row.map(() => 0);
    const out = row.map((byte, x) => {
      const left = x >= step ? row[x - step] : 0;
      const corner = x >= step ? above[x - step] : 0;
      const predicted = [0, left, above[x], Math.floor((left + above[x]) / 2), paeth(left, above[x], corner)][filter];
      return (byte - predicted) & 0xff;
    });
    return [filter, ...out];
  });
}

// Interlaced files are written for eight bit samples only, each pass cut out of the whole rows.
function passes(spec: PngSpec, step: number): number[] {
  return ADAM7.flatMap(([x0, y0, dx, dy]) => {
    const rows: number[][] = [];
    for (let y = y0; y < spec.height; y += dy) {
      const row: number[] = [];
      for (let x = x0; x < spec.width; x += dx) row.push(...spec.rows[y].slice(x * step, (x + 1) * step));
      if (row.length > 0) rows.push(row);
    }
    return filtered(rows, spec.filter ?? 0, step);
  });
}

/** A PNG file of the given rows, filtered and, if asked, interlaced, as an encoder writes one. */
export function pngFile(spec: PngSpec): Uint8Array {
  const step = Math.max(1, (CHANNELS[spec.color] * spec.depth) / 8);
  const header = [...u32(spec.width), ...u32(spec.height), spec.depth, spec.color, 0, 0, spec.interlaced ? 1 : 0];
  const raw = spec.interlaced ? passes(spec, step) : filtered(spec.rows, spec.filter ?? 0, step);
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk('IHDR', header),
    ...(spec.palette ? chunk('PLTE', spec.palette) : []),
    ...(spec.transparency ? chunk('tRNS', spec.transparency) : []),
    ...chunk('IDAT', [...deflateSync(Uint8Array.from(raw))]),
    ...chunk('IEND', []),
  ]);
}
