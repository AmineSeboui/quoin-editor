import type { Decoration, EditorState, Selection } from '../../engine';
import { markRanges } from '../../engine/commands/selection-marks';

export type PaintMode = 'highlight' | 'decorations';

const SELECTED = { class: 'quoin-selected' };

export function isCrossSelection(selection: Selection | null): boolean {
  if (selection?.kind !== 'text') return false;
  const { anchor, head } = selection;
  return anchor.block !== head.block || anchor.region !== head.region;
}

export function selectionDecorations(state: EditorState, mode: PaintMode): Decoration[] {
  if (mode !== 'decorations' || !isCrossSelection(state.selection)) return [];
  return markRanges(state).map(({ block, region, from, to }) => ({
    kind: 'inline',
    block,
    region,
    from,
    to,
    attrs: SELECTED,
  }));
}
