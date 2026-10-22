import { createPluginKey, type EditorState, type PluginSpec, type Selection, type Transaction } from '../../engine';
import type { AnchorRange } from './comment-anchors';
import { mapPendingRanges } from './pending-ranges';

/** Text a thread is being created for, drawn as a pending anchor until the host answers. */
export type PendingAnchor = {
  readonly key: number;
  readonly ranges: readonly AnchorRange[];
  readonly selection: Selection;
};

/** The thread popover: the threads to choose from, and whether it takes focus as it opens. */
export type OpenThreads = { readonly ids: readonly string[]; readonly focus: boolean };

export type CommentsState = {
  readonly pending: readonly PendingAnchor[];
  readonly active: string | null;
  readonly open: OpenThreads | null;
  /** Threads this canvas resolved or deleted, kept out of the lists whatever the host's store still says. */
  readonly ended: readonly string[];
};

export type CommentsAction =
  | { readonly type: 'pending'; readonly pending: PendingAnchor }
  | { readonly type: 'settled'; readonly key: number; readonly open?: OpenThreads }
  | { readonly type: 'activate'; readonly id: string | null }
  | { readonly type: 'open'; readonly open: OpenThreads }
  | { readonly type: 'close' }
  | { readonly type: 'forget'; readonly id: string };

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
      return { ...value, active, open, ended: [...value.ended, action.id] };
    }
  }
}

function afterEdit(tr: Transaction, value: CommentsState, state: EditorState): CommentsState {
  if (!tr.docChanged || value.pending.length === 0) return value;
  const pending = value.pending.map((anchor) => ({ ...anchor, ranges: mapPendingRanges(tr, anchor.ranges, state) }));
  return { ...value, pending };
}

export const commentsPlugin: PluginSpec<CommentsState> = {
  key: commentsKey,
  init: () => IDLE,
  apply(tr, value, _oldState, newState) {
    const edited = afterEdit(tr, value, newState);
    const action = tr.getMeta<CommentsAction>(COMMENTS);
    return action === undefined ? edited : act(edited, action);
  },
};
