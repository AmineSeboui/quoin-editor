import type { EditorState, Pos } from '../../engine';
import { indexOfBlock } from '../../engine/model/doc';
import { comparePos } from '../../engine/model/position';
import { selectedBlockIds, selectionRange } from '../../engine/state/selection';
import { blockMatcher, type BlockMatcher } from '../../engine/find/find-matches';
import type { FindMatch, FindQuery } from '../../engine/find/find-types';

/** The most matches the panel counts and draws; past it the count reads as more than this. */
export const MATCH_CAP = 1000;

export type FindState = {
  readonly open: boolean;
  /** Grows each time the panel is asked to open, so an open panel takes focus again. */
  readonly opened: number;
  readonly search: FindQuery;
  readonly matcher: BlockMatcher | null;
  readonly error: string | null;
  /** The matches in document order, at most `MATCH_CAP` of them. */
  readonly matches: readonly FindMatch[];
  /** Whether the document holds more matches than `matches`. */
  readonly capped: boolean;
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
  capped: false,
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
  const index = matches.findIndex((match) => comparePos(state.doc, startOfMatch(match), at) >= 0);
  return index < 0 ? 0 : index;
}

/** The matches of `value`'s search in `state`, with the current one the nearest at or after `at`. */
export function searched(value: FindState, state: EditorState, at: Pos | null): FindState {
  const matcher = value.matcher ?? blockMatcher(value.search.query, value.search);
  if (typeof matcher !== 'function') {
    return { ...value, matcher: null, error: matcher.error, matches: [], capped: false, current: -1 };
  }
  const all = state.doc.blocks.flatMap((block) => matcher(block));
  const matches = all.length > MATCH_CAP ? all.slice(0, MATCH_CAP) : all;
  const current = nearestMatch(state, matches, at);
  return { ...value, matcher, error: null, matches, capped: all.length > MATCH_CAP, current };
}

export function currentMatch(value: FindState): FindMatch | null {
  return value.matches[value.current] ?? null;
}
