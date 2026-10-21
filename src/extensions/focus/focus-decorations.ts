import type { Attrs, Decoration, EditorState, EngineDoc } from '../../engine';

export const DIMMED_ATTRIBUTE = 'data-quoin-dimmed';
export const DIMMED: Attrs = { [DIMMED_ATTRIBUTE]: '' };

const NONE: readonly Decoration[] = [];

type Drawn = { readonly from: number; readonly to: number; readonly decorations: readonly Decoration[] };

const drawn = new WeakMap<EngineDoc, Drawn>();

function touched({ doc, selection }: EditorState): readonly [number, number] | null {
  if (selection === null) return null;
  const ends =
    selection.kind === 'text'
      ? [selection.anchor.block, selection.head.block]
      : selection.kind === 'node'
        ? [selection.block]
        : [selection.anchor, selection.head];
  const at = ends.map((id) => doc.index.get(id) ?? -1);
  return at.includes(-1) ? null : [Math.min(...at), Math.max(...at)];
}

function undimmed(doc: EngineDoc, from: number, to: number): Set<number> {
  const { blocks } = doc;
  const lit = new Set<number>();
  let level = Infinity;
  for (let i = from; i <= to; i++) {
    lit.add(i);
    level = Math.min(level, blocks[i].indent);
  }
  for (let i = from - 1; i >= 0 && level > 0; i--) {
    if (blocks[i].indent >= level) continue;
    lit.add(i);
    level = blocks[i].indent;
  }
  return lit;
}

/**
 * Dims every block but those the selection touches and the blocks they are nested in. The decorations are kept for
 * each document and recomputed only when the selection reaches other blocks.
 */
export function focusDecorations(state: EditorState): readonly Decoration[] {
  const range = touched(state);
  if (range === null) return NONE;
  const [from, to] = range;
  const known = drawn.get(state.doc);
  if (known !== undefined && known.from === from && known.to === to) return known.decorations;
  const lit = undimmed(state.doc, from, to);
  const decorations = state.doc.blocks.flatMap((block, i): Decoration[] =>
    lit.has(i) ? [] : [{ kind: 'block', block: block.id, attrs: DIMMED }],
  );
  drawn.set(state.doc, { from, to, decorations });
  return decorations;
}
