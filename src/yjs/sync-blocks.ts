import type * as Y from 'yjs';
import { blockById } from '../engine/model/doc';
import { equalInline } from '../engine/model/inline';
import { sameValue } from '../engine/model/same-value';
import type { EngineBlock, EngineDoc, Inline } from '../engine/model/types';
import { attrsOf, definedEntries, regionsOf, toYBlock, type YBlock, type YBlocks } from './doc-shape';
import { insertInline, toYText } from './inline-codec';
import { changedSpan } from './inline-span';

function syncText(target: Y.Text, before: Inline, after: Inline): void {
  const { from, to, slice } = changedSpan(before, after);
  if (to > from) target.delete(from, to - from);
  insertInline(target, from, slice);
}

function syncAttrs(target: Y.Map<unknown>, before: EngineBlock['attrs'], after: EngineBlock['attrs']): void {
  const kept = new Map(definedEntries(after));
  for (const key of target.keys()) if (!kept.has(key)) target.delete(key);
  for (const [key, value] of kept) if (!sameValue(before[key], value)) target.set(key, value);
}

/** Writes the difference between two versions of one block into its shared map, in place. */
export function syncBlock(target: YBlock, before: EngineBlock, after: EngineBlock): void {
  if (before === after) return;
  if (before.type !== after.type) target.set('type', after.type);
  if (before.indent !== after.indent) target.set('indent', after.indent);
  syncAttrs(attrsOf(target), before.attrs, after.attrs);
  const regions = regionsOf(target);
  for (const name of regions.keys()) if (!Object.hasOwn(after.regions, name)) regions.delete(name);
  for (const [name, inline] of Object.entries(after.regions)) {
    const old = Object.hasOwn(before.regions, name) ? before.regions[name] : undefined;
    if (old === undefined) regions.set(name, toYText(inline));
    else if (!equalInline(old, inline)) syncText(regions.get(name)!, old, inline);
  }
}

/**
 * Writes the difference between two documents into the shared array: blocks gone are removed, blocks out of place are
 * moved as a copy, and blocks kept in place are changed where they differ.
 */
export function syncBlocks(target: YBlocks, before: EngineDoc, after: EngineDoc): void {
  for (let i = before.blocks.length - 1; i >= 0; i--) if (!after.index.has(before.blocks[i].id)) target.delete(i, 1);
  const order = before.blocks.filter((block) => after.index.has(block.id)).map((block) => block.id);
  after.blocks.forEach((block, i) => {
    if (order[i] === block.id) {
      syncBlock(target.get(i), blockById(before, block.id)!, block);
      return;
    }
    const at = order.indexOf(block.id, i);
    if (at > i) {
      target.delete(at, 1);
      order.splice(at, 1);
    }
    target.insert(i, [toYBlock(block)]);
    order.splice(i, 0, block.id);
  });
}
