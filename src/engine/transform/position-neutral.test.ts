import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import { text } from '../model/inline';
import { setAttrsStep, setIndentStep } from './attrs-steps';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep, replaceBlockStep } from './block-steps';
import { addMarkStep, removeMarkStep } from './mark-steps';
import { isPositionNeutral } from './position-neutral';
import { replaceDocStep } from './replace-doc-step';
import { replaceInlineStep } from './replace-inline-step';
import { joinBlocksStep, splitBlockStep } from './split-join-steps';
import type { Step } from './step';
import { created, para } from './step-fixtures';

const doc = createDoc([para('a', 'hello'), para('b', 'world')]);
const neutral = (step: Step) => isPositionNeutral(doc, step.apply(doc));

describe('isPositionNeutral', () => {
  it.each([
    ['an attribute patch', setAttrsStep('a', { kind: 'heading', level: 2 })],
    ['an added mark', addMarkStep('a', 'text', 0, 5, { type: 'bold' })],
    ['a removed mark', removeMarkStep('a', 'text', 0, 5, 'bold')],
    ['a block replaced with the same text', replaceBlockStep(para('a', 'hello', { type: 'TOGGLE', attrs: {} }))],
  ])('holds for %s', (_, step) => expect(neutral(step)).toBe(true));

  it.each([
    ['an inline edit', replaceInlineStep('a', 'text', 0, 1, [text('j')])],
    ['an indent change', setIndentStep('b', 1)],
    ['an insertion', insertBlocksStep(0, [para('c', '')])],
    ['a removal', removeBlocksStep(1, 1)],
    ['a move', moveBlocksStep(1, 1, 0)],
    ['a split', splitBlockStep('a', 'text', 2, created('c'))],
    ['a join', joinBlocksStep('a', 'text', 'b', 'text')],
    ['a block replaced with other text', replaceBlockStep(para('a', 'help'))],
    ['a block replaced without its region', replaceBlockStep({ ...para('a', ''), regions: {} })],
    ['a whole document replaced by an equal one', replaceDocStep(createDoc(doc.blocks))],
  ])('fails for %s', (_, step) => expect(neutral(step)).toBe(false));
});
