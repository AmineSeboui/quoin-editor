import type { Decoration, EditorState } from '../../engine';
import { aiState, type AiState } from './ai-plugin';
import { targetGone, targetRanges } from './ai-target';

const REPLACED = { class: 'quoin-ai-replaced' };

/** The block an answer is drawn under, which keeps room for it below its text. */
export const ROOM = 'data-quoin-ai-room';

const drawn = new WeakMap<AiState, { doc: EditorState['doc']; decorations: readonly Decoration[] }>();

function decorate(state: EditorState, { target, ghost }: AiState): readonly Decoration[] {
  if (target === null || ghost === null) return [];
  const replaced: Decoration[] =
    ghost.replace && !targetGone(state.doc, target)
      ? targetRanges(state, target).map((range) => ({ kind: 'inline', ...range, attrs: REPLACED }))
      : [];
  return [...replaced, { kind: 'block', block: target.to.block, attrs: { [ROOM]: '' } }];
}

/** The text an answer would replace marked as such, and room kept under the block the answer is drawn below. */
export function aiDecorations(state: EditorState): readonly Decoration[] {
  const value = aiState(state);
  const last = drawn.get(value);
  if (last?.doc === state.doc) return last.decorations;
  const decorations = decorate(state, value);
  drawn.set(value, { doc: state.doc, decorations });
  return decorations;
}
