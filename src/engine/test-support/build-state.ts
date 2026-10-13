import { createBlockCodec, type BlockCodec } from '../blocks/codec';
import type { Command } from '../commands/command';
import { createDoc, requireBlockIndex } from '../model/doc';
import { normalizeInline, text } from '../model/inline';
import type { QuoinBlock } from '../model/quoin-block';
import type { EngineBlock, EngineDoc, Pos, Selection } from '../model/types';
import { createSchema } from '../schema/create-schema';
import type { Schema } from '../schema/types';
import { applyTransaction, createState, type EditorState } from '../state/editor-state';
import type { PluginSpec } from '../state/plugin';
import { blockRangeSelection, nodeSelection, primaryRegion, textSelection } from '../state/selection';
import type { Transaction } from '../state/transaction';

export type Caret = { block: number; offset: number; region?: string };
export type SelectionSpec = Caret | { anchor: Caret; head: Caret } | { node: number } | { blocks: [number, number] };
type Entry = string | QuoinBlock | { paragraph: string };

export function newIds(prefix = 'n'): () => string {
  let next = 0;
  return () => `${prefix}${next++}`;
}

function engineBlocks(entry: Entry, id: string, codec: BlockCodec): EngineBlock[] {
  if (typeof entry === 'string') return codec.toEngineBlocks({ id, type: 'MARKDOWN', data: { markdown: entry } });
  if ('paragraph' in entry) {
    const regions = { text: normalizeInline([text(entry.paragraph)]) };
    return [{ id, type: 'MARKDOWN', indent: 0, attrs: { kind: 'paragraph' }, regions }];
  }
  return codec.toEngineBlocks({ ...entry, id });
}

function toPos(doc: EngineDoc, schema: Schema, caret: Caret): Pos {
  const block = doc.blocks[caret.block];
  return { block: block.id, region: caret.region ?? primaryRegion(schema, block) ?? '', offset: caret.offset };
}

function toSelection(doc: EngineDoc, schema: Schema, spec: SelectionSpec): Selection {
  const id = (index: number) => doc.blocks[index].id;
  if ('node' in spec) return nodeSelection(id(spec.node));
  if ('blocks' in spec) return blockRangeSelection(id(spec.blocks[0]), id(spec.blocks[1]));
  if ('anchor' in spec) return textSelection(toPos(doc, schema, spec.anchor), toPos(doc, schema, spec.head));
  return textSelection(toPos(doc, schema, spec));
}

export function buildState(
  blocks: readonly Entry[],
  selection?: SelectionSpec | null,
  options: { plugins?: readonly PluginSpec<unknown>[]; schema?: Schema; time?: number } = {},
): EditorState {
  const { time } = options;
  const schema = options.schema ?? createSchema();
  const codec = createBlockCodec(schema, { newId: newIds() });
  const doc = createDoc(
    blocks
      .flatMap((entry, i) => engineBlocks(entry, `b${i}`, codec))
      .map((block, i) => (block.id === `b${i}` ? block : { ...block, id: `b${i}` })),
  );
  return createState({
    doc,
    schema,
    selection: selection ? toSelection(doc, schema, selection) : selection,
    plugins: options.plugins,
    clock: time === undefined ? undefined : () => time,
  });
}

export function blocksOf(state: EditorState): QuoinBlock[] {
  return createBlockCodec(state.schema).blocksFromDoc(state.doc);
}

export function markdownOf(state: EditorState): string[] {
  const codec = createBlockCodec(state.schema);
  return state.doc.blocks.map((block) => {
    const line = block.type === 'MARKDOWN' ? String(codec.toQuoin(block).data.markdown) : `<${block.type}>`;
    return '  '.repeat(block.indent) + line;
  });
}

export function caretOf(state: EditorState): SelectionSpec | null {
  const { doc, schema, selection } = state;
  if (selection === null) return null;
  const index = (id: string) => requireBlockIndex(doc, id);
  const caret = (pos: Pos): Caret => {
    const block = index(pos.block);
    const base = { block, offset: pos.offset };
    return pos.region === primaryRegion(schema, doc.blocks[block]) ? base : { ...base, region: pos.region };
  };
  if (selection.kind === 'node') return { node: index(selection.block) };
  if (selection.kind === 'blocks') return { blocks: [index(selection.anchor), index(selection.head)] };
  const { anchor, head } = selection;
  const collapsed = anchor.block === head.block && anchor.region === head.region && anchor.offset === head.offset;
  return collapsed ? caret(anchor) : { anchor: caret(anchor), head: caret(head) };
}

export function run(
  state: EditorState,
  command: Command,
): { ok: boolean; state: EditorState; tr: Transaction | null } {
  let current = state;
  let last: Transaction | null = null;
  const ok = command(state, (tr) => {
    current = applyTransaction(current, tr);
    last = tr;
  });
  return { ok, state: current, tr: last };
}
