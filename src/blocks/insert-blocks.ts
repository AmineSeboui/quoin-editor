import {
  insertBlocksStep,
  nodeSelection,
  replaceBlockStep,
  Transaction,
  type BlockAttrs,
  type BlockFlow,
  type Command,
  type EngineBlock,
  type EngineDoc,
  type Inline,
  type Schema,
} from '../engine';
import { specFor } from '../engine/blocks/unknown-spec';
import { createBlock, descendantsEnd, headBlockId, isParagraph, regionLength } from '../engine/commands/block-helpers';
import { primaryRegion, startOf } from '../engine/state/selection';
import { OPEN_EDITOR } from './void/void-editing';

export type NewBlock = {
  /** Kept, except by a first block that takes the place of an empty paragraph and so keeps the paragraph's id. */
  readonly id?: string;
  readonly type: string;
  readonly attrs?: BlockAttrs;
  readonly regions?: Readonly<Record<string, Inline>>;
};

/**
 * Where the writer is left once the blocks are in: at the start of the first one's text, on the first one with its
 * editor opening, on an empty line after the last one, or where they already were.
 */
export type Landing = 'text' | 'editor' | 'line' | 'stay';

const isEmptyParagraph = (schema: Schema, block: EngineBlock): boolean =>
  isParagraph(block) && regionLength(block, primaryRegion(schema, block) ?? '') === 0;

function fresh(schema: Schema, { id, type, attrs, regions }: NewBlock, indent: number): EngineBlock {
  const block = createBlock(schema, type, attrs, indent, id);
  return regions === undefined ? block : { ...block, regions };
}

function landOnLine(tr: Transaction, schema: Schema, index: number, indent: number): void {
  const next = tr.doc.blocks[index];
  const reused = next !== undefined && next.indent === indent && isEmptyParagraph(schema, next);
  const line = reused ? next : createBlock(schema, schema.defaultTextBlock, {}, indent);
  if (!reused) tr.step(insertBlocksStep(index, [line]));
  tr.setSelection(startOf(tr.doc, schema, line.id));
}

function land(tr: Transaction, schema: Schema, landing: Landing, first: EngineBlock, after: number): void {
  if (landing === 'text') tr.setSelection(startOf(tr.doc, schema, first.id));
  if (landing === 'editor') tr.setSelection(nodeSelection(first.id)).setMeta(OPEN_EDITOR, first.id);
  if (landing === 'line') landOnLine(tr, schema, after, first.indent);
}

function anchorIndex(doc: EngineDoc, id: string | null): number | undefined {
  if (id !== null) return doc.index.get(id);
  return doc.blocks.length === 0 ? 0 : undefined;
}

/**
 * Inserts the blocks after the anchor and the blocks nested under it, at its indent, then lands as asked. The anchor
 * defaults to the selection's block, and without one only an empty document takes the blocks. An empty paragraph
 * anchor gives its place to the first block when the writer lands in or on that block, and stays as the line to land
 * on when it lands on a line.
 */
export function insertBlocks(blocks: readonly NewBlock[], landing: Landing, anchorId?: string | null): Command {
  return (state, dispatch) => {
    const { doc, schema } = state;
    const id = anchorId === undefined ? headBlockId(state.selection) : anchorId;
    const index = anchorIndex(doc, id);
    if (index === undefined || blocks.length === 0) return false;
    const anchor: EngineBlock | undefined = id === null ? undefined : doc.blocks[index];
    const created = blocks.map((block) => fresh(schema, block, anchor?.indent ?? 0));
    const tr = new Transaction(state);
    const empty = anchor !== undefined && landing !== 'stay' && isEmptyParagraph(schema, anchor);
    if (empty && landing === 'line') {
      tr.step(insertBlocksStep(index, created)).setSelection(startOf(tr.doc, schema, anchor.id));
    } else if (empty) {
      const [first, ...rest] = created;
      const filled = { ...first, id: anchor.id };
      tr.step(replaceBlockStep(filled));
      if (rest.length > 0) tr.step(insertBlocksStep(index + 1, rest));
      land(tr, schema, landing, filled, index + created.length);
    } else {
      const at = anchor === undefined ? 0 : descendantsEnd(doc, index);
      tr.step(insertBlocksStep(at, created));
      land(tr, schema, landing, created[0], at + created.length);
    }
    dispatch?.(tr);
    return true;
  };
}

function landingFor(flow: BlockFlow, hasEditor: boolean): Landing {
  if (flow === 'text') return 'text';
  return hasEditor ? 'editor' : 'line';
}

/**
 * Inserts one block from a menu where typing can go on: in its text, in its editor, or for a block with neither on an
 * empty line after it.
 */
export function insertBlockToWrite(block: NewBlock, hasEditor: boolean, anchorId?: string): Command {
  return (state, dispatch) => {
    const landing = landingFor(specFor(state.schema, block.type).flow, hasEditor);
    return insertBlocks([block], landing, anchorId)(state, dispatch);
  };
}
