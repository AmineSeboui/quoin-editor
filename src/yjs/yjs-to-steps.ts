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
  const keys = [...(event as Y.YMapEvent<unknown>).keysChanged];
  // Which spans are read, and as which blocks, depends on the ids of markers.
  if (target === marker && keys.includes('id')) throw REREAD;
  const fields = readMarker(marker);
  const block = fields === null ? undefined : blockById(doc, fields.id);
  if (block === undefined || shared.layout.entries.get(block.id)?.map !== marker) return [];
  if (target !== marker) {
    if (fields!.attrs !== target) return [];
    return [setAttrsStep(block.id, Object.fromEntries(keys.map((key) => [key, target.get(key)])))];
  }
  // How a block's regions are read depends on its type, so a new type reads the block again.
  if (keys.includes('type')) throw REREAD;
  const { indent, attrs } = fields!;
  if (keys.every((key) => key === 'indent')) return [setIndentStep(block.id, indent)];
  return [replaceBlockStep({ ...block, indent, attrs: attrs?.toJSON() ?? {} })];
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
 * blocks the change left alone, and is `structural`. A change that should have been read as steps but did not apply
 * comes with the error it raised, as `failed`.
 */
export function readRemote(
  shared: Shared,
  events: readonly YEvent[],
  doc: EngineDoc,
): { steps: Step[]; structural: boolean; failed?: Error } {
  try {
    return { steps: contentSteps(shared, events, doc), structural: false };
  } catch (error) {
    const read = readShared(shared.text, shared.required);
    shared.layout = read.layout;
    const blocks = read.doc.blocks.map((block) => {
      const held = blockById(doc, block.id);
      return held !== undefined && sameValue(held, block) ? held : block;
    });
    const next = createDoc(blocks);
    const failed = error === REREAD ? undefined : (error as Error);
    return { steps: sameDoc(next, doc) ? [] : [replaceDocStep(next)], structural: true, failed };
  }
}
