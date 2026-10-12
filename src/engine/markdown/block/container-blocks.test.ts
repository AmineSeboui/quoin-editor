import { describe, expect, it } from 'vitest';
import { code, md, parse } from './block-fixtures';

const divider = { type: 'DIVIDER', data: {} };

describe('block quotes', () => {
  it.each([
    ['> # Foo\n> bar\n> baz', [md('> Foo'), md('> bar baz')]],
    ['># Foo\n>bar\n> baz', [md('> Foo'), md('> bar baz')]],
    ['   > # Foo\n   > bar\n > baz', [md('> Foo'), md('> bar baz')]],
    ['> foo\n> bar', [md('> foo bar')]],
    ['> foo\n>\n> bar', [md('> foo'), md('> bar')]],
    ['> foo\n\n> bar', [md('> foo'), md('> bar')]],
    ['foo\n> bar', [md('foo'), md('> bar')]],
    ['>', []],
    ['>\n>  \n> ', []],
    ['>\n> foo\n>  ', [md('> foo')]],
  ])('reads %j', (input, expected) => expect(parse(input)).toEqual(expected));

  it('continues a paragraph lazily but not after a blank line', () => {
    expect(parse('> bar\nbaz')).toEqual([md('> bar baz')]);
    expect(parse('> bar\nbaz\n> foo')).toEqual([md('> bar baz foo')]);
    expect(parse('> bar\n\nbaz')).toEqual([md('> bar'), md('baz')]);
    expect(parse('> bar\n>\nbaz')).toEqual([md('> bar'), md('baz')]);
    expect(parse('> > > foo\nbar')).toEqual([md('> foo bar')]);
    expect(parse('>>> foo\n> bar\n>>baz')).toEqual([md('> foo bar baz')]);
    expect(parse('> foo\n    - bar')).toEqual([md('> foo - bar')]);
  });

  it('is ended by other blocks and not continued by code or fences', () => {
    expect(parse('> foo\n---')).toEqual([md('> foo'), divider]);
    expect(parse('> aaa\n***\n> bbb')).toEqual([md('> aaa'), divider, md('> bbb')]);
    expect(parse('> - foo\n- bar')).toEqual([md('> foo'), md('- bar')]);
    expect(parse('>     foo\n    bar')).toEqual([code('foo'), code('bar')]);
    expect(parse('    > # Foo\n    > bar')).toEqual([code('> # Foo\n> bar')]);
  });

  it('turns every paragraph, heading and list item of a quote into a quote block', () => {
    expect(parse('> # Title\n>\n> - a\n>   - b\n> 1. c\n>\n> text')).toEqual([
      md('> Title'),
      md('> a'),
      md('> b', 1),
      md('> c'),
      md('> text'),
    ]);
  });

  it('keeps code, dividers and tables found in a quote as blocks of their own', () => {
    expect(parse('> ```\n> x\n> ```\n>\n> ---')).toEqual([code('x'), divider]);
  });

  it('drops a quoted list item that holds nothing but children', () => {
    expect(parse('> 1. > Blockquote\n> continued here.')).toEqual([md('> Blockquote continued here.', 1)]);
    expect(parse('> -')).toEqual([]);
  });
});

