import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import { text } from '../model/inline';
import type { EngineBlock } from '../model/types';
import { setAttrsStep } from './attrs-steps';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep } from './block-steps';
import { addMarkStep } from './mark-steps';
import { replaceInlineStep } from './replace-inline-step';
import { joinBlocksStep, splitBlockStep } from './split-join-steps';
import { StepError } from './step';
import { stepFromJSON } from './step-json';

const para = (id: string, value: string, extra: Partial<EngineBlock> = {}): EngineBlock => ({
  id,
  type: 'MARKDOWN',
  indent: 0,
  attrs: { kind: 'paragraph' },
  regions: { text: value ? [text(value)] : [] },
  ...extra,
});
const doc = createDoc([para('a', 'hello'), para('b', 'world')]);
const pos = (block: string, offset: number) => ({ block, region: 'text', offset });

describe('steps', () => {
  it('replaces inline content and maps positions around it', () => {
    const { doc: next, map } = replaceInlineStep('a', 'text', 1, 3, [text('EY')]).apply(doc);
    expect(next.blocks[0].regions.text).toEqual([text('hEYlo')]);
    expect(map(pos('a', 0))).toEqual(pos('a', 0));
    expect(map(pos('a', 4))).toEqual(pos('a', 4));
    expect(map(pos('a', 2), -1)).toEqual(pos('a', 1));
    expect(map(pos('a', 2), 1)).toEqual(pos('a', 3));
    expect(map(pos('b', 2))).toEqual(pos('b', 2));
  });

  it('inserts at a collapsed point and keeps assoc -1 positions before the insertion', () => {
    const { map } = replaceInlineStep('a', 'text', 5, 5, [text('!')]).apply(doc);
    expect(map(pos('a', 5), -1)).toEqual(pos('a', 5));
    expect(map(pos('a', 5))).toEqual(pos('a', 6));
  });

  it('splits and joins as exact inverses with position mapping', () => {
    const split = splitBlockStep('a', 'text', 2, {
      id: 'c',
      type: 'MARKDOWN',
      attrs: { kind: 'paragraph' },
      indent: 0,
      region: 'text',
    });
    const { doc: next, map } = split.apply(doc);
    expect(next.blocks.map((b) => b.id)).toEqual(['a', 'c', 'b']);
    expect(next.blocks[0].regions.text).toEqual([text('he')]);
    expect(next.blocks[1].regions.text).toEqual([text('llo')]);
    expect(map(pos('a', 4))).toEqual(pos('c', 2));
    expect(map(pos('a', 2), -1)).toEqual(pos('a', 2));
    expect(split.invert(doc).apply(next).doc).toEqual(doc);

    const join = joinBlocksStep('a', 'text', 'b', 'text');
    const joined = join.apply(doc);
    expect(joined.doc.blocks.map((b) => b.id)).toEqual(['a']);
    expect(joined.doc.blocks[0].regions.text).toEqual([text('helloworld')]);
    expect(joined.map(pos('b', 3))).toEqual(pos('a', 8));
    expect(join.invert(doc).apply(joined.doc).doc).toEqual(doc);
  });

  it('rejects a join whose source is not right after the target', () => {
    const three = createDoc([para('a', 'x'), para('b', 'y'), para('c', 'z')]);
    expect(() => joinBlocksStep('a', 'text', 'c', 'text').apply(three)).toThrow(StepError);
  });

  it('removes blocks and maps positions inside them to a neighbour', () => {
    const { doc: next, map } = removeBlocksStep(1, 1).apply(doc);
    expect(next.blocks.map((b) => b.id)).toEqual(['a']);
    expect(map(pos('b', 3), -1)).toEqual(pos('a', 5));
    expect(map(pos('b', 3), 1)).toEqual(pos('a', 5));
  });

  it('moves blocks so they start at the target index', () => {
    const three = createDoc([para('a', ''), para('b', ''), para('c', '')]);
    expect(moveBlocksStep(0, 1, 2).apply(three).doc.blocks.map((b) => b.id)).toEqual(['b', 'c', 'a']);
    expect(moveBlocksStep(2, 1, 0).apply(three).doc.blocks.map((b) => b.id)).toEqual(['c', 'a', 'b']);
  });

  it('patches attrs and deletes keys set to undefined', () => {
    const withLevel = setAttrsStep('a', { kind: 'heading', level: 2 }).apply(doc).doc;
    expect(withLevel.blocks[0].attrs).toEqual({ kind: 'heading', level: 2 });
    expect(setAttrsStep('a', { level: undefined }).apply(withLevel).doc.blocks[0].attrs).toEqual({ kind: 'heading' });
  });

  it('rejects inserting a duplicate id', () => {
    expect(() => insertBlocksStep(0, [para('a', '')]).apply(doc)).toThrow(StepError);
  });

  it('round trips through JSON', () => {
    const step = addMarkStep('a', 'text', 0, 2, { type: 'bold' });
    const json = JSON.parse(JSON.stringify(step.toJSON()));
    expect(stepFromJSON(json).apply(doc).doc).toEqual(step.apply(doc).doc);
  });
});
