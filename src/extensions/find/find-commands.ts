import { getPluginState, Transaction, type Command, type EditorState } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { sliceInline } from '../../engine/model/inline';
import { findMatches } from '../../engine/find/find-matches';
import type { FindQuery } from '../../engine/find/find-types';
import { replaceMatches } from '../../engine/find/replace-matches';
import { FIND, findKey, type FindAction } from './find-plugin';
import { currentMatch } from './find-state';

const act = (state: EditorState, action: FindAction) => new Transaction(state).setMeta(FIND, action);

/** The text a selection covers, when it lies inside one region and holds no atom. */
export function selectedText({ doc, selection }: EditorState): string | undefined {
  if (selection?.kind !== 'text') return undefined;
  const { anchor, head } = selection;
  if (anchor.block !== head.block || anchor.region !== head.region || anchor.offset === head.offset) return undefined;
  const inline = blockById(doc, anchor.block)?.regions[anchor.region];
  const slice =
    inline && sliceInline(inline, Math.min(anchor.offset, head.offset), Math.max(anchor.offset, head.offset));
  if (slice === undefined || slice.some((node) => node.kind === 'atom')) return undefined;
  return slice.map((node) => (node.kind === 'text' ? node.text : '')).join('');
}

/** Opens the panel, searching for the selected text when the selection is a range inside one region. */
export const openFind: Command = (state, dispatch) => {
  dispatch?.(act(state, { type: 'open', query: selectedText(state) }));
  return true;
};

export function closeFind(state: EditorState): Transaction {
  return act(state, { type: 'close' });
}

export function setSearch(state: EditorState, search: FindQuery): Transaction {
  return act(state, { type: 'search', search });
}

export function stepFind(state: EditorState, by: 1 | -1): Transaction {
  return act(state, { type: 'step', by });
}

/** Replaces the current match, as a step of history of its own, and moves on to the match after it. */
export function replaceCurrent(replacement: string): Command {
  return (state, dispatch) => {
    const value = getPluginState(state, findKey);
    const match = currentMatch(value);
    if (!value.open || match === null) return false;
    const replaced = dispatch && ((tr: Transaction) => dispatch(tr.setMeta(FIND, { type: 'replaced' } satisfies FindAction)));
    return replaceMatches(value.search, [match], replacement)(state, replaced);
  };
}

/** Replaces every match in the document, past the ones the panel counts, in one step of history. */
export function replaceAll(replacement: string): Command {
  return (state, dispatch) => {
    const { open, search } = getPluginState(state, findKey);
    const result = findMatches(state.doc, search.query, search);
    if (!open || 'error' in result) return false;
    return replaceMatches(search, result.matches, replacement)(state, dispatch);
  };
}
