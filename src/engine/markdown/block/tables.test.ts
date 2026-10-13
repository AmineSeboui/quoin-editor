import { describe, expect, it } from 'vitest';
import { md, parse } from './block-fixtures';
import { splitRow } from './tables';

const table = (rows: string[][], align: (string | null)[]) => ({ type: 'TABLE', data: { rows, header: true, align } });

describe('splitRow', () => {
  it.each([
    ['| a | b |', ['a', 'b']],
    ['a | b', ['a', 'b']],
    ['|a|b', ['a', 'b']],
    ['a |', ['a']],
    ['| a | |', ['a', '']],
    ['||x|', ['', 'x']],
    ['| a \\| b |', ['a \\| b']],
    ['| a \\\\| b |', ['a \\\\', 'b']],
    ['| `a` | **b** |', ['`a`', '**b**']],
    ['|', []],
  ])('splits %j', (line, expected) => expect(splitRow(line)).toEqual(expected));
});

describe('tables', () => {
  it.each([
    ['| foo | bar |\n| --- | --- |\n| baz | bim |', table([['foo', 'bar'], ['baz', 'bim']], [null, null])],
    ['| abc | defghi |\n:-: | -----------:\nbar | baz', table([['abc', 'defghi'], ['bar', 'baz']], ['center', 'right'])],
    ['| a | b |\n|:-|-:|\n| 1 | 2 |', table([['a', 'b'], ['1', '2']], ['left', 'right'])],
    ['a | b\n-|-\n1 | 2', table([['a', 'b'], ['1', '2']], [null, null])],
    ['| abc | def |\n| --- | --- |', table([['abc', 'def']], [null, null])],
    ['| f\\|oo  |\n| ------ |\n| b `\\|` az |', table([['f\\|oo'], ['b <code>\\|</code> az']], [null])],
  ])('reads %j', (input, expected) => expect(parse(input)).toEqual([expected]));

  it('unescapes the pipes of a cell before it reads the markdown, code spans included (GFM example 200)', () => {
    expect(parse('| f\\|oo  |\n| ------ |\n| b `\\|` az |\n| b **\\|** im |')).toEqual([
      table([['f\\|oo'], ['b <code>\\|</code> az'], ['b **\\|** im']], [null]),
    ]);
  });

  it('writes every cell the way the engine writes it', () => {
    expect(parse('| [!NOTE] | *a* |\n| --- | --- |\n| `a\\|b` | x\\|y |')).toEqual([
      table([['\\[!NOTE\\]', '_a_'], ['<code>a\\|b</code>', 'x\\|y']], [null, null]),
    ]);
  });

  it('pads short rows, drops extra cells and keeps empty cells', () => {
    expect(parse('| abc | def |\n| --- | --- |\n| bar |\n| bar | baz | boo |\n|a||')).toEqual([
      table([['abc', 'def'], ['bar', ''], ['bar', 'baz'], ['a', '']], [null, null]),
    ]);
  });

  it('needs matching cell counts and a pipe in the delimiter row', () => {
    expect(parse('| abc | def |\n| --- |\n| bar |')).toEqual([md('| abc | def | | --- | | bar |')]);
    expect(parse('Foo\n---')).toEqual([md('## Foo')]);
    expect(parse('a b\n:-- :--')).toEqual([md('a b :-- :--')]);
  });

  it('keeps the paragraph lines above the header row', () => {
    expect(parse('Some text\n| a | b |\n|---|---|\n| 1 | 2 |')).toEqual([
      md('Some text'),
      table([['a', 'b'], ['1', '2']], [null, null]),
    ]);
  });

  it('ends at a blank line or the start of another block', () => {
    expect(parse('| a |\n|---|\n\n| b |\n|---|')).toEqual([table([['a']], [null]), table([['b']], [null])]);
    expect(parse('| a | b |\n|---|---|\n| 1 | 2 |\n# H')).toEqual([table([['a', 'b'], ['1', '2']], [null, null]), md('# H')]);
    expect(parse('| a | b |\n|---|---|\n> q')).toEqual([table([['a', 'b']], [null, null]), md('> q')]);
    expect(parse('| a | b |\n|---|---|\n| 1 | 2 |\n---')).toEqual([
      table([['a', 'b'], ['1', '2']], [null, null]),
      { type: 'DIVIDER', data: {} },
    ]);
  });

  it('keeps an indented row in the table', () => {
    expect(parse('| a | b |\n|---|---|\n    | c |')).toEqual([table([['a', 'b'], ['c', '']], [null, null])]);
  });

  it('works inside quotes and list items', () => {
    expect(parse('> | a |\n> |---|\n> | 1 |')).toEqual([{ ...table([['a'], ['1']], [null]) }]);
    expect(parse('- | a |\n  |---|\n  | 1 |')).toEqual([md('- '), { ...table([['a'], ['1']], [null]), indent: 1 }]);
  });

  it('never reads a header row that ends in a hard break backslash', () => {
    expect(parse('a|b\\\n|-|-|', 'newline')).toEqual([md('a|b\\\n|-|-|')]);
    expect(parse('a|b\\\\\n|-|-|')).toEqual([table([['a', 'b\\\\']], [null, null])]);
  });
});
