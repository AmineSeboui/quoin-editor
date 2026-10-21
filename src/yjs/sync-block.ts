import * as Y from 'yjs';
import { equalInline, inlineLength } from '../engine/model/inline';
import { sameValue } from '../engine/model/same-value';
import type { BlockAttrs, EngineBlock, Inline } from '../engine/model/types';
import { definedEntries, deleteText, regionStart } from './doc-shape';
import { insertInline } from './inline-codec';
import { changedSpan } from './inline-span';
import { cleanEntry, indexOf, placeEntries, spanStart, type Entry } from './layout';
import { deleteContent, insertContent, type Shared } from './shared';
import { insertBlocks, removeBlock } from './write-blocks';

function syncAttrs(map: Y.Map<unknown>, before: BlockAttrs, after: BlockAttrs): void {
  const current = map.get('attrs');
  if (!(current instanceof Y.Map)) {
    map.set('attrs', new Y.Map<unknown>(definedEntries(after)));
    return;
  }
  const kept = new Map(definedEntries(after));
  for (const key of [...current.keys()]) if (!kept.has(key)) current.delete(key);
  for (const [key, value] of kept) if (!sameValue(before[key], value)) current.set(key, value);
}

// The names of `after` that keep their region: those `before` has too, taken in the order both hold them.
function keptNames(before: readonly string[], after: readonly string[]): Set<string> {
  const kept = new Set<string>();
  let from = 0;
  for (const name of after) {
    const at = before.indexOf(name, from);
    if (at < 0) continue;
    kept.add(name);
    from = at + 1;
  }
  return kept;
}

// Rewrites the regions of a cleanly written block in one pass: a region both versions keep has its characters
// changed where they differ, a region gone is taken out and a new one is written in its place.
function syncRegions(shared: Shared, entry: Entry, before: EngineBlock, after: EngineBlock): void {
  const { text, layout } = shared;
  const names = Object.keys(after.regions);
  const kept = keptNames(Object.keys(before.regions), names);
  const queue = Object.entries(before.regions);
  let at = spanStart(layout, entry.span) + 1;
  const dropGone = () => {
    while (queue.length > 0 && !kept.has(queue[0][0])) deleteText(text, at, 1 + inlineLength(queue.shift()![1]));
  };
  for (const name of names) {
    dropGone();
    const inline: Inline = after.regions[name];
    if (kept.has(name)) {
      const { from, to, slice } = changedSpan(queue.shift()![1], inline);
      if (to > from) deleteText(text, at + 1 + from, to - from);
      insertInline(text, at + 1 + from, slice);
    } else {
      text.insertEmbed(at, regionStart(name), {});
      insertInline(text, at + 1, inline);
    }
    at += 1 + inlineLength(inline);
  }
  dropGone();
  placeEntries(layout, indexOf(layout, entry.span), 1, [cleanEntry(after, entry.map)]);
}

/**
 * Writes the difference between two versions of one block in place, keeping its marker; `next` is the block after it.
 * Over a layout that is not clean, a block whose regions change is written again whole.
 */
export function syncBlock(shared: Shared, before: EngineBlock, after: EngineBlock, next: string | null): void {
  if (before === after) return;
  const entry = shared.layout.entries.get(before.id)!;
  if (!shared.layout.clean && !sameValue(Object.keys(before.regions), Object.keys(after.regions))) {
    removeBlock(shared, before.id);
    insertBlocks(shared, next, [after]);
    return;
  }
  if (before.type !== after.type) entry.map.set('type', after.type);
  if (before.indent !== after.indent) entry.map.set('indent', after.indent);
  syncAttrs(entry.map, before.attrs, after.attrs);
  if (shared.layout.clean) return syncRegions(shared, entry, before, after);
  for (const region of entry.regions) {
    const was = before.regions[region.name];
    const now = after.regions[region.name];
    if (equalInline(was, now)) continue;
    const { from, to, slice } = changedSpan(was, now);
    deleteContent(shared, region, from, to);
    insertContent(shared, region, from, slice);
  }
}
