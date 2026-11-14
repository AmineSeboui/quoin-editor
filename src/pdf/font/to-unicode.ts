const HEADER = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo <</Registry (Adobe) /Ordering (UCS) /Supplement 0>> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
`;

const FOOTER = `endcmap
CMapName currentdict /CMap defineresource pop
end
end
`;

// A CMap section holds at most a hundred mappings.
const SECTION = 100;

const hex4 = (unit: number) => unit.toString(16).toUpperCase().padStart(4, '0');

function utf16(codePoint: number): string {
  const text = String.fromCodePoint(codePoint);
  return Array.from({ length: text.length }, (_, at) => hex4(text.charCodeAt(at))).join('');
}

/** The CMap that maps each glyph a font drew back to its character, so a reader can copy and search the text. */
export function toUnicodeCMap(used: ReadonlyMap<number, number>): string {
  const pairs = [...used].sort(([a], [b]) => a - b).map(([glyph, codePoint]) => `<${hex4(glyph)}> <${utf16(codePoint)}>`);
  let sections = '';
  for (let at = 0; at < pairs.length; at += SECTION) {
    const chunk = pairs.slice(at, at + SECTION);
    sections += `${chunk.length} beginbfchar\n${chunk.join('\n')}\nendbfchar\n`;
  }
  return HEADER + sections + FOOTER;
}
