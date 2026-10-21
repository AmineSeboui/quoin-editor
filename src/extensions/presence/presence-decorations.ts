import { getPluginState, type Decoration, type EditorState } from '../../engine';
import { markRanges } from '../../engine/commands/selection-marks';
import { presenceKey, type Peer } from './presence-plugin';

function tintOf(state: EditorState, { color, selection }: Peer): readonly Decoration[] {
  if (selection?.kind !== 'text') return [];
  if (![selection.anchor, selection.head].every(({ block }) => state.doc.index.has(block))) return [];
  const attrs: Record<string, string> = { class: 'quoin-presence-selection' };
  if (color !== undefined) attrs.style = `--quoin-presence:${color}`;
  return markRanges({ ...state, selection }).map((range): Decoration => ({ kind: 'inline', ...range, attrs }));
}

// Kept per collaborator and document, so a change from one collaborator draws only theirs again.
const drawn = new WeakMap<Peer, { doc: EditorState['doc']; decorations: readonly Decoration[] }>();

function peerDecorations(state: EditorState, peer: Peer): readonly Decoration[] {
  const last = drawn.get(peer);
  if (last?.doc === state.doc) return last.decorations;
  const decorations = tintOf(state, peer);
  drawn.set(peer, { doc: state.doc, decorations });
  return decorations;
}

/** Each collaborator's text selection, tinted with their colour. Their carets are drawn over the text. */
export function presenceDecorations(state: EditorState): readonly Decoration[] {
  return getPluginState(state, presenceKey).flatMap((peer) => peerDecorations(state, peer));
}
