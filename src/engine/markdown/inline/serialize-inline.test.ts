import { describe, expect, it } from 'vitest';
import { atom, equalInline, normalizeInline, text } from '../../model/inline';
import type { Inline, Mark } from '../../model/types';
import { parseInline } from './parse-inline';
import { inlineCodec, serializeInline } from './serialize-inline';

const b = { type: 'bold' };
const i = { type: 'italic' };
const c = { type: 'code' };
const link = (href: string) => ({ type: 'link', attrs: { href } });

describe('serializeInline', () => {
  it.each([
    [[text('plain')], 'plain'],
    [[text('b', [b])], '**b**'],
    [[text('i', [i])], '_i_'],
    [[text('a'), text('b', [i]), text('c')], 'a*b*c'],
    [[text('x', [{ type: 'strike' }])], '~~x~~'],
    [[text('a`b', [c])], '``a`b``'],
    [[text('`', [c])], '`` ` ``'],
    [[text('t', [link('https://x.y')])], '[t](https://x.y)'],
    [[text('https://x.y', [link('https://x.y')])], '<https://x.y>'],
    [[text('t', [{ type: 'link', attrs: { href: 'a b', title: 'T "q"' } }])], '[t](<a b> "T \\"q\\"")'],
    [[text('u', [{ type: 'underline' }])], '<u>u</u>'],
    [[text('h', [{ type: 'highlight', attrs: { color: 'yellow' } }])], '<mark data-color="yellow">h</mark>'],
    [[text('x', [{ type: 'comment', attrs: { id: 'c1' } }])], '<span data-comment="c1">x</span>'],
    [[atom('mention', { id: '42', label: 'Ada' })], '[@Ada](mention:42)'],
    [[atom('math', { latex: 'x^2' })], '$x^2$'],
    [[text('a\nb')], 'a\\\nb'],
    [[text('ab\n')], 'ab<br>'],
    [[text('a\n\nb')], 'a\\\n<br>b'],
    [[text('*_`[]<~$\\')], '\\*\\_\\`\\[\\]\\<\\~\\$\\\\'],
    [[text('&amp; & x')], '\\&amp; & x'],
    [[text(' lead and trail ')], '&#32;lead and trail&#32;'],
    [[text(' x ', [b])], '<strong> x </strong>'],
  ])('serializes %j', (inline, expected) => {
    expect(serializeInline(normalizeInline(inline))).toBe(expected);
  });

  it('escapes block syntax at the start of a line when asked', () => {
    expect(serializeInline([text('# not a heading')], { escapeLineStart: true })).toBe('\\# not a heading');
    expect(serializeInline([text('1. x\n- y\n> z')], { escapeLineStart: true })).toBe('1\\. x\\\n\\- y\\\n\\> z');
    expect(serializeInline([text('# fine')])).toBe('# fine');
  });

  it('escapes pipes and writes <br> hard breaks for table cells when asked', () => {
    expect(serializeInline([text('a|b')], { escapePipes: true })).toBe('a\\|b');
    expect(serializeInline([text('a\nb')], { hardBreak: 'br' })).toBe('a<br>b');
  });

  it('closes and reopens marks across a link boundary', () => {
    const nodes = normalizeInline([text('x', [b]), text('y', [link('https://u.v'), b]), text('z', [link('https://u.v')])]);
    const markdown = serializeInline(nodes);
    expect(markdown).toBe('**x**[**y**z](https://u.v)');
    expect(equalInline(parseInline(markdown), nodes)).toBe(true);
  });

  it('opens the longer of a bold and a link outside', () => {
    expect(serializeInline(normalizeInline([text('x', [b]), text('y', [link('https://u.v'), b])]))).toBe(
      '**x[y](https://u.v)**',
    );
  });
});

const u = { type: 'underline' };
const strike = { type: 'strike' };
const titled = (href: string, title: string): Mark => ({ type: 'link', attrs: { href, title } });
const mention = (attrs: Record<string, string>, marks: Mark[] = []) => atom('mention', attrs, marks);

