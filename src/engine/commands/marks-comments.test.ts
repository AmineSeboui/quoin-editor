import { describe, expect, it } from 'vitest';
import type { Mark } from '../model/types';
import { buildState, run } from '../test-support/build-state';
import { toggleMark } from './marks';

const select = (markdown: string, from: number, to: number) =>
  buildState([markdown], { anchor: { block: 0, offset: from }, head: { block: 0, offset: to } });

const marksOf = (state: ReturnType<typeof select>): Mark[][] =>
  state.doc.blocks[0].regions.text.map((node) => [...node.marks]);

describe('toggling one comment anchor', () => {
  const stacked = '<span data-comment="c1"><span data-comment="c2">both</span></span> tail';

  it('removes only the named comment from a range', () => {
    const next = run(select(stacked, 0, 4), toggleMark('comment', { id: 'c1' }));
    expect(next.ok).toBe(true);
    expect(marksOf(next.state)[0]).toEqual([{ type: 'comment', attrs: { id: 'c2' } }]);
  });

  it('adds the named comment next to the ones that are there', () => {
    const next = run(select(stacked, 0, 4), toggleMark('comment', { id: 'c3' }));
    expect(marksOf(next.state)[0].map((mark) => mark.attrs?.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('removes only the named comment from the stored marks at a caret', () => {
    const state = buildState([stacked], { block: 0, offset: 2 });
    const next = run(state, toggleMark('comment', { id: 'c1' })).state;
    expect(next.storedMarks).toEqual([{ type: 'comment', attrs: { id: 'c2' } }]);
  });
});
