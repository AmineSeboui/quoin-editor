import { describe, expect, it } from 'vitest';
import { atom, text } from '../../model/inline';
import { parseInlineTag } from './html-tags';
import { parseInline } from './parse-inline';

const b = { type: 'bold' };
const u = { type: 'underline' };
const sub = { type: 'sub' };
const red = { type: 'color', attrs: { color: 'red' } };
const blue = { type: 'color', attrs: { color: 'blue' } };
const comment = (id: string) => ({ type: 'comment', attrs: { id } });

describe('parseInlineTag', () => {
  it('reads open, close and line break tags at a position', () => {
    expect(parseInlineTag('x<u>', 1)).toEqual({ tag: { close: false, name: 'u', mark: u }, end: 4 });
    expect(parseInlineTag('</SPAN >', 0)).toEqual({ tag: { close: true, name: 'span' }, end: 8 });
    expect(parseInlineTag('<br />', 0)).toEqual({ tag: { close: false, name: 'br', lineBreak: true }, end: 6 });
    expect(parseInlineTag('<span data-atom="emoji" data-attr-name="tada">', 0)).toEqual({
      tag: { close: false, name: 'span', atom: { type: 'emoji', attrs: { name: 'tada' } } },
      end: 46,
    });
  });

  it.each([
    '<script>',
    '</script>',
    '</br>',
    '<br class="x">',
    '<u class="x">',
    '<u/>',
    "<span data-color='red'>",
    '<span data-color=red>',
    '<span data-color="#f00">',
    '<span data-color="red" data-bg="blue">',
    '<span data-color="red" data-attr-x="y">',
    '<span data-comment="">',
    '<span>',
    '<span data-mark="link" data-attr-href="javascript:x">',
    '<span data-mark="">',
    '<span data-mark="kbd" title="x">',
    '<span data-atom="emoji" data-attr-="x">',
    '<mark class="x">',
    '<span data-color="red" data-color="blue">',
    '<constructor>',
    '< u>',
    '<u\u00A0>',
  ])('rejects %s', (source) => {
    expect(parseInlineTag(source, 0)).toBeNull();
  });
});

describe('inline HTML marks', () => {
  it.each([
    ['a</u>', [text('a</u>')]],
    ['<u>a<sub>b</u>c</sub>', [text('a', [u]), text('b', [u, sub]), text('c', [sub])]],
    ['**a<u>b**c</u>', [text('a', [b]), text('b', [b, u]), text('c', [u])]],
    ['<b>a**b</b>c**d', [text('abc', [b]), text('d')]],
    ['**a<b>b**c</b>d', [text('abc', [b]), text('d')]],
    ['<b>a**b**c</b>d', [text('abc', [b]), text('d')]],
    ['<u><u>a</u></u>', [text('a', [u])]],
    ['<u>a</u></u>', [text('a', [u]), text('</u>')]],
    ['<B>x</B>', [text('x', [b])]],
    ['a<br/>b<br />c', [text('a\nb\nc')]],
    ['<span data-color="red">a<span data-color="blue">b</span></span>', [text('a', [red]), text('b', [blue])]],
    [
      '<span data-comment="c1">a<span data-comment="c2">b</span></span>',
      [text('a', [comment('c1')]), text('b', [comment('c1'), comment('c2')])],
    ],
    ['<span data-comment="a&amp;b">x</span>', [text('x', [comment('a&b')])]],
    ['<span data-mark="kbd">K</span>', [text('K', [{ type: 'kbd' }])]],
    ['<span data-mark="toString">a</span>**b**', [text('a', [{ type: 'toString' }]), text('b', [b])]],
    ['<code>**x**</code>', [text('x', [b, { type: 'code' }])]],
    ['<u>`</u>`</u>', [text('</u>', [u, { type: 'code' }])]],
  ])('parses %j', (input, expected) => {
    expect(parseInline(input)).toEqual(expected);
  });

  it('turns a data-atom span into one atom and discards what it wraps', () => {
    expect(parseInline('<span data-atom="math" data-attr-latex="x">ignored *x*</span>!')).toEqual([
      atom('math', { latex: 'x' }),
      text('!'),
    ]);
    expect(parseInline('**<span data-atom="emoji" data-attr-name="a"></span>**')).toEqual([
      atom('emoji', { name: 'a' }, [b]),
    ]);
    expect(parseInline('<span data-atom="note"></span>')).toEqual([atom('note', {})]);
  });

  it('keeps a data-atom span without a closing tag as literal text', () => {
    expect(parseInline('<span data-atom="emoji" data-attr-name="a">*b*')).toEqual([
      text('<span data-atom="emoji" data-attr-name="a">'),
      text('b', [{ type: 'italic' }]),
    ]);
  });
});
