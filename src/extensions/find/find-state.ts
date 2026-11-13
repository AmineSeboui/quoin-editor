import type { EditorState, Pos } from '../../engine';
import { indexOfBlock } from '../../engine/model/doc';
import { comparePos } from '../../engine/model/position';
import { selectedBlockIds, selectionRange } from '../../engine/state/selection';
import { blockMatcher, type BlockMatcher } from '../../engine/find/find-matches';
import type { FindMatch, FindQuery } from '../../engine/find/find-types';

export type FindState = {
  readonly open: boolean;
  /** Grows each time the panel is asked to open, so an open panel takes focus again. */
  readonly opened: number;
  readonly search: FindQuery;
  readonly matcher: BlockMatcher | null;
  readonly error: string | null;
  /** Every match, in document order. */
  readonly matches: readonly FindMatch[];
  /** The index in `matches` of the current match, or -1 when there is none. */
  readonly current: number;
  /** Where the search looks from when no match is current. */
  readonly origin: Pos | null;
};

export const CLOSED: FindState = {
  open: false,
  opened: 0,
  search: { query: '', caseSensitive: false, wholeWord: false, regex: false },
  matcher: null,
  error: null,
  matches: [],
  current: -1,
  origin: null,
};

export const startOfMatch = ({ block, region, from }: FindMatch): Pos => ({ block, region, offset: from });

/** Where a search opened from: the start of the selection, or of the first block it takes in. */
export function originOf({ doc, selection }: EditorState): Pos | null {
  const range = selectionRange(doc, selection);
  if (range !== null) return range.from;
  const [block] = selectedBlockIds(doc, selection);
  return block === undefined ? null : { block, region: '', offset: 0 };
}

/** The index of the first match at or after `at`, wrapping to the first match, or -1 when there are none. */
export function nearestMatch(state: EditorState, matches: readonly FindMatch[], at: Pos | null): number {
  if (matches.length === 0) return -1;
  if (at === null || indexOfBlock(state.doc, at.block) < 0) return 0;
  let low = 0;
  let high = matches.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (comparePos(state.doc, startOfMatch(matches[middle]), at) < 0) low = middle + 1;
    else high = middle;
  }
  return low === matches.length ? 0 : low;
}

/** The matches of `value`'s search in `state`, with the current one the nearest at or after `at`. */
export function searched(value: FindState, state: EditorState, at: Pos | null): FindState {
  const matcher = value.matcher ?? blockMatcher(value.search.query, value.search);
  if (typeof matcher !== 'function') {
    return { ...value, matcher: null, error: matcher.error, matches: [], current: -1 };
  }
  const matches = state.doc.blocks.flatMap((block) => matcher(block));
  return { ...value, matcher, error: null, matches, current: nearestMatch(state, matches, at) };
}

export function currentMatch(value: FindState): FindMatch | null {
  return value.matches[value.current] ?? null;
}
