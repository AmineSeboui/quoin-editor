import { describe, expect, it } from 'vitest';
import { nestHeadings, type HeadingNode } from './heading-tree';

type Leveled = { readonly name: string; readonly level: number };

const h = (name: string, level: number): Leveled => ({ name, level });

const shape = (nodes: readonly HeadingNode<Leveled>[]): unknown[] =>
  nodes.map(({ heading, children }) => (children.length === 0 ? heading.name : [heading.name, shape(children)]));

describe('nestHeadings', () => {
  it('is empty for no headings', () => {
    expect(nestHeadings([])).toEqual([]);
  });

  it('nests each heading under the nearest one above it of a lower level', () => {
    const nested = nestHeadings([h('a', 1), h('b', 2), h('c', 3), h('d', 2), h('e', 1), h('f', 2)]);
    expect(shape(nested)).toEqual([['a', [['b', ['c']], 'd']], ['e', ['f']]]);
  });

  it('nests a skipped level one deep', () => {
    expect(shape(nestHeadings([h('a', 1), h('b', 3), h('c', 2), h('d', 3)]))).toEqual([['a', ['b', ['c', ['d']]]]]);
  });

  it('keeps headings above the first one of a lower level at the top', () => {
    expect(shape(nestHeadings([h('a', 3), h('b', 2), h('c', 1), h('d', 4)]))).toEqual(['a', 'b', ['c', ['d']]]);
  });

  it('keeps each heading it is given as it is', () => {
    const headings = [h('a', 1), h('b', 2)];
    const [top] = nestHeadings(headings);
    expect(top.heading).toBe(headings[0]);
    expect(top.children[0].heading).toBe(headings[1]);
  });
});
