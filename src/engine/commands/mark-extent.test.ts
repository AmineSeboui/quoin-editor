import { describe, expect, it } from 'vitest';
import { atom, text } from '../model/inline';
import type { Mark } from '../model/types';
import { markExtent } from './mark-extent';

const link = (href: string): Mark => ({ type: 'link', attrs: { href } });
const bold: Mark = { type: 'bold' };

describe('markExtent', () => {
  const inline = [text('go '), text('here', [link('a')]), text(' and '), text('there', [link('b'), bold])];

  it('finds the run of a mark around an offset, edges included', () => {
    expect(markExtent(inline, 5, 'link')).toEqual({ from: 3, to: 7 });
    expect(markExtent(inline, 3, 'link')).toEqual({ from: 3, to: 7 });
    expect(markExtent(inline, 7, 'link')).toEqual({ from: 3, to: 7 });
  });

  it('is null away from the mark, and for a mark that is absent', () => {
    expect(markExtent(inline, 1, 'link')).toBeNull();
    expect(markExtent(inline, 8, 'link')).toBeNull();
    expect(markExtent(inline, 5, 'italic')).toBeNull();
    expect(markExtent([], 0, 'link')).toBeNull();
  });

  it('spans nodes that differ in other marks but share the mark', () => {
    const mixed = [text('a', [link('x')]), text('b', [link('x'), bold]), atom('mention', { id: '1', label: 'Ada' }, [link('x')]), text('c')];
    expect(markExtent(mixed, 1, 'link')).toEqual({ from: 0, to: 3 });
  });

  it('keeps links with different destinations apart', () => {
    const adjacent = [text('one', [link('a')]), text('two', [link('b')])];
    expect(markExtent(adjacent, 1, 'link')).toEqual({ from: 0, to: 3 });
    expect(markExtent(adjacent, 4, 'link')).toEqual({ from: 3, to: 6 });
    expect(markExtent(adjacent, 3, 'link')).toEqual({ from: 3, to: 6 });
  });
});
