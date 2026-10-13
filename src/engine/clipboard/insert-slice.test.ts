import { describe, expect, it } from 'vitest';
import { buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { insertSlice } from './insert-slice';
import { pasteLinkOverSelection } from './paste-link';
import type { Slice } from './slice';

const slice = (markdown: string[], open = true): Slice => ({
  blocks: markdown.map((m, i) => ({ id: `s${i}`, type: 'MARKDOWN', data: { markdown: m } })),
  openStart: open,
  openEnd: open,
});

describe('insertSlice', () => {
  it('pastes inline content into the current block', () => {
    const state = run(buildState(['ab'], { block: 0, offset: 1 }), insertSlice(slice(['**x**']), { newId: newIds() })).state;
    expect(markdownOf(state)).toEqual(['a**x**b']);
    expect(caretOf(state)).toEqual({ block: 0, offset: 2 });
  });

  it('splits around a multi-block paste and merges the open ends', () => {
    const state = run(buildState(['abcd'], { block: 0, offset: 2 }), insertSlice(slice(['X', '- Y', 'Z']), { newId: newIds() })).state;
    expect(markdownOf(state)).toEqual(['abX', '- Y', 'Zcd']);
    expect(caretOf(state)).toEqual({ block: 2, offset: 1 });
  });

  it('inserts closed blocks after splitting, offsetting indent', () => {
    const base = buildState([{ id: 'p', type: 'MARKDOWN', data: { markdown: '- item' }, indent: 1 }], { block: 0, offset: 4 });
    const state = run(base, insertSlice({ blocks: [{ id: 'd', type: 'DIVIDER', data: {} }], openStart: false, openEnd: false }, { newId: newIds() })).state;
    expect(markdownOf(state)).toEqual(['  - item', '  <DIVIDER>']);
  });

  it('links a selection when a URL is pasted over it', () => {
    const state = buildState(['go here'], { anchor: { block: 0, offset: 3 }, head: { block: 0, offset: 7 } });
    expect(markdownOf(run(state, pasteLinkOverSelection(' https://a.b ')).state)).toEqual(['go [here](https://a.b)']);
    expect(run(state, pasteLinkOverSelection('not a url')).ok).toBe(false);
  });
});
