import type { AtomNode, EditorState, Pos } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { sliceInline } from '../../engine/model/inline';

/** An atom and the place it starts at, its one character running from `offset` to `offset + 1`. */
export type AtomPlace = Pos & { readonly node: AtomNode };

/** The atom of one of `types` that starts at `pos`, if one does. */
export function atomAt({ doc }: EditorState, pos: Pos, types: readonly string[]): AtomNode | null {
  const inline = blockById(doc, pos.block)?.regions[pos.region];
  const [node] = inline === undefined || pos.offset < 0 ? [] : sliceInline(inline, pos.offset, pos.offset + 1);
  return node?.kind === 'atom' && types.includes(node.type) ? node : null;
}

/** The place of the atom of one of `types` that starts at `pos`, if one does. */
export function atomPlaceAt(state: EditorState, pos: Pos, types: readonly string[]): AtomPlace | null {
  const node = atomAt(state, pos, types);
  return node === null ? null : { ...pos, node };
}

/** The atom of one of `types` right before a collapsed caret. */
export function atomBeforeCaret(state: EditorState, types: readonly string[]): AtomPlace | null {
  const { selection } = state;
  if (selection?.kind !== 'text') return null;
  const { anchor, head } = selection;
  if (anchor.block !== head.block || anchor.region !== head.region || anchor.offset !== head.offset) return null;
  return head.offset === 0 ? null : atomPlaceAt(state, { ...head, offset: head.offset - 1 }, types);
}

/** The atom of one of `types` that a text selection covers exactly, from either end. */
export function selectedAtom(state: EditorState, types: readonly string[]): AtomPlace | null {
  const { selection } = state;
  if (selection?.kind !== 'text') return null;
  const { anchor, head } = selection;
  if (anchor.block !== head.block || anchor.region !== head.region || Math.abs(anchor.offset - head.offset) !== 1) {
    return null;
  }
  return atomPlaceAt(state, { ...head, offset: Math.min(anchor.offset, head.offset) }, types);
}
