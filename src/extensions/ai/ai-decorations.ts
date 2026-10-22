import type { Decoration, EditorState } from '../../engine';
import { regionLength } from '../../engine/commands/block-helpers';
import { aiState, type AiState } from './ai-plugin';
import { targetGone, targetRanges } from './ai-target';

export const GHOST_WIDGET = 'ai-ghost';

const REPLACED = { class: 'quoin-ai-replaced' };

const drawn = new WeakMap<AiState, { doc: EditorState['doc']; decorations: readonly Decoration[] }>();

function decorate(state: EditorState, { target, ghost }: AiState): readonly Decoration[] {
  if (target === null || ghost === null) return [];
  const { to } = target;
  const block = state.doc.blocks[state.doc.index.get(to.block)!];
  const replacing = ghost.replace && !targetGone(state.doc, target);
  const replaced: Decoration[] = replacing
    ? targetRanges(state, target).map((range) => ({ kind: 'inline', ...range, attrs: REPLACED }))
    : [];
  const widget: Decoration = {
    kind: 'widget',
    block: to.block,
    region: to.region,
    offset: replacing ? to.offset : regionLength(block, to.region),
    key: GHOST_WIDGET,
    widget: GHOST_WIDGET,
    attrs: { markdown: ghost.shown, phase: ghost.phase },
    side: 1,
  };
  return [...replaced, widget];
}

/** The answer drawn after its target, and the text it would replace marked as such. */
export function aiDecorations(state: EditorState): readonly Decoration[] {
  const value = aiState(state);
  const last = drawn.get(value);
  if (last?.doc === state.doc) return last.decorations;
  const decorations = decorate(state, value);
  drawn.set(value, { doc: state.doc, decorations });
  return decorations;
}
