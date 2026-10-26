import { createPluginKey, type EditorState, type PluginSpec, type Selection, type Transaction } from '../../engine';
import { commentIdsAt, type AnchorRange } from './comment-anchors';
import type { CommentThread } from './comment-threads';
import { mapPendingRanges } from './pending-ranges';

/** Text a thread is being created for, drawn as a pending anchor until the host answers. */
export type PendingAnchor = {
  readonly key: number;
  readonly ranges: readonly AnchorRange[];
  readonly selection: Selection;
};

/** A thread this canvas ended, and the host's copy of it then: once the host's store differs, the host is followed. */
export type EndedThread = { readonly id: string; readonly seen: CommentThread | undefined };

/** Whether a thread is one this canvas ended that the host's store still holds as it was then, open or not. */
export const isEnded = (ended: readonly EndedThread[], id: string, current: CommentThread | undefined): boolean =>
  ended.some((thread) => thread.id === id && thread.seen?.resolved === current?.resolved);

/** The thread popover: the threads to choose from, and whether it takes focus as it opens. */
export type OpenThreads = { readonly ids: readonly string[]; readonly focus: boolean };

export type CommentsState = {
  readonly pending: readonly PendingAnchor[];
  readonly active: string | null;
  readonly open: OpenThreads | null;
  /** Threads this canvas resolved or deleted, kept out of the lists until the host's store sets them anew. */
  readonly ended: readonly EndedThread[];
};

export type CommentsAction =
  | { readonly type: 'pending'; readonly pending: PendingAnchor }
  | { readonly type: 'settled'; readonly key: number; readonly open?: OpenThreads }
  | { readonly type: 'activate'; readonly id: string | null }
  | { readonly type: 'open'; readonly open: OpenThreads }
  | { readonly type: 'close' }
  | { readonly type: 'forget'; readonly id: string; readonly seen?: CommentThread }
  | { readonly type: 'caught'; readonly kept: readonly EndedThread[] };

export const commentsKey = createPluginKey<CommentsState>('comments');

export const COMMENTS = 'comments';

const IDLE: CommentsState = { pending: [], active: null, open: null, ended: [] };

function act(value: CommentsState, action: CommentsAction): CommentsState {
  switch (action.type) {
    case 'pending':
      return { ...value, pending: [...value.pending, action.pending] };
    case 'settled': {
      const pending = value.pending.filter(({ key }) => key !== action.key);
      if (action.open === undefined) return { ...value, pending };
      return { ...value, pending, active: action.open.ids[0] ?? null, open: action.open };
    }
    case 'activate':
      return value.active === action.id ? value : { ...value, active: action.id };
    case 'open':
      return { ...value, active: action.open.ids.length === 1 ? action.open.ids[0] : value.active, open: action.open };
    case 'close':
      return value.open === null ? value : { ...value, active: null, open: null };
    case 'forget': {
      const active = value.active === action.id ? null : value.active;
      const open = value.open?.ids.includes(action.id) ? null : value.open;
      const ended = [...value.ended.filter(({ id }) => id !== action.id), { id: action.id, seen: action.seen }];
      return { ...value, active, open, ended };
    }
    case 'caught':
      return { ...value, ended: action.kept };
  }
}

function afterEdit(tr: Transaction, value: CommentsState, state: EditorState): CommentsState {
  if (!tr.docChanged || value.pending.length === 0) return value;
  const pending = value.pending.map((anchor) => ({ ...anchor, ranges: mapPendingRanges(tr, anchor.ranges, state) }));
  return { ...value, pending };
}

const WRITER_MOVES: readonly string[] = ['input', 'history', 'drop'];

// A thread a click opened, focus left in the text, closes once the writer moves the caret out of its text, or anywhere
// once its text is gone. Only the writer's own moves count, an undo, a redo and a drop included: not a collaborator's,
// nor one your code makes.
function afterMove(tr: Transaction, value: CommentsState, state: EditorState): CommentsState {
  const { open } = value;
  if (open === null || open.focus || !tr.selectionSet || !WRITER_MOVES.includes(tr.origin)) return value;
  const { selection } = state;
  const here = selection?.kind === 'text' ? commentIdsAt(state.doc, selection.head) : [];
  return open.ids.some((id) => here.includes(id)) ? value : { ...value, active: null, open: null };
}

export const commentsPlugin: PluginSpec<CommentsState> = {
  key: commentsKey,
  init: () => IDLE,
  apply(tr, value, _oldState, newState) {
    const edited = afterMove(tr, afterEdit(tr, value, newState), newState);
    const action = tr.getMeta<CommentsAction>(COMMENTS);
    return action === undefined ? edited : act(edited, action);
  },
};
