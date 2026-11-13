export type TinyFontOptions = {
  /** The characters the font draws, each with its advance in font units. */
  readonly glyphs: readonly (readonly [string, number])[];
  readonly name?: string;
  readonly unitsPerEm?: number;
  readonly cmapFormat?: 4 | 12;
  readonly fsType?: number;
  readonly italicAngle?: number;
};

const u16 = (value: number) => [(value >> 8) & 0xff, value & 0xff];
const u32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
const tagBytes = (tag: string) => [...tag].map((char) => char.charCodeAt(0));

function checksum(bytes: number[]): number {
  let sum = 0;
  for (let at = 0; at < bytes.length; at += 4) sum = (sum + (((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0)) >>> 0;
  return sum;
}

const padded = (bytes: number[]) => [...bytes, ...Array((4 - (bytes.length % 4)) % 4).fill(0)];

function boxGlyph(advance: number): number[] {
  const [left, right, top] = [advance * 0.1, advance * 0.9, 700].map(Math.round);
  const xs = [left, 0, right - left, 0];
  const ys = [0, top, 0, -top];
  return [...u16(1), ...u16(left), ...u16(0), ...u16(right), ...u16(top), ...u16(3), ...u16(0), 1, 1, 1, 1, ...xs.flatMap(u16), ...ys.flatMap(u16)];
}

function cmap(points: readonly number[], format: 4 | 12): number[] {
  if (format === 12) {
    const groups = points.flatMap((point, index) => [...u32(point), ...u32(point), ...u32(index + 1)]);
    const table = [...u16(12), ...u16(0), ...u32(16 + groups.length), ...u32(0), ...u32(points.length), ...groups];
    return [...u16(0), ...u16(1), ...u16(3), ...u16(10), ...u32(12), ...table];
  }
  const ends = [...points, 0xffff];
  const count = ends.length;
  const deltas = [...points.map((point, index) => (index + 1 - point) & 0xffff), 1];
  const search = 2 ** Math.floor(Math.log2(count)) * 2;
  const body = [
    ...u16(count * 2),
    ...u16(search),
    ...u16(Math.log2(search / 2)),
    ...u16(count * 2 - search),
    ...ends.flatMap(u16),
    ...u16(0),
    ...ends.flatMap(u16),
    ...deltas.flatMap(u16),
    ...ends.flatMap(() => u16(0)),
  ];
  const table = [...u16(4), ...u16(body.length + 6), ...u16(0), ...body];
  return [...u16(0), ...u16(1), ...u16(3), ...u16(1), ...u32(12), ...table];
}

function nameTable(name: string): number[] {
  const text = [...name].flatMap((char) => u16(char.charCodeAt(0)));
  return [...u16(0), ...u16(1), ...u16(18), ...u16(3), ...u16(1), ...u16(0x409), ...u16(6), ...u16(text.length), ...u16(0), ...text];
}

/** A TrueType font whose glyphs are boxes, one for each character asked for, written as a font tool would. */
export function tinyFont(options: TinyFontOptions): Uint8Array {
  const { glyphs, name = 'TinyFont-Regular', unitsPerEm = 1000, cmapFormat = 4, fsType = 0, italicAngle = 0 } = options;
  const points = glyphs.map(([char]) => char.codePointAt(0)!);
  const order = points.map((_, index) => index).sort((a, b) => points[a] - points[b]);
  const sorted = order.map((index) => glyphs[index]);
  const advances = [unitsPerEm / 2, ...sorted.map(([, advance]) => advance)];
  const outlines = advances.map((advance, gid) => (gid === 0 ? [] : boxGlyph(advance)));
  const offsets = outlines.reduce<number[]>((all, outline) => [...all, all[all.length - 1] + padded(outline).length], [0]);
  const numGlyphs = advances.length;
  const head = [...u32(0x10000), ...u32(0x10000), ...u32(0), ...u32(0x5f0f3cf5), ...u16(0), ...u16(unitsPerEm), ...Array(16).fill(0)];
  head.push(...u16(0), ...u16(0), ...u16(unitsPerEm), ...u16(700), ...u16(0), ...u16(8), ...u16(2), ...u16(1), ...u16(0));
  const hhea = [...u32(0x10000), ...u16(800), ...u16(-200 & 0xffff), ...u16(0), ...u16(Math.max(...advances)), ...Array(22).fill(0), ...u16(numGlyphs)];
  const maxp = [...u32(0x10000), ...u16(numGlyphs), ...Array(26).fill(0)];
  const os2 = Array(96).fill(0);
  os2.splice(0, 2, ...u16(4));
  os2.splice(8, 2, ...u16(fsType));
  os2.splice(68, 4, ...u16(780), ...u16(-220 & 0xffff));
  os2.splice(88, 2, ...u16(680));
  const post = [...u32(0x30000), ...u32(Math.round(italicAngle * 65536) >>> 0), ...Array(24).fill(0)];
  const tables: [string, number[]][] = [
    ['OS/2', os2],
    ['cmap', cmap(sorted.map(([char]) => char.codePointAt(0)!), cmapFormat)],
    ['glyf', outlines.flatMap(padded)],
    ['head', head],
    ['hhea', hhea],
    ['hmtx', advances.flatMap((advance) => [...u16(advance), ...u16(0)])],
    ['loca', offsets.flatMap(u32)],
    ['maxp', maxp],
    ['name', nameTable(name)],
    ['post', post],
  ];
  const directory = [...u32(0x10000), ...u16(tables.length), ...u16(128), ...u16(3), ...u16(tables.length * 16 - 128)];
  let offset = 12 + tables.length * 16;
  const body: number[] = [];
  for (const [tag, data] of tables) {
    directory.push(...tagBytes(tag), ...u32(checksum(padded(data))), ...u32(offset), ...u32(data.length));
    body.push(...padded(data));
    offset += padded(data).length;
  }
  const font = [...directory, ...body];
  const headAt = 12 + tables.length * 16 + tables.slice(0, 3).reduce((sum, [, data]) => sum + padded(data).length, 0);
  font.splice(headAt + 8, 4, ...u32((0xb1b0afba - checksum(font)) >>> 0));
  return Uint8Array.from(font);
}
