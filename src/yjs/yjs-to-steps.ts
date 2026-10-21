import * as Y from 'yjs';
import { blockById, createDoc } from '../engine/model/doc';
import type { EngineDoc } from '../engine/model/types';
import { setAttrsStep, setIndentStep } from '../engine/transform/attrs-steps';
import { replaceBlockStep } from '../engine/transform/block-steps';
import { replaceDocStep } from '../engine/transform/replace-doc-step';
import type { Step } from '../engine/transform/step';
import { attrsOf, fromYBlock, idOf, regionsOf, type YBlock, type YBlocks } from './doc-shape';
import { deltaSteps, type DeltaOp } from './delta-steps';
import { structureSteps } from './structure-steps';
import { uniqueBlocks } from './unique-blocks';

type Change = { block: YBlock; steps: Step[]; replace: boolean };
type YType = Y.AbstractType<unknown>;
type YEvent = Y.YEvent<YType>;

function owner(blocks: YBlocks, target: YType): YBlock {
  let type = target;
  while (type.parent !== blocks) type = type.parent!;
  return type as YBlock;
}

const onlyIndent = (event: YEvent) =>
  event instanceof Y.YMapEvent && [...event.keysChanged].every((key) => key === 'indent');

function regionName(block: YBlock, target: unknown): string {
  for (const [name, region] of regionsOf(block).entries()) if (region === target) return name;
  return '';
}

function record(change: Change, event: YEvent): void {
  const { block } = change;
  const id = idOf(block);
  const attrs = attrsOf(block);
  if (event.target === attrs && event instanceof Y.YMapEvent) {
    const patch = Object.fromEntries([...event.keysChanged].map((key) => [key, attrs.get(key)]));
    change.steps.push(setAttrsStep(id, patch));
  } else if (event instanceof Y.YTextEvent) {
    change.steps.push(...deltaSteps(id, regionName(block, event.target), event.delta as DeltaOp[]));
  } else if (event.target === block && onlyIndent(event)) {
    change.steps.push(setIndentStep(id, block.get('indent') as number));
  } else {
    change.replace = true;
  }
}

function contentSteps(
  events: readonly YEvent[],
  blocks: YBlocks,
  doc: EngineDoc,
  kept: ReadonlySet<YBlock> | null,
): Step[] {
  const changes = new Map<YBlock, Change>();
  for (const event of events) {
    if (event.target === blocks) continue;
    const block = owner(blocks, event.target);
    if (kept?.has(block) === false || blockById(doc, idOf(block)) === undefined) continue;
    const change = changes.get(block) ?? { block, steps: [], replace: false };
    changes.set(block, change);
    record(change, event);
  }
  return [...changes.values()].flatMap(({ block, steps, replace }) =>
    replace ? [replaceBlockStep(fromYBlock(block))] : steps,
  );
}

function insertedBlocks(event: YEvent): Set<YBlock> {
  return new Set([...event.changes.added].flatMap((item) => item.content.getContent() as YBlock[]));
}

/**
 * The engine steps of a change to the shared array, against the editor's document `doc`, which held what the array
 * held before it, and the indexes of block copies the array now holds twice. Content changes are found by block id;
 * when the array itself changed, its order is compared with the document's. Steps that do not apply to the document
 * give way to a replacement of the whole document.
 */
export function stepsFromYjs(
  events: readonly YEvent[],
  blocks: YBlocks,
  doc: EngineDoc,
): { steps: Step[]; copies: number[] } {
  const root = events.find((event) => event.target === blocks);
  const { kept, copies } = root === undefined ? { kept: [], copies: [] } : uniqueBlocks(blocks);
  try {
    const steps = contentSteps(events, blocks, doc, root === undefined ? null : new Set(kept));
    const changed = steps.reduce((current, step) => step.apply(current).doc, doc);
    if (root === undefined) return { steps, copies };
    return { steps: [...steps, ...structureSteps(changed, kept, insertedBlocks(root))], copies };
  } catch {
    const all = root === undefined ? uniqueBlocks(blocks) : { kept, copies };
    return { steps: [replaceDocStep(createDoc(all.kept.map(fromYBlock)))], copies: all.copies };
  }
}
