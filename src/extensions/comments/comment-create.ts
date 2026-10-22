import { addMarkStep, getPluginState, Transaction, type Command, type EditorState } from '../../engine';
import { markRanges } from '../../engine/commands/selection-marks';
import { sameSelection } from '../../engine/state/selection';
import { toError } from '../../to-error';
import { anchorText } from './comment-anchors';
import type { CommentsEditor, CommentsLink } from './comments-link';
import { COMMENTS, commentsKey, type CommentsAction, type PendingAnchor } from './comments-plugin';

export type CreateThread = (input: { anchorText: string; blockId: string }) => Promise<string>;

let nextKey = 0;

/** Whether there is selected text to comment on. */
export const hasCommentableText = (state: EditorState): boolean =>
  state.selection?.kind === 'text' && markRanges(state).length > 0;

/**
 * Starts a thread on the selected text: the text shows as pending until the host answers with the thread's id. One
 * thread is asked for at a time.
 */
export const requestComment: Command = (state, dispatch) => {
  const { selection } = state;
  if (selection?.kind !== 'text' || getPluginState(state, commentsKey).pending.length > 0) return false;
  const ranges = markRanges(state);
  if (ranges.length === 0) return false;
  if (dispatch === undefined) return true;
  const pending: PendingAnchor = { key: ++nextKey, ranges, selection };
  const action: CommentsAction = { type: 'pending', pending };
  dispatch(new Transaction(state).setMeta(COMMENTS, action).setMeta('addToHistory', false));
  return true;
};

function settledTransaction(editor: CommentsEditor, key: number, id: string | null): Transaction {
  const pending = getPluginState(editor.state, commentsKey).pending.find((anchor) => anchor.key === key);
  const tr = editor.createTransaction().setOrigin('command');
  const ranges = id === null ? [] : (pending?.ranges ?? []);
  for (const { block, region, from, to } of ranges) {
    tr.step(addMarkStep(block, region, from, to, { type: 'comment', attrs: { id: id! } }));
  }
  // The new thread opens for its first comment only while the person who asked for it is still where they asked.
  const untouched = pending !== undefined && sameSelection(editor.state.selection, pending.selection);
  const open = id !== null && ranges.length > 0 && untouched ? { ids: [id], focus: true } : undefined;
  const action: CommentsAction = { type: 'settled', key, open };
  return tr.setMeta(COMMENTS, action);
}

function create(editor: CommentsEditor, pending: PendingAnchor, onCreate: CreateThread, link: CommentsLink): void {
  const input = { anchorText: anchorText(editor.state.doc, pending.ranges), blockId: pending.ranges[0].block };
  const settle = (id: string | null, error?: unknown) => {
    if (link.mounts === 0) return;
    editor.dispatch(settledTransaction(editor, pending.key, id));
    if (id === null) link.report(toError(error));
  };
  new Promise<string>((resolve) => resolve(onCreate(input))).then(
    (id) => (typeof id === 'string' && id !== '' ? settle(id) : settle(null, new Error('onCreate gave no thread id'))),
    (error: unknown) => settle(null, error),
  );
}

/** Hands each pending anchor to the host as it is made, for as long as the editor is mounted. */
export function watchCreates(editor: CommentsEditor, onCreate: CreateThread, link: CommentsLink): () => void {
  return editor.subscribe((_, tr) => {
    const action = tr?.getMeta<CommentsAction>(COMMENTS);
    if (action?.type === 'pending') create(editor, action.pending, onCreate, link);
  });
}
