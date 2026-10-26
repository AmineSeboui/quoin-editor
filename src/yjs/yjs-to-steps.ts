import type * as Y from 'yjs';
import { blockById, createDoc } from '../engine/model/doc';
import { sameDoc } from '../engine/model/same-doc';
import { sameValue } from '../engine/model/same-value';
import type { EngineDoc } from '../engine/model/types';
import { setAttrsStep, setIndentStep } from '../engine/transform/attrs-steps';
import { replaceBlockStep } from '../engine/transform/block-steps';
import { replaceDocStep } from '../engine/transform/replace-doc-step';
import type { Step } from '../engine/transform/step';
import { readMarker } from './doc-shape';
import { readShared } from './read-shared';
import { splitOrJoin } from './read-split-join';
import type { Shared } from './shared';
import { textSteps, type DeltaOp } from './text-steps';

type YEvent = Y.YEvent<Y.AbstractType<unknown>>;

const REREAD = new Error('reread');

// A change to a block's marker map or to its attrs map, as a step on that block; none for a marker no block holds.
function markerSteps(shared: Shared, event: YEvent, doc: EngineDoc): Step[] {
  const target = event.target as Y.Map<unknown>;
  const marker = (target.parent === shared.text ? target : target.parent) as Y.Map<unknown>;
  const fields = readMarker(marker);
  const block = fields === null ? undefined : blockById(doc, fields.id);
  if (block === undefined || shared.layout.entries.get(block.id)?.map !== marker) return [];
  const keys = [...(event as Y.YMapEvent<unknown>).keysChanged];
  if (target !== marker) {
    if (fields!.attrs !== target) return [];
    return [setAttrsStep(block.id, Object.fromEntries(keys.map((key) => [key, target.get(key)])))];
  }
  if (keys.includes('id')) throw REREAD;
  if (keys.every((key) => key === 'indent')) return [setIndentStep(block.id, fields!.indent)];
  const { type, indent } = fields!;
  const attrs = fields!.attrs?.toJSON() ?? {};
  // A region read as empty for the old type, or one the new type needs, changes how the block's regions are read.
  const empty = shared.layout.entries.get(block.id)!.regions.some((region) => region.segs.length === 0);
  if (empty || shared.required(type, attrs).some((name) => !Object.hasOwn(block.regions, name))) throw REREAD;
  return [replaceBlockStep({ ...block, type, indent, attrs })];
}

function contentSteps(shared: Shared, events: readonly YEvent[], doc: EngineDoc): Step[] {
  const textEvent = events.find((event) => event.target === shared.text);
  const delta = (textEvent?.delta ?? []) as DeltaOp[];
  const structure = splitOrJoin(shared.layout, delta, doc, shared.required);
  const steps = structure === null ? textSteps(shared.layout, delta) : [structure];
  if (steps === null) throw REREAD;
  let current = steps.reduce((changed, step) => step.apply(changed).doc, doc);
  for (const event of events) {
    if (event === textEvent) continue;
    for (const step of markerSteps(shared, event, current)) {
      current = step.apply(current).doc;
      steps.push(step);
    }
  }
  return steps;
}

/**
 * The engine steps of a change to the shared text, against the editor's document `doc`, which is what the text read
 * as before it, with the layout moved on. A change to the characters of regions, a split, a join or a change of a
 * block's marker is read as its own steps; anything else is read as one replacement of the document, which keeps the
 * blocks the change left alone, and is `structural`.
 */
export function readRemote(
  shared: Shared,
  events: readonly YEvent[],
  doc: EngineDoc,
): { steps: Step[]; structural: boolean } {
  try {
    return { steps: contentSteps(shared, events, doc), structural: false };
  } catch {
    const read = readShared(shared.text, shared.required);
    shared.layout = read.layout;
    const blocks = read.doc.blocks.map((block) => {
      const held = blockById(doc, block.id);
      return held !== undefined && sameValue(held, block) ? held : block;
    });
    const next = createDoc(blocks);
    return { steps: sameDoc(next, doc) ? [] : [replaceDocStep(next)], structural: true };
  }
}
