import {
  createPluginKey,
  replaceBlockStep,
  Transaction,
  type Command,
  type EditorState,
  type PasteRule,
  type PluginSpec,
} from '../../engine';
import { insertSlice } from '../../engine/clipboard/insert-slice';
import { pastedLink } from '../../engine/clipboard/paste-url';
import { sliceFromClipboard } from '../../engine/clipboard/slice-from-clipboard';
import { isParagraph, regionLength, withContent } from '../../engine/commands/block-helpers';
import { runCommands } from '../../engine/commands/run-commands';
import { blockById } from '../../engine/model/doc';
import { isCollapsed, primaryRegion, sameSelection, startOf } from '../../engine/state/selection';
import { insertBlocks, type NewBlock } from '../../blocks/insert-blocks';

/** A link pasted alone on an empty line, which can still be shown as an embed or a bookmark instead. */
export type LinkChoice = { readonly block: string; readonly href: string };

const linkChoiceKey = createPluginKey<LinkChoice | null>('linkChoice');

/** Holds the link just pasted alone on its line, until the text changes or the selection moves. */
export const linkChoicePlugin: PluginSpec<LinkChoice | null> = {
  key: linkChoiceKey,
  init: () => null,
  apply(tr, value) {
    const pasted = tr.getMeta<LinkChoice>(linkChoiceKey.name);
    if (pasted !== undefined) return pasted;
    const moved = tr.selectionSet && !sameSelection(tr.before.selection, tr.selection);
    return value !== null && (tr.docChanged || moved) ? null : value;
  },
};

export const linkChoice = (state: EditorState): LinkChoice | null =>
  (state.pluginState.get(linkChoiceKey.name) as LinkChoice | null | undefined) ?? null;

// A document with no block yet draws one empty line, which the paste creates.
function onEmptyLine({ doc, schema, selection }: EditorState): boolean {
  if (doc.blocks.length === 0) return true;
  if (selection?.kind !== 'text' || !isCollapsed(selection)) return false;
  const block = blockById(doc, selection.head.block);
  return block !== undefined && isParagraph(block) && regionLength(block, primaryRegion(schema, block) ?? '') === 0;
}

/** Pastes a link alone on an empty line as the editor would, and holds it as the line's choice. */
export const pasteLinkChoice: PasteRule = {
  name: 'link-choice',
  match(text, state) {
    const link = pastedLink(text);
    const slice = link === null || link.rest !== '' || !onEmptyLine(state) ? null : sliceFromClipboard({ text });
    if (link === null || slice === null) return null;
    const paste = insertSlice(slice);
    return (before, dispatch) =>
      paste(before, dispatch && ((tr) => dispatch(tr.setMeta(linkChoiceKey.name, choiceAfter(tr, link.href)))));
  },
};

function choiceAfter(tr: Transaction, href: string): LinkChoice | null {
  const { selection } = tr;
  return selection?.kind === 'text' ? { block: selection.head.block, href } : null;
}

function emptyParagraph(blockId: string): Command {
  return (state, dispatch) => {
    const line = blockById(state.doc, blockId);
    if (line === undefined || !isParagraph(line)) return false;
    const tr = new Transaction(state).step(replaceBlockStep(withContent(state.schema, line, [])));
    dispatch?.(tr.setSelection(startOf(tr.doc, state.schema, blockId)));
    return true;
  };
}

/** Empties the line of a pasted link and puts the block above it, the line keeping the caret, in one step. */
export function replaceLink(blockId: string, block: NewBlock): Command {
  return (state, dispatch) => {
    const { ok, tr } = runCommands(state, [emptyParagraph(blockId), insertBlocks([block], 'line', blockId)]);
    if (!ok || tr === null) return false;
    dispatch?.(tr);
    return true;
  };
}
