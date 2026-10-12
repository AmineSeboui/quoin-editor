import { describe, expect, it } from 'vitest';
import { atom, text } from '../../model/inline';
import type { Mark } from '../../model/types';
import { normalizeLabel, parseAutolink, parseLinkDestination, parseLinkTitle } from './link-syntax';
import { parseInline } from './parse-inline';

const b = { type: 'bold' };
const link = (href: string, title?: string): Mark => ({ type: 'link', attrs: title ? { href, title } : { href } });

describe('link syntax', () => {
  it('reads angle-bracketed and raw destinations', () => {
    expect(parseLinkDestination('<a \\> b>x', 0)).toEqual({ value: 'a > b', end: 8 });
    expect(parseLinkDestination('/u(x)(y) z', 0)).toEqual({ value: '/u(x)(y)', end: 8 });
    expect(parseLinkDestination('b\\)c&amp;)', 0)).toEqual({ value: 'b)c&', end: 9 });
    expect(parseLinkDestination(')', 0)).toEqual({ value: '', end: 0 });
    expect(parseLinkDestination('<a\nb>', 0)).toBeNull();
    expect(parseLinkDestination('<a<b>', 0)).toBeNull();
    expect(parseLinkDestination('<ab', 0)).toBeNull();
    expect(parseLinkDestination('a(b', 0)).toBeNull();
    expect(parseLinkDestination(' a', 0)).toBeNull();
    expect(parseLinkDestination(`${'('.repeat(32)}${')'.repeat(32)}`, 0)?.end).toBe(64);
    expect(parseLinkDestination(`${'('.repeat(33)}${')'.repeat(33)}`, 0)).toBeNull();
  });

  it('reads titles in all three quotings', () => {
    expect(parseLinkTitle('"a \\" b"', 0)).toEqual({ value: 'a " b', end: 8 });
    expect(parseLinkTitle("'a'", 0)).toEqual({ value: 'a', end: 3 });
    expect(parseLinkTitle('(a &copy;)', 0)).toEqual({ value: 'a \u00A9', end: 10 });
    expect(parseLinkTitle('"a &bogus; b"', 0)).toEqual({ value: 'a &bogus; b', end: 13 });
    expect(parseLinkTitle('(a (b))', 0)).toBeNull();
    expect(parseLinkTitle('"open', 0)).toBeNull();
    expect(parseLinkTitle('x', 0)).toBeNull();
  });

  it('reads URI and email autolinks', () => {
    expect(parseAutolink('<irc://a.b/c>', 0)).toEqual({ value: { href: 'irc://a.b/c', text: 'irc://a.b/c' }, end: 13 });
    expect(parseAutolink('<a.b-c@d.ef>', 0)).toEqual({
      value: { href: 'mailto:a.b-c@d.ef', text: 'a.b-c@d.ef' },
      end: 12,
    });
    expect(parseAutolink('<a:b>', 0)).toBeNull();
    expect(parseAutolink('<http://a b>', 0)).toBeNull();
    expect(parseAutolink('<a@-b.c>', 0)).toBeNull();
  });

  it('normalizes labels case-insensitively with collapsed whitespace', () => {
    expect(normalizeLabel('  The\n  Docs ')).toBe(normalizeLabel('the docs'));
    expect(normalizeLabel('A')).not.toBe(normalizeLabel('B'));
  });
});

describe('links', () => {
  const refs = new Map([
    ['The  Docs', { href: 'https://d.e' }],
    ['the docs', { href: 'https://ignored' }],
    ['bad', { href: 'javascript:x' }],
  ]);

  it.each([
    ["[a](b 'T')", [text('a', [link('b', 'T')])]],
    ['[a](b (T))', [text('a', [link('b', 'T')])]],
    ['[a](b "")', [text('a', [link('b')])]],
    ['[a]( b\n "T" )', [text('a', [link('b', 'T')])]],
    ['[a](/u(x)', [text('[a](/u(x)')]],
    ['[a](<b)', [text('[a](<b)')]],
    ['[a](b "T"x)', [text('[a](b "T"x)')]],
    ['[a [b](c) d](e)', [text('[a '), text('b', [link('c')]), text(' d](e)')]],
    ['[a](u) [b](v)', [text('a', [link('u')]), text(' '), text('b', [link('v')])]],
    ['<javascript:alert(1)>', [text('javascript:alert(1)')]],
    ['<a b>', [text('<a b>')]],
    ['[*x*](JavaScript:y)', [text('x', [{ type: 'italic' }])]],
    ['[x](javascript&#58;alert(1))', [text('x')]],
    ['[x](&#106;avascript:alert(1))', [text('x')]],
    ['] [a', [text('] [a')]],
    ['[Ada](mention:1)', [text('Ada', [link('mention:1')])]],
    ['[@Ada **x**](mention:1)', [text('@Ada ', [link('mention:1')]), text('x', [link('mention:1'), b])]],
    ['**[@Ada](mention:1)**', [atom('mention', { id: '1', label: 'Ada' }, [b])]],
    ['[@A\\_b](mention:1)', [atom('mention', { id: '1', label: 'A_b' })]],
    ['[@Ada](mention:)', [text('@Ada', [link('mention:')])]],
  ])('parses %j', (input, expected) => {
    expect(parseInline(input)).toEqual(expected);
  });

  it.each([
    ['[x][the docs]', [text('x', [link('https://d.e')])]],
    ['[The Docs][]', [text('The Docs', [link('https://d.e')])]],
    ['[the\ndocs]', [text('the\ndocs', [link('https://d.e')])]],
    ['[x][missing] [the docs]', [text('[x][missing] '), text('the docs', [link('https://d.e')])]],
    ['[the docs](https://o.p)', [text('the docs', [link('https://o.p')])]],
    ['[the docs](not a link)', [text('the docs', [link('https://d.e')]), text('(not a link)')]],
    ['[bad]', [text('bad')]],
    ['[a [the docs]]', [text('[a '), text('the docs', [link('https://d.e')]), text(']')]],
    ['[]', [text('[]')]],
    ['[a [b] c]', [text('[a [b] c]')]],
  ])('resolves references in %j', (input, expected) => {
    expect(parseInline(input, { refs })).toEqual(expected);
  });
});
