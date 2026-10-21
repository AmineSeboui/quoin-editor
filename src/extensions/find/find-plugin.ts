import { createPluginKey, type EditorState, type PluginSpec, type Transaction } from '../../engine';
import type { FindQuery } from '../../engine/find/find-types';
import { CLOSED, currentMatch, originOf, searched, startOfMatch, type FindState } from './find-state';

export const findKey = createPluginKey<FindState>('find');

export const FIND = 'find';

export type FindAction =
  | { readonly type: 'open'; readonly query?: string }
  | { readonly type: 'close' }
  | { readonly type: 'search'; readonly search: FindQuery }
  | { readonly type: 'step'; readonly by: 1 | -1 }
  | { readonly type: 'replaced' };

const wrap = (index: number, length: number) => (index + length) % length;

// After an edit the current match is the nearest at or after where it was. After a replace of the current match that is
// after the replacement, so a replacement that still matches is not found again.
function remapped(tr: Transaction, value: FindState, state: EditorState): FindState {
  const match = currentMatch(value);
  const replaced = tr.getMeta<FindAction>(FIND)?.type === 'replaced';
  const at =
    match === null
      ? value.origin && tr.mapPos(value.origin)
      : replaced
        ? tr.mapPos({ block: match.block, region: match.region, offset: match.to })
        : tr.mapPos(startOfMatch(match), -1);
  return searched({ ...value, origin: value.origin && tr.mapPos(value.origin) }, state, at);
}

export const findPlugin: PluginSpec<FindState> = {
  key: findKey,
  init: () => CLOSED,
  apply(tr, value, _oldState, newState) {
    const action = tr.getMeta<FindAction>(FIND);
    if (action?.type === 'open') {
      const search = action.query === undefined ? value.search : { ...value.search, query: action.query };
      const origin = originOf(newState);
      const opening = { ...value, open: true, opened: value.opened + 1, search, matcher: null, origin };
      return searched(opening, newState, origin);
    }
    if (!value.open) return value;
    if (action?.type === 'close') return { ...CLOSED, opened: value.opened, search: value.search };
    if (action?.type === 'search') {
      const match = currentMatch(value);
      const at = match ? startOfMatch(match) : value.origin;
      return searched({ ...value, search: action.search, matcher: null }, newState, at);
    }
    if (tr.docChanged) return remapped(tr, value, newState);
    if (action?.type === 'step' && value.matches.length > 0) {
      return { ...value, current: wrap(value.current + action.by, value.matches.length) };
    }
    return value;
  },
};
