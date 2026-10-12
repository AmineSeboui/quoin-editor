import { describe, expect, it } from 'vitest';
import { text } from '../../model/inline';
import { classifyDelimiterRun } from './delimiters';
import { parseInline } from './parse-inline';

const b = { type: 'bold' };
const i = { type: 'italic' };
const s = { type: 'strike' };

describe('classifyDelimiterRun', () => {
  it.each([
    ['', 'a', '*', true, false],
    ['a', '', '*', false, true],
    ['a', 'b', '*', true, true],
    ['a', 'b', '_', false, false],
    ['a', 'b', '~', true, true],
    [' ', ' ', '*', false, false],
    ['.', 'a', '_', true, false],
    ['a', '.', '_', false, true],
    ['(', ')', '_', true, true],
    ['a', '\u00A0', '*', false, true],
    ['\uD83D\uDC4D', 'a', '*', true, false],
  ] as const)('classifies %j*%j for %s', (before, after, char, canOpen, canClose) => {
    expect(classifyDelimiterRun(before, after, char)).toEqual({ canOpen, canClose });
  });
});

describe('emphasis', () => {
  it.each([
    ['*foo**bar**baz*', [text('foo', [i]), text('bar', [b, i]), text('baz', [i])]],
    ['*foo**bar*', [text('foo**bar', [i])]],
    ['**foo*', [text('*'), text('foo', [i])]],
    ['*foo**', [text('foo', [i]), text('*')]],
    ['_foo_bar_', [text('foo_bar', [i])]],
    ['*a _b* c_', [text('a _b', [i]), text(' c_')]],
    ['foo*bar*', [text('foo'), text('bar', [i])]],
    ['foo***bar***baz', [text('foo'), text('bar', [b, i]), text('baz')]],
    ['foo_bar_', [text('foo_bar_')]],
    ['* a *', [text('* a *')]],
    ['~~a~', [text('~~a~')]],
    ['~a~~', [text('~a~~')]],
    ['~~~a~~~', [text('~~~a~~~')]],
    ['~~a ~b~ c~~', [text('a b c', [s])]],
    ['~~a ~b c~~', [text('a ~b c', [s])]],
    ['**~~a~~**', [text('a', [b, s])]],
    ['[*a](b)*', [text('*a', [{ type: 'link', attrs: { href: 'b' } }]), text('*')]],
    ['*[a](b)*', [text('a', [{ type: 'link', attrs: { href: 'b' } }, i])]],
    ['\uD83D\uDC4D*a*', [text('\uD83D\uDC4D'), text('a', [i])]],
  ])('parses %j', (input, expected) => {
    expect(parseInline(input)).toEqual(expected);
  });

  it('leaves thousands of unmatched delimiters literal', () => {
    const input = '_a '.repeat(2000) + 'b* '.repeat(2000);
    expect(parseInline(input)).toEqual([text(input)]);
  });
});
