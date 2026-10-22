import { createPluginKey, type EditorState, type PluginSpec, type Selection, type Transaction } from '../../engine';
import { commentAnchors, type AnchorRange } from './comment-anchors';

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

const IDLE: CommentsState = { pending: [], active: null, open: null };

function mapRange(tr: Transaction, range: AnchorRange): AnchorRange | null {
  const from = tr.mapPos({ block: range.block, region: range.region, offset: range.from }, 1);
  const to = tr.mapPos({ block: range.block, region: range.region, offset: range.to }, -1);
  const same = from.block === to.block && from.region === to.region;
  if (!same || from.offset >= to.offset) return null;
  return { block: from.block, region: from.region, from: from.offset, to: to.offset };
}

// What is typed at either edge of a pending anchor stays outside it, as it does for the comment mark it becomes.
function mapPending(tr: Transaction, pending: readonly PendingAnchor[]): readonly PendingAnchor[] {
  return pending.map((anchor) => ({
    ...anchor,
    ranges: anchor.ranges.flatMap((range) => mapRange(tr, range) ?? []),
  }));
}

function act(value: CommentsState, action: CommentsAction): CommentsState {
  switch (action.type) {
    case 'pending':
      return { ...value, pending: [...value.pending, action.pending] };
    case 'settled': {
      const pending = value.pending.filter(({ key }) => key !== action.key);
      if (action.open === undefined) return { ...value, pending };
      return { pending, active: action.open.ids[0] ?? null, open: action.open };
    }
    case 'activate':
      return value.active === action.id ? value : { ...value, active: action.id };
    case 'open':
      return { ...value, active: action.open.ids.length === 1 ? action.open.ids[0] : value.active, open: action.open };
    case 'close':
      return value.open === null ? value : { ...value, active: null, open: null };
    case 'forget': {
      const active = value.active === action.id ? null : value.active;
      return { ...value, active, open: value.open?.ids.includes(action.id) ? null : value.open };
    }
  }
}

// An open thread whose text is all gone closes, so undoing the deletion later does not open it again by itself.
function afterEdit(tr: Transaction, value: CommentsState, doc: EditorState['doc']): CommentsState {
  if (!tr.docChanged) return value;
  const pending = value.pending.length > 0 ? mapPending(tr, value.pending) : value.pending;
  const anchors = commentAnchors(doc);
  const gone = value.open !== null && !value.open.ids.some((id) => anchors.has(id));
  if (pending === value.pending && !gone) return value;
  return gone ? { pending, active: null, open: null } : { ...value, pending };
}

export const commentsPlugin: PluginSpec<CommentsState> = {
  key: commentsKey,
  init: () => IDLE,
  apply(tr, value, _oldState, newState) {
    const edited = afterEdit(tr, value, newState.doc);
    const action = tr.getMeta<CommentsAction>(COMMENTS);
    return action === undefined ? edited : act(edited, action);
  },
};
