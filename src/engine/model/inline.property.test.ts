import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { atom, inlineLength, inlineText, normalizeInline, replaceInline, sliceInline, text } from './inline';
import { addMark, hasMark, sameMarkSet, sortMarks } from './marks';
import type { Inline, InlineNode, Mark } from './types';

const markPool: Mark[] = [
  { type: 'bold' },
  { type: 'italic' },
  { type: 'code' },
  { type: 'link', attrs: { href: 'https://a.b' } },
  { type: 'link', attrs: { href: 'https://c.d' } },
  { type: 'comment', attrs: { id: 'x' } },
  { type: 'comment', attrs: { id: 'y' } },
];

const markSet = fc.subarray(markPool).map((marks) => marks.reduce<Mark[]>(addMark, []));
const rawNode: fc.Arbitrary<InlineNode> = fc.oneof(
  fc
    .tuple(fc.string({ unit: fc.constantFrom('a', 'b', ' ', '\n'), maxLength: 4 }), markSet)
    .map(([value, marks]) => text(value, marks)),
  fc.tuple(fc.constantFrom('1', '2'), markSet).map(([id, marks]) => atom('mention', { id }, marks)),
);
const inline = fc.array(rawNode, { maxLength: 6 }).map(normalizeInline);
const withRange = fc.tuple(inline, fc.nat(), fc.nat()).map(([nodes, x, y]): [Inline, number, number] => {
  const length = inlineLength(nodes);
  const [a, b] = [x % (length + 1), y % (length + 1)];
  return [nodes, Math.min(a, b), Math.max(a, b)];
});

describe('inline properties', () => {
  it('normalizes to a fixed point with no empty, unmerged, unsorted or code hard break text', () => {
    fc.assert(
      fc.property(inline, (nodes) => {
        expect(normalizeInline(nodes)).toEqual(nodes);
        nodes.forEach((node, i) => {
          expect(sameMarkSet(sortMarks(node.marks), node.marks)).toBe(true);
          if (node.kind !== 'text') return;
          expect(node.text).not.toBe('');
          if (node.text.includes('\n')) expect(hasMark(node.marks, 'code')).toBe(false);
          const next = nodes[i + 1];
          if (next?.kind === 'text') expect(sameMarkSet(node.marks, next.marks)).toBe(false);
        });
      }),
    );
  });

  it('slices consistently with the plain text', () => {
    fc.assert(
      fc.property(withRange, ([nodes, from, to]) => {
        expect(inlineText(sliceInline(nodes, from, to))).toBe(inlineText(nodes).slice(from, to));
      }),
    );
  });

  it('restores the original when a range is replaced by its own slice', () => {
    fc.assert(
      fc.property(withRange, ([nodes, from, to]) => {
        expect(replaceInline(nodes, from, to, sliceInline(nodes, from, to))).toEqual(nodes);
      }),
    );
  });

  it('changes the length by the replaced and inserted amounts', () => {
    fc.assert(
      fc.property(withRange, inline, ([nodes, from, to], slice) => {
        const length = inlineLength(replaceInline(nodes, from, to, slice));
        expect(length).toBe(inlineLength(nodes) - (to - from) + inlineLength(slice));
      }),
    );
  });
});
