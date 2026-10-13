import { describe, expect, it } from 'vitest';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { insertTextWithRules } from './input-rule';
import { markInputRules } from './mark-rules';

type Entry = Parameters<typeof buildState>[0][number];
const type = (entry: Entry, offset: number, value: string) =>
  run(buildState([entry], { block: 0, offset }), insertTextWithRules(value, markInputRules)).state;

describe('mark input rules', () => {
  it.each([
    ['a **bold*', '*', 'a **bold**'],
    ['a *it', '*', 'a _it_'],
    ['a _it', '_', 'a _it_'],
    ['~~gone~', '~', '~~gone~~'],
    ['`code', '`', '`code`'],
    ['==hi=', '=', '<mark>hi</mark>'],
    ['[docs](https://d.e', ')', '[docs](https://d.e)'],
  ])('%j plus %j gives %j', (paragraph, value, expected) => {
    expect(markdownOf(type({ paragraph }, paragraph.length, value))).toEqual([expected]);
  });

  it('does not fire for spaced content or intraword underscores', () => {
    expect(markdownOf(type({ paragraph: 'a* b *' }, 6, '*'))).toEqual(['a\\* b \\*\\*']);
    expect(markdownOf(type({ paragraph: 'snake_case' }, 10, '_'))).toEqual(['snake\\_case\\_']);
  });

  it('stops the new mark from continuing', () => {
    const state = type({ paragraph: '**b*' }, 4, '*');
    expect(markdownOf(run(state, insertTextWithRules('c', markInputRules)).state)).toEqual(['**b**c']);
  });

  it('never fires inside code', () => {
    expect(markdownOf(type('`a *b`', 4, '*'))).toEqual(['`a *b*`']);
  });
});
