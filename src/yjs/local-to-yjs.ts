import { blockById } from '../engine/model/doc';
import { sliceInline } from '../engine/model/inline';
import type { EngineBlock, EngineDoc, Inline, Mark } from '../engine/model/types';
import type { Step } from '../engine/transform/step';
import { attrsMap } from './doc-shape';
import { regionOf } from './layout';
import { markAttribute } from './marks-codec';
import { deleteContent, formatContent, insertContent, type Shared } from './shared';
import { syncBlock } from './sync-block';
import { syncDocs } from './sync-docs';
import { writeJoin, writeSplit } from './split-join';
import { insertBlocks, removeBlock } from './write-blocks';

type Params = Readonly<Record<string, unknown>>;
type Context = { shared: Shared; before: EngineDoc; after: EngineDoc; params: Params };
type Writer = (context: Context) => void;

const region = ({ shared, params }: Context) =>
  regionOf(shared.layout, params.block as string, params.region as string);
const following = (doc: EngineDoc, id: string) => doc.blocks[doc.index.get(id)! + 1]?.id ?? null;

function replaceInline(context: Context): void {
  const { from, to, slice } = context.params as { from: number; to: number; slice: Inline };
  const target = region(context);
  deleteContent(context.shared, target, from, to);
  insertContent(context.shared, target, from, slice);
}

function format(context: Context, keys: (inline: Inline) => Record<string, unknown>): void {
  type Span = { block: string; region: string; from: number; to: number };
  const { block, region: name, from, to } = context.params as Span;
  if (to === from) return;
  const inline = blockById(context.before, block)!.regions[name];
  formatContent(context.shared, region(context), from, to, keys(sliceInline(inline, from, to)));
}

function removedKeys(mark: Mark | string, inline: Inline): Record<string, null> {
  if (typeof mark !== 'string') return { [markAttribute(mark)[0]]: null };
  const marks = inline.flatMap((node) => node.marks.filter((candidate) => candidate.type === mark));
  return Object.fromEntries(marks.map((found) => [markAttribute(found)[0], null]));
}

function setAttrs({ shared, after, params }: Context): void {
  const id = params.block as string;
  const { map } = shared.layout.entries.get(id)!;
  const next = blockById(after, id)!.attrs;
  const attrs = attrsMap(map, next);
  if (attrs === null) return;
  for (const key of Object.keys(params.patch as Params)) {
    if (next[key] === undefined) attrs.delete(key);
    else attrs.set(key, next[key]);
  }
}

function moveBlocks({ shared, before, after, params }: Context): void {
  const { from, count, to } = params as { from: number; count: number; to: number };
  if (count === 0 || from === to) return;
  const moved = before.blocks.slice(from, from + count);
  for (const block of moved) removeBlock(shared, block.id);
  insertBlocks(shared, after.blocks[to + count]?.id ?? null, moved);
}

const WRITERS: Readonly<Record<string, Writer>> = {
  replaceInline,
  addMark: (context) => format(context, () => Object.fromEntries([markAttribute(context.params.mark as Mark)])),
  removeMark: (context) => format(context, (inline) => removedKeys(context.params.mark as Mark | string, inline)),
  setAttrs,
  setIndent: ({ shared, params }) =>
    shared.layout.entries.get(params.block as string)!.map.set('indent', params.indent),
  insertBlocks: ({ shared, before, params }) =>
    insertBlocks(shared, before.blocks[params.index as number]?.id ?? null, params.blocks as EngineBlock[]),
  removeBlocks: ({ shared, before, params }) => {
    const { index, count } = params as { index: number; count: number };
    for (const block of before.blocks.slice(index, index + count)) removeBlock(shared, block.id);
  },
  moveBlocks,
  splitBlock: (context) => {
    if (!writeSplit(context.shared, context.after, context.params as Parameters<typeof writeSplit>[2])) {
      syncDocs(context.shared, context.before, context.after);
    }
  },
  joinBlocks: (context) => {
    if (!writeJoin(context.shared, context.after, context.params as Parameters<typeof writeJoin>[2])) {
      syncDocs(context.shared, context.before, context.after);
    }
  },
  replaceBlock: ({ shared, before, params }) => {
    const block = params.block as EngineBlock;
    syncBlock(shared, blockById(before, block.id)!, block, following(before, block.id));
  },
};

/**
 * Writes the steps of a local transaction into the shared text, `docs` holding the document before each step and the
 * one after the last. A step of a kind it does not know is written as the difference it made.
 */
export function writeLocalSteps(shared: Shared, steps: readonly Step[], docs: readonly EngineDoc[]): void {
  steps.forEach((step, i) => {
    const [before, after] = [docs[i], docs[i + 1]];
    const writer = WRITERS[step.stepType];
    if (writer === undefined) syncDocs(shared, before, after);
    else writer({ shared, before, after, params: step.toJSON() });
  });
}
