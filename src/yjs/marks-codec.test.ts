import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sameValue } from '../engine/model/same-value';
import type { Mark } from '../engine/model/types';
import * as Y from 'yjs';
import { text } from '../engine/model/inline';
import { inlineOf, insertInline } from './inline-codec';
import { attributesToMarks, marksToAttributes } from './marks-codec';

const roundTrip = (mark: Mark) => attributesToMarks(marksToAttributes([mark]))[0];

const scalar = fc.oneof(fc.string({ maxLength: 3 }), fc.integer(), fc.boolean(), fc.constant(null));
const object = fc.dictionary(fc.string({ maxLength: 2 }), scalar, { maxKeys: 2, noNullPrototype: true });
const value = fc.oneof(scalar, fc.array(scalar, { maxLength: 2 }), object);
const type = fc.constantFrom('size', 'flag', 'link', 'color', 'comment', 'x:y', 'constructor', '$x');
const mark: fc.Arbitrary<Mark> = type.chain((name) =>
  fc
    .option(fc.dictionary(fc.constantFrom(name, 'id', 'href', 'other'), value, { maxKeys: 3, noNullPrototype: true }), {
      nil: undefined,
    })
    .map((attrs) => (attrs === undefined ? { type: name } : ({ type: name, attrs } as unknown as Mark))),
);

describe('a mark kept as a formatting attribute', () => {
  it('keeps an only attr named like the mark whatever its value', () => {
    for (const attrs of [{ size: 3 }, { flag: true }, { obj: { x: 1 } }, { nil: null }]) {
      const [name] = Object.keys(attrs);
      const original = { type: name, attrs } as unknown as Mark;
      expect(roundTrip(original)).toEqual(original);
      const shared = new Y.Doc().getText('t');
      insertInline(shared, 0, [text('a', [original])]);
      expect(inlineOf(shared)).toEqual([text('a', [original])]);
    }
  });

  it('reads back every mark it writes', () => {
    fc.assert(
      fc.property(mark, (original) => {
        expect(sameValue(roundTrip(original), original)).toBe(true);
      }),
      { seed: 20261021, numRuns: 2000 },
    );
  });
});
