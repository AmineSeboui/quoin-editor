import { getPluginState, type Decoration, type EditorState } from '../../engine';
import { markRanges } from '../../engine/commands/selection-marks';
import { PRESENCE_CARET } from './RemoteCaret';
import { presenceKey, type Peer } from './presence-plugin';

function peerDecorations(state: EditorState, { client, name, color, selection, idle }: Peer): Decoration[] {
  if (selection?.kind !== 'text') return [];
  if (![selection.anchor, selection.head].every(({ block }) => state.doc.index.has(block))) return [];
  const style: Record<string, string> = color === undefined ? {} : { style: `--quoin-presence:${color}` };
  const attrs: Record<string, string> = { 'data-name': name, ...style };
  if (idle) attrs['data-idle'] = '';
  const tint = { class: 'quoin-presence-selection', ...style };
  return [
    ...markRanges({ ...state, selection }).map((range): Decoration => ({ kind: 'inline', ...range, attrs: tint })),
    { kind: 'widget', ...selection.head, key: `presence:${client}`, widget: PRESENCE_CARET, attrs, side: -1 },
  ];
}

const drawn = new WeakMap<readonly Peer[], { doc: EditorState['doc']; decorations: readonly Decoration[] }>();

/** Each collaborator's text selection tinted with their colour, and their caret at its head. */
export function presenceDecorations(state: EditorState): readonly Decoration[] {
  const peers = getPluginState(state, presenceKey);
  const last = drawn.get(peers);
  if (last?.doc === state.doc) return last.decorations;
  const decorations = peers.flatMap((peer) => peerDecorations(state, peer));
  drawn.set(peers, { doc: state.doc, decorations });
  return decorations;
}
