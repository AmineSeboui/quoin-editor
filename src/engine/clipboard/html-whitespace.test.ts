import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromHTML } from './from-html';

const blocks = (html: string) => fromHTML(html, { newId: () => 'x' }).map(({ id: _id, ...rest }) => rest);
const markdownOf = (html: string) => blocks(html).map((block) => block.data.markdown);
const fixture = (name: string) => readFileSync(resolve(__dirname, 'fixtures', name), 'utf8');

describe('pasted pre-formatted text', () => {
  it('imports a monospace white-space: pre block from VS Code as a code block', () => {
    expect(blocks(fixture('vscode.html'))).toEqual([
      { type: 'CODE', data: { language: '', code: 'function f() {\n    return 1;\n}' } },
    ]);
  });

  it('imports monospace lines written with br as a code block', () => {
    const html = '<div style="font-family: monospace; white-space: pre-wrap">a<br>  b</div>';
    expect(blocks(html)).toEqual([{ type: 'CODE', data: { language: '', code: 'a\n  b' } }]);
  });

  it('keeps indentation inside a pre element', () => {
    expect(blocks('<pre>  x\n    y\n</pre>')).toEqual([{ type: 'CODE', data: { language: '', code: '  x\n    y' } }]);
  });

  it('keeps the lines of block children inside a pre element', () => {
    expect(blocks('<pre><div>a</div><div>  b</div></pre>')).toEqual([
      { type: 'CODE', data: { language: '', code: 'a\n  b' } },
    ]);
  });

  it('keeps runs of spaces, tabs and line breaks where white-space is pre', () => {
    expect(markdownOf('<p style="white-space: pre">a   b\tc\n  d</p>')).toEqual(['a   b\tc\\\n&#32; d']);
  });

  it('keeps them where an ancestor inside the fragment sets pre-wrap', () => {
    expect(markdownOf('<div style="white-space: pre-wrap"><p>a   b</p><ul><li>c   d</li></ul></div>')).toEqual([
      'a   b',
      '- c   d',
    ]);
    expect(markdownOf('<div style="white-space: pre-wrap"><span style="font-weight:700">a   b</span></div>')).toEqual([
      '**a   b**',
    ]);
  });

  it('keeps leading spaces of a pre-formatted line', () => {
    expect(markdownOf('<p style="white-space: pre-wrap">   indented</p>')).toEqual(['&#32;  indented']);
  });

  it('collapses whitespace again where a descendant sets normal', () => {
    const html = '<div style="white-space: pre"><p style="white-space: normal">a   b\n c</p></div>';
    expect(markdownOf(html)).toEqual(['a b c']);
  });

  it('keeps collapsing whitespace everywhere else', () => {
    expect(markdownOf('<p>a   b\n  c</p>')).toEqual(['a b c']);
  });

  it('keeps the shape of the Google Docs fixture, whose spans are pre-wrap', () => {
    expect(markdownOf(fixture('google-docs.html')).slice(0, 2)).toEqual(['# Plan', 'Normal and **bold** text']);
  });
});
