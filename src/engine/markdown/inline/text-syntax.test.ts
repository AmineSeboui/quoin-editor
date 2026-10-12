import { describe, expect, it } from 'vitest';
import { atom, text } from '../../model/inline';
import { decodeEntity } from './entities';
import { parseInline } from './parse-inline';

const c = { type: 'code' };

describe('decodeEntity', () => {
  it.each([
    ['amp', '&'],
    ['nbsp', '\u00A0'],
    ['mdash', '\u2014'],
    ['#65', 'A'],
    ['#x1F44D', '\uD83D\uDC4D'],
    ['#X41', 'A'],
    ['#0', '\uFFFD'],
    ['#xD800', '\uFFFD'],
    ['#1114112', '\uFFFD'],
  ])('decodes %s', (name, expected) => expect(decodeEntity(name)).toBe(expected));

  it.each(['bogus', 'AMP', '#', '#x', '#12345678', 'constructor'])('leaves %s undecoded', (name) => {
    expect(decodeEntity(name)).toBeNull();
  });
});

describe('text syntax', () => {
  it.each([
    ['a  \n  b', [text('a\nb')]],
    ['a \t\nb', [text('a\nb')]],
    ['a&#32;\nb', [text('a \nb')]],
    ['a\\\n  b', [text('a\nb')]],
    ['a \\\nb', [text('a \nb')]],
    ['a<br>  b', [text('a\n  b')]],
    ['a\\', [text('a\\')]],
    ['&#x1100000; &AMP; &;', [text('&#x1100000; &AMP; &;')]],
    ['`a\nb`', [text('a b', [c])]],
    ['`  `', [text('  ', [c])]],
    ['` a`', [text(' a', [c])]],
    ['``a`', [text('``a`')]],
    ['`a``b`', [text('a``b', [c])]],
    ['`a\\`b', [text('a\\', [c]), text('b')]],
    ['\\`a`', [text('`a`')]],
    ['`&amp;`', [text('&amp;', [c])]],
    ['`` ` `` and `', [text('`', [c]), text(' and `')]],
    ['$a$5 $a $', [text('$a$5 $a $')]],
    ['$a\\$b$', [atom('math', { latex: 'a$b' })]],
    ['$\\frac{a}{b}$', [atom('math', { latex: '\\frac{a}{b}' })]],
    ['$&amp;$', [atom('math', { latex: '&amp;' })]],
    ['$$', [text('$$')]],
    ['$ a$ $b$', [text('$ a$ '), atom('math', { latex: 'b' })]],
    ['``a` `b`', [text('``a'), text(' ', [c]), text('b`')]],
    ['$a$ and $b$', [atom('math', { latex: 'a' }), text(' and '), atom('math', { latex: 'b' })]],
    ['a!b ! ]', [text('a!b ! ]')]],
  ])('parses %j', (input, expected) => {
    expect(parseInline(input)).toEqual(expected);
  });

  it('keeps hard breaks as newlines when soft breaks become spaces', () => {
    expect(parseInline('a\\\nb\nc  \nd', { softBreak: 'space' })).toEqual([text('a\nb c\nd')]);
  });

  it('does not mutate the reference map it is given', () => {
    const refs = new Map([['A', { href: '/a' }]]);
    parseInline('[a]', { refs });
    expect([...refs]).toEqual([['A', { href: '/a' }]]);
  });
});
