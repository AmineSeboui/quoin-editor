import type { EditorState, EngineBlock, PasteRule } from '../../engine';
import { createBlockCodec } from '../../engine/blocks/codec';
import { sliceFromClipboard } from '../../engine/clipboard/slice-from-clipboard';
import { isTextFlow } from '../../engine/commands/block-helpers';
import { typeOverCells } from '../../engine/commands/cell-commands';
import { pasteCells } from '../../engine/commands/paste-cells';
import { tableBlock } from '../../engine/commands/table-shape';
import { cellSelection } from '../../engine/state/cell-selection';
import { primaryRegion } from '../../engine/state/selection';

type Pasted = Parameters<PasteRule['match']>[2];

type Rich = { readonly blocks: EngineBlock[]; readonly open: boolean };

// What came with the text, as blocks: a paste of text alone is left to the text.
function richBlocks(state: EditorState, pasted: Pasted): Rich | null {
  const slice = pasted?.json || pasted?.html ? sliceFromClipboard({ json: pasted.json, html: pasted.html }) : null;
  if (slice === null) return null;
  const codec = createBlockCodec(state.schema);
  const blocks = slice.blocks.flatMap((block) => codec.toEngineBlocks(block));
  return { blocks, open: slice.openStart && slice.openEnd };
}

// The content of a single line of text pasted with its formatting, which a cell can hold as it is.
function lineOf(state: EditorState, rich: Rich | null) {
  const [only] = rich?.blocks ?? [];
  if (!rich?.open || rich.blocks.length !== 1 || !isTextFlow(state.schema, only)) return undefined;
  return only.regions[primaryRegion(state.schema, only) ?? ''];
}

/**
 * A table pasted into a table, from a cell range of it or from a spreadsheet, fills its cells from the first cell of
 * the selection. Anything else pasted over a cell range replaces the range in its first cell: a line of text keeps its
 * formatting, and more than a line lands as its text.
 */
export const pasteOverCells: PasteRule = {
  name: 'table-cells',
  match(text, state, pasted) {
    const { doc, selection } = state;
    if (selection?.kind !== 'text' || tableBlock(doc, selection.head.block) === null) return null;
    const rich = richBlocks(state, pasted);
    const [only] = rich?.blocks.length === 1 ? rich.blocks : [];
    if (only?.type === 'TABLE') return pasteCells(only);
    if (cellSelection(state) === null) return null;
    return typeOverCells(lineOf(state, rich) ?? text.replace(/\r\n?/g, '\n'));
  },
};
