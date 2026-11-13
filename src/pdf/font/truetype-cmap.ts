export type CharacterMap = (codePoint: number) => number;

function format12(view: DataView, at: number): CharacterMap {
  const groups = view.getUint32(at + 12);
  const group = (index: number) => at + 16 + index * 12;
  return (codePoint) => {
    let [low, high] = [0, groups - 1];
    while (low <= high) {
      const middle = (low + high) >> 1;
      const start = view.getUint32(group(middle));
      if (codePoint < start) high = middle - 1;
      else if (codePoint > view.getUint32(group(middle) + 4)) low = middle + 1;
      else return view.getUint32(group(middle) + 8) + codePoint - start;
    }
    return 0;
  };
}

function format4(view: DataView, at: number): CharacterMap {
  const segments = view.getUint16(at + 6) / 2;
  const ends = at + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const ranges = deltas + segments * 2;
  return (codePoint) => {
    if (codePoint > 0xffff) return 0;
    let [low, high] = [0, segments - 1];
    while (low < high) {
      const middle = (low + high) >> 1;
      if (view.getUint16(ends + middle * 2) < codePoint) low = middle + 1;
      else high = middle;
    }
    const start = view.getUint16(starts + low * 2);
    if (start > codePoint || view.getUint16(ends + low * 2) < codePoint) return 0;
    const delta = view.getUint16(deltas + low * 2);
    const range = view.getUint16(ranges + low * 2);
    if (range === 0) return (codePoint + delta) & 0xffff;
    const glyph = view.getUint16(ranges + low * 2 + range + (codePoint - start) * 2);
    return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
  };
}

// The Unicode subtables, a full repertoire before the basic plane: Windows first, then the Unicode platform.
const PREFERRED = [
  [3, 10, 12],
  [0, 4, 12],
  [0, 6, 12],
  [3, 1, 4],
  [0, 3, 4],
  [0, 2, 4],
  [0, 1, 4],
  [0, 0, 4],
] as const;

/** The glyph of each code point through the font's Unicode character map, or null when it has none it can read. */
export function characterMap(view: DataView, cmap: number): CharacterMap | null {
  const count = view.getUint16(cmap + 2);
  const subtables = Array.from({ length: count }, (_, index) => {
    const record = cmap + 4 + index * 8;
    const at = cmap + view.getUint32(record + 4);
    return { platform: view.getUint16(record), encoding: view.getUint16(record + 2), at, format: view.getUint16(at) };
  });
  for (const [platform, encoding, format] of PREFERRED) {
    const found = subtables.find((table) => table.platform === platform && table.encoding === encoding && table.format === format);
    if (found) return format === 12 ? format12(view, found.at) : format4(view, found.at);
  }
  return null;
}
