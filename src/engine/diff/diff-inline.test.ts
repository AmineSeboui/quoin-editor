import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { atom, normalizeInline, text } from '../model/inline';
import { addMark } from '../model/marks';
import type { Inline, InlineNode, Mark } from '../model/types';
import { diffInline, type InlineChange } from './diff-inline';

const bold = [{ type: 'bold' }];

const side = (changes: readonly InlineChange[], skip: InlineChange['op']): Inline =>
  normalizeInline(changes.filter((change) => change.op !== skip).flatMap((change) => change.inline));

describe('diffInline', () => {
  it('returns one equal change for identical text and none for empty input', () => {
    expect(diffInline([text('same words')], [text('same words')])).toEqual([
      { op: 'equal', inline: [text('same words')] },
    ]);
    expect(diffInline([], [])).toEqual([]);
  });

  it('reports a whole insertion and a whole deletion', () => {
    expect(diffInline([], [text('new')])).toEqual([{ op: 'insert', inline: [text('new')] }]);
    expect(diffInline([text('old')], [])).toEqual([{ op: 'delete', inline: [text('old')] }]);
  });

  it('joins neighbouring tokens of one change into one inline', () => {
    expect(diffInline([text('keep a b c end')], [text('keep end')])).toEqual([
      { op: 'equal', inline: [text('keep ')] },
      { op: 'delete', inline: [text('a b c ')] },
      { op: 'equal', inline: [text('end')] },
    ]);
  });

  it('diffs punctuation apart from the words around it', () => {
    expect(diffInline([text('wait, what')], [text('wait! what')])).toEqual([
      { op: 'equal', inline: [text('wait')] },
      { op: 'delete', inline: [text(',')] },
      { op: 'insert', inline: [text('!')] },
      { op: 'equal', inline: [text(' what')] },
    ]);
  });

  it('sees a mark change on the same words as a deletion and an insertion', () => {
    expect(diffInline([text('a word here')], [text('a '), text('word', bold), text(' here')])).toEqual([
      { op: 'equal', inline: [text('a ')] },
      { op: 'delete', inline: [text('word')] },
      { op: 'insert', inline: [text('word', bold)] },
      { op: 'equal', inline: [text(' here')] },
    ]);
  });

  it('compares link and comment attributes, not only the mark type', () => {
    const link = (href: string) => [{ type: 'link', attrs: { href } }];
    const changes = diffInline([text('site', link('https://a.test'))], [text('site', link('https://b.test'))]);
    expect(changes.map((change) => change.op)).toEqual(['delete', 'insert']);
  });

  it('compares atoms by type, attributes and marks', () => {
    const ann = atom('mention', { id: '1', label: 'Ann' });
    const bob = atom('mention', { id: '2', label: 'Bob' });
    expect(diffInline([text('hi '), ann], [text('hi '), ann])).toEqual([
      { op: 'equal', inline: [text('hi '), ann] },
    ]);
    expect(diffInline([text('hi '), ann], [text('hi '), bob])).toEqual([
      { op: 'equal', inline: [text('hi ')] },
      { op: 'delete', inline: [ann] },
      { op: 'insert', inline: [bob] },
    ]);
    expect(diffInline([ann], [atom('mention', { id: '1', label: 'Ann' }, bold)]).map((change) => change.op)).toEqual([
      'delete',
      'insert',
    ]);
  });

  it('does not change its inputs', () => {
    const a = Object.freeze([Object.freeze(text('a b'))]);
    const b = Object.freeze([Object.freeze(text('a c'))]);
    expect(() => diffInline(a, b)).not.toThrow();
  });
});

const markPool: Mark[] = [
  { type: 'bold' },
  { type: 'italic' },
  { type: 'code' },
  { type: 'link', attrs: { href: 'x' } },
];
const marks = fc.subarray(markPool).map((set) => set.reduce<Mark[]>(addMark, []));
const node: fc.Arbitrary<InlineNode> = fc.oneof(
  fc
    .tuple(fc.string({ unit: fc.constantFrom('a', 'b', ' ', ',', '\n'), maxLength: 5 }), marks)
    .map(([value, set]) => text(value, set)),
  fc.tuple(fc.constantFrom('1', '2'), marks).map(([id, set]) => atom('mention', { id }, set)),
);
const inline = fc.array(node, { maxLength: 6 }).map(normalizeInline);

describe('diffInline properties', () => {
  it('rebuilds both sides from the changes', () => {
    fc.assert(
      fc.property(inline, inline, (a, b) => {
        const changes = diffInline(a, b);
        expect(side(changes, 'insert')).toEqual(a);
        expect(side(changes, 'delete')).toEqual(b);
      }),
    );
  });

  it('finds no change between a value and itself', () => {
    fc.assert(
      fc.property(inline, (a) => {
        expect(diffInline(a, a).every((change) => change.op === 'equal')).toBe(true);
      }),
    );
  });
});
