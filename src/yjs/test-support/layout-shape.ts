import { spanStart, type Layout } from '../layout';

/** Where a layout puts each block and the characters of each of its regions, as positions in the whole text. */
export const layoutShape = (layout: Layout) =>
  [...layout.entries.values()]
    .map((entry) => ({
      id: entry.id,
      at: spanStart(layout, entry.span),
      length: entry.span.length,
      regions: entry.regions.map((region) => [
        region.name,
        region.segs.map((seg) => [spanStart(layout, seg.host) + seg.at, seg.length]),
      ]),
    }))
    .sort((a, b) => a.at - b.at);
