import type { EditorState, EngineBlock, Schema, Selection } from '../../engine';
import { markRanges, rangeContent } from '../../engine/commands/selection-marks';
import { blockById } from '../../engine/model/doc';
import { inlinePlainText } from '../../engine/render/block-plain-text';
import type { ViewController } from '../controller/view-controller';
import { inPlace } from './in-place';
import { isCrossSelection } from './selection-decorations';

/** Whether the selection is of whole blocks, a range of them or one selected as a node, which typing never replaces. */
export const wholeBlocks = (selection: Selection | null): boolean =>
  selection?.kind === 'blocks' || selection?.kind === 'node';

// Firefox and Safari fire copy and cut only for a selection they can see, so a selection no host holds, across hosts or
// of whole blocks, is held by the sink as text that is selected natively.
export function heldBySink(selection: Selection | null): boolean {
  return wholeBlocks(selection) || isCrossSelection(selection);
}

// Blocks with no text, such as a divider, would leave the sink selecting nothing and so firing no clipboard event.
const NO_TEXT = '\u00a0';

function selectionText(state: EditorState): string {
  const text = markRanges(state)
    .map((range) => inlinePlainText(rangeContent(state, range), state.schema))
    .join('\n');
  return text === '' ? NO_TEXT : text;
}

// WebKit scrolls the page as the sink takes focus, preventScroll notwithstanding: a few pixels, or under a transformed
// ancestor its scroll container to the top.
const focusInPlace = (sink: HTMLElement): void => inPlace(sink, () => sink.focus({ preventScroll: true }));

let focusing: ViewController | null = null;

/**
 * Whether the controller's sink is taking focus. Writing the selection again from its focus event would bring the
 * block into view before the scroll is put back, which would undo it, so that is left to the write that follows.
 */
export const focusingSink = (controller: ViewController): boolean => focusing === controller;

// The sink's own text stays selected, so a composition replaces it and leaves only what was composed, and a screen
// reader reads it as the selection.
export function focusSink(controller: ViewController): void {
  const { sink } = controller;
  if (sink === null) return;
  const text = selectionText(controller.editor.state);
  if (sink.textContent !== text) sink.textContent = text;
  if (sink.ownerDocument.activeElement !== sink) {
    const outer = focusing;
    focusing = controller;
    try {
      focusInPlace(sink);
    } finally {
      focusing = outer;
    }
  }
  sink.ownerDocument.getSelection()?.selectAllChildren(sink);
}

/** What the editor calls a block selected as a whole, given the schema it can read the block's text with. */
export type BlockLabel = (block: EngineBlock, schema: Schema) => string;

/**
 * What a block selected as a whole is called while the sink holds it, the name the editor gives it. Null for any other
 * selection, and empty when the editor names no blocks.
 */
export function selectedBlockName({ doc, schema, selection }: EditorState, blockLabel?: BlockLabel): string | null {
  const block = selection?.kind === 'node' ? blockById(doc, selection.block) : undefined;
  return block === undefined ? null : (blockLabel?.(block, schema) ?? '');
}

export function clearSink(controller: ViewController): void {
  const { sink } = controller;
  if (sink !== null && sink.textContent !== '') sink.textContent = '';
}
