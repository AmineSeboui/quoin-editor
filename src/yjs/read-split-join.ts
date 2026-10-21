import * as Y from 'yjs';
import { blockById } from '../engine/model/doc';
import type { EngineDoc } from '../engine/model/types';
import { joinBlocksStep, splitBlockStep } from '../engine/transform/split-join-steps';
import type { Step } from '../engine/transform/step';
import { readMarker, regionNameOf } from './doc-shape';
import { cleanEntry, indexOf, offsetIn, placeEntries, spanAt, spanStart, type Layout } from './layout';
import type { DeltaOp } from './text-steps';

const plain = (op: DeltaOp | undefined) => op === undefined || op.attributes === undefined;

// A marker and a region start put in inside the last region of a block, as a split writes them.
function split(layout: Layout, delta: readonly DeltaOp[]): { step: Step; map: Y.Map<unknown> } | null {
  const [at, ops] = delta[0]?.retain === undefined ? [0, delta] : [delta[0].retain, delta.slice(1)];
  const map = ops[0]?.insert;
  const name = regionNameOf(ops[1]?.insert);
  if (ops.length !== 2 || !(map instanceof Y.Map) || name === null || !plain(delta[0])) return null;
  const marker = readMarker(map);
  const span = spanAt(layout, at);
  const region = span.entry?.regions.at(-1);
  const seg = region?.segs[0];
  const rel = at - spanStart(layout, span);
  if (marker === null || seg === undefined || rel < seg.at || rel > seg.at + seg.length) return null;
  const { id, type, indent, attrs } = marker;
  const created = { id, type, indent, attrs: attrs?.toJSON() ?? {}, region: name, regions: {} };
  return { step: splitBlockStep(span.entry!.id, region!.name, offsetIn(seg, rel), created), map };
}

// A block's marker and only region start taken out right after the block before it, as a join takes them.
function join(layout: Layout, delta: readonly DeltaOp[]): Step | null {
  const [at, ops] = delta[0]?.retain === undefined ? [0, delta] : [delta[0].retain, delta.slice(1)];
  if (ops.length !== 1 || ops[0].delete !== 2 || !plain(delta[0])) return null;
  const span = spanAt(layout, at, true);
  const source = span.entry;
  const target = layout.spans[span.index - 1]?.entry ?? null;
  if (spanStart(layout, span) !== at || source === null || target === null) return null;
  if (source.regions.length !== 1 || target.regions.length === 0) return null;
  return joinBlocksStep(target.id, target.regions.at(-1)!.name, source.id, source.regions[0].name);
}

/**
 * The split or join step of a change to a clean shared text that writes one, with the layout moved on to the document
 * after it; null for any other change.
 */
export function splitOrJoin(layout: Layout, delta: readonly DeltaOp[], doc: EngineDoc): Step | null {
  if (!layout.clean) return null;
  const found = split(layout, delta);
  const step = found?.step ?? join(layout, delta);
  if (step === null) return null;
  const after = step.apply(doc).doc;
  const { block, target, created } = step.toJSON() as { block?: string; target?: string; created?: { id: string } };
  const kept = layout.entries.get((block ?? target)!)!;
  const entries = [cleanEntry(blockById(after, kept.id)!, kept.map)];
  if (found !== null) entries.push(cleanEntry(blockById(after, created!.id)!, found.map));
  placeEntries(layout, indexOf(layout, kept.span), found === null ? 2 : 1, entries);
  return step;
}
