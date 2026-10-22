import { getPluginState, type Decoration, type EditorState } from '../../engine';
import { commentAnchors, type AnchorRange } from './comment-anchors';
import { commentsKey, type CommentsState } from './comments-plugin';

const PENDING = { class: 'quoin-comment-pending' };
const ACTIVE = { class: 'quoin-comment-active' };

const inline = (ranges: readonly AnchorRange[], attrs: Decoration['attrs']): Decoration[] =>
  ranges.map((range) => ({ kind: 'inline', ...range, attrs }));

const drawn = new WeakMap<CommentsState, { doc: EditorState['doc']; decorations: readonly Decoration[] }>();

/** The text of threads being created, and the anchor of the active thread, drawn stronger than the rest. */
export function commentsDecorations(state: EditorState): readonly Decoration[] {
  const value = getPluginState(state, commentsKey);
  const last = drawn.get(value);
  if (last?.doc === state.doc) return last.decorations;
  const active = value.active === null ? [] : (commentAnchors(state.doc).get(value.active) ?? []);
  const decorations = [...value.pending.flatMap(({ ranges }) => inline(ranges, PENDING)), ...inline(active, ACTIVE)];
  drawn.set(value, { doc: state.doc, decorations });
  return decorations;
}