describe('list items', () => {
  it.each([
    ['- one\n\n two', [md('- one'), md('two')]],
    ['- one\n\n  two', [md('- one'), md('two', 1)]],
    [' -    one\n\n     two', [md('- one'), code(' two')]],
    [' -    one\n\n      two', [md('- one'), md('two', 1)]],
    ['- foo\n\n\n  bar', [md('- foo'), md('bar', 1)]],
    ['-    foo\n\n  bar', [md('- foo'), md('bar')]],
    ['-  foo\n\n   bar', [md('- foo'), md('bar', 1)]],
    ['- Foo\n\n      bar\n\n\n      baz', [md('- Foo'), code('bar\n\n\nbaz', '', 1)]],
    ['10) foo\n    - bar', [md('10. foo'), md('- bar', 1)]],
    ['10) foo\n   - bar', [md('10. foo'), md('- bar')]],
    ['- foo\n  - bar\n    - baz\n      - boo', [md('- foo'), md('- bar', 1), md('- baz', 2), md('- boo', 3)]],
    ['- foo\n - bar\n  - baz\n   - boo', [md('- foo'), md('- bar'), md('- baz'), md('- boo')]],
    ['- a\n - b\n  - c\n   - d\n    - e', [md('- a'), md('- b'), md('- c'), md('- d - e')]],
    ['1. a\n\n  2. b\n\n    3. c', [md('1. a'), md('2. b'), code('3. c')]],
    ['- a\n- b\n\n  c\n- d', [md('- a'), md('- b'), md('c', 1), md('- d')]],
    ['* foo\n  * bar\n\n  baz', [md('- foo'), md('- bar', 1), md('baz', 1)]],
    ['- a\n  - b\n\n    c\n- d', [md('- a'), md('- b', 1), md('c', 2), md('- d')]],
  ])('reads %j', (input, expected) => expect(parse(input)).toEqual(expected));

  it('keeps the number each ordered item was written with and starts a list per marker kind', () => {
    expect(parse('1. a\n1. b\n7. c')).toEqual([md('1. a'), md('1. b'), md('7. c')]);
    expect(parse('003. ok\n0. zero')).toEqual([md('3. ok'), md('0. zero')]);
    expect(parse('123456789. ok')).toEqual([md('123456789. ok')]);
    expect(parse('- a\n* b\n+ c\n1. d\n2) e')).toEqual([md('- a'), md('- b'), md('- c'), md('1. d'), md('2. e')]);
  });

  it('needs a space after the marker and at most nine digits', () => {
    expect(parse('-one\n\n2.two')).toEqual([md('\\-one'), md('2\\.two')]);
    expect(parse('1234567890. not ok')).toEqual([md('1234567890\\. not ok')]);
    expect(parse('-1. not ok')).toEqual([md('\\-1. not ok')]);
    expect(parse('    1.  indented')).toEqual([code('1.  indented')]);
  });

  it('interrupts a paragraph only for bullets, a one, and items with content', () => {
    expect(parse('Foo\n- bar\n- baz')).toEqual([md('Foo'), md('- bar'), md('- baz')]);
    expect(parse('windows\n14.  doors')).toEqual([md('windows 14.  doors')]);
    expect(parse('windows\n1.  doors')).toEqual([md('windows'), md('1. doors')]);
    expect(parse('foo\n*\n\nfoo\n1.')).toEqual([md('foo \\*'), md('foo 1.')]);
  });

  it('reads empty items and items that start on the next line', () => {
    expect(parse('- foo\n-\n- bar')).toEqual([md('- foo'), md('- '), md('- bar')]);
    expect(parse('- foo\n-   \n- bar')).toEqual([md('- foo'), md('- '), md('- bar')]);
    expect(parse('1. foo\n2.\n3. bar')).toEqual([md('1. foo'), md('2. '), md('3. bar')]);
    expect(parse('*')).toEqual([md('- ')]);
    expect(parse('-\n  foo')).toEqual([md('- foo')]);
    expect(parse('-\n\n  foo')).toEqual([md('- '), md('foo')]);
    expect(parse('-\n  foo\n-\n  ```\n  bar\n  ```\n-\n      baz')).toEqual([
      md('- foo'),
      md('- '),
      code('bar', '', 1),
      md('- '),
      code('baz', '', 1),
    ]);
  });

  it('continues an item paragraph lazily', () => {
    expect(parse('- a\nb')).toEqual([md('- a b')]);
    expect(parse('1. a\nb')).toEqual([md('1. a b')]);
    expect(parse('- a\n\n  b\nc')).toEqual([md('- a'), md('b c', 1)]);
    expect(parse('  1.  A paragraph\nwith two lines.\n\n          indented code\n\n      > A block quote.')).toEqual([
      md('1. A paragraph with two lines.'),
      code('indented code', '', 1),
      md('> A block quote.', 1),
    ]);
  });

  it('puts every child of an item one indent deeper', () => {
    expect(parse('1.  foo\n\n    ```\n    bar\n    ```\n\n    baz\n\n    > bam')).toEqual([
      md('1. foo'),
      code('bar', '', 1),
      md('baz', 1),
      md('> bam', 1),
    ]);
    expect(parse('- a\n  > b\n  ```\n  c\n  ```\n- d')).toEqual([md('- a'), md('> b', 1), code('c', '', 1), md('- d')]);
  });

  it('gives an item that starts with another block a bare marker block', () => {
    expect(parse('- - foo')).toEqual([md('- '), md('- foo', 1)]);
    expect(parse('1. - 2. foo')).toEqual([md('1. '), md('- ', 1), md('2. foo', 2)]);
    expect(parse('- # Foo\n- Bar\n  ---\n  baz')).toEqual([md('- '), md('# Foo', 1), md('- '), md('## Bar', 1), md('baz', 1)]);
    expect(parse('- ```\n  b\n\n\n  ```\n- c')).toEqual([md('- '), code('b\n\n', '', 1), md('- c')]);
  });

  it('removes link definitions inside an item', () => {
    expect(parse('- a\n- b\n\n  [ref]: /url\n- d')).toEqual([md('- a'), md('- b'), md('- d')]);
  });
});

describe('task items', () => {
  it('reads checked and unchecked boxes of bullet items', () => {
    expect(parse('- [x] done\n- [ ] todo\n- [X] caps\n* [ ] star\n+ [x] plus')).toEqual([
      md('- [x] done'),
      md('- [ ] todo'),
      md('- [x] caps'),
      md('- [ ] star'),
      md('- [x] plus'),
    ]);
  });

  it('keeps text that only looks like a box', () => {
    expect(parse('- [x]nospace')).toEqual([md('- \\[x\\]nospace')]);
    expect(parse('1. [ ] ordered')).toEqual([md('1. \\[ \\] ordered')]);
  });

  it('allows an empty task and drops the spaces after the box', () => {
    expect(parse('- [ ]')).toEqual([md('- [ ] ')]);
    expect(parse('- [ ]  two spaces\n  more')).toEqual([md('- [ ] two spaces more')]);
  });
});

describe('line breaks and endings', () => {
  it('turns a backslash or two trailing spaces into a hard break', () => {
    expect(parse('a\\\nb')).toEqual([md('a\\\nb')]);
    expect(parse('a  \nb')).toEqual([md('a\\\nb')]);
    expect(parse('a\n   b\n      c')).toEqual([md('a b c')]);
    expect(parse('a\nb\nc', 'newline')).toEqual([md('a\\\nb\\\nc')]);
  });

  it('reads every kind of line ending', () => {
    expect(parse('# a\r\nb\r\r- c\n- d')).toEqual([md('# a'), md('b'), md('- c'), md('- d')]);
  });
});

describe('nesting limit', () => {
  it('reads deeply nested quotes and lists as text past the limit without failing', () => {
    expect(parse(`${'> '.repeat(5000)}x`)).toHaveLength(1);
    const lists = parse(`${'- '.repeat(5000)}x`);
    expect(lists.length).toBeGreaterThan(10);
    expect(lists.length).toBeLessThan(100);
  });
});
