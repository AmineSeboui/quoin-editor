import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fromHTML } from './from-html';
import { nearestPaletteColor } from './html-styles';

const parse = (html: string) => {
  let n = 0;
  return fromHTML(html, { newId: () => `h${++n}` }).map(({ id: _id, ...rest }) => rest);
};
const fixture = (name: string) => readFileSync(resolve(__dirname, 'fixtures', name), 'utf8');

describe('fromHTML', () => {
  it('converts block and inline elements', () => {
    expect(parse('<h2>T</h2><p>a <b>b</b> <i>c</i> <a href="https://x.y">d</a><br>e</p><hr><pre class="language-js">x</pre>')).toEqual([
      { type: 'MARKDOWN', data: { markdown: '## T' } },
      { type: 'MARKDOWN', data: { markdown: 'a **b** _c_ [d](https://x.y)\\\ne' } },
      { type: 'DIVIDER', data: {} },
      { type: 'CODE', data: { language: 'js', code: 'x' } },
    ]);
  });

  it('nests lists and reads checkboxes', () => {
    expect(parse('<ul><li>a<ul><li><input type="checkbox" checked>b</li></ul></li></ul><ol start="4"><li>c</li></ol>')).toEqual([
      { type: 'MARKDOWN', data: { markdown: '- a' } },
      { type: 'MARKDOWN', data: { markdown: '- [x] b' }, indent: 1 },
      { type: 'MARKDOWN', data: { markdown: '4. c' } },
    ]);
  });

  it('drops scripts and unsafe links', () => {
    expect(parse('<script>x</script><p><a href="javascript:x">y</a></p>')).toEqual([{ type: 'MARKDOWN', data: { markdown: 'y' } }]);
  });

  it('maps styled spans to marks and palette colours', () => {
    expect(parse('<p><span style="font-weight:700;color:#d44c47">r</span><span style="background-color:rgb(251,243,219)">y</span></p>')).toEqual([
      { type: 'MARKDOWN', data: { markdown: '**<span data-color="red">r</span>**<span data-bg="yellow">y</span>' } },
    ]);
    expect(nearestPaletteColor('#000000', 'text')).toBeNull();
    expect(nearestPaletteColor('rgba(0,0,0,0)', 'background')).toBeNull();
  });

  it('reads tables, images and details', () => {
    expect(parse('<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table><img src="https://i/p.png" alt="P"><details open><summary>S</summary><p>in</p></details>')).toEqual([
      { type: 'TABLE', data: { rows: [['a'], ['1']], header: true, align: [null] } },
      { type: 'IMAGE', data: { storageKey: '', alt: 'P', url: 'https://i/p.png' } },
      { type: 'TOGGLE', data: { markdown: 'S', open: true } },
      { type: 'MARKDOWN', data: { markdown: 'in' }, indent: 1 },
    ]);
  });

  it('handles Google Docs, Word and Notion markup', () => {
    expect(parse(fixture('google-docs.html'))).toEqual([
      { type: 'MARKDOWN', data: { markdown: '# Plan' } },
      { type: 'MARKDOWN', data: { markdown: 'Normal and **bold** text' } },
      { type: 'MARKDOWN', data: { markdown: '- one' } },
    ]);
    expect(parse(fixture('word.html'))).toEqual([
      { type: 'MARKDOWN', data: { markdown: 'Intro' } },
      { type: 'MARKDOWN', data: { markdown: '- first' } },
      { type: 'MARKDOWN', data: { markdown: '- second' } },
    ]);
    expect(parse(fixture('notion.html'))).toEqual([
      { type: 'MARKDOWN', data: { markdown: '- [ ] task' } },
      { type: 'TOGGLE', data: { markdown: 'Toggle', open: false } },
      { type: 'MARKDOWN', data: { markdown: 'hidden' }, indent: 1 },
    ]);
  });
});