describe('serializeInline forms', () => {
  it.each<[string, Inline, string, Parameters<typeof serializeInline>[1]?]>([
    ['marks in rank order, outermost first', [text('x', [strike, u, i, b])], '**_<u>~~x~~</u>_**'],
    ['bold and italic on one run', [text('x', [b, i])], '**_x_**'],
    [
      'a comment inside a link',
      [text('x', [link('u'), { type: 'comment', attrs: { id: 'c1' } }])],
      '[<span data-comment="c1">x</span>](u)',
    ],
    ['a highlight without a colour', [text('x', [{ type: 'highlight' }])], '<mark>x</mark>'],
    [
      'text and background colours',
      [text('x', [{ type: 'color', attrs: { color: 'red' } }, { type: 'background', attrs: { color: 'blue' } }])],
      '<span data-color="red"><span data-bg="blue">x</span></span>',
    ],
    ['sub and superscript', [text('x', [{ type: 'sub' }]), text('y', [{ type: 'sup' }])], '<sub>x</sub><sup>y</sup>'],
    [
      'a custom mark with sorted, escaped attributes',
      [text('t', [{ type: 'tag', attrs: { b: 'x"y', a: '1&amp;' } }]), text('k', [{ type: 'kbd' }])],
      '<span data-mark="tag" data-attr-a="1&amp;amp;" data-attr-b="x&quot;y">t</span><span data-mark="kbd">k</span>',
    ],
    ['code inside bold', [text('x', [b, c])], '**`x`**'],
    ['code with a leading space', [text(' a', [c])], '`  a `'],
    ['code made only of spaces', [text('  ', [c])], '`  `'],
    ['the shortest fence that is not in the code', [text('a``b', [c])], '`a``b`'],
    ['a fence longer than every run inside', [text('a`b``c', [c])], '```a`b``c```'],
    ['a fence shorter than the longest run when that length is free', [text('a`b```c', [c])], '``a`b```c``'],
    ['code that holds an atom', [text('a', [c]), atom('math', { latex: 'x' }, [c])], '<code>a$x$</code>'],
    ['code with a pipe in a table cell', [text('a|b', [c])], '<code>a\\|b</code>', { escapePipes: true }],
    ['a mention with a kind', [mention({ id: '42', label: 'Ada', kind: 'page' })], '[@Ada](mention:page:42)'],
    ['a mention label that needs escaping', [mention({ id: '1', label: 'a]b' })], '[@a\\]b](mention:1)'],
    [
      'a mention label with block syntax after a hard break',
      [mention({ id: '1', label: 'a\n# b' })],
      '[@a\\\n# b](mention:1)',
    ],
    [
      'a mention label with a heading after a hard break when line starts are escaped',
      [mention({ id: '1', label: 'a\n# b' })],
      '[@a\\\n\\# b](mention:1)',
      { escapeLineStart: true },
    ],
    [
      'a mention label with a list item after a hard break when line starts are escaped',
      [mention({ id: '1', label: 'a\n- b' })],
      '[@a\\\n\\- b](mention:1)',
      { escapeLineStart: true },
    ],
    [
      'a mention label with an ordered item after a hard break when line starts are escaped',
      [mention({ id: '1', label: 'a\n1. b' })],
      '[@a\\\n1\\. b](mention:1)',
      { escapeLineStart: true },
    ],
    [
      'a mention inside a link',
      [mention({ id: '1', label: 'Ada' }, [link('https://a.b')])],
      '[<span data-atom="mention" data-attr-id="1" data-attr-label="Ada"></span>](https://a.b)',
    ],
    [
      'a mention whose id would not survive sanitizing',
      [mention({ id: '1 ', label: 'Ada' })],
      '<span data-atom="mention" data-attr-id="1 " data-attr-label="Ada"></span>',
    ],
    [
      'math holding a dollar sign',
      [atom('math', { latex: 'a$b' })],
      '<span data-atom="math" data-attr-latex="a$b"></span>',
    ],
    [
      'math followed by a digit',
      [atom('math', { latex: 'x' }), text('5')],
      '<span data-atom="math" data-attr-latex="x"></span>5',
    ],
    [
      'math with a leading space',
      [atom('math', { latex: ' x' })],
      '<span data-atom="math" data-attr-latex=" x"></span>',
    ],
    [
      'an atom without a pretty form',
      [atom('emoji', { name: 'a"b&', a: '2' })],
      '<span data-atom="emoji" data-attr-a="2" data-attr-name="a&quot;b&amp;"></span>',
    ],
    ['an unbalanced parenthesis in a destination', [text('t', [link('a)b')])], '[t](<a)b>)'],
    ['a backslash in a destination', [text('t', [link('a\\b')])], '[t](a\\\\b)'],
    [
      'an entity in a destination and a title',
      [text('t', [titled('a&amp;b', 'x&amp;y')])],
      '[t](a\\&amp;b "x\\&amp;y")',
    ],
    ['an empty destination with a title', [text('t', [titled('', 'T')])], '[t](<> "T")'],
    ['an empty destination', [text('t', [link('')])], '[t]()'],
    ['an email autolink', [text('a@b.c', [link('mailto:a@b.c')])], '<a@b.c>'],
    [
      'a titled link is never an autolink',
      [text('https://a.b', [titled('https://a.b', 'T')])],
      '[https://a.b](https://a.b "T")',
    ],
    ['a link whose text is not its address', [text('x', [link('https://a.b')])], '[x](https://a.b)'],
    ['a link to a mention that starts with @', [text('@x', [link('mention:1')])], '[<u></u>@x](mention:1)'],
    ['an exclamation mark before a link', [text('!'), text('t', [link('u')])], '\\![t](u)'],
    ['an exclamation mark before a mention', [text('hi!'), mention({ id: '1', label: 'A' })], 'hi\\![@A](mention:1)'],
    ['an exclamation mark before a bracket', [text('![x]')], '\\!\\[x\\]'],
    ['a hard break inside bold', [text('a\nb', [b])], '**a\\\nb**'],
    ['a space after a hard break', [text('a\n b')], 'a\\\n&#32;b'],
    ['a space before a hard break', [text('a \nb')], 'a&#32;\\\nb'],
    ['tabs at both ends', [text('\ta\t')], '&#9;a&#9;'],
    ['a lone hard break', [text('\n')], '<br>'],
    ['emphasis around punctuation', [text('(x)', [i])], '_(x)_'],
    ['italic keeps its underscores out of a word', [text('a'), text('b', [i]), text('c')], 'a*b*c'],
    ['bold inside a word', [text('a'), text('b', [b]), text('c')], 'a**b**c'],
    ['emphasis with trailing whitespace', [text('x ', [i])], '<em>x </em>'],
    ['emphasis with leading whitespace', [text(' x', [strike])], '<del> x</del>'],
    ['italic around bold', [text('a ', [i]), text('b', [b, i]), text(' c', [i])], '_a **b** c_'],
    ['strike around bold', [text('a ', [strike]), text('b', [b, strike]), text(' c', [strike])], '~~a **b** c~~'],
    ['bold around italic', [text('a ', [b]), text('b', [b, i]), text(' c', [b])], '**a _b_ c**'],
    ['italic around a link', [text('a ', [i]), text('b', [i, link('u')]), text(' c', [i])], '_a [b](u) c_'],
    ['italic around code', [text('a ', [i]), text('b', [c, i]), text(' c', [i])], '_a `b` c_'],
    [
      'code over bold stays innermost',
      [text('a ', [c]), text('b', [c, b]), text(' c', [c])],
      '` a  `**`b`**`  c `',
    ],
    [
      'code over a link stays innermost',
      [text('a ', [c]), text('b', [c, link('u')]), text(' c', [c])],
      '` a  `[`b`](u)`  c `',
    ],
    ['code over strike stays innermost', [text('ab', [c]), text('cd', [c, strike])], '`ab`~~`cd`~~'],
    ['unmarked spaces around italic', [text('x '), text('a', [i]), text(' y')], 'x _a_ y'],
    ['italic with edge spaces next to bold', [text(' a ', [i]), text('b', [b, i])], '<em> a **b**</em>'],
    ['an italic that would fuse with a bold', [text('a', [b]), text('b', [i]), text('c')], '**a**<em>b</em>c'],
    ['an escaped star in front of bold', [text('*'), text('x', [b])], '\\***x**'],
  ])('writes %s', (_name, inline, expected, options) => {
    const nodes = normalizeInline(inline);
    const markdown = serializeInline(nodes, options);
    expect(markdown).toBe(expected);
    expect(equalInline(parseInline(markdown), nodes)).toBe(true);
  });

  it('writes block syntax after a <br> hard break without escaping it', () => {
    const options = { escapeLineStart: true, hardBreak: 'br' } as const;
    expect(serializeInline([text('# x\n# y')], options)).toBe('\\# x<br># y');
  });

  it('escapes ordered list markers with either delimiter', () => {
    expect(serializeInline([text('12) x\n3. y')], { escapeLineStart: true })).toBe('12\\) x\\\n3\\. y');
  });

  it('falls back to the strict form when the pretty form does not read back', () => {
    const unsafe = [text('t', [b, link('javascript:x')])];
    expect(serializeInline(unsafe)).toBe('[<strong>t</strong>](javascript:x)');
  });

  it('writes the empty inline as the empty string', () => {
    expect(serializeInline([])).toBe('');
  });

  it('accepts inline that is not normalized', () => {
    expect(serializeInline([text('a'), text('', [b]), text('b')])).toBe('ab');
  });

  it('does not modify its input', () => {
    const inline = normalizeInline([text('a*', [b, link('https://a.b')]), mention({ id: '1', label: 'A' })]);
    const copy = structuredClone(inline);
    serializeInline(inline, { escapeLineStart: true, escapePipes: true });
    expect(inline).toEqual(copy);
  });

  it('exposes the parser and the serializer as the inline codec', () => {
    expect(inlineCodec.serialize([text('x', [b])])).toBe('**x**');
    expect(inlineCodec.parse('**x**')).toEqual([text('x', [b])]);
  });
});
