import * as Y from 'yjs';
import { blockById } from '../engine/model/doc';
import { sameValue } from '../engine/model/same-value';
import type { EngineDoc } from '../engine/model/types';
import { replaceBlockStep } from '../engine/transform/block-steps';
import type { Step } from '../engine/transform/step';
import { indexOf, placeEntries, spanAt, spanStart, type Entry, type Layout } from './layout';
import { adopted, crossesStray, isPlain } from './plain';
import { reader } from './read-shared';
import type { Shared } from './shared';
import type { DeltaOp } from './text-steps';

type Reader = ReturnType<typeof reader>;

/**
 * The entries of the blocks whose spans a change of the shared text puts something in or takes something out of, by
 * marker, found in the layout before it; null when it puts in, takes out or formats anything else.
 */
export function touchedEntries(layout: Layout, delta: readonly DeltaOp[]): Map<Y.Map<unknown>, Entry> | null {
  const touched = new Map<Y.Map<unknown>, Entry>();
  let at = 0;
  for (const op of delta) {
    const length = op.retain ?? op.delete ?? 0;
    if (op.insert instanceof Y.Map || (op.retain && op.attributes)) return null;
    if (op.retain === undefined) {
      const span = spanAt(layout, at, op.insert === undefined);
      const start = spanStart(layout, span);
      if (span.entry === null || start === at || at + length > start + span.length) return null;
      touched.set(span.entry.map, span.entry);
    }
    at += length;
  }
  return touched;
}

// Gives each reader what Y.Text.toDelta gives from its marker to the next, walking the items as toDelta does with the
// formatting in force from the start of the text, without building the delta of the whole text.
function readSpans(text: Y.Text, readers: ReadonlyMap<unknown, Reader>): void {
  const attributes = new Map<string, unknown>();
  let read: Reader | undefined;
  for (let item = text._start; item !== null; item = item.right) {
    const { content } = item;
    if (item.deleted) continue;
    if (content instanceof Y.ContentFormat) {
      if (content.value === null) attributes.delete(content.key);
      else attributes.set(content.key, content.value);
    } else {
      const insert = content instanceof Y.ContentString ? content.str : content.getContent()[0];
      if (insert instanceof Y.Map) read = readers.get(insert);
      read?.read({ insert, attributes: Object.fromEntries(attributes) });
    }
  }
}

/**
 * The steps that replace each block of `entries`, by marker, by what the shared text now holds from its marker to the
 * next, with the layout moved on; null when one of them was not held plainly, or now reads characters into another block.
 */
export function readBlocks(shared: Shared, entries: ReadonlyMap<Y.Map<unknown>, Entry>, doc: EngineDoc): Step[] | null {
  const { layout } = shared;
  const readers = new Map<unknown, Reader>();
  for (const [map, entry] of entries) {
    if (!isPlain(entry)) return null;
    readers.set(map, reader(shared.required));
  }
  readSpans(shared.text, readers);
  const steps: Step[] = [];
  for (const [map, entry] of entries) {
    const { doc: one, layout: own } = readers.get(map)!.finish();
    const next = own.spans[1].entry!;
    const at = indexOf(layout, entry.span);
    // Characters before the first region start of a span are read into a region of another block, and characters
    // outside any region elsewhere may be read into this one once it has other regions.
    if (crossesStray(own, 1) || crossesStray(layout, at)) return null;
    placeEntries(layout, at, 1, [adopted(entry, next)]);
    if (!sameValue(blockById(doc, entry.id), one.blocks[0])) steps.push(replaceBlockStep(one.blocks[0]));
  }
  return steps;
}
