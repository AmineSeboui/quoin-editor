import { describe, expect, it } from 'vitest';
import { code, md, parse } from './block-fixtures';

const divider = { type: 'DIVIDER', data: {} };

describe('tabs', () => {
  it.each([
    ['\tfoo\tbaz\t\tbim', [code('foo\tbaz\t\tbim')]],
    ['  \tfoo\tbaz\t\tbim', [code('foo\tbaz\t\tbim')]],
    ['    a\ta\n    \u1f50\ta', [code('a\ta\n\u1f50\ta')]],
    ['    foo\n\tbar', [code('foo\nbar')]],
    ['>\t\tfoo', [code('  foo')]],
    ['- foo\n\n\t\tbar', [md('- foo'), code('  bar', '', 1)]],
    ['  - foo\n\n\tbar', [md('- foo'), md('bar', 1)]],
    ['-\t\tfoo', [md('- '), code('  foo', '', 1)]],
    [' - foo\n   - bar\n\t - baz', [md('- foo'), md('- bar', 1), md('- baz', 2)]],
    ['#\tFoo', [md('# Foo')]],
    ['*\t*\t*\t', [divider]],
  ])('reads %j', (input, expected) => expect(parse(input)).toEqual(expected));
});

describe('thematic breaks', () => {
  it.each([
    '***\n---\n___',
    ' ***\n  ***\n   ***',
    '_____________________________________',
    ' - - -',
    ' **  * ** * ** * **',
  ])('reads %j as dividers', (input) => {
    expect(parse(input).every((block) => block.type === 'DIVIDER')).toBe(true);
  });

  it.each([
    ['+++', [md('\\+++')]],
    ['--\n**\n__', [md('\\-- \\*\\* \\_\\_')]],
    ['    ***', [code('***')]],
    ['Foo\n    ***', [md('Foo \\*\\*\\*')]],
  ])('does not read %j as a divider', (input, expected) => expect(parse(input)).toEqual(expected));

  it('interrupts a paragraph and a list', () => {
    expect(parse('Foo\n***\nbar')).toEqual([md('Foo'), divider, md('bar')]);
    expect(parse('- foo\n***\n- bar')).toEqual([md('- foo'), divider, md('- bar')]);
    expect(parse('* Foo\n* * *\n* Bar')).toEqual([md('- Foo'), divider, md('- Bar')]);
    expect(parse('- Foo\n- * * *')).toEqual([md('- Foo'), md('- '), { ...divider, indent: 1 }]);
  });
});

describe('ATX headings', () => {
  it('reads levels one to six and drops the closing sequence', () => {
    expect(parse('# a\n## b\n### c\n#### d\n##### e\n###### f')).toEqual([
      md('# a'),
      md('## b'),
      md('### c'),
      md('#### d'),
      md('##### e'),
      md('###### f'),
    ]);
    expect(parse('## foo ##\n  ###   bar    ###\n# foo ##################################')).toEqual([
      md('## foo'),
      md('### bar'),
      md('# foo'),
    ]);
  });

  it.each([
    ['####### foo', md('\\####### foo')],
    ['#5 bolt', md('\\#5 bolt')],
    ['\\## foo', md('\\## foo')],
    ['### foo ### b', md('### foo ### b')],
    ['# foo#', md('# foo#')],
    ['foo\n    # bar', md('foo # bar')],
  ])('keeps %j as text', (input, expected) => expect(parse(input)).toEqual([expected]));

  it('keeps an escaped trailing hash and reads empty headings', () => {
    expect(parse('### foo \\###\n## foo #\\##\n# foo \\#')).toEqual([md('### foo \\###'), md('## foo \\###'), md('# foo \\#')]);
    expect(parse('## \n#\n### ###')).toEqual([md('## '), md('# '), md('### ')]);
  });

  it('interrupts a paragraph and canonicalizes the inline text', () => {
    expect(parse('Foo bar\n# baz\nBar foo')).toEqual([md('Foo bar'), md('# baz'), md('Bar foo')]);
    expect(parse('# foo *bar* \\*baz\\*')).toEqual([md('# foo _bar_ \\*baz\\*')]);
  });

  it('writes a hard break in a heading as br so the heading stays on one line', () => {
    expect(parse('# a<br>b')).toEqual([md('# a<br>b')]);
    expect(parse('a\\\nb\n---', 'newline')).toEqual([md('## a<br>b')]);
  });
});

