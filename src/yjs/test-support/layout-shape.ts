import { spanStart, type Layout } from '../layout';
import { isPlain } from '../plain';

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

/** Whether the text holds exactly the blocks of a layout, each as a client writes one, and nothing else. */
export const heldPlainly = ({ spans }: Layout) =>
  spans[0].length === 0 && spans.slice(1).every((span) => span.entry !== null && isPlain(span.entry));
