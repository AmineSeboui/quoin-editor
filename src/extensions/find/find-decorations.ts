import { getPluginState, type Decoration, type EditorState } from '../../engine';
import { findKey } from './find-plugin';
import type { FindState } from './find-state';

export const MATCH_CLASS = 'quoin-find-match';
export const CURRENT_CLASS = 'quoin-find-current';

/** The most matches marked at once, so a search that finds far more costs no more to draw. */
export const DRAWN_MATCHES = 1000;

const MATCH = { class: MATCH_CLASS };
const CURRENT = { class: `${MATCH_CLASS} ${CURRENT_CLASS}` };
const NONE: readonly Decoration[] = [];

const drawn = new WeakMap<FindState, readonly Decoration[]>();

function firstDrawn({ matches, current }: FindState): number {
  return Math.max(0, Math.min(current - DRAWN_MATCHES / 2, matches.length - DRAWN_MATCHES));
}

/** Marks the matches of an open search around the current one, and the current one apart from the rest. */
export function findDecorations(state: EditorState): readonly Decoration[] {
  const value = getPluginState(state, findKey);
  if (!value.open || value.matches.length === 0) return NONE;
  let decorations = drawn.get(value);
  if (decorations === undefined) {
    const first = firstDrawn(value);
    decorations = value.matches.slice(first, first + DRAWN_MATCHES).map(
      ({ block, region, from, to }, index): Decoration => ({
        kind: 'inline',
        block,
        region,
        from,
        to,
        attrs: first + index === value.current ? CURRENT : MATCH,
      }),
    );
    drawn.set(value, decorations);
  }
  return decorations;
}
