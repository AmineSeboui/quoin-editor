import { describe, expect, it } from 'vitest';
import { code, md, parse } from './block-fixtures';

describe('HTML blocks', () => {
  it.each([
    ['<div>hi</div>', '\\<div>hi\\</div>'],
    ['<table>\n  <tr>\n    <td>\n           hi\n    </td>\n  </tr>\n</table>', '\\<table> \\<tr> \\<td> hi \\</td> \\</tr> \\</table>'],
    [' <div>\n  *hello*\n         <foo><a>', '\\<div> _hello_ \\<foo>\\<a>'],
    ['</div>\n*foo*', '\\</div> _foo_'],
    ['<div id="foo"\n  class="bar">\n</div>', '\\<div id="foo" class="bar"> \\</div>'],
    ['<div class\nfoo', '\\<div class foo'],
    ['<a href="foo">\n*bar*\n</a>', '\\<a href="foo"> _bar_ \\</a>'],
    ['<Warning>\n*bar*\n</Warning>', '\\<Warning> _bar_ \\</Warning>'],
    ['<!-- Foo\n\nbar\n   baz -->', '\\<!-- Foo  bar baz -->'],
    ['<?php\n\n  echo \'>\';\n\n?>', "\\<?php  echo '>';  ?>"],
    ['<!DOCTYPE html>', '\\<!DOCTYPE html>'],
    ['<style\n  type="text/css">\nh1 {color:red;}\n\np {color:blue;}\n</style>', '\\<style type="text/css"> h1 {color:red;}  p {color:blue;} \\</style>'],
  ])('keeps %j as one block of escaped text', (input, expected) => expect(parse(input)).toEqual([md(expected)]));

  it('ends a block that has no closing condition at the next blank line', () => {
    expect(parse('<div>\n*foo*\n\n*bar*')).toEqual([md('\\<div> _foo_'), md('_bar_')]);
    expect(parse('<DIV CLASS="foo">\n\n*Markdown*\n\n</DIV>')).toEqual([
      md('\\<DIV CLASS="foo">'),
      md('_Markdown_'),
      md('\\</DIV>'),
    ]);
    expect(parse('<table>\n\n  <tr>\n\n    <td>\n      Hi\n    </td>\n\n  </tr>\n\n</table>')).toEqual([
      md('\\<table>'),
      md('\\<tr>'),
      code('<td>\n  Hi\n</td>'),
      md('\\</tr>'),
      md('\\</table>'),
    ]);
  });

  it('runs a script, style, pre or comment block to its closing tag across blank lines', () => {
    expect(parse('<script>\nfoo\n\nbar\n</script>\nokay')).toEqual([md('\\<script> foo  bar \\</script>'), md('okay')]);
    expect(parse('<!-- foo -->*bar*\n*baz*')).toEqual([md('\\<!-- foo -->_bar_'), md('_baz_')]);
  });

  it('interrupts a paragraph for block level tags only', () => {
    expect(parse('Foo\n<div>\nbar\n</div>')).toEqual([md('Foo'), md('\\<div> bar \\</div>')]);
    expect(parse('Foo\n<a href="bar">\nbaz')).toEqual([md('Foo \\<a href="bar"> baz')]);
  });

  it('does not start from an indented line', () => {
    expect(parse('  <div>\n\n    <div>')).toEqual([md('\\<div>'), code('<div>')]);
  });

  it('reads a tag followed by text as inline HTML in a paragraph', () => {
    expect(parse('<u>text</u> after')).toEqual([md('<u>text</u> after')]);
    expect(parse('<span data-color="red">x</span>')).toEqual([md('<span data-color="red">x</span>')]);
  });

  it('works inside quotes and list items', () => {
    expect(parse('> <div>\n> foo\n\nbar')).toEqual([md('> \\<div> foo'), md('bar')]);
    expect(parse('- <div>\n- foo')).toEqual([md('- \\<div>'), md('- foo')]);
  });
});
