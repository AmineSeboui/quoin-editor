import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import { commonPrefix, commonSuffix } from '../model/common-ends';
import { text } from '../model/inline';
import { replaceDocStep } from './replace-doc-step';
import { StepError } from './step';
import { divider, idsOf, para, pos } from './step-fixtures';
import { stepFromJSON } from './step-json';

const before = createDoc([para('a', 'hello'), para('b', 'world'), divider('d')]);
const after = createDoc([para('a', 'hi'), para('c', 'new')]);

describe('replaceDocStep', () => {
  it('swaps the whole document and inverts to the previous one', () => {
    const step = replaceDocStep(after);
    const { doc } = step.apply(before);
    expect(doc).toBe(after);
    expect(step.invert(before).apply(doc).doc).toBe(before);
  });

  it('keeps the region of a surviving block and maps the offset through the change to its text', () => {
    const { map } = replaceDocStep(after).apply(before);
    expect(map(pos('a', 1))).toEqual(pos('a', 1));
    expect(map(pos('a', 3))).toEqual(pos('a', 1));
    expect(map(pos('a', 5))).toEqual(pos('a', 2));
  });

  it('moves a position after an insertion by its length, and one at the insertion by its side', () => {
    const { map } = replaceDocStep(createDoc([para('a', 'say hello')])).apply(before);
    expect(map(pos('a', 2))).toEqual(pos('a', 6));
    expect(map(pos('a', 0))).toEqual(pos('a', 4));
    expect(map(pos('a', 0), -1)).toEqual(pos('a', 0));
  });

  it('collapses a position inside deleted text to where the deletion was', () => {
    const { map } = replaceDocStep(createDoc([para('a', 'ho')])).apply(before);
    expect(map(pos('a', 1))).toEqual(pos('a', 1));
    expect(map(pos('a', 3))).toEqual(pos('a', 1));
    expect(map(pos('a', 4))).toEqual(pos('a', 1));
    expect(map(pos('a', 5))).toEqual(pos('a', 2));
  });

  it('leaves a position alone when only the marks of its text change, and clamps one past the end', () => {
    const bold = createDoc([para('a', 'x', { regions: { text: [text('hello', [{ type: 'bold' }])] } })]);
    const { map } = replaceDocStep(bold).apply(before);
    expect(map(pos('a', 3))).toEqual(pos('a', 3));
    expect(map(pos('a', 9))).toEqual(pos('a', 5));
  });

  it('moves a position whose region is gone to the start of the block, in region order', () => {
    const noted = createDoc([para('a', 'hi', { regions: { text: [text('hi')], note: [text('n')] } })]);
    const { map } = replaceDocStep(noted).apply(before);
    expect(map(pos('a', 3, 'gone'))).toEqual(pos('a', 0, 'note'));
  });

  it('moves a position in a removed block to the start of the block now at that index', () => {
    const { map } = replaceDocStep(after).apply(before);
    expect(map(pos('b', 3))).toEqual(pos('c', 0));
    expect(map(pos('d', 0, ''))).toEqual(pos('c', 0));
  });

  it('leaves a position alone when no block is left', () => {
    const { map } = replaceDocStep(createDoc([])).apply(before);
    expect(map(pos('a', 2))).toEqual(pos('a', 2));
  });

  it('restores from JSON and rejects repeated ids', () => {
    const step = replaceDocStep(after);
    const copy = stepFromJSON(JSON.parse(JSON.stringify(step.toJSON())));
    expect(copy.stepType).toBe('replaceDoc');
    expect(idsOf(copy.apply(before).doc)).toEqual(['a', 'c']);
    expect(() => stepFromJSON({ stepType: 'replaceDoc', blocks: [para('a', 'x'), para('a', 'y')] })).toThrow(StepError);
    expect(() => stepFromJSON({ stepType: 'replaceDoc', blocks: 'no' })).toThrow(StepError);
  });

  it('builds a frozen step', () => {
    expect(Object.isFrozen(replaceDocStep(after))).toBe(true);
  });

  it('maps every position of every changed region as a position mapped on its own through its text would be', () => {
    const pairs: [string, string][] = [
      ['hello world', 'XXXX hello world'],
      ['hello world', 'hello'],
      ['abcabc', 'abXcabc'],
      ['aaaa', 'aa'],
      ['', 'new'],
      ['same', 'same'],
    ];
    const old = createDoc(pairs.map(([before], index) => para(`p${index}`, before)));
    const { map } = replaceDocStep(createDoc(pairs.map(([, after], index) => para(`p${index}`, after)))).apply(old);
    const alone = (before: string, after: string, offset: number, assoc: -1 | 1) => {
      const from = commonPrefix(before, after);
      const insertion = from + commonSuffix(before, after) >= before.length;
      const mapped = offset > from || (offset === from && insertion && assoc > 0) ? Math.max(offset + after.length - before.length, from) : offset;
      return Math.min(mapped, after.length);
    };
    for (let round = 0; round < 3; round++) {
      pairs.forEach(([before, after], index) => {
        for (let offset = 0; offset <= before.length; offset++) {
          for (const assoc of [-1, 1] as const) {
            expect(map(pos(`p${index}`, offset), assoc)).toEqual(pos(`p${index}`, alone(before, after, offset, assoc)));
          }
        }
      });
    }
  });
});
