// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fromHTML } from './from-html';

const markdownOf = (html: string) => {
  let n = 0;
  return fromHTML(html, { newId: () => `d${++n}` }).map(
    (block) => '  '.repeat(block.indent ?? 0) + (block.type === 'MARKDOWN' ? block.data.markdown : `<${block.type}>`),
  );
};

describe('fromHTML word processor marks', () => {
  it.each([
    ['<span style="font-family:Consolas">x</span>', '`x`'],
    ["<span style=\"font-family:'Roboto Mono',monospace\">x</span>", '`x`'],
    ['<span style="font: 12px Menlo">x</span>', '`x`'],
    ['<tt>x</tt>', '`x`'],
    ['<samp>x</samp>', '`x`'],
    ['<font face="Liberation Mono, monospace">x</font>', '`x`'],
    ['<span style="font-family:\'Lucida Console\'">x</span>', '`x`'],
    ['<span style="font-family:\'Monotype Corsiva\'">x</span>', 'x'],
    ['<font color="#c9211e">x</font>', '<span data-color="red">x</span>'],
    ['<font size="2">x</font>', 'x'],
    ['<span style="color:red">x</span>', '<span data-color="red">x</span>'],
    ['<span style="background:yellow;mso-highlight:yellow">x</span>', '<span data-bg="yellow">x</span>'],
    ['<span style="background: #ffff00">x</span>', '<span data-bg="yellow">x</span>'],
    ['<span style="color:windowtext">x</span>', 'x'],
    ['<span style="color:toString">x</span>', 'x'],
    ['x<span>&nbsp;</span>', 'x'],
  ])('maps %s', (html, expected) => expect(markdownOf(`<p>${html}</p>`)).toEqual([expected]));
});

describe('fromHTML code shading and links into the source', () => {
  it('reads the grey a word processor shades code with as part of the code', () => {
    const html = '<style>span.CodeChar {font-family:Consolas; background:#F0F0F0}</style><p><span class=CodeChar>x^2</span></p>';
    expect(markdownOf(html)).toEqual(['`x^2`']);
    expect(markdownOf('<p><span style="font-family:Consolas;background:yellow">x</span></p>')).toEqual([
      '<span data-bg="yellow">`x`</span>',
    ]);
    expect(markdownOf('<p><span style="background:#F0F0F0">x</span></p>')).toEqual(['<span data-bg="gray">x</span>']);
  });

  it('keeps the words of a link to a place in the document it was copied from, and drops the link', () => {
    const html = '<p><a href="#_q1">Catalogue</a>, <a href="#top">top</a> and <a href="https://quoin.dev/docs#install">install</a></p>';
    expect(markdownOf(html)).toEqual(['Catalogue, top and [install](https://quoin.dev/docs#install)']);
  });
});

describe('fromHTML page fonts', () => {
  it('keeps the typeface of the page a selection was copied from out of the marks', () => {
    expect(markdownOf('<div style="font-family: monospace"><p>a <span style="font-family: monospace">b</span></p></div>')).toEqual([
      'a `b`',
    ]);
  });
});
