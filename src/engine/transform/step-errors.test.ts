import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import { setAttrsStep, setIndentStep } from './attrs-steps';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep, replaceBlockStep } from './block-steps';
import { addMarkStep, removeMarkStep, restoreMarksStep } from './mark-steps';
import { replaceInlineStep } from './replace-inline-step';
import { joinBlocksStep, splitBlockStep } from './split-join-steps';
import { StepError } from './step';
import { text } from '../model/inline';
import { created, para } from './step-fixtures';

const doc = createDoc([para('a', 'hello'), para('b', 'world')]);

describe('steps that cannot apply', () => {
  it.each([
    ['replacing in a missing block', replaceInlineStep('z', 'text', 0, 0, [])],
    ['replacing in a missing region', replaceInlineStep('a', 'body', 0, 0, [])],
    ['a range that ends before it starts', replaceInlineStep('a', 'text', 3, 2, [])],
    ['a negative offset', replaceInlineStep('a', 'text', -1, 2, [])],
    ['an offset past the end', replaceInlineStep('a', 'text', 0, 6, [])],
    ['a fractional offset', replaceInlineStep('a', 'text', 0.5, 2, [])],
    ['adding a mark past the end', addMarkStep('a', 'text', 0, 9, { type: 'bold' })],
    ['removing a mark in a missing region', removeMarkStep('a', 'body', 0, 1, 'bold')],
    ['restoring marks over text of another length', restoreMarksStep('a', 'text', 0, 2, [text('hello')])],
    ['restoring marks over other text', restoreMarksStep('a', 'text', 0, 2, [text('xy')])],
    ['patching a missing block', setAttrsStep('z', {})],
    ['indenting a missing block', setIndentStep('z', 1)],
    ['a negative indent', setIndentStep('a', -1)],
    ['a fractional indent', setIndentStep('a', 0.5)],
    ['inserting past the end', insertBlocksStep(3, [para('c', '')])],
    ['inserting at a negative index', insertBlocksStep(-1, [para('c', '')])],
    ['inserting the same id twice', insertBlocksStep(0, [para('c', ''), para('c', '')])],
    ['removing past the end', removeBlocksStep(1, 2)],
    ['a negative remove count', removeBlocksStep(0, -1)],
    ['moving blocks that run past the end', moveBlocksStep(1, 2, 0)],
    ['moving to a start that runs past the end', moveBlocksStep(0, 1, 2)],
    ['replacing a missing block', replaceBlockStep(para('z', ''))],
    ['splitting a missing block', splitBlockStep('z', 'text', 0, created('c'))],
    ['splitting a missing region', splitBlockStep('a', 'body', 0, created('c'))],
    ['splitting past the end', splitBlockStep('a', 'text', 6, created('c'))],
    ['splitting into an id that exists', splitBlockStep('a', 'text', 1, created('b'))],
    ['joining into a missing block', joinBlocksStep('z', 'text', 'b', 'text')],
    ['joining a missing source', joinBlocksStep('a', 'text', 'z', 'text')],
    ['joining into a missing region', joinBlocksStep('a', 'body', 'b', 'text')],
    ['joining a missing source region', joinBlocksStep('a', 'text', 'b', 'body')],
    ['joining a block to itself', joinBlocksStep('a', 'text', 'a', 'text')],
    ['joining a block to the one before it', joinBlocksStep('b', 'text', 'a', 'text')],
  ])('throws a StepError for %s', (_name, step) => {
    expect(() => step.apply(doc)).toThrow(StepError);
  });

  it.each([
    ['replaceInline', replaceInlineStep('z', 'text', 0, 0, [])],
    ['addMark', addMarkStep('a', 'text', 0, 9, { type: 'bold' })],
    ['restoreMarks', restoreMarksStep('a', 'body', 0, 1, [text('h')])],
    ['setAttrs', setAttrsStep('z', { a: 1 })],
    ['setIndent', setIndentStep('z', 1)],
    ['replaceBlock', replaceBlockStep(para('z', ''))],
    ['joinBlocks', joinBlocksStep('a', 'text', 'z', 'text')],
  ])('throws a StepError when %s is inverted against a document it does not fit', (_name, step) => {
    expect(() => step.invert(doc)).toThrow(StepError);
  });

  it('leaves the document untouched when a step fails', () => {
    const before = JSON.stringify(doc.blocks);
    expect(() => insertBlocksStep(1, [para('c', ''), para('a', '')]).apply(doc)).toThrow(StepError);
    expect(JSON.stringify(doc.blocks)).toBe(before);
  });
});
