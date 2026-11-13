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

describe('fromHTML page fonts', () => {
  it('keeps the typeface of the page a selection was copied from out of the marks', () => {
    expect(markdownOf('<div style="font-family: monospace"><p>a <span style="font-family: monospace">b</span></p></div>')).toEqual([
      'a `b`',
    ]);
  });
});