describe('blank characters', () => {
  it('trims spaces and tabs from headings and fence info but keeps a no-break space', () => {
    expect(parse('#\ta\u00A0\t')).toEqual([md('# a\u00A0')]);
    expect(parse('# \u00A0a')).toEqual([md('# \u00A0a')]);
    expect(parse('```\t js \u00A0\nx\n```')).toEqual([code('x', 'js')]);
  });

  it('reads a heading whose text is a long run of blanks quickly', () => {
    const started = performance.now();
    expect(parse(`# a${' '.repeat(100000)}x`)).toHaveLength(1);
    expect(parse(`${'`'.repeat(100000)}a\``)).toHaveLength(1);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('setext headings', () => {
  it.each([
    ['Big\n===\n\nSmall\n---', [md('# Big'), md('## Small')]],
    ['Foo *bar\nbaz*\n====', [md('# Foo _bar baz_')]],
    ['Foo\n-------------------------\n\nFoo\n=', [md('## Foo'), md('# Foo')]],
    ['   Foo\n---\n\n  Foo\n-----\n\n  Foo\n  ===', [md('## Foo'), md('## Foo'), md('# Foo')]],
    ['Foo\n   ----      ', [md('## Foo')]],
    ['Foo  \n-----', [md('## Foo')]],
    ['Foo\nBar\n---', [md('## Foo Bar')]],
    ['---\nFoo\n---\nBar\n---\nBaz', [divider, md('## Foo'), md('## Bar'), md('Baz')]],
  ])('reads %j', (input, expected) => expect(parse(input)).toEqual(expected));

  it.each([
    ['Foo\n    ---', [md('Foo ---')]],
    ['Foo\n= =\n\nFoo\n--- -', [md('Foo = ='), md('Foo'), divider]],
    ['\n====', [md('\\====')]],
    ['Foo\nbar\n\\---\nbaz', [md('Foo bar --- baz')]],
    ['> foo\nbar\n===', [md('> foo bar ===')]],
    ['- Foo\n---', [md('- Foo'), divider]],
    ['> foo\n-----', [md('> foo'), divider]],
    ['    Foo\n---', [code('Foo'), divider]],
  ])('does not read %j as a heading', (input, expected) => expect(parse(input)).toEqual(expected));

  it('keeps a trailing backslash as text', () => {
    expect(parse('Foo\\\n----')).toEqual([md('## Foo\\\\')]);
  });

  it('leaves the underline as text when only link definitions came before it', () => {
    expect(parse('[foo]: /url\n===\n[foo]')).toEqual([md('\\=== [foo](/url)')]);
  });
});

describe('fenced code', () => {
  it.each([
    ['```\n<\n >\n```', code('<\n >')],
    ['~~~\n<\n >\n~~~', code('<\n >')],
    ['```\naaa\n~~~\n```', code('aaa\n~~~')],
    ['````\naaa\n```\n``````', code('aaa\n```')],
    ['```', code('')],
    ['```\n```', code('')],
    ['`````\n\n```\naaa', code('\n```\naaa')],
    ['```\n\n  \n```', code('\n  ')],
    [' ```\n aaa\naaa\n```', code('aaa\naaa')],
    ['   ```\n   aaa\n    aaa\n  aaa\n   ```', code('aaa\n aaa\naaa')],
    ['```\naaa\n    ```', code('aaa\n    ```')],
    ['~~~~~~\naaa\n~~~ ~~', code('aaa\n~~~ ~~')],
    ['```\n``` aaa\n```', code('``` aaa')],
    ['```ruby\ndef foo(x)\n  return 3\nend\n```', code('def foo(x)\n  return 3\nend', 'ruby')],
    ['~~~~    ruby startline=3 $%@#$\nx\n~~~~~~~', code('x', 'ruby')],
    ['````;\n````', code('', ';')],
    ['~~~ aa ``` ~~~\nfoo\n~~~', code('foo', 'aa')],
    ['```\ta\\*b\nx\n```', code('x', 'a*b')],
  ])('reads %j', (input, expected) => expect(parse(input)).toEqual([expected]));

  it.each([
    ['``\nfoo\n``', [md('`foo`')]],
    ['``` ```\naaa', [md('` ` aaa')]],
    ['``` aa ```\nfoo', [md('`aa` foo')]],
    ['    ```\n    aaa\n    ```', [code('```\naaa\n```')]],
  ])('does not open a fence for %j', (input, expected) => expect(parse(input)).toEqual(expected));

  it('interrupts paragraphs and ends when the fence closes', () => {
    expect(parse('foo\n```\nbar\n```\nbaz')).toEqual([md('foo'), code('bar'), md('baz')]);
    expect(parse('foo\n---\n~~~\nbar\n~~~\n# baz')).toEqual([md('## foo'), code('bar'), md('# baz')]);
  });

  it('ends at the quote or list that holds it', () => {
    expect(parse('> ```\n> aaa\n\nbbb')).toEqual([code('aaa'), md('bbb')]);
    expect(parse('> ```\nfoo\n```')).toEqual([code(''), md('foo'), code('')]);
  });
});

describe('indented code', () => {
  it.each([
    ['    a simple\n      indented code block', [code('a simple\n  indented code block')]],
    ['    chunk1\n\n    chunk2\n  \n \n \n    chunk3', [code('chunk1\n\nchunk2\n\n\n\nchunk3')]],
    ['    chunk1\n      \n      chunk2', [code('chunk1\n  \n  chunk2')]],
    ['    foo\nbar', [code('foo'), md('bar')]],
    ['        foo\n    bar', [code('    foo\nbar')]],
    ['\n    \n    foo\n    \n\n', [code('foo')]],
    ['    foo  ', [code('foo  ')]],
    ['Foo\n    bar', [md('Foo bar')]],
    ['# Heading\n    foo\nHeading\n------\n    foo\n----', [md('# Heading'), code('foo'), md('## Heading'), code('foo'), divider]],
  ])('reads %j', (input, expected) => expect(parse(input)).toEqual(expected));
});

describe('math fences', () => {
  it('reads multi line latex and keeps it verbatim', () => {
    expect(parse('$$\n\\frac{a}{b}\n  x^2\n$$')).toEqual([{ type: 'MATH', data: { latex: '\\frac{a}{b}\n  x^2' } }]);
  });

  it('interrupts a paragraph and runs to the end when unclosed', () => {
    expect(parse('text\n$$\nx')).toEqual([md('text'), { type: 'MATH', data: { latex: 'x' } }]);
  });

  it('opens only on a line holding nothing but the two dollar signs', () => {
    expect(parse('$$ x\n$$')).toEqual([md('\\$\\$ x'), { type: 'MATH', data: { latex: '' } }]);
  });
});
