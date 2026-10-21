import { blockById } from '../engine/model/doc';
import type { EngineDoc } from '../engine/model/types';
import { deleteText, markerOf, writeBlock } from './doc-shape';
import { cleanEntry, indexOf, placeEntries, pointOf, spanStart } from './layout';
import type { Shared } from './shared';

type Split = { block: string; region: string; offset: number; created: { id: string; region: string } };
type Join = { target: string; targetRegion: string; source: string; sourceRegion: string };

/**
 * Writes a split as a marker put in at the split point, so the characters after it, and whatever anyone types among
 * them meanwhile, become the new block's. Only a split of a block's last region into the new block's last region can
 * be written so; for any other it returns false.
 */
export function writeSplit(shared: Shared, after: EngineDoc, { block, region, offset, created }: Split): boolean {
  const { layout, text } = shared;
  const entry = layout.entries.get(block)!;
  const tail = blockById(after, created.id)!;
  const last = entry.regions[entry.regions.length - 1];
  if (!layout.clean || last.name !== region || Object.keys(tail.regions).at(-1) !== created.region) return false;
  const { rel } = pointOf(last, offset);
  const map = markerOf(tail);
  writeBlock(text, spanStart(layout, entry.span) + rel, tail, map, created.region);
  const head = cleanEntry(blockById(after, block)!, entry.map);
  placeEntries(layout, indexOf(layout, entry.span), 1, [head, cleanEntry(tail, map)]);
  return true;
}

/**
 * Writes a join as the second block's marker and region start taken out, so its characters, and whatever anyone types
 * among them meanwhile, flow into the region before. Only a join of the second block's first region onto the first
 * block's last region can be written so; for any other it returns false.
 */
export function writeJoin(shared: Shared, after: EngineDoc, join: Join): boolean {
  const { target, targetRegion, source, sourceRegion } = join;
  const { layout, text } = shared;
  const [into, from] = [target, source].map((id) => layout.entries.get(id)!);
  const index = indexOf(layout, into.span);
  const ends = into.regions.at(-1)?.name === targetRegion && from.regions[0]?.name === sourceRegion;
  if (!layout.clean || !ends || indexOf(layout, from.span) !== index + 1) return false;
  const start = spanStart(layout, from.span);
  const moved = from.regions[0].segs[0].length;
  const rest = from.span.length - 2 - moved;
  if (rest > 0) deleteText(text, start + 2 + moved, rest);
  deleteText(text, start, 2);
  placeEntries(layout, index, 2, [cleanEntry(blockById(after, target)!, into.map)]);
  return true;
}
