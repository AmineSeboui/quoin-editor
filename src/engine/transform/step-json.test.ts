import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import { atom, text } from '../model/inline';
import { setAttrsStep, setIndentStep } from './attrs-steps';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep, replaceBlockStep } from './block-steps';
import { addMarkStep, removeMarkStep } from './mark-steps';
import { replaceInlineStep } from './replace-inline-step';
import { joinBlocksStep, splitBlockStep } from './split-join-steps';
import { StepError, type StepJSON } from './step';
import { created, divider, para } from './step-fixtures';
import { stepFromJSON } from './step-json';

const doc = createDoc([para('a', 'hello'), para('b', 'world'), divider('d')]);
const viaJSON = (json: StepJSON) => stepFromJSON(JSON.parse(JSON.stringify(json)));

describe('step JSON', () => {
  it.each([
    [
      'replaceInline',
      replaceInlineStep('a', 'text', 1, 3, [text('X', [{ type: 'bold' }]), atom('mention', { id: '1' })]),
    ],
    ['addMark', addMarkStep('a', 'text', 0, 2, { type: 'link', attrs: { href: 'https://a.b' } })],
    ['removeMark', removeMarkStep('a', 'text', 0, 2, { type: 'bold' })],
    ['removeMark', removeMarkStep('a', 'text', 0, 2, 'bold')],
    ['setAttrs', setAttrsStep('a', { kind: 'heading', level: 2, gone: undefined })],
    ['setIndent', setIndentStep('a', 2)],
    ['insertBlocks', insertBlocksStep(1, [para('n', 'new'), divider('m')])],
    ['removeBlocks', removeBlocksStep(0, 2)],
    ['moveBlocks', moveBlocksStep(0, 2, 1)],
    ['replaceBlock', replaceBlockStep(para('b', 'changed'))],
    ['splitBlock', splitBlockStep('a', 'text', 2, created('c', { regions: { note: [text('n')] } }))],
    ['joinBlocks', joinBlocksStep('a', 'text', 'b', 'text')],
  ])('restores a %s step that behaves the same', (stepType, step) => {
    const copy = viaJSON(step.toJSON());
    expect(copy.stepType).toBe(stepType);
    expect(copy.toJSON()).toEqual(JSON.parse(JSON.stringify(step.toJSON())));
    expect(copy.apply(doc).doc).toEqual(step.apply(doc).doc);
  });

  it('serializes a deleted attr as a marker and reads it back as a deletion', () => {
    const step = setAttrsStep('a', { level: undefined, kind: 'quote' });
    expect(step.toJSON()).toEqual({
      stepType: 'setAttrs',
      block: 'a',
      patch: { level: { $delete: true }, kind: 'quote' },
    });
    const withLevel = createDoc([para('a', 'x', { attrs: { kind: 'heading', level: 2 } })]);
    expect(viaJSON(step.toJSON()).apply(withLevel).doc.blocks[0].attrs).toEqual({ kind: 'quote' });
  });

  it('builds frozen steps', () => {
    expect(Object.isFrozen(setIndentStep('a', 1))).toBe(true);
  });

  it('rejects an unknown step type', () => {
    expect(() => stepFromJSON({ stepType: 'explode' })).toThrow(StepError);
    expect(() => stepFromJSON({ stepType: 'toString' })).toThrow(StepError);
  });

  const range = { block: 'a', region: 'text', from: 0, to: 1 };
  const split = { stepType: 'splitBlock', block: 'a', region: 'text', offset: 0 };
  it.each<[string, StepJSON]>([
    ['a block id that is not a string', { stepType: 'setIndent', block: 1, indent: 1 }],
    ['an indent that is not an integer', { stepType: 'setIndent', block: 'a', indent: 'x' }],
    ['a missing slice', { stepType: 'replaceInline', block: 'a', region: 'text', from: 0, to: 0 }],
    ['a mark that is not an object', { stepType: 'addMark', ...range, mark: 'bold' }],
    ['a mark with malformed attrs', { stepType: 'addMark', ...range, mark: { type: 'b', attrs: [] } }],
    ['a removed mark that is a number', { stepType: 'removeMark', ...range, mark: 3 }],
    ['a patch that is an array', { stepType: 'setAttrs', block: 'a', patch: [] }],
    ['blocks that are not blocks', { stepType: 'insertBlocks', index: 0, blocks: [{ id: 'x' }] }],
    ['blocks that are not an array', { stepType: 'insertBlocks', index: 0, blocks: 'x' }],
    [
      'a block whose regions are not inline',
      { stepType: 'replaceBlock', block: { ...para('a', ''), regions: { text: 'x' } } },
    ],
    ['a missing replacement block', { stepType: 'replaceBlock' }],
    [
      'a created block without a region',
      { ...split, created: { id: 'c', type: 'T', attrs: {}, indent: 0 } },
    ],
    ['created regions that are not inline', { ...split, created: { ...created('c'), regions: { x: 1 } } }],
    ['a non-integer count', { stepType: 'removeBlocks', index: 0, count: 1.5 }],
  ])('rejects %s', (_name, json) => {
    expect(() => stepFromJSON(json)).toThrow(StepError);
  });
});
