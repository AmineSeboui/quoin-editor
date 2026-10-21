import { getPluginState, type Decoration, type EditorState } from '../../engine';
import { findKey } from './find-plugin';
import type { FindState } from './find-state';

export const MATCH_CLASS = 'quoin-find-match';
export const CURRENT_CLASS = 'quoin-find-current';

const MATCH = { class: MATCH_CLASS };
const CURRENT = { class: `${MATCH_CLASS} ${CURRENT_CLASS}` };
const NONE: readonly Decoration[] = [];

const drawn = new WeakMap<FindState, readonly Decoration[]>();

/** Marks every match of an open search, and the current one apart from the rest. */
export function findDecorations(state: EditorState): readonly Decoration[] {
  const value = getPluginState(state, findKey);
  if (!value.open || value.matches.length === 0) return NONE;
  let decorations = drawn.get(value);
  if (decorations === undefined) {
    decorations = value.matches.map(({ block, region, from, to }, index): Decoration => ({
      kind: 'inline',
      block,
      region,
      from,
      to,
      attrs: index === value.current ? CURRENT : MATCH,
    }));
    drawn.set(value, decorations);
  }
  return decorations;
}
