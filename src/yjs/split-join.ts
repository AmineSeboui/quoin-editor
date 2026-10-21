import { blockById } from '../engine/model/doc';
import type { EngineDoc } from '../engine/model/types';
import { deleteText, markerOf, writeBlock } from './doc-shape';
import { cleanEntry, indexOf, placeEntries, pointOf, spanStart } from './layout';
import { isPlain, rewritten } from './plain';
import { dropSpans } from './write-blocks';
import { reread, type Shared } from './shared';

type Split = { block: string; region: string; offset: number; created: { id: string; region: string } };
type Join = { target: string; targetRegion: string; source: string; sourceRegion: string };

/**
 * Writes a split as a marker put in at the split point, so the characters after it, and whatever anyone types among
 * them meanwhile, become the new block's. Only a split of a block's last region into the new block's last region can
 * be written so; for any other it returns false. Over a block the text does not hold plainly it re-reads the text.
 */
export function writeSplit(shared: Shared, after: EngineDoc, { block, region, offset, created }: Split): boolean {
  const { layout, text } = shared;
  const entry = layout.entries.get(block)!;
  const tail = blockById(after, created.id)!;
  const last = entry.regions[entry.regions.length - 1];
  if (last.name !== region || Object.keys(tail.regions).at(-1) !== created.region) return false;
  const { seg, rel } = pointOf(last, offset);
  const map = markerOf(tail);
  writeBlock(text, spanStart(layout, seg.host) + rel, tail, map, created.region);
  if (!isPlain(entry)) {
    reread(shared);
    return true;
  }
  const head = rewritten(entry, blockById(after, block)!);
  placeEntries(layout, indexOf(layout, entry.span), 1, [head, cleanEntry(tail, map)]);
  return true;
}

/**
 * Writes a join as the second block's marker and region start taken out, so its characters, and whatever anyone types
 * among them meanwhile, flow into the region before. Only a join of the second block's first region onto the first
 * block's last region can be written so; for any other it returns false. Unless both blocks are plain, it re-reads the
 * text.
 */
export function writeJoin(shared: Shared, after: EngineDoc, join: Join): boolean {
  const { target, targetRegion, source, sourceRegion } = join;
  const { layout, text } = shared;
  const [into, from] = [target, source].map((id) => layout.entries.get(id)!);
  if (into.regions.at(-1)?.name !== targetRegion || from.regions[0]?.name !== sourceRegion) return false;
  // A copy of the second block left behind would be read as that block once its marker is gone, and a stretch nobody
  // reads between the two blocks would swallow the characters that flow into the first.
  const between = layout.spans.slice(indexOf(layout, into.span) + 1, indexOf(layout, from.span));
  dropSpans(shared, [...from.copies, ...between]);
  const start = spanStart(layout, from.span);
  if (!isPlain(into) || !isPlain(from)) {
    const own = from.regions[0].segs.find((seg) => seg.host === from.span)!;
    deleteText(text, start + own.at - 1, 1);
    deleteText(text, start, 1);
    reread(shared);
    return true;
  }
  const index = indexOf(layout, into.span);
  const moved = from.regions[0].segs[0].length;
  const rest = from.span.length - 2 - moved;
  if (rest > 0) deleteText(text, start + 2 + moved, rest);
  deleteText(text, start, 2);
  placeEntries(layout, index, 2, [rewritten(into, blockById(after, target)!)]);
  return true;
}
