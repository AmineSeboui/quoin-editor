import type { EditorState } from '../../engine';
import { drawnBlockCount } from '../navigation/visible-blocks';
import { isCrossSelection } from './selection-decorations';

export type Heard = { readonly key: string; readonly message: string };

export const SILENCE: Heard = { key: '', message: '' };

// The key names the blocks a selection spans, so a selection that moves to other blocks is said again even when its
// words stay the same, and one that grows inside the same blocks is not.
export function selectionAnnouncement({ doc, selection }: EditorState, blocksSelected: (count: number) => string): Heard {
  if (selection === null || (selection.kind === 'text' && !isCrossSelection(selection))) return SILENCE;
  if (selection.kind === 'node') return { key: `node:${selection.block}`, message: blocksSelected(1) };
  const anchor = selection.kind === 'blocks' ? selection.anchor : selection.anchor.block;
  const head = selection.kind === 'blocks' ? selection.head : selection.head.block;
  const first = doc.index.get(anchor);
  const last = doc.index.get(head);
  if (first === undefined || last === undefined) return SILENCE;
  const count = drawnBlockCount(doc, Math.min(first, last), Math.max(first, last) + 1);
  return { key: `${selection.kind}:${anchor}:${head}`, message: blocksSelected(count) };
}
