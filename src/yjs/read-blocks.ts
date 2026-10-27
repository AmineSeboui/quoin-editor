import * as Y from 'yjs';
import { blockById } from '../engine/model/doc';
import { sameValue } from '../engine/model/same-value';
import type { EngineDoc } from '../engine/model/types';
import { replaceBlockStep } from '../engine/transform/block-steps';
import type { Step } from '../engine/transform/step';
import { indexOf, placeEntries, spanAt, spanStart, type Entry, type Layout } from './layout';
import { adopted, crossesStray, isPlain } from './plain';
import { reader, readItems } from './read-shared';
import type { Shared } from './shared';
import type { DeltaOp } from './text-steps';

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

/**
 * The steps that replace each block of `entries`, by marker, by what the shared text now holds from its marker to the
 * next, with the layout moved on; null when one of them was not held plainly, or now reads characters into another block.
 */
export function readBlocks(shared: Shared, entries: ReadonlyMap<Y.Map<unknown>, Entry>, doc: EngineDoc): Step[] | null {
  const { layout } = shared;
  const readers = new Map<unknown, ReturnType<typeof reader>>();
  for (const [map, entry] of entries) {
    if (!isPlain(entry)) return null;
    readers.set(map, reader(shared.required));
  }
  readItems(shared.text, (marker) => readers.get(marker));
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
