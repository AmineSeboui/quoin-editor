import type * as Y from 'yjs';
import { blockById, requireBlockIndex } from '../engine/model/doc';
import { sliceInline } from '../engine/model/inline';
import type { EngineBlock, EngineDoc, Inline, Mark } from '../engine/model/types';
import type { Step } from '../engine/transform/step';
import { attrsOf, regionsOf, toYBlock, type YBlock, type YBlocks } from './doc-shape';
import { insertInline } from './inline-codec';
import { markAttribute } from './marks-codec';
import { syncBlock, syncBlocks } from './sync-blocks';

type Params = Readonly<Record<string, unknown>>;
type Context = { blocks: YBlocks; before: EngineDoc; after: EngineDoc; params: Params };
type Writer = (context: Context) => void;

const blockAt = ({ blocks, before }: Context, id: unknown): YBlock =>
  blocks.get(requireBlockIndex(before, id as string));
const textAt = (context: Context, id: unknown, region: unknown): Y.Text =>
  regionsOf(blockAt(context, id)).get(region as string)!;
const engineBlock = (doc: EngineDoc, id: unknown): EngineBlock => blockById(doc, id as string)!;

function replaceInline(context: Context): void {
  const { block, region, from, to, slice } = context.params as { from: number; to: number; slice: Inline } & Params;
  const target = textAt(context, block, region);
  if (to > from) target.delete(from, to - from);
  insertInline(target, from, slice);
}

function format(context: Context, keys: (inline: Inline) => Record<string, unknown>): void {
  const { block, region, from, to } = context.params as { from: number; to: number } & Params;
  if (to === from) return;
  const inline = engineBlock(context.before, block).regions[region as string];
  textAt(context, block, region).format(from, to - from, keys(sliceInline(inline, from, to)));
}

function removedKeys(mark: Mark | string, inline: Inline): Record<string, null> {
  if (typeof mark !== 'string') return { [markAttribute(mark)[0]]: null };
  const marks = inline.flatMap((node) => node.marks.filter((candidate) => candidate.type === mark));
  return Object.fromEntries(marks.map((found) => [markAttribute(found)[0], null]));
}

function setAttrs(context: Context): void {
  const { block, patch } = context.params as { patch: Params } & Params;
  const attrs = attrsOf(blockAt(context, block));
  const next = engineBlock(context.after, block).attrs;
  for (const key of Object.keys(patch)) {
    if (next[key] === undefined) attrs.delete(key);
    else attrs.set(key, next[key]);
  }
}

function removeBlocks({ blocks, params }: Context): void {
  const { index, count } = params as { index: number; count: number };
  if (count > 0) blocks.delete(index, count);
}

function moveBlocks({ blocks, before, params }: Context): void {
  const { from, count, to } = params as { from: number; count: number; to: number };
  if (count === 0 || from === to) return;
  blocks.delete(from, count);
  blocks.insert(to, before.blocks.slice(from, from + count).map(toYBlock));
}

function splitBlock(context: Context): void {
  const { block, region, offset } = context.params as { offset: number } & Params;
  const target = textAt(context, block, region);
  if (target.length > offset) target.delete(offset, target.length - offset);
  const index = requireBlockIndex(context.before, block as string);
  context.blocks.insert(index + 1, [toYBlock(context.after.blocks[index + 1])]);
}

function joinBlocks(context: Context): void {
  const { target, targetRegion, source, sourceRegion } = context.params;
  const into = textAt(context, target, targetRegion);
  insertInline(into, into.length, engineBlock(context.before, source).regions[sourceRegion as string]);
  context.blocks.delete(requireBlockIndex(context.before, source as string), 1);
}

function replaceBlock(context: Context): void {
  const block = context.params.block as EngineBlock;
  syncBlock(blockAt(context, block.id), engineBlock(context.before, block.id), block);
}

const WRITERS: Readonly<Record<string, Writer>> = {
  replaceInline,
  addMark: (context) => format(context, () => Object.fromEntries([markAttribute(context.params.mark as Mark)])),
  removeMark: (context) => format(context, (inline) => removedKeys(context.params.mark as Mark | string, inline)),
  setAttrs,
  setIndent: (context) => blockAt(context, context.params.block).set('indent', context.params.indent),
  insertBlocks: ({ blocks, params }) =>
    blocks.insert(params.index as number, (params.blocks as EngineBlock[]).map(toYBlock)),
  removeBlocks,
  moveBlocks,
  splitBlock,
  joinBlocks,
  replaceBlock,
};

/**
 * Writes the steps of a local transaction into the shared array, `docs` holding the document before each step and the
 * one after the last. A step of a kind it does not know is written as the difference it made.
 */
export function writeLocalSteps(blocks: YBlocks, steps: readonly Step[], docs: readonly EngineDoc[]): void {
  steps.forEach((step, i) => {
    const [before, after] = [docs[i], docs[i + 1]];
    const writer = WRITERS[step.stepType];
    if (writer === undefined) syncBlocks(blocks, before, after);
    else writer({ blocks, before, after, params: step.toJSON() });
  });
}
