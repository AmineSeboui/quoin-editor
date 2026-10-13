import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
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

  it('keeps the region of a surviving block and clamps the offset to its new length', () => {
    const { map } = replaceDocStep(after).apply(before);
    expect(map(pos('a', 1))).toEqual(pos('a', 1));
    expect(map(pos('a', 5))).toEqual(pos('a', 2));
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
});
